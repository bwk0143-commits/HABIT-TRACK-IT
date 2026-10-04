from datetime import date, datetime, timedelta, timezone


def _completion_date(value):
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).date()

    if isinstance(value, date):
        return value

    if isinstance(value, str):
        try:
            return date.fromisoformat(value[:10])
        except ValueError:
            return None

    return None


def completion_days(habit):
    days = set()
    stored_days = habit.get("completion_dates", [])

    if isinstance(stored_days, list):
        for value in stored_days:
            completion_day = _completion_date(value)
            if completion_day is not None:
                days.add(completion_day)

    if habit.get("completed") is True:
        completion_day = _completion_date(habit.get("completed_at"))
        if completion_day is not None:
            days.add(completion_day)

    return days


def calculate_streaks(habits, today=None):
    today = today or datetime.now(timezone.utc).date()
    activity_days = set()

    for habit in habits:
        activity_days.update(completion_days(habit))

    best_streak = 0
    run_length = 0
    previous_day = None

    for activity_day in sorted(activity_days):
        if previous_day is not None and activity_day == previous_day + timedelta(days=1):
            run_length += 1
        else:
            run_length = 1

        best_streak = max(best_streak, run_length)
        previous_day = activity_day

    anchor_day = today if today in activity_days else today - timedelta(days=1)
    current_streak = 0

    while anchor_day in activity_days:
        current_streak += 1
        anchor_day -= timedelta(days=1)

    return current_streak, best_streak