"""Salesforce read-only sync (Phase B). OAuth connect + pull accounts/contacts/tasks
for context and matching. No write-back yet."""
from fastapi import APIRouter, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session
from sqlalchemy import func as _func
from typing import Optional

from app.database import get_db
from app.models.domain import Account, Contact, SalesforceToken
from app.services.crm import salesforce
from app.services import email_service  # reuse find_matching_account / fuzzy key
from app.services.auth_service import get_optional_user

router = APIRouter(prefix="/salesforce", tags=["salesforce"])


@router.get("/status")
def status(user_id: Optional[str] = Depends(get_optional_user), db: Session = Depends(get_db)):
    uid = user_id or "sarah"
    token = db.query(SalesforceToken).filter(SalesforceToken.user_id == uid).first()
    if not token:
        token = db.query(SalesforceToken).first()
    return {"connected": token is not None, "configured": salesforce.is_configured()}


@router.get("/connect")
def connect(user_id: str = "sarah"):
    if not salesforce.is_configured():
        return HTMLResponse(
            "<html><body style='font-family:sans-serif;padding:40px'>"
            "<h2>Salesforce not configured</h2><p>Set SALESFORCE_CLIENT_ID / SECRET / REDIRECT_URI in Railway first.</p>"
            "</body></html>", status_code=400)
    return RedirectResponse(salesforce.get_auth_url(user_id=user_id))


@router.get("/callback")
def callback(code: str, state: str | None = None, error: str | None = None, db: Session = Depends(get_db)):
    if error:
        return HTMLResponse(f"<html><body style='font-family:sans-serif;padding:40px'><h2>Salesforce connection cancelled</h2><p>{error}</p></body></html>")
    try:
        data = salesforce.exchange_code(code, state)
    except Exception as exc:
        return HTMLResponse(f"<html><body style='font-family:sans-serif;padding:40px'><h2>Could not connect Salesforce</h2><p style='color:#888'>{exc}</p></body></html>", status_code=400)

    uid = "sarah"
    if state and state.startswith("uid:"):
        parts = state.split(":", 2)
        if len(parts) >= 2:
            uid = parts[1]

    token = db.query(SalesforceToken).filter(SalesforceToken.user_id == uid).first()
    if not token:
        token = SalesforceToken(user_id=uid)
        db.add(token)
    token.access_token = data["access_token"]
    token.refresh_token = data["refresh_token"]
    token.instance_url = data["instance_url"]
    token.token_uri = data["token_uri"]
    token.expiry = data["expiry"]
    token.scopes = data["scopes"]
    db.commit()
    return HTMLResponse("<html><body style='font-family:sans-serif;padding:40px;text-align:center'><h2>Salesforce connected</h2><p>You can close this tab and run a sync from Continuo.</p></body></html>")


@router.post("/sync")
def sync(user_id: Optional[str] = Depends(get_optional_user), db: Session = Depends(get_db)):
    """Read-only: pull SF accounts/contacts and link them to Continuo records.
    Links by stored Salesforce id first, then fuzzy name match; creates missing
    accounts. Never writes to Salesforce."""
    uid = user_id or "sarah"
    token = db.query(SalesforceToken).filter(SalesforceToken.user_id == uid).first()
    if not token:
        token = db.query(SalesforceToken).first()
    if not token:
        return {"error": "Salesforce not connected"}

    accounts_linked = accounts_created = contacts_linked = contacts_created = 0

    sf_accounts = salesforce.list_accounts(token)
    all_accounts = db.query(Account).all()
    sf_to_account: dict[str, Account] = {}

    for sf in sf_accounts:
        acct = next((a for a in all_accounts if a.salesforce_account_id == sf["external_id"]), None)
        if not acct:
            acct = email_service.find_matching_account(sf["name"] or "", all_accounts)
        if not acct:
            acct = Account(name=sf["name"], status="active", momentum="unknown",
                           city=sf.get("city"), state=sf.get("state"), phone=sf.get("phone"))
            db.add(acct); db.flush()
            all_accounts.append(acct)
            accounts_created += 1
        if acct.salesforce_account_id != sf["external_id"]:
            acct.salesforce_account_id = sf["external_id"]
            accounts_linked += 1
        sf_to_account[sf["external_id"]] = acct
    db.commit()

    for sf in salesforce.list_contacts(token):
        acct = sf_to_account.get(sf.get("account_external_id") or "")
        existing = None
        if sf.get("email"):
            existing = db.query(Contact).filter(_func.lower(Contact.email) == sf["email"].lower()).first()
        if not existing and sf.get("external_id"):
            existing = db.query(Contact).filter(Contact.salesforce_contact_id == sf["external_id"]).first()
        if existing:
            if not existing.salesforce_contact_id:
                existing.salesforce_contact_id = sf["external_id"]
                contacts_linked += 1
            if acct and not existing.account_id:
                existing.account_id = acct.id
        else:
            db.add(Contact(
                account_id=acct.id if acct else None,
                name=sf.get("name") or "(unknown)",
                email=sf.get("email"), phone=sf.get("phone"), role=sf.get("title"),
                salesforce_contact_id=sf.get("external_id"),
            ))
            contacts_created += 1
    db.commit()

    return {
        "accounts_created": accounts_created,
        "accounts_linked": accounts_linked,
        "contacts_created": contacts_created,
        "contacts_linked": contacts_linked,
    }
