import asyncio
import hashlib
import logging
import os
import secrets
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
from contextlib import asynccontextmanager
from zoneinfo import ZoneInfo

from fastapi import FastAPI, HTTPException, Depends
from database import (
    users_collection,
    habits_collection,
    email_verifications_collection,
    notifications_collection,
    ensure_indexes,
)
from models import (
    UserRegister,
    UserLogin,
    EmailVerification,
    HabitCreate,
    HabitUpdate,
    UserSettingsUpdate,
)
from passlib.context import CryptContext
from auth import create_access_token, get_current_user
from bson import ObjectId
from bson.errors import InvalidId
from fastapi.middleware.cors import CORSMiddleware
from streaks import calculate_streaks, completion_days
from reminders import process_due_reminders

logger = logging.getLogger(__name__)


async def reminder_scheduler():
    indexes_ready = False
    while True:
        if not indexes_ready:
            try:
                await asyncio.to_thread(ensure_indexes)
                indexes_ready = True
            except Exception:
                logger.exception("MongoDB reminder indexes are unavailable; retrying")
        if indexes_ready:
            try:
                await asyncio.to_thread(
                    process_due_reminders,
                    users_collection,
                    habits_collection,
                    notifications_collection,
                )
            except Exception:
                logger.exception("Reminder scheduler iteration failed")
        await asyncio.sleep(30)


@asynccontextmanager
async def lifespan(_app):
    task = asyncio.create_task(reminder_scheduler())
    try:
        yield
    finally:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


app = FastAPI(title="Habit Tracker API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto",
)


@app.get("/")
def home():
    return {"message": "Habit Tracker API is running"}


def send_verification_email(email: str, token: str):
    smtp_host = os.getenv("SMTP_HOST")
    smtp_username = os.getenv("SMTP_USERNAME")
    smtp_password = os.getenv("SMTP_PASSWORD")
    sender_email = os.getenv("SMTP_FROM_EMAIL") or smtp_username
    frontend_url = os.getenv("FRONTEND_URL")

    if not all((smtp_host, smtp_username, smtp_password, sender_email, frontend_url)):
        raise HTTPException(
            status_code=503,
            detail="Email verification is temporarily unavailable. Please try again later.",
        )

    verification_url = f"{frontend_url.rstrip('/')}/verify-email?token={token}"
    message = EmailMessage()
    message["Subject"] = "Verify your Habit Tracker email"
    message["From"] = sender_email
    message["To"] = email
    message.set_content(
        "Verify your email address to finish creating your Habit Tracker account.\n\n"
        f"Open this link within 30 minutes: {verification_url}\n\n"
        "If you did not request this account, you can ignore this email."
    )

    try:
        with smtplib.SMTP(smtp_host, int(os.getenv("SMTP_PORT", "587")), timeout=15) as server:
            server.starttls()
            server.login(smtp_username, smtp_password)
            server.send_message(message)
    except Exception as error:
        raise HTTPException(
            status_code=503,
            detail="We could not send the verification email. Please try again later.",
        ) from error


@app.get("/me")
def get_me(current_user: dict = Depends(get_current_user)):
    user = users_collection.find_one({"_id": ObjectId(current_user["user_id"])})

    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return {
        "name": user.get("name", ""),
        "email": user.get("email", ""),
    }


DEFAULT_USER_SETTINGS = {
    "in_app_notifications_enabled": True,
    "browser_notifications_enabled": False,
    "timezone": "Asia/Kolkata",
}


def _find_current_user(current_user):
    try:
        user_id = ObjectId(current_user["user_id"])
    except (KeyError, InvalidId) as error:
        raise HTTPException(status_code=401, detail="Invalid user session") from error

    user = users_collection.find_one({"_id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user


@app.get("/settings")
def get_settings(current_user: dict = Depends(get_current_user)):
    user = _find_current_user(current_user)
    stored_settings = user.get("settings", {})
    settings = {
        **DEFAULT_USER_SETTINGS,
        **stored_settings,
        "in_app_notifications_enabled": stored_settings.get("in_app_notifications_enabled", True),
        "browser_notifications_enabled": stored_settings.get(
            "browser_notifications_enabled",
            stored_settings.get("browser_notifications", False),
        ),
    }
    settings.pop("habit_reminders", None)
    settings.pop("email_reminders", None)
    settings.pop("email_reminders_enabled", None)
    settings.pop("browser_notifications", None)
    settings.pop("default_reminder_time", None)
    return settings


@app.put("/settings")
def update_settings(
    settings_update: UserSettingsUpdate,
    current_user: dict = Depends(get_current_user),
):
    user = _find_current_user(current_user)
    stored_settings = user.get("settings", {})
    current_settings = {
        "in_app_notifications_enabled": stored_settings.get("in_app_notifications_enabled", True),
        "browser_notifications_enabled": stored_settings.get(
            "browser_notifications_enabled",
            stored_settings.get("browser_notifications", False),
        ),
        "timezone": stored_settings.get("timezone", "Asia/Kolkata"),
    }
    updates = settings_update.model_dump(exclude_unset=True)

    if "timezone" in updates and updates["timezone"] is None:
        raise HTTPException(status_code=422, detail="Timezone cannot be empty")

    current_settings.update(updates)
    users_collection.update_one(
        {"_id": user["_id"]},
        {"$set": {"settings": current_settings}},
    )
    return current_settings


def _notification_sort_key(notification):
    created_at = notification.get("created_at")
    if not isinstance(created_at, datetime):
        return 0
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)
    return created_at.timestamp()


def _serialize_notification(notification):
    created_at = notification.get("created_at")
    return {
        "id": str(notification["_id"]),
        "habit_id": notification.get("habit_id"),
        "title": notification.get("title", "Habit reminder"),
        "message": notification.get("message", "It's time for your habit."),
        "type": notification.get("type", "habit_reminder"),
        "created_at": created_at.isoformat() if isinstance(created_at, datetime) else None,
        "read": notification.get("read", False),
    }


@app.get("/notifications")
def get_notifications(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    notifications = list(notifications_collection.find({"user_id": user_id}))
    notifications.sort(key=_notification_sort_key, reverse=True)
    notifications = notifications[:100]
    unread_count = sum(1 for notification in notifications if not notification.get("read", False))
    return {
        "notifications": [_serialize_notification(item) for item in notifications],
        "unread_count": unread_count,
    }


@app.patch("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user),
):
    try:
        object_id = ObjectId(notification_id)
    except InvalidId as error:
        raise HTTPException(status_code=404, detail="Notification not found") from error

    result = notifications_collection.update_one(
        {"_id": object_id, "user_id": current_user["user_id"]},
        {"$set": {"read": True}},
    )
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Notification not found")
    return {"message": "Notification marked as read"}


@app.post("/notifications/read-all")
def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    result = notifications_collection.update_many(
        {"user_id": current_user["user_id"], "read": False},
        {"$set": {"read": True}},
    )
    return {"message": "Notifications marked as read", "updated": result.modified_count}


def set_habit_completion(habit_id: str, user_id: str, completed: bool):
    try:
        object_id = ObjectId(habit_id)
    except InvalidId as error:
        raise HTTPException(status_code=404, detail="Habit not found") from error

    habit_filter = {"_id": object_id, "user_id": user_id}
    existing_habit = habits_collection.find_one(habit_filter)

    if not existing_habit:
        raise HTTPException(status_code=404, detail="Habit not found")

    now = datetime.now(timezone.utc)
    recorded_days = completion_days(existing_habit)
    if completed:
        completed_at = now
        recorded_days.add(now.date())
        update = {
            "$set": {
                "completed": True,
                "completed_at": completed_at,
                "completion_dates": [day.isoformat() for day in sorted(recorded_days)],
            },
        }
    else:
        completed_at = None
        if existing_habit.get("completed") is True:
            prior_days = completion_days({
                "completed": True,
                "completed_at": existing_habit.get("completed_at"),
            })
            if not prior_days:
                prior_days = {now.date()}
            recorded_days.difference_update(prior_days)
        update = {
            "$set": {
                "completed": False,
                "completed_at": None,
                "completion_dates": [day.isoformat() for day in sorted(recorded_days)],
            },
        }

    result = habits_collection.update_one(habit_filter, update)
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")

    updated_habit = habits_collection.find_one(habit_filter)
    return {
        "id": str(object_id),
        "title": updated_habit.get("title", ""),
        "category": updated_habit.get("category", "General"),
        "completed": updated_habit.get("completed", completed),
        "completed_at": completed_at.isoformat() if completed_at else None,
    }


@app.post("/register")
def register_user(user: UserRegister):
    existing_user = users_collection.find_one({"email": user.email})

    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    pending_registration = {
        "name": user.name,
        "email": user.email,
        "password": pwd_context.hash(user.password),
        "token_hash": token_hash,
        "expires_at": datetime.now(timezone.utc) + timedelta(minutes=30),
    }

    email_verifications_collection.replace_one(
        {"email": user.email}, pending_registration, upsert=True
    )

    try:
        send_verification_email(user.email, token)
    except HTTPException:
        email_verifications_collection.delete_one(
            {"email": user.email, "token_hash": token_hash}
        )
        raise

    return {"message": "Verification email sent. Check your inbox to finish registration."}


@app.post("/verify-email")
def verify_email(request: EmailVerification):
    token_hash = hashlib.sha256(request.token.encode()).hexdigest()
    pending_registration = email_verifications_collection.find_one(
        {"token_hash": token_hash}
    )

    if not pending_registration:
        raise HTTPException(status_code=400, detail="Verification link is invalid or expired")

    expires_at = pending_registration["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at <= datetime.now(timezone.utc):
        email_verifications_collection.delete_one({"_id": pending_registration["_id"]})
        raise HTTPException(status_code=400, detail="Verification link is invalid or expired")

    if users_collection.find_one({"email": pending_registration["email"]}):
        email_verifications_collection.delete_one({"_id": pending_registration["_id"]})
        raise HTTPException(status_code=400, detail="Email already registered")

    users_collection.insert_one({
        "name": pending_registration["name"],
        "email": pending_registration["email"],
        "password": pending_registration["password"],
        "email_verified": True,
    })
    email_verifications_collection.delete_one({"_id": pending_registration["_id"]})

    return {"message": "Email verified. Your account is ready; you can now log in."}


@app.post("/login")
def login_user(user: UserLogin):
    existing_user = users_collection.find_one({"email": user.email})

    if not existing_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if existing_user.get("email_verified", True) is not True:
        raise HTTPException(status_code=403, detail="Please verify your email before logging in")

    if not pwd_context.verify(user.password, existing_user["password"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    access_token = create_access_token({
        "email": existing_user["email"],
        "user_id": str(existing_user["_id"]),
    })

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "name": existing_user["name"],
    }


@app.post("/habits")
def create_habit(
    habit: HabitCreate,
    current_user: dict = Depends(get_current_user),
):
    completed_at = datetime.now(timezone.utc) if habit.completed else None
    habit_data = {
        "title": habit.title,
        "category": habit.category,
        "user_id": current_user["user_id"],
        "completed": habit.completed,
        "completed_at": completed_at,
        "completion_dates": [completed_at.date().isoformat()] if completed_at else [],
        "reminder_enabled": habit.reminder_enabled,
        "reminder_time": habit.reminder_time,
        "streak": 0,
        "best_streak": 0,
    }

    result = habits_collection.insert_one(habit_data)

    return {
        "message": "Habit created successfully",
        "habit_id": str(result.inserted_id),
    }


@app.get("/habits")
def get_habits(current_user: dict = Depends(get_current_user)):
    habits = habits_collection.find({"user_id": current_user["user_id"]})

    habit_list = []
    for habit in habits:
        habit_list.append({
            "id": str(habit["_id"]),
            "title": habit["title"],
            "category": habit["category"],
            "completed": habit.get("completed", False),
            "reminder_enabled": habit.get("reminder_enabled", False),
            "reminder_time": habit.get("reminder_time"),
            "completed_at": habit.get("completed_at").isoformat()
            if isinstance(habit.get("completed_at"), datetime)
            else None,
            "streak": calculate_streaks([habit])[0],
        })

    return habit_list


@app.patch("/habits/{habit_id}")
def update_habit_status(
    habit_id: str,
    habit_update: HabitUpdate,
    current_user: dict = Depends(get_current_user),
):
    if habit_update.completed is not None:
        set_habit_completion(
            habit_id, current_user["user_id"], habit_update.completed
        )

    update_data = habit_update.model_dump(
        exclude_unset=True,
        exclude={"completed"},
    )

    if not update_data and habit_update.completed is None:
        return {"message": "No changes to apply"}

    if update_data:
        try:
            object_id = ObjectId(habit_id)
        except InvalidId as error:
            raise HTTPException(status_code=404, detail="Habit not found") from error
        habit_filter = {"_id": object_id, "user_id": current_user["user_id"]}
        existing_habit = habits_collection.find_one(habit_filter)
        if not existing_habit:
            raise HTTPException(status_code=404, detail="Habit not found")

        reminder_enabled = update_data.get(
            "reminder_enabled", existing_habit.get("reminder_enabled", False)
        )
        reminder_time = update_data.get(
            "reminder_time", existing_habit.get("reminder_time")
        )
        if reminder_enabled and not reminder_time:
            raise HTTPException(
                status_code=422,
                detail="A reminder time is required when reminders are enabled",
            )

        result = habits_collection.update_one(habit_filter, {"$set": update_data})
        if result.matched_count == 0:
            raise HTTPException(status_code=404, detail="Habit not found")

    return {"message": "Habit updated successfully"}


@app.patch("/habits/{habit_id}/complete")
def complete_habit(
    habit_id: str,
    current_user: dict = Depends(get_current_user),
):
    habit = set_habit_completion(habit_id, current_user["user_id"], True)
    return {"message": "Habit marked as complete", "habit": habit}


@app.patch("/habits/{habit_id}/uncomplete")
def uncomplete_habit(
    habit_id: str,
    current_user: dict = Depends(get_current_user),
):
    habit = set_habit_completion(habit_id, current_user["user_id"], False)
    return {"message": "Habit marked as incomplete", "habit": habit}


@app.delete("/habits/{habit_id}")
def delete_habit(
    habit_id: str,
    current_user: dict = Depends(get_current_user),
):
    result = habits_collection.delete_one({
        "_id": ObjectId(habit_id),
        "user_id": current_user["user_id"],
    })

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Habit not found")

    return {"message": "Habit deleted successfully"}


@app.put("/habits/{habit_id}")
def update_habit(
    habit_id: str,
    habit: HabitUpdate,
    current_user: dict = Depends(get_current_user),
):
    return update_habit_status(habit_id, habit, current_user)


@app.get("/dashboard")
def get_dashboard(current_user: dict = Depends(get_current_user)):
    user_id = current_user["user_id"]
    habits = list(habits_collection.find({"user_id": user_id}))
    total_habits = len(habits)
    completed_habits = sum(1 for habit in habits if habit.get("completed") is True)
    pending_habits = total_habits - completed_habits
    percentage = round((completed_habits / total_habits) * 100) if total_habits > 0 else 0
    current_streak, best_streak = calculate_streaks(habits)

    return {
        "totalHabits": total_habits,
        "completedToday": completed_habits,
        "pending": pending_habits,
        "percentage": percentage,
        "currentStreak": current_streak,
        "bestStreak": best_streak,
    }

