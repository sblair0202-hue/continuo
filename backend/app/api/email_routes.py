import re
import time

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import HTMLResponse, RedirectResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.domain import Account, Contact, EmailToken, Signal, Task
from app.services.email_service import extract_account_data_from_emails
from app.services import email_service
from typing import Optional

from app.services.auth_service import get_current_user, get_optional_user

router = APIRouter(prefix="/email", tags=["email"])

# Simple in-memory cache: account_id → (fetched_at, results)
_thread_cache: dict[int, tuple[float, list]] = {}
_CACHE_TTL = 900  # 15 minutes


@router.get("/debug-scan")
def debug_scan(db: Session = Depends(get_db)):
    """No-auth diagnostic — shows scan step results for troubleshooting."""
    import traceback, os
    result: dict = {}
    token = db.query(EmailToken).filter(EmailToken.user_id == "sarah").first()
    if not token:
        token = db.query(EmailToken).first()
    result["token_found"] = token is not None
    result["token_user_id"] = token.user_id if token else None
    result["GOOGLE_CLIENT_ID_set"] = bool(os.getenv("GOOGLE_CLIENT_ID"))
    result["ANTHROPIC_API_KEY_set"] = bool(os.getenv("ANTHROPIC_API_KEY"))
    if not token:
        return result
    try:
        emails = email_service.fetch_recent_emails(token, hours=48)
        result["emails_fetched"] = len(emails)
        result["fetch_ok"] = True
    except Exception as e:
        result["fetch_ok"] = False
        result["fetch_error"] = traceback.format_exc()
        return result
    try:
        extracted = extract_account_data_from_emails(emails[:3])
        result["extract_ok"] = True
        result["extracted_count"] = len(extracted)
    except Exception as e:
        result["extract_ok"] = False
        result["extract_error"] = traceback.format_exc()
    return result


@router.get("/connect")
def connect(user_id: str = "sarah"):
    """Open in browser to start Gmail OAuth flow."""
    url = email_service.get_auth_url(user_id=user_id)
    return RedirectResponse(url)


@router.get("/callback")
def callback(code: str, state: str | None = None, error: str | None = None, db: Session = Depends(get_db)):
    if error:
        return HTMLResponse(f"""
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>❌ Gmail connection cancelled</h2>
          <p>{error}</p><p>Close this tab and try again from Continuo settings.</p>
        </body></html>
        """)
    try:
        token_data = email_service.exchange_code(code)
    except Exception as exc:
        return HTMLResponse(f"""
        <html><body style="font-family:sans-serif;padding:40px;text-align:center">
          <h2>❌ Could not connect Gmail</h2>
          <p style="color:#888;font-size:13px">{exc}</p>
          <p>Close this tab and try again. Make sure your Google account is added as a test user in Google Cloud Console.</p>
        </body></html>
        """, status_code=400)

    # Extract user_id embedded in state (format: "uid:<user_id>:<random>")
    saved_user_id = "sarah"
    if state and state.startswith("uid:"):
        parts = state.split(":", 2)
        if len(parts) >= 2:
            saved_user_id = parts[1]

    token = db.query(EmailToken).filter(EmailToken.user_id == saved_user_id).first()
    if not token:
        token = EmailToken(user_id=saved_user_id)
        db.add(token)

    token.access_token = token_data["access_token"]
    token.refresh_token = token_data["refresh_token"]
    token.token_uri = token_data["token_uri"]
    token.expiry = token_data["expiry"]
    token.scopes = token_data["scopes"]
    db.commit()

    return HTMLResponse("""
    <html><body style="font-family:sans-serif;padding:40px;text-align:center">
      <h2>✅ Gmail connected!</h2>
      <p>Continuo can now scan your inbox for field intelligence. You can close this tab.</p>
    </body></html>
    """)


@router.get("/status")
def status(user_id: Optional[str] = Depends(get_optional_user), db: Session = Depends(get_db)):
    if user_id:
        token = db.query(EmailToken).filter(EmailToken.user_id == user_id).first()
        if not token and user_id != "sarah":
            legacy = db.query(EmailToken).filter(EmailToken.user_id == "sarah").first()
            if legacy:
                legacy.user_id = user_id
                db.commit()
                token = legacy
    else:
        # No auth header — single-user fallback (Build #10 compat)
        token = db.query(EmailToken).filter(EmailToken.user_id == "sarah").first()
    return {"connected": token is not None}


def _parse_from(raw: str) -> tuple[str, str]:
    """Split 'Name <email>' into (name, email)."""
    m = re.match(r'^"?([^"<]+?)"?\s*<([^>]+)>', raw)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return raw.strip(), raw.strip()


@router.get("/threads")
def get_account_threads(account_id: int = Query(...), user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Fetch recent emails relevant to a specific account."""
    token = db.query(EmailToken).filter(EmailToken.user_id == user_id).first()
    if not token:
        raise HTTPException(status_code=401, detail="Gmail not connected")

    # Serve from cache if fresh
    cached = _thread_cache.get(account_id)
    if cached and (time.time() - cached[0]) < _CACHE_TTL:
        return cached[1]

    account = db.query(Account).filter(Account.id == account_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Account not found")

    # Build search terms from account name + contact names
    contacts = db.query(Contact).filter(Contact.account_id == account_id).all()
    search_terms = [f'"{account.name}"']
    for c in contacts[:4]:
        search_terms.append(f'"{c.name}"')
    query_str = " OR ".join(search_terms)

    try:
        raw_emails = email_service.fetch_recent_emails(token, hours=720, query_override=query_str)
        db.add(token)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gmail error: {e}")

    results = []
    for e in raw_emails[:8]:
        name, email_addr = _parse_from(e.get("from", ""))
        results.append({
            "id": e["id"],
            "from_name": name or email_addr,
            "from_email": email_addr,
            "subject": e.get("subject", "(No subject)"),
            "date": e.get("date", ""),
            "snippet": e.get("snippet", ""),
            "body_excerpt": e.get("body", "")[:600],
        })

    _thread_cache[account_id] = (time.time(), results)
    return results


@router.post("/extract-signals")
def extract_signals(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    token = db.query(EmailToken).filter(EmailToken.user_id == user_id).first()
    if not token:
        raise HTTPException(
            status_code=401,
            detail="Gmail not connected. Open Settings → Integrations to connect Gmail."
        )

    accounts = db.query(Account).all()

    try:
        emails = email_service.fetch_recent_emails(token)
        db.add(token)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gmail fetch error: {e}")

    if not emails:
        return {"extracted": 0, "signals": []}

    try:
        raw_signals = email_service.extract_signals_from_emails(emails, accounts)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Signal extraction failed: {e}")

    account_map = {a.name.lower(): a for a in accounts}
    saved = []

    for rs in raw_signals:
        account = None
        if rs.get("account_name"):
            account = account_map.get(rs["account_name"].lower())

        signal = Signal(
            account_id=account.id if account else None,
            signal_type=rs.get("signal_type", "continuity"),
            title=rs.get("title", "Email signal"),
            summary=rs.get("summary"),
            evidence_text=rs.get("evidence_text"),
            confidence_score=float(rs.get("confidence_score", 0.7)),
            impact_level=rs.get("impact_level", "medium"),
            urgency=rs.get("urgency", "low"),
            suggested_action=rs.get("suggested_action"),
            status="new",
        )
        db.add(signal)
        saved.append({
            "title": signal.title,
            "signal_type": signal.signal_type,
            "account_name": account.name if account else None,
            "impact_level": signal.impact_level,
        })

    db.commit()

    return {"extracted": len(saved), "signals": saved}


@router.post("/scan-accounts")
def scan_accounts(user_id: str = Depends(get_current_user), db: Session = Depends(get_db)):
    """Scan Gmail for account contact data (fax, phone, referral instructions, contacts) and merge into Accounts."""
    token = db.query(EmailToken).filter(EmailToken.user_id == user_id).first()
    if not token:
        legacy = db.query(EmailToken).filter(EmailToken.user_id == "sarah").first()
        if legacy:
            legacy.user_id = user_id
            db.commit()
            token = legacy
    if not token:
        raise HTTPException(status_code=401, detail="Gmail not connected. Open Settings → Integrations to connect Gmail.")

    try:
        emails = email_service.fetch_recent_emails(token, hours=4320)  # 180 days
        db.add(token)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Gmail fetch error: {e}")

    if not emails:
        return {"accounts_updated": 0, "contacts_added": 0, "message": "No emails found."}

    try:
        extracted = extract_account_data_from_emails(emails)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Account extraction failed: {e}")

    from sqlalchemy import func as _func
    existing_accounts = {a.name.lower(): a for a in db.query(Account).all()}

    _MERGE_FIELDS = ("phone", "fax", "website", "referral_email", "referral_instructions", "scheduling_instructions")
    accounts_updated = 0
    contacts_added = 0

    for data in extracted:
        if not data.get("name"):
            continue

        key = data["name"].lower()
        account = existing_accounts.get(key)

        if not account:
            account = Account(name=data["name"], status="prospect", momentum="unknown")
            db.add(account)
            db.flush()
            existing_accounts[key] = account

        changed = False
        for field in _MERGE_FIELDS:
            val = data.get(field)
            if val and not getattr(account, field, None):
                setattr(account, field, val)
                changed = True

        if changed:
            accounts_updated += 1

        # Merge contacts
        for c_data in data.get("contacts", []):
            if not c_data.get("name"):
                continue
            existing = db.query(Contact).filter(
                Contact.account_id == account.id,
                _func.lower(Contact.name) == c_data["name"].lower(),
            ).first()
            if not existing:
                contact = Contact(
                    account_id=account.id,
                    name=c_data["name"],
                    role=c_data.get("role"),
                    email=c_data.get("email"),
                    phone=c_data.get("phone"),
                )
                db.add(contact)
                contacts_added += 1
            else:
                if c_data.get("email") and not existing.email:
                    existing.email = c_data["email"]
                if c_data.get("phone") and not existing.phone:
                    existing.phone = c_data["phone"]
                if c_data.get("role") and not existing.role:
                    existing.role = c_data["role"]

    db.commit()

    # Extract action items / tasks from the same emails
    tasks_added = 0
    try:
        all_accounts = db.query(Account).all()
        acct_by_name = {a.name.lower(): a for a in all_accounts}
        raw_tasks = email_service.extract_tasks_from_emails(emails, all_accounts)
        for t in raw_tasks:
            title = (t.get("title") or "").strip()
            if not title:
                continue
            acct = acct_by_name.get((t.get("account_name") or "").lower()) if t.get("account_name") else None
            # Skip if an open task with the same title already exists
            dup = db.query(Task).filter(
                _func.lower(Task.title) == title.lower(),
                Task.status == "open",
            ).first()
            if dup:
                continue
            db.add(Task(
                account_id=acct.id if acct else None,
                title=title,
                description=t.get("description"),
                priority=t.get("priority") if t.get("priority") in ("low", "medium", "high") else "medium",
                status="open",
                source_type="email",
            ))
            tasks_added += 1
        db.commit()
    except Exception:
        db.rollback()

    return {
        "accounts_updated": accounts_updated,
        "contacts_added": contacts_added,
        "accounts_found_in_email": len(extracted),
        "tasks_added": tasks_added,
    }
