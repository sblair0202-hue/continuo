"""Salesforce provider — read-only (Phase B). OAuth web-server flow, mirrors the
Google calendar/email pattern (direct HTTP token exchange, no SDK).

Config via env vars (add when the External Client App exists):
  SALESFORCE_CLIENT_ID
  SALESFORCE_CLIENT_SECRET
  SALESFORCE_REDIRECT_URI   (e.g. https://<railway>/salesforce/callback)
  SALESFORCE_LOGIN_URL      (default https://login.salesforce.com; use My Domain in prod)
"""
import json
import os
from datetime import datetime, timedelta

import requests

API_VERSION = "v66.0"
# Read-only needs api access; refresh_token+offline_access for background sync.
SCOPES = ["api", "refresh_token", "offline_access"]

name = "salesforce"


def _cfg(key: str, default: str = "") -> str:
    return os.getenv(key, default)


def _login_url() -> str:
    return _cfg("SALESFORCE_LOGIN_URL", "https://login.salesforce.com").rstrip("/")


def is_configured() -> bool:
    return bool(_cfg("SALESFORCE_CLIENT_ID") and _cfg("SALESFORCE_CLIENT_SECRET"))


def get_auth_url(user_id: str = "sarah") -> str:
    import secrets
    import urllib.parse
    state = f"uid:{user_id}:{secrets.token_urlsafe(16)}"
    params = {
        "response_type": "code",
        "client_id": _cfg("SALESFORCE_CLIENT_ID"),
        "redirect_uri": _cfg("SALESFORCE_REDIRECT_URI"),
        "scope": " ".join(SCOPES),
        "state": state,
    }
    return f"{_login_url()}/services/oauth2/authorize?" + urllib.parse.urlencode(params)


def exchange_code(code: str) -> dict:
    resp = requests.post(f"{_login_url()}/services/oauth2/token", data={
        "grant_type": "authorization_code",
        "code": code,
        "client_id": _cfg("SALESFORCE_CLIENT_ID"),
        "client_secret": _cfg("SALESFORCE_CLIENT_SECRET"),
        "redirect_uri": _cfg("SALESFORCE_REDIRECT_URI"),
    })
    if not resp.ok:
        raise ValueError(f"Salesforce token exchange failed: {resp.text}")
    data = resp.json()
    return {
        "access_token": data["access_token"],
        "refresh_token": data.get("refresh_token"),
        "instance_url": data.get("instance_url"),
        "token_uri": f"{_login_url()}/services/oauth2/token",
        "scopes": json.dumps(SCOPES),
        "expiry": datetime.utcnow() + timedelta(hours=1),
    }


def _refresh(token_row) -> None:
    if not token_row.refresh_token:
        return
    resp = requests.post(f"{_login_url()}/services/oauth2/token", data={
        "grant_type": "refresh_token",
        "refresh_token": token_row.refresh_token,
        "client_id": _cfg("SALESFORCE_CLIENT_ID"),
        "client_secret": _cfg("SALESFORCE_CLIENT_SECRET"),
    })
    if resp.ok:
        data = resp.json()
        token_row.access_token = data["access_token"]
        if data.get("instance_url"):
            token_row.instance_url = data["instance_url"]
        token_row.expiry = datetime.utcnow() + timedelta(hours=1)


def _query(token_row, soql: str) -> list[dict]:
    """Run a SOQL query, refreshing the token once on 401."""
    import urllib.parse
    url = f"{token_row.instance_url}/services/data/{API_VERSION}/query?q={urllib.parse.quote(soql)}"
    headers = {"Authorization": f"Bearer {token_row.access_token}"}
    resp = requests.get(url, headers=headers)
    if resp.status_code == 401:
        _refresh(token_row)
        headers = {"Authorization": f"Bearer {token_row.access_token}"}
        resp = requests.get(url, headers=headers)
    resp.raise_for_status()
    return resp.json().get("records", [])


def list_accounts(token_row) -> list[dict]:
    rows = _query(token_row, "SELECT Id, Name, BillingCity, BillingState, Phone FROM Account ORDER BY Name LIMIT 500")
    return [{
        "external_id": r["Id"], "name": r.get("Name"),
        "city": r.get("BillingCity"), "state": r.get("BillingState"),
        "phone": r.get("Phone"),
    } for r in rows]


def list_contacts(token_row) -> list[dict]:
    rows = _query(token_row, "SELECT Id, Name, Email, Phone, Title, AccountId FROM Contact ORDER BY Name LIMIT 1000")
    return [{
        "external_id": r["Id"], "name": r.get("Name"), "email": r.get("Email"),
        "phone": r.get("Phone"), "title": r.get("Title"),
        "account_external_id": r.get("AccountId"),
    } for r in rows]


def list_open_tasks(token_row) -> list[dict]:
    rows = _query(token_row, "SELECT Id, Subject, Description, ActivityDate, Status, WhatId, WhoId FROM Task WHERE Status != 'Completed' ORDER BY ActivityDate NULLS LAST LIMIT 500")
    return [{
        "external_id": r["Id"], "title": r.get("Subject"), "description": r.get("Description"),
        "due_date": r.get("ActivityDate"), "status": r.get("Status"),
        "account_external_id": r.get("WhatId"),
    } for r in rows]
