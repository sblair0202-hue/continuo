# Continuo — What We're Building Next

Last updated: 2026-06-27

---

## Sprint 9 (Active) — Gmail Per-Account View

**Goal:** Surface relevant email history inside each account's detail screen, so a rep can review recent communication before a visit without leaving Continuo.

### What to Build

**Account detail screen — "Recent Emails" section**
- Appears below Activity History.
- Shows last 3–5 emails where the sender or subject matches the account name or known contacts.
- Each row: sender name, subject line, relative date ("2 days ago"), one-line snippet.
- Tap → opens email thread view inside Continuo (plain text, no formatting required).
- "View in Gmail" link at the bottom of each thread.
- If Gmail is not connected: show a subtle "Connect Gmail" prompt instead of the section.

**Backend — account-scoped email search**
- `GET /email/threads?account_id={id}` — search Gmail for messages matching the account name and contact names associated with that account.
- Returns: id, from, subject, date, snippet, body excerpt.
- Reuses `email_service.fetch_recent_emails()` with a targeted search query.
- Cache results for 15 minutes per account to avoid hammering Gmail API.

**What this is NOT**
- Not a full Gmail client.
- No compose, no reply, no labels.
- Drafts (Phase 2) come after this lands and is validated.

### Why Now
- Email service already has OAuth, token refresh, and Gmail API wired.
- Account detail screen already has the section structure to add this.
- Highest-value Phase 1 feature: "What did I last say to these people?"

---

## Sprint 10 — Authentication & User Accounts

**Goal:** Replace hardcoded `user_id = "sarah"` with real authentication. Every piece of data is owned by an authenticated user.

### What to Build

**Backend**
- `users` table: id, email, name, role (developer / beta / individual), created_at.
- JWT-based session tokens (or use Google ID tokens directly).
- All routes read user from auth header, not hardcoded string.
- Migrate CalendarToken and EmailToken to be keyed by real user_id.

**Mobile**
- Google Sign-In (expo-auth-session or @react-native-google-signin).
- Sign in with Apple (required on iOS if Google is offered).
- Secure token storage via expo-secure-store (replaces any AsyncStorage usage for credentials).
- Face ID / Touch ID unlock after initial login.
- Persistent session with auto-refresh.

**Developer Role**
- Sarah's account gets `role = "developer"` automatically on first login.
- Developer role: no feature gates, admin tools visible, beta features on.

### Known Dependencies
- Requires schema migration: add `user_id` FK to all data tables that don't have it (or confirm they all already do).
- CalendarToken and EmailToken must be re-associated after migration.
- `USER_ID = "sarah"` constant appears in: routes.py, calendar_routes.py, email_routes.py, daily_brief_routes.py — all must be updated.

---

## Sprint 11 — Settings & Privacy Screen

**Goal:** Settings screen that exists from the beginning, even if some items are "Coming Soon." Makes security visible as a product feature.

### Sections

**Profile**
- Name, company, territory, role badge.

**Connected Accounts**
- Google Calendar — connected / disconnect.
- Gmail — connected / disconnect.
- Microsoft (Coming Soon).

**Security**
- Face ID / Touch ID toggle.
- Session timeout.
- Login history (last 5 sessions).
- Logout from all devices.

**Privacy**
- What data Continuo stores.
- Download my data (export JSON).
- Delete my data.
- PHI guidance (Continuo is not a medical record system).

**AI**
- Voice transcription preference (when voice is built).
- Daily Brief length preference.

**Developer (role-gated)**
- DB row counts.
- Feature flags.
- Reset demo data.
- Force Daily Brief regeneration.

---

## Backlog (Not Yet Scheduled)

These are confirmed future features in rough priority order.

### Visit Mode
Tap "I'm here" on an account. App switches context: today's objectives, contacts, open tasks, referral info, voice record button. When you leave: "Record recap?" This is the most product-native feature on the backlog.

### Quick Add Floating Button
`+` → choose: Voice / Task / Account / Contact / Visit. No menus, no navigation.

### Offline Mode
View accounts, referral info, tasks, and contacts without network. Sync on reconnect. Required before use in hospital environments with unreliable Wi-Fi.

### Universal Search
One search bar that finds tasks, contacts, recaps, milestones, and emails across the entire territory. Currently search only covers accounts/contacts/signals.

### Gmail Phase 2 — Drafts
"Draft follow-up email" on an account → rep reviews → send. Pre-filled with account context.

### Push Notifications
Daily Brief at 7am. "You have a visit in 30 minutes" alert. Task due reminders.

### Attachments
Account-level file storage: PDFs, referral forms, CEU certificates, photos, business cards.

### Analytics (Developer Only)
Recaps submitted, signals accepted, tasks completed, AI calls made, most-used features. Helps prioritize future sprints.

---

## Version 1.0 Checklist

- [ ] Authentication — no hardcoded user IDs
- [ ] Real Indiana territory data — accounts, contacts, referral info populated
- [ ] Google Calendar — Today's Schedule reads real events
- [ ] Gmail — Recent emails visible on account detail
- [ ] Daily Brief — auto-generated, not on-demand
- [ ] Settings + Privacy screen
- [ ] PHI warning surfaced in review screen
- [ ] City names normalized (no ALL CAPS)
- [ ] Referral Guide — all accounts have complete fax and referral wording
- [ ] No plaintext token storage
- [ ] TestFlight build available
