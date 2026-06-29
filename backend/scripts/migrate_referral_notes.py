"""
Import referral notes, addresses, and onboarding dates from the Salesforce
"All Active Therapy Sites" export into continuo_dev.db.

Run from backend/:
    python scripts/migrate_referral_notes.py
"""

import sqlite3
import pandas as pd
from pathlib import Path

XLSX = Path(r"C:\Users\sblai\Downloads\All Active Therapy Sites-2026-06-27-23-10-52.xlsx")
DB   = Path(__file__).parent.parent / "continuo_dev.db"

# Explicit name mappings where the Salesforce name differs from the DB name
NAME_MAP = {
    "Rehab Without Walls- Greenwood":                           10,
    "IU Health Rehabilitation & Sports Medicine - Bloomington": 8,
    "Salience Neuro Rehab":                                     3,
    "Parkview Randallia Outpatient Therapy":                    14,
    "Physical Therapy and Rehab - Neuro Specialty Clinic":      17,
    "Riverview Health Outpatient Therapy":                      5,
    "Physical Therapy and Rehab - Stones Crossing":             9,
    "Restorative Health and Wellness":                          4,
    "IU Health Neurorehabilitation and Robotics":               15,
    "Ascension St. Vincent Rehab - Naab Rd":                   12,
    "NeuroHope":                                                7,
    # Both Franciscan Indianapolis rows → same DB account
    "Franciscan Health Rehabilitation Services Indianapolis":   19,
    "Franciscan Health Rehabilitation Indianapolis":            19,
}

def clean(val) -> str | None:
    if val is None or (isinstance(val, float) and str(val) == "nan"):
        return None
    return str(val).strip() or None

def main():
    # Read Excel — header is on row index 11 (0-based)
    df = pd.read_excel(XLSX, header=11)
    df.columns = [str(c).strip() for c in df.columns]

    # Keep only data rows (drop total row at the end)
    data_rows = df[df["Territory"].notna() & (df["Territory"] != "Total")].copy()

    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row

    updated = []
    skipped = []

    for _, row in data_rows.iterrows():
        sf_name = clean(row.get("Account Name"))
        if not sf_name:
            continue

        account_id = NAME_MAP.get(sf_name)
        if not account_id:
            skipped.append(sf_name)
            continue

        # Pull fields from Excel
        address          = clean(row.get("Shipping Address Line 1"))
        city             = clean(row.get("Shipping City"))
        state            = clean(row.get("Shipping State/Province (text only)"))
        referral_process = clean(row.get("Referral Process"))

        # Build SET clause — only update non-null values
        sets, params = [], []
        sets.append("is_therapy_site = 1")

        if address:
            sets.append("address = ?"); params.append(address)
        if city:
            sets.append("city = ?"); params.append(city)
        if state:
            sets.append("state = ?"); params.append(state)

        # Merge referral notes: if we already have content, append rather than overwrite
        if referral_process:
            existing = conn.execute(
                "SELECT referral_instructions FROM accounts WHERE id = ?", (account_id,)
            ).fetchone()
            existing_notes = existing["referral_instructions"] if existing else None

            if existing_notes and existing_notes.strip():
                # Only append if the new content isn't already in there
                if referral_process not in existing_notes:
                    merged = f"{existing_notes.strip()}\n\n{referral_process}"
                    sets.append("referral_instructions = ?"); params.append(merged)
            else:
                sets.append("referral_instructions = ?"); params.append(referral_process)

        params.append(account_id)
        sql = f"UPDATE accounts SET {', '.join(sets)} WHERE id = ?"
        conn.execute(sql, params)
        updated.append((account_id, sf_name))

    conn.commit()
    conn.close()

    print(f"\n✓ Updated {len(updated)} accounts:")
    for aid, name in updated:
        print(f"   [{aid}] {name}")

    if skipped:
        print(f"\n⚠  {len(skipped)} rows had no DB match (not imported):")
        for name in skipped:
            print(f"   - {name}")

if __name__ == "__main__":
    main()
