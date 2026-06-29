import os
from datetime import datetime

import httpx

NOTION_VERSION = "2022-06-28"


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {os.getenv('NOTION_TOKEN', '')}",
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


def _extract_text(prop: dict) -> str:
    """Pull plain text out of any Notion property type."""
    ptype = prop.get("type", "")
    if ptype == "title":
        parts = prop.get("title", [])
        return "".join(p.get("plain_text", "") for p in parts).strip()
    elif ptype == "rich_text":
        parts = prop.get("rich_text", [])
        return "".join(p.get("plain_text", "") for p in parts).strip()
    elif ptype == "url":
        return prop.get("url") or ""
    elif ptype == "phone_number":
        return prop.get("phone_number") or ""
    elif ptype == "email":
        return prop.get("email") or ""
    elif ptype == "select":
        sel = prop.get("select")
        return sel.get("name", "") if sel else ""
    elif ptype == "multi_select":
        return ", ".join(s["name"] for s in prop.get("multi_select", []))
    elif ptype == "checkbox":
        return "true" if prop.get("checkbox") else ""
    else:
        return ""


def _get_prop(props: dict, *keys: str) -> str | None:
    """Try multiple property key names and return the first non-empty value."""
    for key in keys:
        if key in props:
            val = _extract_text(props[key])
            if val:
                return val
    return None


def import_accounts_from_notion(database_id: str) -> list[dict]:
    """Read all pages from a Notion database and return account dicts."""
    token = os.getenv("NOTION_TOKEN", "")
    if not token:
        raise ValueError("NOTION_TOKEN not set")
    if not database_id:
        raise ValueError("NOTION_DATABASE_ID not set")

    accounts: list[dict] = []
    url = f"https://api.notion.com/v1/databases/{database_id}/query"
    payload: dict = {"page_size": 100}

    while True:
        r = httpx.post(url, headers=_headers(), json=payload)
        r.raise_for_status()
        data = r.json()

        for page in data.get("results", []):
            props = page.get("properties", {})
            # Auto-detect: Notion databases always have exactly one "title" type property
            name = ""
            for prop in props.values():
                if prop.get("type") == "title":
                    name = _extract_text(prop)
                    break
            # Fallback to common name keys if title prop was empty
            if not name:
                for key in ("Name", "Account", "Account Name", "Facility", "Hospital", "Client", "name"):
                    if key in props:
                        val = _extract_text(props[key])
                        if val:
                            name = val
                            break
            if not name:
                continue

            status = _get_prop(props, "Status", "status")
            momentum = _get_prop(props, "Momentum", "momentum")
            next_action = _get_prop(props, "Next Action", "next_action", "Next Steps", "Action Items")
            location = _get_prop(props, "Location", "location", "City, State")
            city, state = None, None
            if location and "," in location:
                loc_parts = [p.strip() for p in location.split(",", 1)]
                city, state = loc_parts[0], loc_parts[1]
            elif location:
                city = location

            accounts.append({
                "name": name,
                "status": status or "prospect",
                "momentum": momentum or "unknown",
                "next_action": next_action,
                "city": city,
                "state": state,
                "notion_page_id": page["id"],
                # Referral & contact info
                "address": _get_prop(props, "Address", "Street Address", "address"),
                "phone": _get_prop(props, "Phone", "Phone Number", "Main Phone", "phone"),
                "fax": _get_prop(props, "Fax", "Fax Number", "fax"),
                "website": _get_prop(props, "Website", "URL", "Web", "website"),
                "account_type": _get_prop(props, "Type", "Account Type", "Facility Type", "account_type"),
                "referral_instructions": _get_prop(props, "Referral Instructions", "Referral Process", "Referral Protocol", "How to Refer", "referral_instructions"),
                "scheduling_instructions": _get_prop(props, "Scheduling Instructions", "Scheduling Notes", "How to Schedule", "scheduling_instructions"),
                "referral_contact": _get_prop(props, "Referral Contact", "Referral Coordinator", "Contact Name", "referral_contact"),
                "referral_email": _get_prop(props, "Referral Email", "Contact Email", "Email", "referral_email"),
                "preferred_referral_method": _get_prop(props, "Preferred Method", "Referral Method", "Submission Method", "preferred_referral_method"),
                "insurance_notes": _get_prop(props, "Insurance Notes", "Insurance", "Payers", "Insurance Info", "insurance_notes"),
                "vivistim_status": _get_prop(props, "Vivistim Status", "vivistim_status", "Device Status"),
            })

        if not data.get("has_more"):
            break
        payload["start_cursor"] = data["next_cursor"]

    return accounts


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
    if not os.getenv("NOTION_TOKEN", ""):
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
