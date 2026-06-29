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


@router.get("/voice-journal/recent")
def list_recent_voice_journals(db: Session = Depends(get_db)):
    """Debug endpoint: returns the 10 most recent voice journal entries."""
    entries = db.query(VoiceJournalEntry).order_by(VoiceJournalEntry.id.desc()).limit(10).all()
    return [{"id": e.id, "reviewed": e.reviewed, "approved": e.approved, "created_at": str(e.created_at)} for e in entries]


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
    try:
        extraction = extract_field_intelligence(payload.transcript)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc))
    entry = VoiceJournalEntry(
        user_id=payload.user_id,
        transcript=payload.transcript,
        ai_summary=extraction.summary,
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)

    return VoiceJournalResponse(
        id=entry.id,
        transcript=entry.transcript,
        extraction_preview=extraction,
    )


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
