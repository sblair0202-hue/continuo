"""
Import referral data from All Active Therapy Sites Excel export into Continuo accounts.
Safe to re-run: only updates address/city/state/referral_instructions where the Excel
has data; never clears a field that already has a value.
"""
import re
import sqlite3

import openpyxl

EXCEL_PATH = r"C:\Users\sblai\Downloads\All Active Therapy Sites-2026-06-27-23-10-52.xlsx"
DB_PATH = r"C:\Users\sblai\continuo\backend\continuo_dev.db"

# Manual mapping: excel account name (normalized) → DB account ID
# Confirmed by comparing both lists
ID_MAP = {
    "rehab without walls- greenwood": 10,
    "iu health rehabilitation & sports medicine - bloomington": 8,
    "salience neuro rehab": 3,
    "parkview randallia outpatient therapy": 14,
    "physical therapy and rehab - neuro specialty clinic": 17,
    "riverview health outpatient therapy": 5,
    "physical therapy and rehab - stones crossing": 9,
    "restorative health and wellness": 4,
    "iu health neurorehabilitation and robotics": 15,
    "ascension st. vincent rehab - naab rd": 12,
    "neurohope": 7,
    # Both Franciscan rows map to South Emerson (same location, split across two rows)
    "franciscan health rehabilitation services indianapolis": 19,
    "franciscan health rehabilitation indianapolis": 19,
}


def clean_text(value):
    if not value:
        return None
    return str(value).replace("\r\n", "\n").replace("\r", "\n").strip()


def extract_fax(ref_text):
    """Pull fax number from referral instruction text if present."""
    if not ref_text:
        return None
    m = re.search(r"[Ff]ax[:\s]+([0-9]{3}[-.\s]?[0-9]{3}[-.\s]?[0-9]{4})", ref_text)
    if m:
        return m.group(1).strip()
    return None


def load_excel_rows():
    wb = openpyxl.load_workbook(EXCEL_PATH)
    ws = wb.active
    rows = []
    for row in ws.iter_rows(min_row=13, max_row=25, values_only=True):
        name = clean_text(row[3])
        if not name or name in ("Total",):
            continue
        rows.append({
            "name": name,
            "address": clean_text(row[5]) or None,
            "city": clean_text(row[6]),
            "state": "Indiana",
            "zip": clean_text(row[8]),
            "referral_instructions": clean_text(row[9]),
        })
    return rows


def merge_updates(existing, incoming):
    """Merge two dicts of updates: combine referral text if both rows update same account."""
    for key, value in incoming.items():
        if value is None:
            continue
        if key == "referral_instructions" and existing.get(key):
            # Append additional referral info rather than overwrite
            if value not in existing[key]:
                existing[key] = existing[key] + "\n\n" + value
        elif not existing.get(key):
            existing[key] = value
    return existing


def main():
    excel_rows = load_excel_rows()
    print(f"Loaded {len(excel_rows)} rows from Excel\n")

    # Group updates by DB account ID
    updates: dict[int, dict] = {}
    unmatched = []

    for row in excel_rows:
        key = row["name"].lower()
        db_id = ID_MAP.get(key)
        if db_id is None:
            unmatched.append(row["name"])
            continue

        patch = {
            "address": row["address"],
            "city": row["city"],
            "state": row["state"],
            "referral_instructions": row["referral_instructions"],
        }
        fax = extract_fax(row["referral_instructions"])
        if fax:
            patch["fax"] = fax

        if db_id not in updates:
            updates[db_id] = patch
        else:
            updates[db_id] = merge_updates(updates[db_id], patch)

    if unmatched:
        print(f"WARNING — {len(unmatched)} unmatched account(s):")
        for n in unmatched:
            print(f"  - {n}")
        print()

    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    for db_id, patch in updates.items():
        cur.execute("SELECT name FROM accounts WHERE id=?", (db_id,))
        row = cur.fetchone()
        if not row:
            print(f"  SKIP — no account with id {db_id}")
            continue

        db_name = row[0]
        fields = []
        values = []

        for col in ("address", "city", "state", "fax", "referral_instructions"):
            val = patch.get(col)
            if val:
                fields.append(f"{col}=?")
                values.append(val)

        if not fields:
            print(f"  SKIP [{db_id}] {db_name} — nothing to update")
            continue

        values.append(db_id)
        cur.execute(f"UPDATE accounts SET {', '.join(fields)} WHERE id=?", values)
        print(f"  UPDATED [{db_id}] {db_name}")
        for col, val in zip([f.split("=")[0] for f in fields], values[:-1]):
            preview = str(val)[:60].replace("\n", " ")
            print(f"    {col}: {preview}")

    conn.commit()
    conn.close()
    print(f"\nDone — {len(updates)} account(s) updated.")


if __name__ == "__main__":
    main()
