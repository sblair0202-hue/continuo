"""
One-time contact import + account merge script.

Actions:
  1. Merge RHI (duplicate) into Rehab Hospital of Indiana
  2. Remove placeholder contacts from Notion import
  3. Import all therapist contacts from screenshots
  4. Update existing contacts where name was placeholder

Run from backend directory:
    python scripts/import_contacts.py
"""

import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from app.database import engine, Base
from app.models.domain import Account, Contact, Task, Opportunity, Milestone, ActivityHistory

# (name, account_name, discipline, role, phone, champion_level)
# Leader badge = champion_level "champion", role "Team Lead"
CONTACTS = [
    # Ascension St. Vincent Rehab - Brownsburg
    ("Matt Zaudtke",        "Ascension St. Vincent Rehab - Brownsburg",                   "OT/PT",   "Therapist",  "(317) 415-6040", "supportive"),
    ("Hannah Schoening",    "Ascension St. Vincent Rehab - Brownsburg",                   "OT/PT",   "Therapist",  "(317) 415-6040", "supportive"),
    ("Taylor Penning",      "Ascension St. Vincent Rehab - Brownsburg",                   "OT/PT",   "Therapist",  "(317) 415-6040", "supportive"),
    # Ascension St. Vincent Rehab - Naab Rd
    ("Morgan Reed",         "Ascension St. Vincent Rehab - Naab Rd",                      "OT/PT",   "Therapist",  "(317) 338-3364", "supportive"),
    # Franciscan Health Rehabilitation - Mooresville
    ("Alisha B Kijovsky",   "Franciscan Health Rehabilitation - Mooresville",              "OT",      "Therapist",  "317-834-4413",   "champion"),
    # Franciscan Carmel
    ("Victoria Lothamer",   "Franciscan Carmel",                                           "OT/PT",   "Therapist",  "317-508-4098",   "champion"),
    # Franciscan Health Rehabilitation - South Emerson (Indianapolis)
    ("Katy Ellis",          "Franciscan Health Rehabilitation - South Emerson (Indianapolis)", "OT/PT", "Therapist", "317-508-4098",  "supportive"),
    # IU Health Neurorehabilitation & Robotics
    ("Kathryn Gyves",       "IU Health Neurorehabilitation & Robotics",                   "PT",      "Team Lead",  "317-963-7050",   "champion"),
    ("Ryan Neyenhaus",      "IU Health Neurorehabilitation & Robotics",                   "OT",      "Therapist",  "317-963-7055",   "supportive"),
    ("Emily Smith",         "IU Health Neurorehabilitation & Robotics",                   "OT",      "Therapist",  "317-963-7055",   "supportive"),
    # NeuroHope
    ("Elizabeth Parr",      "NeuroHope",                                                   "OT",      "Therapist",  "317-525-8386",   "supportive"),
    ("Krista Kaufman",      "NeuroHope",                                                   "OT/PT",   "Therapist",  "317-525-8386",   "supportive"),
    ("Elliot Cohee",        "NeuroHope",                                                   "PT",      "Team Lead",  "317-525-8386",   "champion"),
    # Parkview Randallia Outpatient Therapy
    ("Dalton Shutt",        "Parkview Randallia Outpatient Therapy",                       "OT",      "Therapist",  "260-373-3202",   "supportive"),
    ("Kelly Voltz",         "Parkview Randallia Outpatient Therapy",                       "PT",      "Team Lead",  "260-373-3202",   "champion"),
    ("Andrea Marushka",     "Parkview Randallia Outpatient Therapy",                       "OT/PT",   "Therapist",  "260-373-3202",   "supportive"),
    ("Devyn Carder",        "Parkview Randallia Outpatient Therapy",                       "OT",      "Therapist",  "260-373-3202",   "supportive"),
    # Physical Therapy & Rehab - Neuro Specialty Clinic
    ("Tosha Adams",         "Physical Therapy & Rehab - Neuro Specialty Clinic",           "OT",      "Therapist",  "317-528-8111",   "supportive"),
    # Physical Therapy & Rehab - Stones Crossing
    ("Nicole Willis",       "Physical Therapy & Rehab - Stones Crossing",                  "OT",      "Therapist",  "317-497-6000",   "supportive"),
    # Rehab Without Walls - Greenwood
    ("Celine Siahmakoun",   "Rehab Without Walls - Greenwood",                             "PT",      "Therapist",  "(317) 324-3765", "supportive"),
    ("Daniel Sego",         "Rehab Without Walls - Greenwood",                             "OT",      "Team Lead",  "(317) 324-3765", "champion"),
    # Restorative Health and Wellness
    ("Sarah Blount",        "Restorative Health and Wellness",                             "OT/PT",   "Therapist",  "317-505-1410",   "supportive"),
    ("Aika Yoshida",        "Restorative Health and Wellness",                             "OT/PT",   "Therapist",  "317-505-1410",   "supportive"),
    # Salience Neuro Rehab
    ("Melanie Lindauer",    "Salience Neuro Rehab",                                        "OT",      "Team Lead",  "812-998-6176",   "champion"),
]

# Placeholder contact names created during Notion import to remove or replace
PLACEHOLDERS = {
    "Local therapy team",
    "Parkview therapy team",
    "Community Neuro Champion",
    "Emily Smith / Ryan Neyenhaus",  # will be replaced by individual records
    "Kaitlynn (BDR)",                # keep but don't overwrite — not in screenshot
}

# Contacts to rename (old_name → new_name, same account)
RENAMES = {
    "Alisha": "Alisha B Kijovsky",
    "Tori Lothamer": "Victoria Lothamer",
}


def run():
    Base.metadata.create_all(bind=engine)
    with Session(engine) as db:

        # ── 1. Merge RHI → Rehab Hospital of Indiana ─────────────────────────
        rhi_dup  = db.query(Account).filter(Account.name == "RHI").first()
        rhi_keep = db.query(Account).filter(Account.name == "Rehab Hospital of Indiana").first()

        if rhi_dup and rhi_keep:
            for model in [Contact, Task, Opportunity, Milestone, ActivityHistory]:
                if hasattr(model, "account_id"):
                    db.query(model).filter(model.account_id == rhi_dup.id).update(
                        {"account_id": rhi_keep.id}
                    )
            db.delete(rhi_dup)
            print(f"[Merge] RHI (id={rhi_dup.id}) → Rehab Hospital of Indiana (id={rhi_keep.id})")
        elif rhi_dup:
            rhi_dup.name = "Rehab Hospital of Indiana"
            print(f"[Rename] RHI → Rehab Hospital of Indiana")

        db.flush()

        # ── 2. Remove placeholder contacts ───────────────────────────────────
        for placeholder in PLACEHOLDERS:
            c = db.query(Contact).filter(Contact.name == placeholder).first()
            if c:
                db.delete(c)
                print(f"[Remove placeholder] {placeholder}")

        # ── 3. Rename approximate contacts from Notion ────────────────────────
        for old_name, new_name in RENAMES.items():
            c = db.query(Contact).filter(Contact.name == old_name).first()
            if c:
                c.name = new_name
                print(f"[Rename contact] {old_name!r} → {new_name!r}")

        db.flush()

        # ── 4. Import contacts ────────────────────────────────────────────────
        created = updated = skipped = 0

        for (name, account_name, discipline, role, phone, champion_level) in CONTACTS:
            account = db.query(Account).filter(Account.name == account_name).first()
            if not account:
                print(f"  [WARN] Account not found: {account_name!r} — skipping {name}")
                skipped += 1
                continue

            existing = db.query(Contact).filter(
                Contact.name == name,
                Contact.account_id == account.id,
            ).first()

            if existing:
                # Update fields that may have been set from placeholder data
                existing.discipline    = discipline
                existing.role          = role
                existing.phone         = phone
                existing.champion_level = champion_level
                existing.relationship_status = "active"
                updated += 1
                print(f"  [Update] {name} @ {account_name}")
            else:
                contact = Contact(
                    name=name,
                    account_id=account.id,
                    discipline=discipline,
                    role=role,
                    phone=phone,
                    champion_level=champion_level,
                    relationship_status="active",
                )
                db.add(contact)
                created += 1
                print(f"  [Create] {name} @ {account_name} ({discipline})")

        db.commit()

        print()
        print("=" * 50)
        print(f"Contacts created:  {created}")
        print(f"Contacts updated:  {updated}")
        print(f"Contacts skipped:  {skipped}")
        print()
        print("All contacts:")
        all_contacts = db.query(Contact).join(Account).order_by(Account.name, Contact.name).all()
        for c in all_contacts:
            acct = db.query(Account).filter(Account.id == c.account_id).first()
            print(f"  {c.name} | {acct.name if acct else '?'} | {c.discipline} | {c.role} | {c.phone}")


if __name__ == "__main__":
    run()
