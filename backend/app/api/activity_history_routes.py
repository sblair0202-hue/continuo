from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import ActivityHistory

router = APIRouter(prefix="/activity-history", tags=["activity-history"])


@router.get("")
def list_activity_history(account_id: int | None = None, db: Session = Depends(get_db)):
    q = db.query(ActivityHistory)
    if account_id is not None:
        q = q.filter(ActivityHistory.account_id == account_id)
    return q.order_by(ActivityHistory.completed_at.desc()).all()
