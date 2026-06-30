import json
import os
from datetime import datetime, timezone

from google.oauth2.credentials import Credentials
from google.auth.transport.requests import Request
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"]

CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv("GOOGLE_WEB_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.getenv("GOOGLE_WEB_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET", ""),
        "redirect_uris": [os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/calendar/callback")],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
}

REDIRECT_URI = os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/calendar/callback")

_CLIENT_ID     = lambda: os.getenv("GOOGLE_WEB_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID", "")
_CLIENT_SECRET = lambda: os.getenv("GOOGLE_WEB_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET", "")


def get_auth_url(user_id: str = "sarah") -> str:
    import secrets, urllib.parse
    state = f"uid:{user_id}:{secrets.token_urlsafe(16)}"
    params = {
        "client_id":     _CLIENT_ID(),
        "redirect_uri":  REDIRECT_URI,
        "response_type": "code",
        "scope":         " ".join(SCOPES),
        "access_type":   "offline",
        "prompt":        "consent",
        "state":         state,
    }
    return "https://accounts.google.com/o/oauth2/auth?" + urllib.parse.urlencode(params)


def exchange_code(code: str) -> dict:
    import requests as _req
    resp = _req.post("https://oauth2.googleapis.com/token", data={
        "code":          code,
        "client_id":     _CLIENT_ID(),
        "client_secret": _CLIENT_SECRET(),
        "redirect_uri":  REDIRECT_URI,
        "grant_type":    "authorization_code",
    })
    if not resp.ok:
        raise ValueError(f"Token exchange failed: {resp.text}")
    data = resp.json()
    from datetime import timedelta as _td
    expiry = datetime.utcnow() + _td(seconds=data.get("expires_in", 3600))
    return {
        "access_token":  data["access_token"],
        "refresh_token": data.get("refresh_token"),
        "token_uri":     "https://oauth2.googleapis.com/token",
        "scopes":        json.dumps(SCOPES),
        "expiry":        expiry,
    }


def _build_credentials(token_row) -> Credentials:
    scopes = json.loads(token_row.scopes) if token_row.scopes else SCOPES
    creds = Credentials(
        token=token_row.access_token,
        refresh_token=token_row.refresh_token,
        token_uri=token_row.token_uri or "https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_WEB_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID", ""),
        client_secret=os.getenv("GOOGLE_WEB_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET", ""),
        scopes=scopes,
    )
    if token_row.expiry:
        creds.expiry = token_row.expiry.replace(tzinfo=timezone.utc)
    return creds


def refresh_if_needed(token_row) -> Credentials:
    creds = _build_credentials(token_row)
    if creds.expired and creds.refresh_token:
        creds.refresh(Request())
        token_row.access_token = creds.token
        token_row.expiry = creds.expiry.replace(tzinfo=None) if creds.expiry else None
    return creds


def fetch_today_events(token_row) -> list[dict]:
    creds = refresh_if_needed(token_row)
    service = build("calendar", "v3", credentials=creds)

    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    end_of_day = now.replace(hour=23, minute=59, second=59, microsecond=0)

    result = service.events().list(
        calendarId="primary",
        timeMin=start_of_day.isoformat(),
        timeMax=end_of_day.isoformat(),
        singleEvents=True,
        orderBy="startTime",
    ).execute()

    events = []
    for item in result.get("items", []):
        start = item.get("start", {})
        end = item.get("end", {})
        attendees = [
            a.get("displayName") or a.get("email", "")
            for a in item.get("attendees", [])
            if not a.get("self")
        ]
        events.append({
            "id": item["id"],
            "title": item.get("summary", "(No title)"),
            "start": start.get("dateTime") or start.get("date"),
            "end": end.get("dateTime") or end.get("date"),
            "location": item.get("location"),
            "attendees": attendees,
            "description": item.get("description"),
            "html_link": item.get("htmlLink"),
        })

    return events


def generate_meeting_prep(event: dict, signals: list, contacts: list, account_name: str | None) -> str:
    import anthropic

    signal_lines = "\n".join(
        f"- [{s.signal_type.upper()}] {s.title}" + (f" → {s.suggested_action}" if s.suggested_action else "")
        for s in signals[:10]
    )
    contact_lines = "\n".join(
        f"- {c.name}" + (f" ({c.role})" if c.role else "") + (f" — {c.relationship_notes}" if c.relationship_notes else "")
        for c in contacts[:5]
    )
    attendee_str = ", ".join(event.get("attendees", [])) or "None listed"

    prompt = f"""You are an AI Chief of Staff preparing a concise meeting brief for a medical device sales rep.

Meeting: {event['title']}
Time: {event['start']}
Account: {account_name or 'Unknown'}
Attendees: {attendee_str}

Active signals for this account:
{signal_lines or 'None'}

Known contacts:
{contact_lines or 'None'}

Write a 3-5 sentence meeting brief covering:
1. The current situation at this account (momentum, key signals)
2. Who will be in the room and what matters to them
3. The single most important thing to accomplish in this meeting

Be direct and specific. Write as if briefing someone 5 minutes before they walk in."""

    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=400,
        messages=[{"role": "user", "content": prompt}],
    )
    return message.content[0].text
