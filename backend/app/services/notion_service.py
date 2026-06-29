import os
from datetime import datetime

import httpx

NOTION_TOKEN = os.getenv("NOTION_TOKEN", "")
NOTION_VERSION = "2022-06-28"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Notion-Version": NOTION_VERSION,
        "Content-Type": "application/json",
    }


def _rich_text(text: str) -> list:
    return [{"type": "text", "text": {"content": str(text)[:2000]}}]


def get_database_properties(database_id: str) -> dict:
    """Fetch Notion database schema to discover property names."""
    url = f"https://api.notion.com/v1/databases/{database_id}"
    r = httpx.get(url, headers=_headers())
    r.raise_for_status()
    return r.json().get("properties", {})


def upsert_account_page(database_id: str, account, signals: list, existing_pages: dict) -> str:
    """Create or update a Notion page for an account. Returns page_id."""
    high_signals = [s for s in signals if s.status == "new" and s.impact_level in ("high", "medium")]
    signal_summary = "; ".join(s.title for s in high_signals[:5]) or "None"

    properties = {
        "Name": {"title": _rich_text(account.name)},
        "Status": {"rich_text": _rich_text(account.status or "prospect")},
        "Momentum": {"rich_text": _rich_text(account.momentum or "unknown")},
        "Active Signals": {"rich_text": _rich_text(signal_summary)},
        "Signal Count": {"number": len(high_signals)},
        "Last Synced": {"rich_text": _rich_text(datetime.utcnow().strftime("%Y-%m-%d %H:%M UTC"))},
    }
    if account.next_action:
        properties["Next Action"] = {"rich_text": _rich_text(account.next_action)}
    if account.city or account.state:
        location = ", ".join(filter(None, [account.city, account.state]))
        properties["Location"] = {"rich_text": _rich_text(location)}

    if account.name in existing_pages:
        page_id = existing_pages[account.name]
        url = f"https://api.notion.com/v1/pages/{page_id}"
        r = httpx.patch(url, headers=_headers(), json={"properties": properties})
        r.raise_for_status()
        return page_id
    else:
        url = "https://api.notion.com/v1/pages"
        body = {
            "parent": {"database_id": database_id},
            "properties": properties,
        }
        r = httpx.post(url, headers=_headers(), json=body)
        r.raise_for_status()
        return r.json()["id"]


def fetch_existing_pages(database_id: str) -> dict:
    """Return {account_name: page_id} for pages already in the database."""
    url = f"https://api.notion.com/v1/databases/{database_id}/query"
    r = httpx.post(url, headers=_headers(), json={"page_size": 100})
    r.raise_for_status()
    pages = {}
    for page in r.json().get("results", []):
        props = page.get("properties", {})
        name_prop = props.get("Name", {})
        title_list = name_prop.get("title", [])
        if title_list:
            name = title_list[0].get("plain_text", "")
            if name:
                pages[name] = page["id"]
    return pages


def sync_accounts(accounts: list, signals: list) -> dict:
    database_id = os.getenv("NOTION_DATABASE_ID", "")
    if not database_id:
        raise ValueError("NOTION_DATABASE_ID not set in environment")
    if not NOTION_TOKEN:
        raise ValueError("NOTION_TOKEN not set in environment")

    existing = fetch_existing_pages(database_id)
    synced = 0
    errors = []

    for account in accounts:
        account_signals = [s for s in signals if s.account_id == account.id]
        try:
            upsert_account_page(database_id, account, account_signals, existing)
            synced += 1
        except Exception as e:
            errors.append({"account": account.name, "error": str(e)})

    return {"synced": synced, "errors": errors}
