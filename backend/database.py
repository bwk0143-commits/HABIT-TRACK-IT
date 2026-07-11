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