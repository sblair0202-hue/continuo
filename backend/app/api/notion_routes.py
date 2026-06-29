import os

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import Account, Signal
from app.services import notion_service

router = APIRouter(prefix="/notion", tags=["notion"])


@router.get("/status")
def status():
    token = os.getenv("NOTION_TOKEN", "")
    database_id = os.getenv("NOTION_DATABASE_ID", "")
    return {
        "connected": bool(token and database_id),
        "has_token": bool(token),
        "has_database": bool(database_id),
    }


@router.post("/sync")
def sync(db: Session = Depends(get_db)):
    token = os.getenv("NOTION_TOKEN", "")
    database_id = os.getenv("NOTION_DATABASE_ID", "")

    if not token:
        raise HTTPException(status_code=400, detail="NOTION_TOKEN not set in backend/.env")
    if not database_id:
        raise HTTPException(status_code=400, detail="NOTION_DATABASE_ID not set in backend/.env")

    accounts = db.query(Account).all()
    signals = db.query(Signal).all()

    if not accounts:
        return {"synced": 0, "errors": [], "message": "No accounts to sync"}

    try:
        result = notion_service.sync_accounts(accounts, signals)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Notion sync failed: {e}")

    return result
