"""
Sprint 7 migration — adds referral guide fields to the accounts table.
Safe to re-run: skips columns that already exist.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy import text
from app.database import engine

NEW_COLUMNS = [
    ("address",                  "TEXT"),
    ("phone",                    "VARCHAR"),
    ("fax",                      "VARCHAR"),
    ("website",                  "VARCHAR"),
    ("account_type",             "VARCHAR"),
    ("referral_instructions",    "TEXT"),
    ("scheduling_instructions",  "TEXT"),
    ("referral_contact",         "VARCHAR"),
    ("referral_email",           "VARCHAR"),
    ("preferred_referral_method","VARCHAR"),
    ("insurance_notes",          "TEXT"),
    ("is_implant_center",        "BOOLEAN NOT NULL DEFAULT 0"),
    ("is_therapy_site",          "BOOLEAN NOT NULL DEFAULT 0"),
    ("is_evaluation_site",       "BOOLEAN NOT NULL DEFAULT 0"),
    ("vivistim_status",          "VARCHAR"),
    ("pm_r_available",           "BOOLEAN NOT NULL DEFAULT 0"),
    ("neurosurgery_available",   "BOOLEAN NOT NULL DEFAULT 0"),
]


def run():
    with engine.connect() as conn:
        existing = conn.execute(text("PRAGMA table_info(accounts)")).fetchall()
        existing_cols = {row[1] for row in existing}
        added = 0
        for col_name, col_type in NEW_COLUMNS:
            if col_name not in existing_cols:
                conn.execute(text(f"ALTER TABLE accounts ADD COLUMN {col_name} {col_type}"))
                print(f"  [Added]  {col_name}")
                added += 1
            else:
                print(f"  [Skip]   {col_name} (already exists)")
        conn.commit()
    print(f"\nMigration complete — {added} column(s) added.")


if __name__ == "__main__":
    run()
