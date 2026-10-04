import os
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv
import certifi

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

MONGO_URI = os.getenv("MONGO_URI")

client = MongoClient(
    MONGO_URI,
    tls=True,
    tlsCAFile=certifi.where()
)


db = client["habit_tracker"]
users_collection = db["users"]
habits_collection = db["habits"]
email_verifications_collection = db["email_verifications"]
notifications_collection = db["notifications"]


def ensure_indexes():
    email_verifications_collection.create_index("email", unique=True)
    email_verifications_collection.create_index("expires_at", expireAfterSeconds=0)
    notifications_collection.create_index(
        [("user_id", 1), ("habit_id", 1), ("reminder_date", 1), ("type", 1)],
        unique=True,
    )