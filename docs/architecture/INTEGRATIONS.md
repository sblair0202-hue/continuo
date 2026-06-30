# Continuo — Integrations

## Google Calendar

### Purpose
Surface upcoming meetings, account visits, and patient appointments in the daily brief and Today screen.

### OAuth Flow
```
Browser → GET /calendar/connect
        ↓
Google OAuth consent (scope: calendar.readonly)
        ↓
GET /calendar/callback?code=...
  → exchanges code for tokens
  → stores in CalendarToken table (user_id, access_token, refresh_token, expiry)
```

### Scopes
- `https://www.googleapis.com/auth/calendar.readonly`

### Token Storage
`CalendarToken` table. Tokens auto-refresh via `google-auth-oauthlib` when expired.

### Required env vars
| Variable | Value |
|----------|-------|
| `GOOGLE_CLIENT_ID` | Web client ID |
| `GOOGLE_CLIENT_SECRET` | Web client secret |
| `GOOGLE_REDIRECT_URI` | `https://continuo-production-2d36.up.railway.app/calendar/callback` |

### Google Cloud Console
Registered redirect URI: `https://continuo-production-2d36.up.railway.app/calendar/callback`

### Status check (Build #10+)
`GET /calendar/status` — returns `{"connected": true/false}`. Works without auth header (falls back to legacy "sarah" user_id for Build #10 compatibility).

---

## Gmail

### Purpose
- Surface recent emails from accounts and contacts in account detail view
- Scan historical emails (180 days) to extract account data: phone, fax, contacts, referral instructions

### OAuth Flow
```
Browser → GET /email/connect
        ↓
Google OAuth consent (scope: gmail.readonly)
        ↓
GET /email/callback?code=...
  → exchanges code for tokens
  → stores in EmailToken table
```

### Scopes
- `https://www.googleapis.com/auth/gmail.readonly`

### Token Storage
`EmailToken` table. Same refresh pattern as Calendar.

### Email Account Scanning
`POST /email/scan-accounts` — fetches 180 days of Gmail, uses Claude Haiku to extract structured account data (phone, fax, website, referral instructions, contacts), merges non-destructively into the Accounts table.

### Required env vars
| Variable | Value |
|----------|-------|
| `GOOGLE_CLIENT_ID` | Web client ID |
| `GOOGLE_CLIENT_SECRET` | Web client secret |
| `GMAIL_REDIRECT_URI` | `https://continuo-production-2d36.up.railway.app/email/callback` |

### Google Cloud Console
Registered redirect URI: `https://continuo-production-2d36.up.railway.app/email/callback`

---

## Notion

### Purpose
Bidirectional sync of Account data. Notion serves as an external account database that can seed Continuo or receive Continuo's structured data.

### Architecture
No stored OAuth credentials. Configured entirely via env vars. No user-level auth — single workspace token.

### Endpoints
| Endpoint | Direction | Behavior |
|----------|-----------|---------|
| `GET /notion/status` | — | Returns whether NOTION_TOKEN + NOTION_DATABASE_ID are set |
| `POST /notion/import` | Notion → Continuo | Pulls accounts from Notion; creates new or backfills empty fields on existing |
| `POST /notion/sync` | Continuo → Notion | Pushes all Accounts and Signals to Notion database |

### Import behavior
- Matches accounts by name (case-insensitive)
- For existing accounts: only fills empty fields (non-destructive)
- For new accounts: creates full Account row
- Returns counts: imported / updated / skipped

### Required env vars
| Variable | Value |
|----------|-------|
| `NOTION_TOKEN` | Notion integration token |
| `NOTION_DATABASE_ID` | ID of the Notion database to sync with |

Both are optional — if absent, Notion status shows "not connected."

---

## Salesforce (Future — fields reserved)

No Salesforce integration is built yet. Fields are reserved in domain models to keep data Salesforce-ready:

| Model | Field |
|-------|-------|
| Account | `salesforce_account_id` |
| Contact | `salesforce_contact_id` |
| Task | `salesforce_task_id` |

Architecture rule: domain models must remain neutral and Salesforce-ready. Do not hard-code Salesforce into core models.

---

## 8x8 SMS (Future Research Sprint)

### Goal
The TDS never has to open 8x8 unless absolutely necessary. Continuo becomes the operational dashboard while still using the organization's approved SMS platform.

### Research Questions
- Available APIs (REST? SDK?)
- Authentication model (API key? OAuth? Per-user?)
- Rate limits
- Cost structure
- Multi-user architecture (one org account, multiple TDS users)
- HIPAA / security considerations (PHI in SMS)
- Webhooks for inbound messages (reply detection)

### Potential Capabilities
- Send SMS (patient confirmations, follow-up reminders)
- Receive replies (YES/NO confirmation parsing)
- Delivery receipts
- Scheduled messages
- Automatic logging to account timeline
- Confirmation workflows (drive-before-confirm problem)

### Do Not Build Until
Research is complete and HIPAA/security review is done. PHI may be present in patient confirmation messages.
