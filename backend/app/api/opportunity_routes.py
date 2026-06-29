from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import Opportunity

router = APIRouter(prefix="/opportunities", tags=["opportunities"])


@router.get("")
def list_opportunities(account_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(Opportunity)
    if account_id is not None:
        q = q.filter(Opportunity.account_id == account_id)
    return q.order_by(Opportunity.created_at.desc()).all()


@router.post("")
def create_opportunity(payload: dict, db: Session = Depends(get_db)):
    opp = Opportunity(
        account_id=payload.get("account_id"),
        title=payload["title"],
        status=payload.get("status", "new"),
        probability=payload.get("probability"),
        next_action=payload.get("next_action"),
        owner=payload.get("owner"),
        notes=payload.get("notes"),
    )
    db.add(opp)
    db.commit()
    db.refresh(opp)
    return opp


@router.patch("/{opp_id}")
def update_opportunity(opp_id: int, payload: dict, db: Session = Depends(get_db)):
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    for field in ("title", "status", "probability", "next_action", "owner", "notes"):
        if field in payload:
            setattr(opp, field, payload[field])
    opp.last_activity_at = datetime.utcnow()
    db.commit()
    return opp


@router.delete("/{opp_id}")
def delete_opportunity(opp_id: int, db: Session = Depends(get_db)):
    opp = db.query(Opportunity).filter(Opportunity.id == opp_id).first()
    if not opp:
        raise HTTPException(status_code=404, detail="Opportunity not found")
    db.delete(opp)
    db.commit()
    return {"status": "deleted"}
