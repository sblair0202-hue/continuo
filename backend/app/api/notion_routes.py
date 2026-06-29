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


@router.post("/import")
def import_from_notion(db: Session = Depends(get_db), database_id: str = ""):
    """Pull accounts from Notion into Continuo. Skips accounts that already exist by name.
    Pass ?database_id=... to import from a specific database, otherwise uses NOTION_DATABASE_ID env var."""
    database_id = database_id or os.getenv("NOTION_DATABASE_ID", "")
    if not os.getenv("NOTION_TOKEN", ""):
        raise HTTPException(status_code=400, detail="NOTION_TOKEN not set")
    if not database_id:
        raise HTTPException(status_code=400, detail="NOTION_DATABASE_ID not set")

    try:
        notion_accounts = notion_service.import_accounts_from_notion(database_id)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Notion read failed: {e}")

    existing_names = {a.name.lower() for a in db.query(Account).all()}
    imported, skipped = 0, 0

    for data in notion_accounts:
        if data["name"].lower() in existing_names:
            skipped += 1
            continue
        account = Account(
            name=data["name"],
            status=data["status"],
            momentum=data["momentum"],
            next_action=data.get("next_action"),
            city=data.get("city"),
            state=data.get("state"),
        )
        db.add(account)
        existing_names.add(data["name"].lower())
        imported += 1

    db.commit()
    return {"imported": imported, "skipped": skipped, "total_in_notion": len(notion_accounts)}
