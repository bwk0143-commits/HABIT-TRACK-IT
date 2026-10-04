import copy
import importlib
import sys
import types
import unittest
from pathlib import Path

from bson import ObjectId

BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


class MemoryCollection:
    def __init__(self):
        self.documents = []

    def insert_one(self, document):
        stored = copy.deepcopy(document)
        stored.setdefault("_id", ObjectId())
        self.documents.append(stored)
        return types.SimpleNamespace(inserted_id=stored["_id"])

    def find_one(self, query):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                return copy.deepcopy(document)
        return None

    def find(self, query):
        return [
            copy.deepcopy(document)
            for document in self.documents
            if all(document.get(key) == value for key, value in query.items())
        ]

    def update_one(self, query, update):
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                document.update(copy.deepcopy(update.get("$set", {})))
                return types.SimpleNamespace(matched_count=1)
        return types.SimpleNamespace(matched_count=0)

    def update_many(self, query, update):
        modified_count = 0
        for document in self.documents:
            if all(document.get(key) == value for key, value in query.items()):
                document.update(copy.deepcopy(update.get("$set", {})))
                modified_count += 1
        return types.SimpleNamespace(modified_count=modified_count)


fake_database = types.ModuleType("database")
fake_database.users_collection = MemoryCollection()
fake_database.habits_collection = MemoryCollection()
fake_database.email_verifications_collection = MemoryCollection()
fake_database.notifications_collection = MemoryCollection()
fake_database.ensure_indexes = lambda: None
sys.modules["database"] = fake_database

fake_auth = types.ModuleType("auth")
fake_auth.create_access_token = lambda payload: "test-token"
fake_auth.get_current_user = lambda: {}
sys.modules["auth"] = fake_auth

main = importlib.import_module("main")


class ReminderApiTests(unittest.TestCase):
    def setUp(self):
        fake_database.users_collection.documents = []
        fake_database.habits_collection.documents = []
        fake_database.notifications_collection.documents = []
        self.user_id = ObjectId()
        self.other_user_id = ObjectId()
        fake_database.users_collection.insert_one({
            "_id": self.user_id,
            "name": "Karthik",
            "email": "karthik@example.test",
        })
        fake_database.users_collection.insert_one({
            "_id": self.other_user_id,
            "name": "Other User",
            "email": "other@example.test",
        })
        self.current_user = {"user_id": str(self.user_id)}
        self.other_user = {"user_id": str(self.other_user_id)}

    def test_settings_are_user_scoped_and_persisted(self):
        defaults = main.get_settings(self.current_user)
        self.assertEqual(defaults["timezone"], "Asia/Kolkata")
        self.assertFalse(defaults["browser_notifications_enabled"])

        main.update_settings(
            main.UserSettingsUpdate(
                in_app_notifications_enabled=False,
                browser_notifications_enabled=True,
                timezone="America/New_York",
            ),
            self.current_user,
        )

        saved = main.get_settings(self.current_user)
        untouched = main.get_settings(self.other_user)
        self.assertFalse(saved["in_app_notifications_enabled"])
        self.assertTrue(saved["browser_notifications_enabled"])
        self.assertEqual(saved["timezone"], "America/New_York")
        self.assertTrue(untouched["in_app_notifications_enabled"])
        self.assertFalse(untouched["browser_notifications_enabled"])

    def test_previous_settings_keys_are_returned_as_canonical_fields(self):
        fake_database.users_collection.update_one(
            {"_id": self.user_id},
            {"$set": {"settings": {
                "habit_reminders": False,
                "email_reminders": False,
                "browser_notifications": True,
                "default_reminder_time": "07:30",
                "timezone": "America/New_York",
            }}},
        )

        settings = main.get_settings(self.current_user)
        self.assertTrue(settings["in_app_notifications_enabled"])
        self.assertNotIn("email_reminders_enabled", settings)
        self.assertTrue(settings["browser_notifications_enabled"])
        self.assertEqual(settings["timezone"], "America/New_York")
        self.assertNotIn("default_reminder_time", settings)
        self.assertNotIn("habit_reminders", settings)

    def test_habit_reminder_create_update_and_legacy_defaults(self):
        created = main.create_habit(
            main.HabitCreate(
                title="Study DSA",
                category="Study",
                reminder_enabled=True,
                reminder_time="19:00",
            ),
            self.current_user,
        )
        habit_id = created["habit_id"]
        habits = main.get_habits(self.current_user)
        self.assertTrue(habits[0]["reminder_enabled"])
        self.assertEqual(habits[0]["reminder_time"], "19:00")

        second_created = main.create_habit(
            main.HabitCreate(
                title="Gym",
                category="Exercise",
                reminder_enabled=True,
                reminder_time="17:30",
            ),
            self.current_user,
        )

        main.update_habit_status(
            habit_id,
            main.HabitUpdate(
                reminder_time="20:00",
            ),
            self.current_user,
        )
        updated = main.get_habits(self.current_user)[0]
        unchanged = next(
            habit for habit in main.get_habits(self.current_user)
            if habit["id"] == second_created["habit_id"]
        )
        self.assertTrue(updated["reminder_enabled"])
        self.assertEqual(updated["reminder_time"], "20:00")
        self.assertEqual(unchanged["reminder_time"], "17:30")
        self.assertNotIn("timezone", updated)

        fake_database.habits_collection.insert_one({
            "title": "Old habit",
            "category": "Custom",
            "user_id": str(self.user_id),
            "completed": False,
        })
        legacy = next(
            habit for habit in main.get_habits(self.current_user)
            if habit["title"] == "Old habit"
        )
        self.assertFalse(legacy["reminder_enabled"])
        self.assertIsNone(legacy["reminder_time"])
        self.assertNotIn("timezone", legacy)

    def test_user_cannot_modify_another_users_reminder(self):
        created = main.create_habit(
            main.HabitCreate(title="Private habit", category="Custom"),
            self.current_user,
        )

        with self.assertRaises(main.HTTPException) as error:
            main.update_habit_status(
                created["habit_id"],
                main.HabitUpdate(reminder_enabled=True, reminder_time="19:00"),
                self.other_user,
            )

        self.assertEqual(error.exception.status_code, 404)

    def test_notifications_are_user_scoped_and_can_be_marked_read(self):
        own_notification = fake_database.notifications_collection.insert_one({
            "user_id": str(self.user_id),
            "habit_id": str(ObjectId()),
            "title": "Time for Study DSA",
            "message": "Your study session is ready.",
            "type": "habit_reminder",
            "created_at": main.datetime.now(main.timezone.utc),
            "read": False,
        })
        fake_database.notifications_collection.insert_one({
            "user_id": str(self.other_user_id),
            "habit_id": str(ObjectId()),
            "title": "Private notification",
            "message": "Not yours.",
            "type": "habit_reminder",
            "created_at": main.datetime.now(main.timezone.utc),
            "read": False,
        })

        own_list = main.get_notifications(self.current_user)
        self.assertEqual(len(own_list["notifications"]), 1)
        self.assertEqual(own_list["unread_count"], 1)

        notification_id = own_notification.inserted_id
        main.mark_notification_read(str(notification_id), self.current_user)
        self.assertEqual(main.get_notifications(self.current_user)["unread_count"], 0)

        other_notification = fake_database.notifications_collection.find_one({
            "user_id": str(self.other_user_id),
        })
        with self.assertRaises(main.HTTPException) as error:
            main.mark_notification_read(str(other_notification["_id"]), self.current_user)
        self.assertEqual(error.exception.status_code, 404)

    def test_read_all_only_marks_current_users_notifications(self):
        for user_id in (self.user_id, self.other_user_id):
            fake_database.notifications_collection.insert_one({
                "user_id": str(user_id),
                "title": "Reminder",
                "message": "Habit reminder.",
                "type": "habit_reminder",
                "read": False,
            })

        result = main.mark_all_notifications_read(self.current_user)

        self.assertEqual(result["updated"], 1)
        self.assertEqual(main.get_notifications(self.current_user)["unread_count"], 0)
        self.assertEqual(main.get_notifications(self.other_user)["unread_count"], 1)


if __name__ == "__main__":
    unittest.main()