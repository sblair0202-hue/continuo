"""
One-time Notion → Continuo import script.

Sources:
  - Indiana Site Dashboard (7b365393-936b-4ef3-ae7b-c8c6e24051da): 18 accounts
  - People DB: workspace members only — skipped

Run from backend directory:
    python scripts/import_notion.py
"""

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import requests
from datetime import date
from sqlalchemy.orm import Session
from app.database import engine, Base
from app.models.domain import Account, Contact, Task, Opportunity, Milestone

NOTION_TOKEN = os.getenv("NOTION_TOKEN", "")
SITE_DB_ID   = "7b365393-936b-4ef3-ae7b-c8c6e24051da"

HEADERS = {
    "Authorization": f"Bearer {NOTION_TOKEN}",
    "Notion-Version": "2022-06-28",
    "Content-Type": "application/json",
}

# ── Field normalisers ──────────────────────────────────────────────────────────

MOMENTUM_MAP = {
    "🔴 At Risk":      "at_risk",
    "🟡 Stable":       "stable",
    "🟢 Accelerating": "rising",
}

STATUS_MAP = {
    "0 - Training Planned": "training_planned",
    "1 - Active Interest":  "active_interest",
    "2 - Stalled":          "stalled",
    "3 - Evaluating":       "evaluating",
    "4 - Prehab":           "prehab",
    "5 - Treating":         "treating_patients",
}

# Opportunity status derived from stage
OPP_STATUS_MAP = {
    "0 - Training Planned": "new",
    "1 - Active Interest":  "new",
    "2 - Stalled":          "waiting",
    "3 - Evaluating":       "active",
    "4 - Prehab":           "active",
    "5 - Treating":         "active",
}

PRIORITY_MAP = {
    "Scale":     "high",
    "Sustain":   "high",
    "Build":     "medium",
    "Unlock":    "medium",
    "Re-engage": "low",
    "Monitor":   "low",
}

SKIP_CHAMPIONS = {"no strong champion", "tbd", "", "none"}


def rt(blocks) -> str:
    """Extract plain text from a Notion rich_text array."""
    return "".join(b.get("plain_text", "") for b in (blocks or []))


def select(prop) -> str:
    s = prop.get("select")
    return s["name"] if s else ""


def query_all(db_id: str) -> list[dict]:
    rows, cursor = [], None
    while True:
        body = {"page_size": 100}
        if cursor:
            body["start_cursor"] = cursor
        r = requests.post(
            f"https://api.notion.com/v1/databases/{db_id}/query",
            headers=HEADERS,
            json=body,
        )
        r.raise_for_status()
        data = r.json()
        rows.extend(data["results"])
        if not data.get("has_more"):
            break
        cursor = data["next_cursor"]
    return rows


# ── Main import ────────────────────────────────────────────────────────────────

def run():
    Base.metadata.create_all(bind=engine)

    with Session(engine) as db:
        rows = query_all(SITE_DB_ID)
        print(f"Fetched {len(rows)} rows from Indiana Site Dashboard")

        accounts_created = contacts_created = tasks_created = 0
        opps_created = milestones_created = 0

        for row in rows:
            p = row["properties"]

            site_name   = rt(p["Site"]["title"])
            stage       = select(p["Stage"])
            momentum_raw = select(p["Momentum"])
            pipeline    = select(p["Pipeline"])
            priority_lane = select(p.get("Priority Lane", {}))
            system      = select(p.get("System", {}))
            champion    = rt(p.get("Champion", {}).get("rich_text", []))
            next_action = rt(p.get("Next Action", {}).get("rich_text", []))
            barrier     = rt(p.get("Barrier", {}).get("rich_text", []))
            notes_text  = rt(p.get("Notes", {}).get("rich_text", []))
            strat_imp   = select(p.get("Strategic Importance", {}))

            if not site_name:
                continue

            # ── Account ──────────────────────────────────────────────────────
            account = db.query(Account).filter(Account.name == site_name).first()
            if not account:
                account = Account(
                    name=site_name,
                    organization=system or None,
                    status=STATUS_MAP.get(stage),
                    momentum=MOMENTUM_MAP.get(momentum_raw),
                    next_action=next_action or None,
                    priority=PRIORITY_MAP.get(priority_lane),
                )
                db.add(account)
                db.flush()  # get account.id
                accounts_created += 1
                print(f"  [Account] {site_name}")
            else:
                print(f"  [Account] SKIP (exists): {site_name}")
                # Still update fields that may be stale
                account.organization = system or account.organization
                account.status = STATUS_MAP.get(stage, account.status)
                account.momentum = MOMENTUM_MAP.get(momentum_raw, account.momentum)
                account.next_action = next_action or account.next_action
                db.flush()

            # ── Contact (champion) ────────────────────────────────────────────
            if champion.lower().strip() not in SKIP_CHAMPIONS:
                existing_contact = db.query(Contact).filter(
                    Contact.name == champion,
                    Contact.account_id == account.id,
                ).first()
                if not existing_contact:
                    contact = Contact(
                        name=champion,
                        account_id=account.id,
                        role="Champion",
                        champion_level="champion",
                        relationship_status="active",
                    )
                    db.add(contact)
                    contacts_created += 1
                    print(f"    [Contact] {champion} @ {site_name}")

            # ── Opportunity ───────────────────────────────────────────────────
            opp_status = OPP_STATUS_MAP.get(stage)
            if opp_status:
                existing_opp = db.query(Opportunity).filter(
                    Opportunity.account_id == account.id
                ).first()
                if not existing_opp:
                    # Build notes from pipeline, strategic importance, barrier, notes
                    opp_notes_parts = []
                    if pipeline:
                        opp_notes_parts.append(f"Pipeline: {pipeline}")
                    if strat_imp:
                        opp_notes_parts.append(f"Strategic importance: {strat_imp}")
                    if barrier:
                        opp_notes_parts.append(f"Barrier: {barrier}")
                    if notes_text:
                        opp_notes_parts.append(notes_text)

                    opp = Opportunity(
                        account_id=account.id,
                        title=f"Grow {site_name}",
                        status=opp_status,
                        next_action=next_action or None,
                        notes="\n".join(opp_notes_parts) or None,
                    )
                    db.add(opp)
                    opps_created += 1
                    print(f"    [Opportunity] {opp.title} ({opp_status})")

            # ── Task (next action) ────────────────────────────────────────────
            if next_action:
                existing_task = db.query(Task).filter(
                    Task.account_id == account.id,
                    Task.title == next_action,
                ).first()
                if not existing_task:
                    task = Task(
                        account_id=account.id,
                        title=next_action,
                        priority=PRIORITY_MAP.get(priority_lane, "medium"),
                        status="open",
                        source_type="notion",
                    )
                    db.add(task)
                    tasks_created += 1
                    print(f"    [Task] {next_action[:60]}")

            # ── Milestone (treating sites only) ───────────────────────────────
            if stage == "5 - Treating":
                existing_ms = db.query(Milestone).filter(
                    Milestone.account_id == account.id,
                    Milestone.title == "Treating patients",
                ).first()
                if not existing_ms:
                    ms = Milestone(
                        account_id=account.id,
                        title="Treating patients",
                        milestone_type="implant",
                        date=date.today(),
                        notes=f"Stage at import: {stage}",
                    )
                    db.add(ms)
                    milestones_created += 1
                    print(f"    [Milestone] Treating patients @ {site_name}")

        db.commit()

    print()
    print("=" * 50)
    print(f"Import complete:")
    print(f"  Accounts:    {accounts_created} created")
    print(f"  Contacts:    {contacts_created} created")
    print(f"  Opportunities: {opps_created} created")
    print(f"  Tasks:       {tasks_created} created")
    print(f"  Milestones:  {milestones_created} created")


if __name__ == "__main__":
    run()
