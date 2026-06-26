from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import Account, Activity, Contact, Task, VoiceJournalEntry
from app.schemas.voice_journal import (
    ApproveExtractionRequest,
    VoiceJournalCreate,
    VoiceJournalResponse,
)
from app.services.extraction_service import extract_field_intelligence

router = APIRouter()


def get_or_create_account(
    db: Session,
    name: str,
    city: str | None = None,
    state: str | None = None,
) -> Account:
    account = db.query(Account).filter(Account.name == name).first()
    if account:
        return account

    account = Account(name=name, city=city, state=state)
    db.add(account)
    db.commit()
    db.refresh(account)
    return account


@router.post("/voice-journal", response_model=VoiceJournalResponse)
def create_voice_journal(payload: VoiceJournalCreate, db: Session = Depends(get_db)):
    extraction = extract_field_intelligence(payload.transcript)
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


@router.get("/contacts")
def list_contacts(db: Session = Depends(get_db)):
    return db.query(Contact).all()


@router.get("/activities")
def list_activities(db: Session = Depends(get_db)):
    return db.query(Activity).order_by(Activity.activity_date.desc()).all()


@router.get("/tasks")
def list_tasks(db: Session = Depends(get_db)):
    return db.query(Task).all()
