"""CRMProvider interface — any CRM (Salesforce first) implements this so the rest
of the app never depends on a specific vendor."""
from __future__ import annotations

from typing import Protocol


class CRMProvider(Protocol):
    name: str

    def list_accounts(self, token_row) -> list[dict]:
        """Return [{external_id, name, city, state, phone, ...}]."""
        ...

    def list_contacts(self, token_row) -> list[dict]:
        """Return [{external_id, name, email, phone, title, account_external_id}]."""
        ...

    def list_open_tasks(self, token_row) -> list[dict]:
        """Return [{external_id, title, description, due_date, status, account_external_id}]."""
        ...

    # Phase C (write-back) — not implemented in read-only phase
    def create_activity(self, token_row, activity: dict) -> str:
        """Create an activity/Task in the CRM; return its external id."""
        ...
