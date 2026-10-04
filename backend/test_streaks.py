import unittest
from datetime import date, datetime, timedelta, timezone

from streaks import calculate_streaks


class CalculateStreaksTests(unittest.TestCase):
    def setUp(self):
        self.today = date(2026, 10, 4)

    def test_multiple_habits_on_one_day_count_as_one_streak_day(self):
        habits = [
            {"completion_dates": ["2026-10-04"]},
            {"completion_dates": ["2026-10-04"]},
            {"completion_dates": ["2026-10-04"]},
        ]

        self.assertEqual(calculate_streaks(habits, self.today), (1, 1))

    def test_gap_resets_current_streak_and_preserves_best(self):
        habits = [{"completion_dates": ["2026-10-01", "2026-10-02", "2026-10-04"]}]

        self.assertEqual(calculate_streaks(habits, self.today), (1, 2))

    def test_yesterdays_streak_remains_current_until_today_ends(self):
        habits = [{"completion_dates": ["2026-10-02", "2026-10-03"]}]

        self.assertEqual(calculate_streaks(habits, self.today), (2, 2))

    def test_completed_at_is_normalized_to_utc_day(self):
        completed_at = datetime(
            2026, 10, 3, 23, 30, tzinfo=timezone(timedelta(hours=-2))
        )
        habits = [{"completed": True, "completed_at": completed_at}]

        self.assertEqual(calculate_streaks(habits, self.today), (1, 1))

    def test_legacy_habit_without_completion_dates_is_safe(self):
        habits = [{"completed": True}, {"title": "Older habit"}]

        self.assertEqual(calculate_streaks(habits, self.today), (0, 0))


if __name__ == "__main__":
    unittest.main()