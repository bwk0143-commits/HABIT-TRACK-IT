import html
import json
import os
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


class EmailServiceConfigurationError(Exception):
    pass


class EmailDeliveryError(Exception):
    pass


def email_service_configured():
    return bool(os.getenv("RESEND_API_KEY") and os.getenv("FROM_EMAIL"))


def send_reminder_email(email: str, user_name: str, habit_name: str, message: str):
    api_key = os.getenv("RESEND_API_KEY")
    sender_email = os.getenv("FROM_EMAIL")
    if not api_key or not sender_email:
        raise EmailServiceConfigurationError(
            "Email reminders are not configured. Set RESEND_API_KEY and FROM_EMAIL on the backend."
        )

    escaped_message = html.escape(message).replace("\n", "<br>")
    escaped_name = html.escape(user_name)
    escaped_habit = html.escape(habit_name)
    payload = {
        "from": sender_email,
        "to": [email],
        "subject": f"⏰ Habit Reminder: {habit_name}",
        "html": (
            '<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;'
            'padding:28px;color:#17352a;background:#f3fbf5;border-radius:12px">'
            f"<p>Hey {escaped_name},</p>"
            "<p>It's time for your habit:</p>"
            f'<h2 style="color:#16784b">{escaped_habit}</h2>'
            f"<p>{escaped_message}</p>"
            "<p>Keep going! 🔥</p><p>— Habit Track</p></div>"
        ),
    }
    request = Request(
        "https://api.resend.com/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=15) as response:
            if response.status >= 300:
                raise EmailDeliveryError("The email provider rejected the reminder")
    except (HTTPError, URLError, TimeoutError) as error:
        raise EmailDeliveryError("Unable to deliver the reminder email") from error