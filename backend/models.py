import re
from typing import Optional
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError
from pydantic import BaseModel, EmailStr, field_validator, model_validator


def validate_timezone(value: Optional[str]) -> Optional[str]:
    if value is None:
        return value

    try:
        ZoneInfo(value)
    except (ZoneInfoNotFoundError, ValueError) as error:
        raise ValueError("Use a valid IANA timezone, such as Asia/Kolkata") from error
    return value


def validate_reminder_time(value: Optional[str]) -> Optional[str]:
    if value is not None and not re.fullmatch(r"(?:[01]\d|2[0-3]):[0-5]\d", value):
        raise ValueError("Reminder time must use 24-hour HH:MM format")
    return value


class UserRegister(BaseModel):
    name: str
    email: EmailStr
    password: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class EmailVerification(BaseModel):
    token: str


class HabitCreate(BaseModel):
    title: str
    category: str
    completed: bool = False
    reminder_enabled: bool = False
    reminder_time: Optional[str] = None

    _validate_time = field_validator("reminder_time")(validate_reminder_time)

    @model_validator(mode="after")
    def require_time_for_enabled_reminder(self):
        if self.reminder_enabled and not self.reminder_time:
            raise ValueError("A reminder time is required when reminders are enabled")
        return self


class HabitUpdate(BaseModel):
    title: Optional[str] = None
    category: Optional[str] = None
    completed: Optional[bool] = None
    reminder_enabled: Optional[bool] = None
    reminder_time: Optional[str] = None

    _validate_time = field_validator("reminder_time")(validate_reminder_time)


class UserSettingsUpdate(BaseModel):
    in_app_notifications_enabled: Optional[bool] = None
    browser_notifications_enabled: Optional[bool] = None
    timezone: Optional[str] = None

    _validate_timezone = field_validator("timezone")(validate_timezone)
