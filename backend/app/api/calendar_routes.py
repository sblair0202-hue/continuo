from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import Account, CalendarToken, Contact, Signal
from app.services import calendar_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/calendar", tags=["calendar"])

_OAUTH_CALLBACK_USER = "sarah"  # browser-based OAuth flow has no JWT context


@router.get("/connect")
def connect():
    """Open this in a browser to start the Google OAuth flow."""
    url = calendar_service.get_auth_url()
    return RedirectResponse(url)


@router.get("/callback")
def callback(code: str, db: Session = Depends(get_db)):
    """Google redirects here after user approves access."""
    token_data = calendar_service.exchange_code(code)

    token = db.query(CalendarToken).filter(CalendarToken.user_id == _OAUTH_CALLBACK_USER).first()
    if not token:
        token = CalendarToken(user_id=_OAUTH_CALLBACK_USER)
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
def status(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    token = db.query(CalendarToken).filter(CalendarToken.user_id == user_id).first()
    return {"connected": token is not None}


@router.get("/today")
def today_events(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    token = db.query(CalendarToken).filter(CalendarToken.user_id == user_id).first()
    if not token:
        raise HTTPException(status_code=401, detail="Calendar not connected. Open http://localhost:8000/calendar/connect in your browser.")

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
