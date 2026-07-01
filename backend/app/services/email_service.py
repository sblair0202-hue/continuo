import base64
import json
import os
import re
from datetime import datetime, timedelta, timezone

import anthropic
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

# Filler words dropped when comparing account names for duplicate matching.
_FILLER_WORDS = {
    "the", "a", "of", "and", "health", "system", "center", "centre",
    "outpatient", "therapy", "rehab", "rehabilitation", "clinic", "hospital",
    "medical", "inc", "llc", "services", "care", "wellness",
}


def account_fuzzy_key(name: str) -> str:
    """Normalize an account name to a comparison key: lowercase, strip punctuation,
    drop filler words, remove spaces. Same key = treat as the same account."""
    n = re.sub(r"[^a-z0-9 ]", " ", (name or "").lower())
    tokens = [t for t in n.split() if t and t not in _FILLER_WORDS]
    return "".join(tokens)


def find_matching_account(name: str, accounts: list):
    """Return an existing Account that is the same place as `name`, or None.
    Conservative: exact fuzzy-key match only, so distinct cities stay separate
    (e.g. Franciscan Lafayette vs Crawfordsville) but 'Neuro Hope Rehab' matches
    'NeuroHope'."""
    if not name:
        return None
    target = account_fuzzy_key(name)
    if not target:
        return None
    for a in accounts:
        if account_fuzzy_key(a.name) == target:
            return a
    return None

REDIRECT_URI = os.getenv("GMAIL_REDIRECT_URI", "http://localhost:8000/email/callback")

_CLIENT_ID     = lambda: os.getenv("GOOGLE_WEB_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID", "")
_CLIENT_SECRET = lambda: os.getenv("GOOGLE_WEB_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET", "")


def get_auth_url(user_id: str = "sarah") -> str:
    import secrets, urllib.parse
    state = f"uid:{user_id}:{secrets.token_urlsafe(16)}"
    params = {
        "client_id":     _CLIENT_ID(),
        "redirect_uri":  REDIRECT_URI,
        "response_type": "code",
        "scope":         " ".join(SCOPES),
        "access_type":   "offline",
        "prompt":        "consent",
        "state":         state,
    }
    return "https://accounts.google.com/o/oauth2/auth?" + urllib.parse.urlencode(params)


def exchange_code(code: str) -> dict:
    import requests as _req
    resp = _req.post("https://oauth2.googleapis.com/token", data={
        "code":          code,
        "client_id":     _CLIENT_ID(),
        "client_secret": _CLIENT_SECRET(),
        "redirect_uri":  REDIRECT_URI,
        "grant_type":    "authorization_code",
    })
    if not resp.ok:
        raise ValueError(f"Token exchange failed: {resp.text}")
    data = resp.json()
    expiry = datetime.utcnow() + timedelta(seconds=data.get("expires_in", 3600))
    return {
        "access_token":  data["access_token"],
        "refresh_token": data.get("refresh_token"),
        "token_uri":     "https://oauth2.googleapis.com/token",
        "scopes":        json.dumps(SCOPES),
        "expiry":        expiry,
    }


def _build_credentials(token_row) -> Credentials:
    scopes = json.loads(token_row.scopes) if token_row.scopes else SCOPES
    creds = Credentials(
        token=token_row.access_token,
        refresh_token=token_row.refresh_token,
        token_uri=token_row.token_uri or "https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_WEB_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID", ""),
        client_secret=os.getenv("GOOGLE_WEB_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET", ""),
        scopes=scopes,
    )
    if token_row.expiry:
        creds.expiry = token_row.expiry.replace(tzinfo=timezone.utc)
    return creds


def refresh_if_needed(token_row) -> Credentials:
    creds = _build_credentials(token_row)
    try:
        is_expired = creds.expired
    except TypeError:
        # google-auth stores expiry as naive UTC but newer utcnow() is tz-aware.
        # Force a refresh so google-auth rebuilds expiry as tz-aware, fixing
        # subsequent internal valid/expired checks during .execute().
        is_expired = True
    if (is_expired or creds.expiry is None) and creds.refresh_token:
        creds.refresh(Request())
        token_row.access_token = creds.token
        token_row.expiry = creds.expiry.replace(tzinfo=None) if creds.expiry else None
    return creds


def _decode_body(payload: dict) -> str:
    """Extract plain-text body from a Gmail message payload."""
    mime = payload.get("mimeType", "")
    if mime == "text/plain":
        data = payload.get("body", {}).get("data", "")
        if data:
            return base64.urlsafe_b64decode(data + "==").decode("utf-8", errors="ignore")

    for part in payload.get("parts", []):
        text = _decode_body(part)
        if text:
            return text
    return ""


def fetch_recent_emails(token_row, hours: int = 48, query_override: str | None = None) -> list[dict]:
    creds = refresh_if_needed(token_row)
    service = build("gmail", "v1", credentials=creds)

    after_ts = int((datetime.now(timezone.utc) - timedelta(hours=hours)).timestamp())
    if query_override:
        query = f"after:{after_ts} ({query_override}) -category:promotions -category:social"
    else:
        query = f"after:{after_ts} -from:me -category:promotions -category:social"

    result = service.users().messages().list(
        userId="me", q=query, maxResults=20
    ).execute()

    messages = []
    for msg_ref in result.get("messages", []):
        msg = service.users().messages().get(
            userId="me", id=msg_ref["id"], format="full"
        ).execute()

        headers = {h["name"].lower(): h["value"] for h in msg.get("payload", {}).get("headers", [])}
        body = _decode_body(msg.get("payload", {}))[:2000]

        messages.append({
            "id": msg["id"],
            "from": headers.get("from", ""),
            "to": headers.get("to", "") + " " + headers.get("cc", ""),
            "subject": headers.get("subject", "(No subject)"),
            "date": headers.get("date", ""),
            "internal_date": msg.get("internalDate"),  # epoch ms as string
            "snippet": msg.get("snippet", ""),
            "body": body,
        })

    return messages


def compute_account_health(emails: list[dict], accounts: list, contacts: list) -> dict:
    """Map each account to (last_interaction_epoch_ms, momentum) based on how recently
    it appears in the rep's email (by contact email match or account name in the text)."""
    # contact email -> account_id
    contact_map = {}
    for c in contacts:
        if c.email and c.account_id:
            contact_map[c.email.lower()] = c.account_id

    # account_id -> significant name key for text matching
    acct_keys = {a.id: account_fuzzy_key(a.name) for a in accounts}

    latest: dict[int, int] = {}
    for e in emails:
        try:
            ts = int(e.get("internal_date") or 0)
        except (TypeError, ValueError):
            ts = 0
        if not ts:
            continue
        parties = (e.get("from", "") + " " + e.get("to", "")).lower()
        text_key = account_fuzzy_key(e.get("subject", "") + " " + e.get("body", "")[:500])

        matched = set()
        for addr, acct_id in contact_map.items():
            if addr and addr in parties:
                matched.add(acct_id)
        for acct_id, key in acct_keys.items():
            if key and len(key) >= 6 and key in text_key:
                matched.add(acct_id)

        for acct_id in matched:
            if ts > latest.get(acct_id, 0):
                latest[acct_id] = ts

    import time as _time
    now_ms = int(_time.time() * 1000)
    day_ms = 86400 * 1000
    result = {}
    for acct_id, ts in latest.items():
        days = (now_ms - ts) / day_ms
        if days <= 21:
            momentum = "rising"
        elif days <= 60:
            momentum = "stable"
        else:
            momentum = "declining"
        result[acct_id] = (ts, momentum)
    return result


def extract_account_data_from_emails(emails: list[dict]) -> list[dict]:
    """Use Claude to extract structured account contact data from emails.
    Returns list of dicts with: name, phone, fax, website, contacts[], referral_instructions, etc.
    """
    if not emails:
        return []

    email_blocks = []
    for e in emails[:20]:
        block = f"FROM: {e['from']}\nSUBJECT: {e['subject']}\nSNIPPET: {e['snippet']}"
        if e["body"]:
            block += f"\nBODY: {e['body'][:800]}"
        email_blocks.append(block)

    emails_text = "\n\n---\n\n".join(email_blocks)

    prompt = f"""You are helping a medical device sales rep extract account information from their emails.

Analyze these emails and extract SPECIFIC healthcare sites/clinics/locations (a named rehab center, therapy clinic, or hospital campus) with their contact details.

IMPORTANT: Do NOT create an account for a parent health SYSTEM or corporate brand. Skip generic system names like "Franciscan Alliance", "Franciscan Health" (with no site), "Parkview Health", "IU Health", "Ascension", "Community Health Network". Only extract a specific site/location (e.g. "Franciscan Health Lafayette", "Parkview Randallia"). If only the parent system is identifiable and no specific site, SKIP it entirely.

Emails:
{emails_text}

Extract all specific healthcare sites you find. For each, return:
{{
  "name": "organization name",
  "phone": "phone number or null",
  "fax": "fax number or null",
  "website": "website or null",
  "referral_email": "referral email address or null",
  "referral_instructions": "how to refer patients there, or null",
  "scheduling_instructions": "how to schedule, or null",
  "contacts": [
    {{
      "name": "contact name",
      "role": "their role/title",
      "email": "email or null",
      "phone": "direct phone or null"
    }}
  ]
}}

Rules:
- Only extract real healthcare organizations, not personal email senders
- Include direct contacts (therapists, coordinators, physicians, admins) found in these emails
- If a field is not mentioned, use null
- Phone/fax should be formatted like (317) 555-1234 or +1-317-555-1234
- Return a JSON array. Return [] if no healthcare accounts found.
- Return only valid JSON, no explanation."""

    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip().rstrip("```").strip()

    return json.loads(text) if text else []


def extract_tasks_from_emails(emails: list[dict], accounts: list) -> list[dict]:
    """Extract actionable follow-ups / to-dos from emails as task dicts."""
    if not emails:
        return []

    account_names = [a.name for a in accounts]
    account_str = ", ".join(account_names[:25]) or "None"

    email_blocks = []
    for e in emails[:15]:
        block = f"FROM: {e['from']}\nSUBJECT: {e['subject']}\nSNIPPET: {e.get('snippet','')}"
        if e.get("body"):
            block += f"\nBODY EXCERPT: {e['body'][:800]}"
        email_blocks.append(block)
    emails_text = "\n\n---\n\n".join(email_blocks)

    prompt = f"""You are analyzing a medical device sales rep's emails to extract concrete action items and follow-up tasks.

Known accounts in their territory: {account_str}

Emails:
{emails_text}

Extract every actionable task, follow-up, commitment, or to-do implied or stated in these emails. Examples: "send referral packet", "follow up on OT eval", "schedule training", "confirm reimbursement docs", "reply to therapist", "call back about scheduling".

For each task return:
{{
  "title": "short imperative task (max 12 words, start with a verb)",
  "description": "1 sentence of context including who/what",
  "account_name": "exact account name from territory list above, or null if unclear",
  "priority": "low|medium|high",
  "due_hint": "any date/deadline mentioned, or null"
}}

Rules:
- Only real action items the rep needs to do. Ignore newsletters, receipts, automated notifications, FYI-only messages.
- Match account_name to the territory list when possible; otherwise null.
- Return a JSON array. Return [] if no tasks found.
- Return only valid JSON, no explanation."""

    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2000,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip().rstrip("```").strip()

    return json.loads(text) if text else []


def extract_people_from_emails(emails: list[dict], accounts: list) -> list[dict]:
    """Extract people (therapists, coordinators, physicians, schedulers) from emails,
    with a best-guess of which account they belong to and the evidence for it."""
    if not emails:
        return []

    account_names = [a.name for a in accounts]
    account_str = "\n".join(f"- {n}" for n in account_names[:30]) or "None"

    email_blocks = []
    for e in emails[:15]:
        block = f"FROM: {e['from']}\nSUBJECT: {e['subject']}\nSNIPPET: {e.get('snippet','')}"
        if e.get("body"):
            block += f"\nBODY EXCERPT: {e['body'][:900]}"
        email_blocks.append(block)
    emails_text = "\n\n---\n\n".join(email_blocks)

    prompt = f"""You are analyzing a medical device rep's emails to identify the real PEOPLE they work with at healthcare accounts (therapists/OTs/PTs, care coordinators, schedulers, physicians, admins).

The rep's known accounts:
{account_str}

Emails:
{emails_text}

For each real person you find who works at a healthcare organization (NOT the rep herself, NOT automated senders, NOT vendors/newsletters), return:
{{
  "name": "full name",
  "email": "their email or null",
  "role": "their role/title if known, e.g. 'Occupational Therapist', or null",
  "account_name": "the EXACT account name from the list above if you are confident, else null",
  "account_confidence": "high|medium|low",
  "evidence": "1 short sentence: why you think they belong to that account, quoting context (location, signature, thread topic)"
}}

Rules:
- Use the email domain and thread context to infer the account, but if a domain maps to multiple locations (e.g. a health system with several sites) and the specific site is NOT clear, set account_name to null and account_confidence to "low".
- Prefer null over guessing. It is better to leave account_name null than to assign the wrong site.
- Return a JSON array. Return [] if no real people found.
- Return only valid JSON, no explanation."""

    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=2500,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip().rstrip("```").strip()

    return json.loads(text) if text else []


def extract_signals_from_emails(emails: list[dict], accounts: list) -> list[dict]:
    if not emails:
        return []

    account_names = [a.name for a in accounts]
    account_str = ", ".join(account_names[:20]) or "None"

    email_blocks = []
    for e in emails[:10]:
        block = f"FROM: {e['from']}\nSUBJECT: {e['subject']}\nSNIPPET: {e['snippet']}"
        if e["body"]:
            block += f"\nBODY EXCERPT: {e['body'][:500]}"
        email_blocks.append(block)

    emails_text = "\n\n---\n\n".join(email_blocks)

    prompt = f"""You are analyzing emails for a medical device sales rep to extract field intelligence signals.

Known accounts in their territory: {account_str}

Emails to analyze:
{emails_text}

Extract only signal-worthy intelligence: scheduling changes, objections, competitive mentions, relationship updates, budget/procurement signals, clinical concerns, or action items involving known accounts or contacts.

Ignore: newsletters, automated notifications, HR/admin emails, irrelevant correspondence.

Return a JSON array of signals. Each signal:
{{
  "account_name": "exact account name from territory or null",
  "signal_type": one of: risk|opportunity|relationship|momentum|milestone|continuity|referral_pathway|crm|task|win|question,
  "title": "short signal title (max 10 words)",
  "summary": "1-2 sentence summary of the signal",
  "evidence_text": "the specific quote or fact from the email",
  "impact_level": "low|medium|high",
  "urgency": "none|low|medium|high",
  "suggested_action": "one specific action to take (or null)",
  "confidence_score": 0.0-1.0,
  "source_email_subject": "the email subject"
}}

Return [] if no signal-worthy content found. Return only valid JSON, no explanation."""

    client = anthropic.Anthropic()
    message = client.messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1500,
        messages=[{"role": "user", "content": prompt}],
    )

    text = message.content[0].text.strip()
    if text.startswith("```"):
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
    text = text.strip().rstrip("```").strip()

    return json.loads(text) if text else []
