# Salesforce Integration — Design & Prep

Status: **PREP / not yet built.** Product principle 0: Continuo complements Salesforce, it does not replace it. Continuo's job is to make updating Salesforce nearly effortless — not to become the CRM.

---

## Phasing (ship value early, de-risk the hard parts)

### Phase A — Prepare mode (BUILT)
- `GET /voice-journal/{id}/salesforce-prep` generates a clean, plain-text Salesforce activity note from a recap.
- Review screen: "Prepare Salesforce Update" → copy to clipboard OR send to email.
- No Salesforce login, no API, no data leaves except what the user chooses to paste/email.
- This already delivers the core promise ("spend less time typing into Salesforce").

### Phase B — Read-only sync (NEXT)
- Connect Salesforce via OAuth (External Client App).
- Pull the user's Accounts, Contacts, and open Tasks/Opportunities into Continuo for context (meeting prep, dedup, matching).
- Store Salesforce IDs on existing reserved columns (`salesforce_account_id`, etc.) so records are linked, not duplicated.
- Nothing written back yet — read-only is low-risk and immediately useful.

### Phase C — Write-back (LATER)
- One-tap push of a prepared activity → creates a `Task` (or `Event`) in Salesforce against the matched Account/Contact.
- Later: opportunity updates, call logs.
- Always "AI suggests, human approves" — the user reviews before anything is written to the corporate system of record.

---

## Technical facts (verified July 2026)

- **Auth:** OAuth 2.0. As of **Spring '26, Connected Apps creation is restricted** — use an **External Client App (ECA)**. Use My Domain endpoints: `https://<myorg>.my.salesforce.com/services/oauth2/authorize` and `/token`. Separate app per environment (sandbox vs prod).
- **Recommended flow:** Web-server OAuth (authorization code) for a user-linked connection, mirroring how Continuo already does Google OAuth (browser → callback → store tokens). Refresh tokens for offline access (scope `refresh_token offline_access`).
- **API version:** REST v66.0 (Spring '26).
- **Objects we care about:**
  - `Account`, `Contact` — read for context/matching.
  - `Task` — activity/to-do (Subject, Description, WhatId=Account, WhoId=Contact, ActivityDate, Status). This is what a "logged activity" maps to.
  - `Event` — calendar meeting (alternative to Task for visits).
  - `Opportunity` — later.
- **Write example:** `POST /services/data/v66.0/sobjects/Task` with `{Subject, Description, WhatId, WhoId, Status}`.
- **Rate limits:** per-org daily API call limits (edition-dependent). Read-heavy sync must batch (Composite / Bulk API) and cache.

## Provider abstraction (per CLAUDE.md architecture rules)
- `backend/app/services/crm/` — `CRMProvider` interface (`list_accounts`, `list_contacts`, `create_activity`, ...).
- `SalesforceProvider` implements it. Keeps routes thin and domain models CRM-neutral.
- Token storage mirrors `CalendarToken`/`EmailToken`: a `SalesforceToken` table (access, refresh, instance_url, expiry) — encrypted at rest before any non-Sarah user (BLOCK on multi-user).

## Data model
- Reuse reserved columns: `Account.salesforce_account_id`, `Contact.salesforce_contact_id`, `Task.salesforce_task_id`.
- Add `SalesforceToken` (user_id, access_token, refresh_token, instance_url, expiry).
- Matching: link by SF ID when synced; fall back to fuzzy name match (reuse `account_fuzzy_key`) with a review step when ambiguous.

## Decisions (locked 2026-07-01)
1. **Org:** Build/test against a **free Salesforce Developer Edition org** first (developer.salesforce.com/signup). Never touch Mobia prod until it works.
2. **Scope:** **Read-only sync (Phase B) is the next build.** Write-back (Phase C) deferred.
3. **Object mapping (Phase C, later):** decide Task vs Event when we get there; reps usually log visits as Events, follow-ups as Tasks.

## Status: Phase B SCAFFOLDED (2026-07-01), inert until credentials added
- `backend/app/services/crm/{base,salesforce}.py` + `backend/app/api/salesforce_routes.py` deployed.
- `SalesforceToken` table created. Routes: `/salesforce/connect`, `/callback`, `/status`, `POST /salesforce/sync`.
- `/status` returns `configured:false` until env vars set.

## To ACTIVATE (manual steps for Sarah)
1. Sign up: **developer.salesforce.com/signup** (free Dev org, 2 min).
2. In that org: Setup → **App Manager → New External Client App** (or "New Connected App" if ECA unavailable in Dev edition). Enable OAuth. Callback URL: `https://continuo-production-2d36.up.railway.app/salesforce/callback`. Scopes: `api`, `refresh_token`/`offline_access`.
3. Copy the **Consumer Key** (client id) and **Consumer Secret**.
4. Add to Railway: `SALESFORCE_CLIENT_ID`, `SALESFORCE_CLIENT_SECRET`, `SALESFORCE_REDIRECT_URI=https://continuo-production-2d36.up.railway.app/salesforce/callback`. (Leave `SALESFORCE_LOGIN_URL` default for Dev org.)
5. Visit `/salesforce/connect` in a browser → approve → then `POST /salesforce/sync`.

## Security notes
- Least privilege scopes; no full `api` write until Phase C.
- Encrypt SalesforceToken at rest (same requirement flagged for CalendarToken/EmailToken).
- Never write to Salesforce without explicit user approval per record.
