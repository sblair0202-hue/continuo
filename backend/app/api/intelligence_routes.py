"""
Sprint 8: Territory Intelligence API endpoints.
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db
from app.models.domain import (
    Account, Contact, Signal, Task, Opportunity,
)
from app.services.intelligence_service import (
    generate_account_snapshot,
    generate_visit_brief,
    build_territory_context,
    ask_territory,
    generate_weekly_brief,
)

router = APIRouter(tags=["intelligence"])


# ── Account Snapshot ──────────────────────────────────────────────────────────

@router.get("/accounts/{account_id}/snapshot")
def account_snapshot(account_id: int, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    contacts = db.query(Contact).filter(Contact.account_id == account_id).all()
    signals = db.query(Signal).filter(Signal.account_id == account_id).all()
    opps = db.query(Opportunity).filter(Opportunity.account_id == account_id).all()
    tasks = db.query(Task).filter(Task.account_id == account_id).all()

    text = generate_account_snapshot(account, contacts, signals, opps, tasks)
    return {"account_id": account_id, "snapshot": text}


# ── Visit Brief ───────────────────────────────────────────────────────────────

@router.get("/accounts/{account_id}/visit-brief")
def visit_brief(account_id: int, db: Session = Depends(get_db)):
    account = db.query(Account).filter(Account.id == account_id).first()
    contacts = db.query(Contact).filter(Contact.account_id == account_id).all()
    signals = db.query(Signal).filter(Signal.account_id == account_id).all()
    tasks = db.query(Task).filter(Task.account_id == account_id).all()
    opps = db.query(Opportunity).filter(Opportunity.account_id == account_id).all()

    items = generate_visit_brief(account, contacts, signals, tasks, opps)
    return {"account_id": account_id, "account_name": account.name, "items": items}


# ── Ask Continuo ──────────────────────────────────────────────────────────────

@router.post("/ask")
def ask(body: dict, db: Session = Depends(get_db)):
    question = body.get("question", "").strip()
    if not question:
        return {"answer": "Please ask a question.", "question": question}

    accounts = db.query(Account).all()
    contacts = db.query(Contact).all()
    signals = db.query(Signal).filter(Signal.status.in_(["new", "active", "accepted"])).all()
    tasks = db.query(Task).filter(Task.status != "done").all()
    opps = db.query(Opportunity).all()

    ctx = build_territory_context(accounts, contacts, signals, tasks, opps)
    answer = ask_territory(question, ctx)
    return {"question": question, "answer": answer}


# ── Smart Search ──────────────────────────────────────────────────────────────

@router.get("/search")
def search(q: str, db: Session = Depends(get_db)):
    if not q or len(q.strip()) < 2:
        return {"accounts": [], "contacts": [], "signals": [], "tasks": []}

    term = f"%{q.strip()}%"

    accounts = db.query(Account).filter(
        or_(
            Account.name.ilike(term),
            Account.organization.ilike(term),
            Account.city.ilike(term),
            Account.next_action.ilike(term),
            Account.referral_instructions.ilike(term),
        )
    ).limit(20).all()

    contacts = db.query(Contact).filter(
        or_(
            Contact.name.ilike(term),
            Contact.role.ilike(term),
            Contact.discipline.ilike(term),
            Contact.relationship_notes.ilike(term),
        )
    ).limit(20).all()

    signals = db.query(Signal).filter(
        or_(
            Signal.title.ilike(term),
            Signal.summary.ilike(term),
            Signal.suggested_action.ilike(term),
            Signal.evidence_text.ilike(term),
        )
    ).filter(Signal.status.in_(["new", "active", "accepted"])).limit(20).all()

    tasks = db.query(Task).filter(
        or_(
            Task.title.ilike(term),
            Task.description.ilike(term),
        )
    ).filter(Task.status != "done").limit(20).all()

    # Build account name lookup once — avoid N+1 queries
    contact_acct_ids = {c.account_id for c in contacts if c.account_id}
    task_acct_ids = {t.account_id for t in tasks if t.account_id}
    extra_ids = (contact_acct_ids | task_acct_ids) - {a.id for a in accounts}
    acct_name_map: dict[int, str] = {a.id: a.name for a in accounts}
    if extra_ids:
        extra = db.query(Account).filter(Account.id.in_(extra_ids)).all()
        acct_name_map.update({a.id: a.name for a in extra})

    return {
        "accounts": [
            {"id": a.id, "name": a.name, "city": a.city, "state": a.state,
             "momentum": a.momentum, "next_action": a.next_action}
            for a in accounts
        ],
        "contacts": [
            {"id": c.id, "name": c.name, "role": c.role, "discipline": c.discipline,
             "account_id": c.account_id, "phone": c.phone,
             "account_name": acct_name_map.get(c.account_id) if c.account_id else None}
            for c in contacts
        ],
        "signals": [
            {"id": s.id, "title": s.title, "signal_type": s.signal_type,
             "impact_level": s.impact_level, "account_id": s.account_id,
             "summary": s.summary, "suggested_action": s.suggested_action}
            for s in signals
        ],
        "tasks": [
            {"id": t.id, "title": t.title, "priority": t.priority,
             "account_id": t.account_id, "due_date": t.due_date,
             "account_name": acct_name_map.get(t.account_id) if t.account_id else None}
            for t in tasks
        ],
    }


# ── Weekly Brief ──────────────────────────────────────────────────────────────

@router.get("/weekly-brief")
def weekly_brief(db: Session = Depends(get_db)):
    accounts = db.query(Account).all()
    signals = db.query(Signal).all()
    tasks = db.query(Task).all()
    opps = db.query(Opportunity).all()

    from datetime import datetime
    text = generate_weekly_brief(signals, tasks, accounts, opps)
    return {
        "brief": text,
        "generated_at": datetime.utcnow().isoformat(),
        "account_count": len(accounts),
        "signal_count": len([s for s in signals if s.status == "new"]),
        "task_count": len([t for t in tasks if t.status != "done"]),
        "opportunity_count": len([o for o in opps if o.status not in ("won", "lost")]),
    }
