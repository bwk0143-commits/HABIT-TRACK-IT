from fastapi import FastAPI, HTTPException,Depends
from database import users_collection,habits_collection
from models import UserRegister,UserLogin,HabitCreate
from passlib.context import CryptContext
from auth import create_access_token,get_current_user
from bson import ObjectId
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Habit Tracker API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)
pwd_context = CryptContext(
    schemes=["bcrypt"],
    deprecated="auto"
)


@app.get("/")
def home():
    return {"message": "Habit Tracker API is running"}


@app.post("/register")
def register_user(user: UserRegister):

    existing_user = users_collection.find_one(
        {"email": user.email}
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    hashed_password = pwd_context.hash(user.password)

    user_data = {
        "name": user.name,
        "email": user.email,
        "password": hashed_password
    }

    users_collection.insert_one(user_data)

    return {
        "message": "User registered successfully"
    }
@app.post("/login")
def login_user(user: UserLogin):
    existing_user = users_collection.find_one(
        {"email": user.email}
    )

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not pwd_context.verify(
        user.password,
        existing_user["password"]
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token({
        "email": existing_user["email"],
        "user_id": str(existing_user["_id"])
    })

    return {
        "message": "Login successful",
        "access_token": access_token,
        "token_type": "bearer",
        "name": existing_user["name"]
    }
@app.post("/habits")
def ceate_habit(
    habit: HabitCreate,
    current_user: dict = Depends(get_current_user)
):
    habit_data ={
        "title": habit.title,
        "category": habit.category,
        "user_id": current_user["user_id"],
        "completed": False
    }

    result = habits_collection.insert_one(habit_data)

    return {
        "message": "Habit created successfully",
        "habit_id": str(result.inserted_id)
    }
@app.get("/habits")
def get_habits(
    current_user: dict = Depends(get_current_user)
):
    habits = habits_collection.find(
        {"user_id": current_user["user_id"]}
    )

    habit_list = []
    for habit in habits:
        habit_list.append({
            "id": str(habit["_id"]),
            "title": habit["title"],
            "category": habit["category"],
            "completed": habit["completed"]
        })

    return habit_list
@app.patch("/habits/{habit_id}/complete")
def complete_habit(
    habit_id: str,
    current_user: dict =Depends(get_current_user)
):
    result = habits_collection.update_one(
        {
            "_id": ObjectId(habit_id),
            "user_id": current_user["user_id"]
        },
        {
            "$set": {"completed": True}
        }
    )
    if result.matched_count == 0:
        raise HTTPException(
            satus_code=404,
            detail="habit not found"

        )
    return {"message": "Habit marked as complete"}
@app.delete("/habits/{habit_id}")
def delete_habit(
    habit_id: str,
    current_user: dict = Depends(get_current_user)
):
    result = habits_collection.delete_one({
        "_id": ObjectId(habit_id),
        "user_id": current_user["user_id"]
    })

    if result.deleted_count == 0:
        raise HTTPException(
            status_code=404,
            detail="habit not found"
        )
    return {"message": "Habit dleted successfully"}

@app.put("/habits/{habit_id}")
def update_habit(
    habit_id: str,
    habit: HabitCreate,
    current_user: dict =Depends(get_current_user)
):
    result = habits_collection.update_one(
        {
            "_id": ObjectId(habit_id),
            "user_id": current_user["user_id"]
        },
        {
            "$set": {
                "title": habit.title,
                "category": habit.category
            }
        }
    )

    if result.matched_count ==0:
        raise HTTPException(
            status_code=404,
            detail="Habit not found"
        )
    
    return {"message": "Habit updated successfully"}

@app.get("/dashboard")
def get_dashboard(
    current_user: dict = Depends(get_current_user)
):
    user_id = current_user["user_id"]
    total_habits = habits_collection.count_documents(
        {"user_id": user_id}
    )

    completed_habits = habits_collection.count_documents({
        "user_id": user_id,
        "complted": True
    })

    pending_habits = total_habits - completed_habits

    percentage =(
        round((completed_habits / total_habits)*100)
        if total_habits >0
        else 0
    )

    return {
        "totalHabits": total_habits,
        "completedToday": completed_habits,
        "pending": pending_habits,
        "percentage": percentage
    }
