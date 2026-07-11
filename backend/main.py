from fastapi import FastAPI, HTTPException
from database import users_collection
from models import UserRegister
from passlib.context import CryptContext

app = FastAPI(title="Habit Tracker API")

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