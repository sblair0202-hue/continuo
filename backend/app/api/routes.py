from datetime import datetime

from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import Account, Activity, Contact, Signal, Task, VoiceJournalEntry
from app.schemas.voice_journal import (
    ApproveExtractionRequest,
    VoiceJournalCreate,
    VoiceJournalResponse,
)
from app.services.field_intelligence_engine import extract_field_intelligence, extract_text_from_image

router = APIRouter()


_TERRITORY_ACCOUNTS = [
    {"name": "Ascension St. Vincent Rehab - Brownsburg",        "address": "1240 N Green St",                    "city": "Brownsburg",   "state": "IN", "zip": "46112", "phone": "317-415-6040", "fax": "317-415-6045"},
    {"name": "Ascension St. Vincent Rehab - Naab Rd",           "address": "8550 Naab Rd, Ste 100",              "city": "Indianapolis", "state": "IN", "zip": "46260", "phone": "317-338-3364", "fax": "317-338-6491"},
    {"name": "Franciscan Health Rehabilitation - South Emerson", "address": "8051 S Emerson Ave, Suite 100",      "city": "Indianapolis", "state": "IN", "zip": "46237", "phone": "317-508-4098", "fax": "317-528-6696"},
    {"name": "Franciscan Health Rehabilitation - North Meridian","address": "12188B N Meridian St, Ste 260",      "city": "Carmel",       "state": "IN", "zip": "46032", "phone": "317-528-8494", "fax": "317-528-6696"},
    {"name": "Franciscan Health Rehabilitation - Mooresville",   "address": "1201 Hadley Road",                   "city": "Mooresville",  "state": "IN", "zip": "46158", "phone": "317-834-4413", "fax": "317-528-6696"},
    {"name": "NeuroHope",                                        "address": "1300 E 96th St",                     "city": "Indianapolis", "state": "IN", "zip": "46240", "phone": "317-525-8386", "fax": "844-556-4672"},
    {"name": "Restorative Health and Wellness",                  "address": "10293 N Meridian St, Suite 200",     "city": "Indianapolis", "state": "IN", "zip": "46290", "phone": "317-505-1410", "fax": "463-306-1031"},
    {"name": "Physical Therapy & Rehab - Stones Crossing",       "address": "3000 State Rd 135, Suite 110",       "city": "Greenwood",    "state": "IN", "zip": "46143", "phone": "317-497-6000", "fax": "317-497-2514"},
    {"name": "Physical Therapy & Rehab - Neuro Specialty Clinic","address": "8051 S Emerson Ave, Suite 450",      "city": "Indianapolis", "state": "IN", "zip": "46237", "phone": "317-528-8111", "fax": "317-621-3004"},
    {"name": "IU Health Neurorehabilitation & Robotics",         "address": "355 W 16th St",                      "city": "Indianapolis", "state": "IN", "zip": "46202", "phone": "317-963-7050", "fax": "317-963-7055"},
    {"name": "Parkview Randallia Outpatient Therapy",            "address": "2200 Randallia Dr",                  "city": "Fort Wayne",   "state": "IN", "zip": "46805", "phone": "260-373-3202", "fax": "260-373-3223"},
    {"name": "Salience Neuro Rehab",                             "address": "8902 N Meridian St, Suite 200",      "city": "Indianapolis", "state": "IN", "zip": "46260", "phone": "812-998-6176", "fax": "812-901-6129"},
    {"name": "Rehab Without Walls - Greenwood",                  "address": "704 S State Rd 135, Suite D",        "city": "Greenwood",    "state": "IN", "zip": "46143", "phone": "317-324-3765", "fax": "317-324-3768"},
    # From email — Franciscan sites with full referral pathway
    {"name": "Franciscan Health Crawfordsville",                 "address": None,                                 "city": "Crawfordsville","state":"IN", "zip": None,    "phone": "765-362-6740", "fax": "765-362-6750",
     "referral_instructions": "OT eval and treat for Vivistim. Fax referral to (765) 362-6750. State: 'OT eval and treat for Vivistim.' Phone follow-up: (765) 362-6740.",
     "contacts": [
         {"name": "AJ Ehrlich",       "role": "Primary OT",   "discipline": "OT, CHT",  "email": "aj.ehrlich@franciscanalliance.org"},
         {"name": "Anna Kamhausen",   "role": "Primary OT",   "discipline": "COTA",     "email": "anna.kamhausen@franciscanalliance.org"},
         {"name": "Annare L Loubser", "role": "Supervisor",   "discipline": None,       "email": "annare.loubser@franciscanalliance.org"},
     ]},
    {"name": "Franciscan Health Lafayette",                      "address": None,                                 "city": "Lafayette",    "state": "IN", "zip": None,    "phone": None,           "fax": "765-423-6099",
     "referral_instructions": "OT eval and treat for Vivistim. Fax referral to (765) 423-6099.",
     "contacts": [
         {"name": "Adam Ewald",       "role": "Primary OT",   "discipline": "OT",       "email": "Adam.Ewald@franciscanalliance.org"},
         {"name": "Natalie Milakis",  "role": "Primary OT",   "discipline": "OT",       "email": "Natalie.Milakis@franciscanalliance.org"},
         {"name": "Erin P Charters",  "role": "Supervisor",   "discipline": None,       "email": "Erin.Charters@franciscanalliance.org"},
         {"name": "Annare L Loubser", "role": "Supervisor",   "discipline": None,       "email": "AnnareL.Loubser@franciscanalliance.org"},
     ]},
]

_DEFAULT_REFERRAL = "OT/PT Eval and treat for Vivistim"


@router.post("/admin/seed-territory")
def seed_territory(db: Session = Depends(get_db)):
    """Upsert Sarah's Indiana territory accounts with addresses, phone, fax, and referral info."""
    from sqlalchemy import func as _func
    upserted, contacts_added = 0, 0

    for data in _TERRITORY_ACCOUNTS:
        key = data["name"].lower()
        account = db.query(Account).filter(_func.lower(Account.name) == key).first()
        if not account:
            account = Account(name=data["name"], status="active", momentum="unknown")
            db.add(account)
            db.flush()

        if data.get("address") and not account.address:
            addr = data["address"]
            if data.get("zip"):
                addr += f", {data['city']}, {data['state']} {data['zip']}"
            account.address = addr
        if data.get("city") and not account.city:
            account.city = data["city"]
        if data.get("state") and not account.state:
            account.state = data["state"]
        if data.get("phone") and not account.phone:
            account.phone = data["phone"]
        if data.get("fax") and not account.fax:
            account.fax = data["fax"]
        if not account.referral_instructions:
            account.referral_instructions = data.get("referral_instructions", _DEFAULT_REFERRAL)

        for c_data in data.get("contacts", []):
            existing = db.query(Contact).filter(
                Contact.account_id == account.id,
                _func.lower(Contact.name) == c_data["name"].lower(),
            ).first()
            if not existing:
                db.add(Contact(
                    account_id=account.id,
                    name=c_data["name"],
                    role=c_data.get("role"),
                    discipline=c_data.get("discipline"),
                    email=c_data.get("email"),
                ))
                contacts_added += 1
        upserted += 1

    db.commit()
    return {"accounts_upserted": upserted, "contacts_added": contacts_added}


@router.get("/debug/anthropic")
def debug_anthropic():
    """No-auth: test Anthropic API key and model connectivity."""
    import os, traceback
    key = os.getenv("ANTHROPIC_API_KEY", "")
    result = {"key_set": bool(key), "key_prefix": key[:12] if key else None}
    try:
        import anthropic as _ant
        client = _ant.Anthropic(api_key=key)
        msg = client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=16,
            messages=[{"role": "user", "content": "Reply with the word OK."}],
        )
        result["api_ok"] = True
        result["response"] = msg.content[0].text.strip()
    except Exception:
        result["api_ok"] = False
        result["error"] = traceback.format_exc()
    return result


def get_or_create_account(
    db: Session,
    name: str,
    city: str | None = None,
    state: str | None = None,
) -> Account:
    from sqlalchemy import func
    account = db.query(Account).filter(func.lower(Account.name) == name.strip().lower()).first()
    if account:
        return account

    account = Account(name=name.strip(), city=city, state=state)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.get("/debug/db")
def debug_db(db: Session = Depends(get_db)):
    """No-auth diagnostic endpoint. Visit in browser to confirm database type and data counts."""
    import os
    from app.database import DATABASE_URL
    from app.models.domain import User, CalendarToken, EmailToken
    db_type = "postgresql" if "postgresql" in DATABASE_URL else "sqlite"
    live_env = os.environ.get("DATABASE_URL", "NOT_IN_PROCESS_ENV")
    return {
        "db_type": db_type,
        "db_url_prefix": DATABASE_URL[:40] + "...",
        "live_env_DATABASE_URL": live_env[:30] + "..." if len(live_env) > 30 else live_env,
        "GOOGLE_REDIRECT_URI": os.environ.get("GOOGLE_REDIRECT_URI", "NOT_SET"),
        "GMAIL_REDIRECT_URI": os.environ.get("GMAIL_REDIRECT_URI", "NOT_SET"),
        "GOOGLE_CLIENT_ID_set": bool(os.environ.get("GOOGLE_CLIENT_ID")),
        "accounts": db.query(Account).count(),
        "users": db.query(User).count(),
        "calendar_tokens": db.query(CalendarToken).count(),
        "email_tokens": db.query(EmailToken).count(),
    }


@router.get("/voice-journal/recent")
def list_recent_voice_journals(db: Session = Depends(get_db)):
    """Debug endpoint: returns the 10 most recent voice journal entries."""
    entries = db.query(VoiceJournalEntry).order_by(VoiceJournalEntry.id.desc()).limit(10).all()
    return [{"id": e.id, "reviewed": e.reviewed, "approved": e.approved, "created_at": str(e.created_at)} for e in entries]


@router.get("/voice-journal/queue")
def get_review_queue(db: Session = Depends(get_db)):
    """Return captures saved for later review (not yet approved)."""
    entries = (
        db.query(VoiceJournalEntry)
        .filter(VoiceJournalEntry.status == "pending_review", VoiceJournalEntry.approved == False)
        .order_by(VoiceJournalEntry.created_at.desc())
        .all()
    )
    return [
        {
            "id": e.id,
            "ai_summary": e.ai_summary,
            "preview": e.ai_extraction_json,  # stored extraction JSON for reopening review
            "source": e.source,
            "created_at": str(e.created_at),
        }
        for e in entries
    ]



@router.post("/extract-from-image")
def extract_from_image(payload: dict):
    image_base64 = payload.get("image_base64", "")
    media_type = payload.get("media_type", "image/jpeg")
    if not image_base64:
        raise HTTPException(status_code=400, detail="image_base64 is required")
    try:
        text = extract_text_from_image(image_base64, media_type)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    return {"extracted_text": text}


@router.post("/voice-journal", response_model=VoiceJournalResponse)
def create_voice_journal(payload: VoiceJournalCreate, db: Session = Depends(get_db)):
    import json as _json
    try:
        extraction = extract_field_intelligence(payload.transcript)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    entry = VoiceJournalEntry(
        user_id=payload.user_id,
        transcript=payload.transcript,
        ai_summary=extraction.summary,
        ai_extraction_json=_json.dumps(extraction.model_dump()),
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return VoiceJournalResponse(
        id=entry.id,
        transcript=entry.transcript,
        extraction_preview=extraction,
    )


@router.post("/voice-journal/{entry_id}/save-for-later")
def save_for_later(entry_id: int, db: Session = Depends(get_db)):
    """Mark entry as pending review without committing extracted objects."""
    entry = db.query(VoiceJournalEntry).filter(VoiceJournalEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Voice journal entry not found")
    entry.status = "pending_review"
    entry.reviewed = False
    db.commit()
    return {"status": "saved_for_later", "voice_journal_entry_id": entry.id}


@router.post("/voice-journal/{entry_id}/approve")
def approve_voice_journal(
    entry_id: int,
    payload: ApproveExtractionRequest,
    db: Session = Depends(get_db),
):
    entry = db.query(VoiceJournalEntry).filter(VoiceJournalEntry.id == entry_id).first()
    if not entry:
        raise HTTPException(status_code=404, detail="Voice journal entry not found")

    account_map: dict[str, Account] = {}

    for extracted_account in payload.extraction.accounts:
        account = get_or_create_account(
            db,
            extracted_account.name,
            extracted_account.city,
            extracted_account.state,
        )
        if extracted_account.status:
            account.status = extracted_account.status
        if extracted_account.momentum:
            account.momentum = extracted_account.momentum
        if extracted_account.next_action:
            account.next_action = extracted_account.next_action
        account.last_activity_at = datetime.utcnow()
        account_map[account.name] = account
        db.add(account)

    db.commit()

    for extracted_contact in payload.extraction.contacts:
        account = None
        if extracted_contact.account_name:
            account = account_map.get(extracted_contact.account_name) or db.query(Account).filter(
                Account.name == extracted_contact.account_name
            ).first()

        contact = db.query(Contact).filter(Contact.name == extracted_contact.name).first()
        if not contact:
            contact = Contact(name=extracted_contact.name)

        if account:
            contact.account_id = account.id

        contact.role = extracted_contact.role
        contact.discipline = extracted_contact.discipline
        contact.relationship_notes = extracted_contact.relationship_note
        contact.relationship_status = extracted_contact.relationship_status or "active"
        contact.champion_level = extracted_contact.champion_level or contact.champion_level
        contact.last_contacted_at = datetime.utcnow()
        db.add(contact)

    # Save activities and build account_name → activity map for signal linking
    activity_map: dict[str, Activity] = {}
    for extracted_activity in payload.extraction.activities:
        account = None
        if extracted_activity.account_name:
            account = account_map.get(extracted_activity.account_name) or db.query(Account).filter(
                Account.name == extracted_activity.account_name
            ).first()

        activity = Activity(
            account_id=account.id if account else None,
            voice_journal_entry_id=entry.id,
            activity_type=extracted_activity.activity_type,
            summary=extracted_activity.summary,
            details=extracted_activity.details,
            outcome=extracted_activity.outcome,
            momentum=extracted_activity.momentum,
            next_step=extracted_activity.next_step,
            confidence_score=extracted_activity.confidence_score,
        )
        db.add(activity)
        db.flush()  # Populate activity.id before signals reference it
        if extracted_activity.account_name:
            activity_map[extracted_activity.account_name] = activity

    for extracted_task in payload.extraction.tasks:
        account = None
        if extracted_task.account_name:
            account = account_map.get(extracted_task.account_name) or db.query(Account).filter(
                Account.name == extracted_task.account_name
            ).first()

        task = Task(
            account_id=account.id if account else None,
            title=extracted_task.title,
            description=extracted_task.description,
            priority=extracted_task.priority,
            task_type=extracted_task.task_type,
            source_type="voice",
            source_id=entry.id,
        )
        db.add(task)

    for extracted_signal in payload.extraction.signals:
        account = None
        linked_activity = None
        if extracted_signal.account_name:
            account = account_map.get(extracted_signal.account_name) or db.query(Account).filter(
                Account.name == extracted_signal.account_name
            ).first()
            linked_activity = activity_map.get(extracted_signal.account_name)

        signal = Signal(
            activity_id=linked_activity.id if linked_activity else None,
            account_id=account.id if account else None,
            signal_type=extracted_signal.signal_type,
            title=extracted_signal.title,
            summary=extracted_signal.summary,
            evidence_text=extracted_signal.evidence_text,
            confidence_score=extracted_signal.confidence_score,
            impact_level=extracted_signal.impact_level,
            urgency=extracted_signal.urgency,
            suggested_action=extracted_signal.suggested_action,
            status=extracted_signal.status,
        )
        db.add(signal)

    entry.reviewed = True
    entry.approved = True
    entry.status = "saved"
    db.add(entry)
    db.commit()

    return {"status": "approved", "voice_journal_entry_id": entry.id}


@router.get("/accounts")
def list_accounts(db: Session = Depends(get_db)):
    return db.query(Account).all()


@router.get("/accounts/{account_id}")
def get_account(account_id: int, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    return account


_ACCOUNT_EDITABLE = {
    "name", "city", "state", "status", "momentum", "next_action", "priority", "organization",
    # Sprint 7 referral fields
    "address", "phone", "fax", "website", "account_type",
    "referral_instructions", "scheduling_instructions",
    "referral_contact", "referral_email", "preferred_referral_method", "insurance_notes",
    "is_implant_center", "is_therapy_site", "is_evaluation_site",
    "vivistim_status", "pm_r_available", "neurosurgery_available",
}


@router.patch("/accounts/{account_id}")
def update_account(account_id: int, payload: dict, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")
    for field, value in payload.items():
        if field in _ACCOUNT_EDITABLE:
            setattr(account, field, value)
    db.commit()
    return account


@router.get("/contacts")
def list_contacts(db: Session = Depends(get_db)):
    return db.query(Contact).all()


@router.get("/activities")
def list_activities(account_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    q = db.query(Activity)
    if account_id is not None:
        q = q.filter(Activity.account_id == account_id)
    return q.order_by(Activity.activity_date.desc()).all()


@router.get("/tasks")
def list_tasks(account_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    q = db.query(Task)
    if account_id is not None:
        q = q.filter(Task.account_id == account_id)
    return q.all()


@router.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db)):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
    return {"status": "deleted"}


@router.patch("/tasks/{task_id}")
def update_task(task_id: int, payload: dict, db: Session = Depends(get_db)):
    from app.models.domain import ActivityHistory
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    for field in ("title", "description", "status", "priority", "category", "due_date", "opportunity_id"):
        if field in payload:
            setattr(task, field, payload[field])
    if payload.get("status") == "done":
        hist = ActivityHistory(
            account_id=task.account_id,
            title=task.title,
            category=task.category or task.task_type,
            source="task",
            source_id=task.id,
            completed_at=datetime.utcnow(),
        )
        db.add(hist)
    db.commit()
    return task


@router.get("/signals")
def list_signals(account_id: Optional[int] = Query(None), db: Session = Depends(get_db)):
    q = db.query(Signal)
    if account_id is not None:
        q = q.filter(Signal.account_id == account_id)
    return q.order_by(Signal.created_at.desc()).all()


@router.delete("/signals/{signal_id}")
def delete_signal(signal_id: int, db: Session = Depends(get_db)):
    signal = db.query(Signal).filter(Signal.id == signal_id).first()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    db.delete(signal)
    db.commit()
    return {"status": "deleted"}


VALID_STATUSES = {"new", "accepted", "active", "resolved", "rejected", "historical"}


@router.patch("/signals/{signal_id}/status")
def update_signal_status(signal_id: int, payload: dict, db: Session = Depends(get_db)):
    signal = db.query(Signal).filter(Signal.id == signal_id).first()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    new_status = payload.get("status")
    if new_status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {VALID_STATUSES}")
    signal.status = new_status
    db.commit()
    return {"id": signal_id, "status": signal.status}


@router.patch("/contacts/{contact_id}")
def update_contact(contact_id: int, payload: dict, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    for field in ("name", "role", "discipline", "phone", "relationship_notes", "champion_level", "relationship_status"):
        if field in payload:
            setattr(contact, field, payload[field])
    db.commit()
    return contact


@router.delete("/contacts/{contact_id}")
def delete_contact(contact_id: int, db: Session = Depends(get_db)):
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    db.delete(contact)
    db.commit()
    return {"status": "deleted"}


@router.patch("/signals/{signal_id}")
def update_signal(signal_id: int, payload: dict, db: Session = Depends(get_db)):
    signal = db.query(Signal).filter(Signal.id == signal_id).first()
    if not signal:
        raise HTTPException(status_code=404, detail="Signal not found")
    for field in ("title", "signal_type", "impact_level", "urgency", "suggested_action", "summary"):
        if field in payload:
            setattr(signal, field, payload[field])
    db.commit()
    return {"id": signal_id}
