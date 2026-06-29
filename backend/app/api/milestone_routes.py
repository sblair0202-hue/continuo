from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import ActivityHistory, Milestone

router = APIRouter(prefix="/milestones", tags=["milestones"])


def _parse_date(date_str: str) -> datetime:
    try:
        return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid date: {date_str}. Use ISO format e.g. 2026-06-25")


@router.get("")
def list_milestones(account_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Milestone)
    if account_id is not None:
        q = q.filter(Milestone.account_id == account_id)
    return q.order_by(Milestone.date.asc()).all()


@router.post("")
def create_milestone(payload: dict, db: Session = Depends(get_db)):
    if not payload.get("date"):
        raise HTTPException(status_code=400, detail="date is required for milestones")
    date = _parse_date(payload["date"])

    milestone = Milestone(
        account_id=payload.get("account_id"),
        opportunity_id=payload.get("opportunity_id"),
        title=payload["title"],
        milestone_type=payload.get("milestone_type", "other"),
        date=date,
        notes=payload.get("notes"),
    )
    db.add(milestone)
    db.flush()

    # Auto-add to activity history so it appears in the account timeline
    hist = ActivityHistory(
        account_id=milestone.account_id,
        title=milestone.title,
        category=milestone.milestone_type,
        source="milestone",
        source_id=milestone.id,
        completed_at=date,
    )
    db.add(hist)
    db.commit()
    db.refresh(milestone)
    return milestone


@router.patch("/{milestone_id}")
def update_milestone(milestone_id: int, payload: dict, db: Session = Depends(get_db)):
    m = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Milestone not found")
    for field in ("title", "milestone_type", "notes", "opportunity_id"):
        if field in payload:
            setattr(m, field, payload[field])
    if "date" in payload:
        m.date = _parse_date(payload["date"])
    db.commit()
    return m


@router.delete("/{milestone_id}")
def delete_milestone(milestone_id: int, db: Session = Depends(get_db)):
    m = db.query(Milestone).filter(Milestone.id == milestone_id).first()
    if not m:
        raise HTTPException(status_code=404, detail="Milestone not found")
    db.delete(m)
    db.commit()
    return {"status": "deleted"}
