# Continuo — Known Issues

Last updated: 2026-06-27

Issues are grouped by severity. Fix before public beta unless noted otherwise.

---

## Critical — Fix Before Any Other Rep Touches the App

### AUTH-1: No authentication — user_id hardcoded as "sarah"
Every backend route has `USER_ID = "sarah"` or passes `user_id: "sarah"` from the mobile client. There is no real user model, no login, and no data isolation. Any second user would see Sarah's entire territory.
**Fix in:** Sprint 10 (Auth)

### AUTH-2: OAuth tokens stored as plaintext in SQLite
`CalendarToken` and `EmailToken` rows store `access_token` and `refresh_token` as unencrypted text columns in `continuo_dev.db`. Before any public release, tokens must be encrypted at rest or migrated to a secrets store.
**Fix in:** Sprint 10 (Auth)

---

## High — Noticeable in Daily Use

### DATA-1: City names from Excel import are uppercase
Accounts imported from the Salesforce therapy site export have cities stored in ALL CAPS (GREENWOOD, BLOOMINGTON, FORT WAYNE, INDIANAPOLIS). Looks wrong in the UI wherever city is displayed.
**Fix:** One-time `UPDATE accounts SET city = UPPER_TO_TITLE(city)` migration, or fix in next data import script.

### DATA-2: Ascension Naab Rd referral instructions are incomplete
The exported referral instruction says "Have referral faxed to them, info below." The "info below" refers to content that existed below the cell in the original system but wasn't captured in the export. The actual fax number and wording are missing.
**Fix:** Get fax number and referral wording from Salesforce directly and update manually.

### UI-1: PHI warning extracted by AI but not shown to the user
`field_intelligence_engine.py` sets `possible_phi_warning: true` when patient names appear in a transcript. The review screen (`/review/[id]`) never reads or displays this flag. A rep could unknowingly store patient-identifiable content without any prompt.
**Fix:** Add a visible warning banner on the review screen when `possible_phi_warning` is true.

### CAP-1: Voice recording is a placeholder
The "Voice (coming soon)" button on the Capture screen shows an Alert. There is no actual voice recording, transcription, or Whisper integration.
**Status:** Intentional deferral. Not blocking any current workflow.

---

## Medium — Rough Edges

### UX-1: Daily Brief is on-demand only
The Daily Brief requires the user to tap a button. There is no push notification, no auto-generation on app open, and no scheduling.
**Fix in:** Post-Sprint 10, after auth and push notification infrastructure exists.

### UX-2: No Settings screen
There is no Settings tab or screen. Users cannot manage connected accounts, revoke OAuth access, or see security status. A Privacy & Security page is planned.
**Fix in:** Sprint 11

### UX-3: No offline mode
The app crashes or shows empty states without a network connection. Accounts, contacts, and referral info should be readable offline.
**Status:** Significant work; deferred to a later sprint.

### UX-4: No PHI guidance in the Capture screen
The transcript input has no hint that patient identifiers should not be entered. The AI will extract and store whatever the rep types.
**Fix:** Add a subtle placeholder or footer note on the Capture screen.

### BACKEND-1: Notion sync requires manual Notion API key setup
`notion_service.py` reads from environment variables. There is no UI to connect Notion. If the env var is missing, the endpoint returns an error with no user-facing guidance.
**Status:** Low priority until Notion integration is revisited.

### BACKEND-2: Email "extract-signals" scans last 48 hours only
`fetch_recent_emails` has `hours=48` hardcoded. There is no way to scan older emails or a custom date range.
**Fix:** Add optional `days` query param to the endpoint.

---

## Low — Polish Items

### POLISH-1: Account detail "Snapshot" loads on every visit
The AI Account Snapshot is fetched every time the account detail screen opens. It should be cached (e.g., invalidate after 24 hours or after a new recap is submitted for that account).

### POLISH-2: Momentum dot colors use hardcoded values in some places
Some components reference momentum colors directly rather than using the semantic color tokens from `colors.ts`. Inconsistent if the palette changes.

### POLISH-3: Search results are not ranked
`GET /search?q=` returns accounts, contacts, and signals that match the query string, but there is no relevance ranking. Exact matches appear in the same order as partial matches.

### POLISH-4: Referral Guide does not include fax number for all accounts
The Referral Guide email format includes fax if the `fax` field is populated, but several accounts have fax numbers embedded only in their `referral_instructions` text. The guide should parse those out or the fax field should be populated for all accounts.
