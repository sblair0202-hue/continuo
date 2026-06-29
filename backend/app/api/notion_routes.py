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

    existing_accounts = {a.name.lower(): a for a in db.query(Account).all()}
    imported, updated, skipped = 0, 0, 0

    _REFERRAL_FIELDS = (
        "address", "phone", "fax", "website", "account_type",
        "referral_instructions", "scheduling_instructions",
        "referral_contact", "referral_email", "preferred_referral_method",
        "insurance_notes", "vivistim_status",
    )

    for data in notion_accounts:
        key = data["name"].lower()
        if key in existing_accounts:
            # Update referral/contact fields on the existing account
            account = existing_accounts[key]
            changed = False
            for field in _REFERRAL_FIELDS:
                val = data.get(field)
                if val and not getattr(account, field, None):
                    setattr(account, field, val)
                    changed = True
            # Also update city/state if missing
            for field in ("city", "state", "next_action", "status"):
                val = data.get(field)
                if val and not getattr(account, field, None):
                    setattr(account, field, val)
                    changed = True
            if changed:
                db.add(account)
                updated += 1
            else:
                skipped += 1
            continue

        account = Account(
            name=data["name"],
            status=data.get("status") or "prospect",
            momentum=data.get("momentum") or "unknown",
            next_action=data.get("next_action"),
            city=data.get("city"),
            state=data.get("state"),
            address=data.get("address"),
            phone=data.get("phone"),
            fax=data.get("fax"),
            website=data.get("website"),
            account_type=data.get("account_type"),
            referral_instructions=data.get("referral_instructions"),
            scheduling_instructions=data.get("scheduling_instructions"),
            referral_contact=data.get("referral_contact"),
            referral_email=data.get("referral_email"),
            preferred_referral_method=data.get("preferred_referral_method"),
            insurance_notes=data.get("insurance_notes"),
            vivistim_status=data.get("vivistim_status"),
        )
        db.add(account)
        existing_accounts[key] = account
        imported += 1

    db.commit()
    return {
        "imported": imported,
        "updated": updated,
        "skipped": skipped,
        "total_in_notion": len(notion_accounts),
    }
