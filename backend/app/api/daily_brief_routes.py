from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import Account, CalendarToken, Signal, Task
from app.services import calendar_service, daily_brief_service
from app.services.auth_service import get_current_user

router = APIRouter(prefix="/daily-brief", tags=["daily-brief"])


@router.get("")
def get_daily_brief(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    signals = db.query(Signal).all()
    tasks = db.query(Task).all()
    accounts = db.query(Account).all()

    meetings = []
    token = db.query(CalendarToken).filter(CalendarToken.user_id == user_id).first()
    if token:
        try:
            events = calendar_service.fetch_today_events(token)
            db.add(token)
            db.commit()
            meetings = events
        except Exception:
            pass

    high_signals = [s for s in signals if s.status == "new" and s.impact_level in ("high", "medium")]
    open_tasks = [t for t in tasks if t.status == "open" and t.priority == "high"]

    # Only show empty state when there are truly no accounts at all
    if not accounts and not meetings:
        return {
            "brief": "Add your first account to get started — or tap the Orb and speak a recap from today.",
            "generated_at": datetime.utcnow().isoformat(),
            "signal_count": 0,
            "task_count": 0,
            "meeting_count": 0,
            "has_meetings": False,
        }

    try:
        brief_text = daily_brief_service.generate_daily_brief(signals, tasks, meetings, accounts)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Brief generation failed: {e}")

    return {
        "brief": brief_text,
        "generated_at": datetime.utcnow().isoformat(),
        "signal_count": len(high_signals),
        "task_count": len(open_tasks),
        "meeting_count": len(meetings),
        "has_meetings": len(meetings) > 0,
    }
