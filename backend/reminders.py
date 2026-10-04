import logging
import random
from datetime import date, datetime, timezone
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError

logger = logging.getLogger(__name__)

REMINDER_MESSAGES = {
    "study": (
        "Hey {name} 📚 It's time for {habit}! Even one focused session today moves you closer to your goals.",
        "Your study session for {habit} is waiting, {name}. Start with one problem and keep your streak alive!",
    ),
    "exercise": (
        "Time to move, {name} 💪 Your consistency is what creates results. Don't break today's streak!",
        "Your workout for {habit} is waiting, {name}! One session is another step toward your fitness goal.",
    ),
    "fitness": (
        "Time to move, {name} 💪 Your consistency is what creates results. Don't break today's streak!",
        "Your workout for {habit} is waiting, {name}! One session is another step toward your fitness goal.",
    ),
    "health": (
        "A little care goes a long way, {name}. It's time for {habit}.",
        "Your health habit {habit} is waiting, {name}. Take a moment for yourself today.",
    ),
    "water": (
        "💧 Hydration check, {name}! It's time for {habit}; drink some water and keep refreshed.",
        "Take a water break for {habit}, {name}. Your next glass is a small win for your health.",
    ),
    "reading": (
        "📖 A few pages today can become a book finished tomorrow. Time for {habit}!",
        "Your reading time is here, {name}. Settle in with a few pages of {habit}.",
    ),
    "meditation": (
        "🧘 Take a few quiet minutes for yourself, {name}. It's time for {habit}.",
        "Pause and breathe, {name}. Your meditation time for {habit} is ready.",
    ),
    "sleep": (
        "🌙 It's time to wind down for {habit}, {name}. A good night's sleep helps tomorrow.",
        "Your sleep routine {habit} is waiting, {name}. Start winding down for a better tomorrow.",
    ),
    "coding": (
        "🚀 Time to build {habit}, {name}! Even one hour of coding today moves your project forward.",
        "Your coding session for {habit} is waiting, {name}. Make one small improvement today.",
    ),
    "work": (
        "Time to focus, {name}. Take the next step on {habit} and keep your momentum going.",
        "Your work session for {habit} is ready, {name}. Start with one clear next action.",
    ),
    "custom": (
        "⏰ Reminder, {name}: It's time for {habit}. Keep going and maintain your streak!",
        "Your habit {habit} is waiting, {name}. A small step today keeps your routine moving.",
    ),
}


def generate_reminder_message(user_name: str, habit_name: str, category: str) -> str:
    normalized_category = (category or "custom").strip().lower()
    messages = REMINDER_MESSAGES.get(normalized_category, REMINDER_MESSAGES["custom"])
    return random.choice(messages).format(name=user_name, habit=habit_name)


def _completed_on_local_day(habit, local_day: date, timezone_info: ZoneInfo):
    if habit.get("completed") is not True:
        return False

    completed_at = habit.get("completed_at")
    if not isinstance(completed_at, datetime):
        return True
    if completed_at.tzinfo is None:
        completed_at = completed_at.replace(tzinfo=timezone.utc)
    return completed_at.astimezone(timezone_info).date() == local_day


def process_due_reminders(
    users_collection,
    habits_collection,
    notifications_collection,
    now=None,
):
    now = now or datetime.now(timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    now = now.astimezone(timezone.utc)
    sent_count = 0

    for user in users_collection.find({}):
        preferences = user.get("settings", {})
        if preferences.get("in_app_notifications_enabled", True) is False:
            continue

        timezone_name = preferences.get("timezone") or "Asia/Kolkata"
        try:
            timezone_info = ZoneInfo(timezone_name)
        except (ZoneInfoNotFoundError, ValueError, TypeError):
            logger.warning("Skipping reminders for user %s with invalid timezone", user.get("_id"))
            continue

        local_now = now.astimezone(timezone_info)
        try:
            user_id = str(ObjectId(user["_id"]))
        except (InvalidId, KeyError, TypeError):
            continue

        for habit in habits_collection.find({
            "user_id": user_id,
            "reminder_enabled": True,
        }):
            reminder_time = habit.get("reminder_time")
            if not reminder_time or local_now.strftime("%H:%M") != reminder_time:
                continue
            if _completed_on_local_day(habit, local_now.date(), timezone_info):
                continue

            try:
                habit_object_id = ObjectId(habit["_id"])
            except (InvalidId, KeyError, TypeError):
                continue

            notification_key = {
                "user_id": user_id,
                "habit_id": str(habit_object_id),
                "reminder_date": local_now.date().isoformat(),
                "type": "habit_reminder",
            }
            try:
                user_name = user.get("name", "there")
                habit_name = habit.get("title", "your habit")
                reminder_message = generate_reminder_message(
                    user_name,
                    habit_name,
                    habit.get("category", "custom"),
                )
                notifications_collection.insert_one({
                    **notification_key,
                    "title": f"Time for {habit_name}",
                    "message": reminder_message,
                    "created_at": now,
                    "read": False,
                })
            except DuplicateKeyError:
                continue
            except Exception:
                logger.exception("Unable to create a reminder notification for habit %s", habit.get("_id"))
                continue
            sent_count += 1

    return sent_count