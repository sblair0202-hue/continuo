from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import Account, CalendarToken, Contact, Signal
from app.services import calendar_service
from typing import Optional

from app.services.auth_service import get_current_user, get_optional_user

router = APIRouter(prefix="/calendar", tags=["calendar"])

@router.get("/connect")
def connect(user_id: str = "sarah"):
    """Open this in a browser to start the Google OAuth flow."""
    url = calendar_service.get_auth_url(user_id=user_id)
    return RedirectResponse(url)

@router.get("/debug-url")
def debug_auth_url(user_id: str = "sarah"):
    """Returns the OAuth URL without redirecting — for debugging."""
    return {"auth_url": calendar_service.get_auth_url(user_id=user_id)}


@router.get("/callback")
def callback(code: str, state: str | None = None, error: str | None = None, db: Session = Depends(get_db)):
    """Google redirects here after user approves access."""
    if error:
        return HTMLResponse(f"""
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>❌ Calendar connection cancelled</h2>
          <p>{error}</p><p>You can close this tab and try again from Continuo settings.</p>
        </body></html>
        """)
    try:
        token_data = calendar_service.exchange_code(code)
    except Exception as exc:
        return HTMLResponse(f"""
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>❌ Could not connect Calendar</h2>
          <p style="color:#888;font-size:13px">{exc}</p>
          <p>Close this tab and try again. Make sure your Google account is added as a test user in Google Cloud Console.</p>
        </body></html>
        """, status_code=400)

    # Extract user_id embedded in state (format: "uid:<user_id>:<random>")
    saved_user_id = "sarah"
    if state and state.startswith("uid:"):
        parts = state.split(":", 2)
        if len(parts) >= 2:
            saved_user_id = parts[1]

    token = db.query(CalendarToken).filter(CalendarToken.user_id == saved_user_id).first()
    if not token:
        token = CalendarToken(user_id=saved_user_id)
        db.add(token)

    token.access_token = token_data["access_token"]
    token.refresh_token = token_data["refresh_token"]
    token.token_uri = token_data["token_uri"]
    token.expiry = token_data["expiry"]
    token.scopes = token_data["scopes"]
    db.commit()

    return HTMLResponse("""
    <html><body style="font-family:sans-serif;padding:40px;text-align:center">
      <h2>✅ Google Calendar connected!</h2>
      <p>You can close this tab and return to Continuo.</p>
    </body></html>
    """)


@router.get("/status")
def status(user_id: Optional[str] = Depends(get_optional_user), db: Session = Depends(get_db)):
    if user_id:
        token = db.query(CalendarToken).filter(CalendarToken.user_id == user_id).first()
        if not token and user_id != "sarah":
            legacy = db.query(CalendarToken).filter(CalendarToken.user_id == "sarah").first()
            if legacy:
                legacy.user_id = user_id
                db.commit()
                token = legacy
    else:
        # No auth header — single-user fallback (Build #10 compat)
        token = db.query(CalendarToken).filter(CalendarToken.user_id == "sarah").first()
    return {"connected": token is not None}


@router.get("/today")
def today_events(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    token = db.query(CalendarToken).filter(CalendarToken.user_id == user_id).first()
    if not token:
        legacy = db.query(CalendarToken).filter(CalendarToken.user_id == "sarah").first()
        if legacy:
            legacy.user_id = user_id
            db.commit()
            token = legacy
    if not token:
        raise HTTPException(status_code=401, detail="Calendar not connected. Open Settings to connect Google Calendar.")

    try:
        events = calendar_service.fetch_today_events(token)
        db.add(token)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Google Calendar error: {e}")

    accounts = {a.name.lower(): a for a in db.query(Account).all()}
    contacts = db.query(Contact).all()

    enriched = []
    for event in events:
        matched_account = None
        for name, account in accounts.items():
            if name in event["title"].lower():
                matched_account = account
                break

        account_contacts = [c for c in contacts if c.account_id == matched_account.id] if matched_account else []
        signal_count = 0
        if matched_account:
            signal_count = db.query(Signal).filter(
                Signal.account_id == matched_account.id,
                Signal.status == "new"
            ).count()

        enriched.append({
            **event,
            "account_id": matched_account.id if matched_account else None,
            "account_name": matched_account.name if matched_account else None,
            "signal_count": signal_count,
            "contact_count": len(account_contacts),
        })

    return enriched


def _get_cal_token(db: Session, user_id: str):
    token = db.query(CalendarToken).filter(CalendarToken.user_id == user_id).first()
    if not token:
        legacy = db.query(CalendarToken).filter(CalendarToken.user_id == "sarah").first()
        if legacy:
            legacy.user_id = user_id
            db.commit()
            token = legacy
    return token


@router.post("/events")
def create_calendar_event(payload: dict, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a single calendar event. Body: {title, start, end?, location?, description?, all_day?}."""
    token = _get_cal_token(db, user_id)
    if not token:
        raise HTTPException(status_code=401, detail="Calendar not connected. Open Settings to connect Google Calendar.")
    if not payload.get("title") or not payload.get("start"):
        raise HTTPException(status_code=400, detail="title and start are required")
    try:
        created = calendar_service.create_event(token, payload)
        db.add(token); db.commit()
        return created
    except Exception as e:
        msg = str(e)
        if "insufficient" in msg.lower() or "scope" in msg.lower() or "403" in msg:
            raise HTTPException(status_code=403, detail="Calendar needs write access. Please reconnect Google Calendar in Settings.")
        raise HTTPException(status_code=502, detail=f"Could not create event: {e}")


@router.post("/events-from-schedule")
def events_from_schedule(payload: dict, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Parse a schedule (from OCR'd photo text or pasted text) into calendar events and create them.
    Body: {text, date?} where date is the schedule's day (YYYY-MM-DD) if not in the text."""
    import json as _json, os, anthropic as _ant
    from datetime import datetime as _dt
    token = _get_cal_token(db, user_id)
    if not token:
        raise HTTPException(status_code=401, detail="Calendar not connected.")
    text = (payload.get("text") or "").strip()
    if not text:
        raise HTTPException(status_code=400, detail="text is required")
    schedule_date = payload.get("date") or _dt.now().strftime("%Y-%m-%d")

    prompt = f"""Extract calendar appointments from this schedule text. The schedule is for {schedule_date} unless dates appear in the text.

Schedule:
{text}

Return a JSON array of events. Each event:
{{
  "title": "short title (patient initials or appt type; do NOT include full patient names for privacy)",
  "start": "ISO 8601 datetime like 2026-07-02T09:00:00",
  "end": "ISO 8601 datetime or null",
  "location": "location or null"
}}
Rules: infer times from the schedule. If only a time is given, use the schedule date. Use 24h reasoning but output ISO. Return [] if none. Return only valid JSON."""

    try:
        client = _ant.Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
        msg = client.messages.create(model="claude-haiku-4-5-20251001", max_tokens=2000,
                                      messages=[{"role": "user", "content": prompt}])
        raw = msg.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"): raw = raw[4:]
        raw = raw.strip().rstrip("`").strip()
        parsed = _json.loads(raw) if raw else []
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Could not parse schedule: {e}")

    created, failed = [], 0
    for ev in parsed:
        if not ev.get("title") or not ev.get("start"):
            continue
        try:
            created.append(calendar_service.create_event(token, ev))
        except Exception:
            failed += 1
    db.add(token); db.commit()
    return {"created": created, "created_count": len(created), "failed": failed, "parsed_count": len(parsed)}


@router.get("/meeting-prep/{event_id}")
def meeting_prep(event_id: str, account_id: int | None = None, user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    token = db.query(CalendarToken).filter(CalendarToken.user_id == user_id).first()
    if not token:
        raise HTTPException(status_code=401, detail="Calendar not connected.")

    events = calendar_service.fetch_today_events(token)
    event = next((e for e in events if e["id"] == event_id), None)
    if not event:
        raise HTTPException(status_code=404, detail="Event not found in today's calendar.")

    signals = []
    contacts = []
    account_name = None

    if account_id:
        account = db.query(Account).filter(Account.id == account_id).first()
        if account:
            account_name = account.name
            signals = db.query(Signal).filter(
                Signal.account_id == account_id,
                Signal.status == "new"
            ).all()
            contacts = db.query(Contact).filter(Contact.account_id == account_id).all()

    try:
        brief = calendar_service.generate_meeting_prep(event, signals, contacts, account_name)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Meeting prep generation failed: {e}")

    return {
        "event_id": event_id,
        "event_title": event["title"],
        "brief": brief,
        "signal_count": len(signals),
        "contact_count": len(contacts),
    }
