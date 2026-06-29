import base64
import json
import os
from datetime import datetime, timedelta, timezone

import anthropic
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build

SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"]

REDIRECT_URI = os.getenv("GMAIL_REDIRECT_URI", "http://localhost:8000/email/callback")

CLIENT_CONFIG = {
    "web": {
        "client_id": os.getenv("GOOGLE_WEB_CLIENT_ID") or os.getenv("GOOGLE_CLIENT_ID", ""),
        "client_secret": os.getenv("GOOGLE_WEB_CLIENT_SECRET") or os.getenv("GOOGLE_CLIENT_SECRET", ""),
        "redirect_uris": [REDIRECT_URI],
        "auth_uri": "https://accounts.google.com/o/oauth2/auth",
        "token_uri": "https://oauth2.googleapis.com/token",
    }
}


_pkce_store: dict[str, str] = {}


def get_auth_url() -> str:
    flow = Flow.from_client_config(CLIENT_CONFIG, scopes=SCOPES, redirect_uri=REDIRECT_URI)
    auth_url, state = flow.authorization_url(access_type="offline", prompt="consent")
    cv = getattr(getattr(flow, "oauth2session", None), "code_verifier", None) or getattr(flow, "code_verifier", None)
    if cv and state:
        _pkce_store[state] = cv
    return auth_url


def exchange_code(code: str, state: str | None = None) -> dict:
    flow = Flow.from_client_config(CLIENT_CONFIG, scopes=SCOPES, redirect_uri=REDIRECT_URI)
    if state and state in _pkce_store:
        cv = _pkce_store.pop(state)
        sess = getattr(flow, "oauth2session", None)
        if sess is not None:
            sess.code_verifier = cv
    flow.fetch_token(code=code)
    creds = flow.credentials
    return {
        "access_token": creds.token,
        "refresh_token": creds.refresh_token,
        "token_uri": creds.token_uri,
        "scopes": json.dumps(list(creds.scopes or SCOPES)),
        "expiry": creds.expiry,
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
    if creds.expired and creds.refresh_token:
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
            "subject": headers.get("subject", "(No subject)"),
            "date": headers.get("date", ""),
            "snippet": msg.get("snippet", ""),
            "body": body,
        })

    return messages


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
