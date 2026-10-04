import unittest
from datetime import datetime, timezone

from bson import ObjectId
from pymongo.errors import DuplicateKeyError

from reminders import generate_reminder_message, process_due_reminders


class MemoryUsers:
    def __init__(self, users):
        self.users = users

    def find(self, query):
        return list(self.users)


class MemoryHabits:
    def __init__(self, habits):
        self.habits = habits

    def find(self, query):
        return [
            habit for habit in self.habits
            if all(habit.get(key) == value for key, value in query.items())
        ]


class MemoryNotifications:
    def __init__(self):
        self.entries = []

    def insert_one(self, entry):
        unique_fields = ("user_id", "habit_id", "reminder_date", "type")
        if any(all(existing.get(key) == entry.get(key) for key in unique_fields) for existing in self.entries):
            raise DuplicateKeyError("duplicate reminder notification")
        self.entries.append(dict(entry))


class ReminderTests(unittest.TestCase):
    def setUp(self):
        self.user_id = ObjectId()
        self.habit_id = ObjectId()
        self.now = datetime(2026, 10, 4, 13, 30, tzinfo=timezone.utc)
        self.user = {
            "_id": self.user_id,
            "name": "Karthik",
            "settings": {
                "in_app_notifications_enabled": True,
                "browser_notifications_enabled": False,
                "timezone": "Asia/Kolkata",
            },
        }
        self.habit = {
            "_id": self.habit_id,
            "user_id": str(self.user_id),
            "title": "Study DSA",
            "category": "Study",
            "completed": False,
            "reminder_enabled": True,
            "reminder_time": "19:00",
        }
        self.second_habit = {
            "_id": ObjectId(),
            "user_id": str(self.user_id),
            "title": "Gym",
            "category": "Exercise",
            "completed": False,
            "reminder_enabled": True,
            "reminder_time": "17:30",
        }
        self.users = MemoryUsers([self.user])
        self.habits = MemoryHabits([self.habit, self.second_habit])
        self.notifications = MemoryNotifications()

    def process(self):
        return process_due_reminders(
            self.users,
            self.habits,
            self.notifications,
            now=self.now,
        )

    def test_creates_personalized_notification_once_at_local_reminder_time_without_email(self):
        self.assertEqual(self.process(), 1)
        self.assertEqual(self.process(), 0)
        self.assertEqual(len(self.notifications.entries), 1)
        notification = self.notifications.entries[0]
        self.assertIn("Karthik", notification["message"])
        self.assertIn("Study DSA", notification["message"])
        self.assertEqual(notification["title"], "Time for Study DSA")
        self.assertEqual(notification["type"], "habit_reminder")
        self.assertFalse(notification["read"])

    def test_completed_habit_today_is_not_reminded(self):
        self.habit["completed"] = True
        self.habit["completed_at"] = self.now

        self.assertEqual(self.process(), 0)
        self.assertEqual(self.notifications.entries, [])

    def test_completed_habit_on_previous_local_day_can_be_reminded(self):
        self.habit["completed"] = True
        self.habit["completed_at"] = datetime(2026, 10, 3, 13, 30, tzinfo=timezone.utc)

        self.assertEqual(self.process(), 1)

    def test_in_app_preference_can_disable_notifications(self):
        self.user["settings"]["in_app_notifications_enabled"] = False

        self.assertEqual(self.process(), 0)
        self.assertEqual(self.notifications.entries, [])

    def test_user_timezone_applies_to_habit_without_changing_its_time(self):
        self.user["settings"]["timezone"] = "America/New_York"
        self.assertEqual(self.habit["reminder_time"], "19:00")
        self.assertEqual(self.process(), 0)

        self.now = datetime(2026, 10, 4, 21, 30, tzinfo=timezone.utc)
        self.assertEqual(self.process(), 1)
        self.assertEqual(self.notifications.entries[0]["title"], "Time for Gym")
        self.assertEqual(self.second_habit["reminder_time"], "17:30")

        self.now = datetime(2026, 10, 4, 23, 0, tzinfo=timezone.utc)
        self.assertEqual(self.process(), 1)
        self.assertEqual(self.habit["reminder_time"], "19:00")
        self.assertEqual(len(self.notifications.entries), 2)

    def test_message_generator_uses_real_user_and_habit_names(self):
        message = generate_reminder_message("Karthik", "Study DSA", "Study")

        self.assertIn("Karthik", message)
        self.assertIn("Study DSA", message)


if __name__ == "__main__":
    unittest.main()