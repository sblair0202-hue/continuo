# Continuo — Production Readiness & TestFlight Spec
**Date:** 2026-06-28
**Author:** Sarah Blair
**Prepared for:** External readiness review / App Store submission planning

---

## What Is Continuo

Continuo is a mobile-first Field Intelligence Platform for medical device sales reps. It converts field visit recaps into structured intelligence: accounts, contacts, signals, tasks, opportunities, and milestones. Purpose-built for a Vivistim therapy rep working the Indiana territory, and designed from the start to scale into a multi-user SaaS platform.

**Current user:** Sarah Blair (solo user, developer/beta role)
**Platform target:** iOS (TestFlight → App Store), Android (future)
**Stack:** React Native (Expo Router), FastAPI backend, SQLite (dev) / PostgreSQL (prod), Anthropic Claude AI

---

## What Is Built and Working

### Screens

| Screen | Route | Status |
|--------|-------|--------|
| Sign In | `/sign-in` | Working — JWT, biometric unlock |
| Biometric Unlock | `/biometric-unlock` | Working — Face ID / Touch ID |
| Home / Dashboard | `/(tabs)/index` | Working — daily brief, calendar, signals |
| Accounts | `/(tabs)/accounts` | Working — list, filter by momentum/risk/opportunity |
| Capture | `/(tabs)/capture` | Partial — text recap works; voice is a placeholder |
| Search | `/(tabs)/search` | Working — accounts, contacts, signals, tasks |
| Settings | `/(tabs)/settings` | Working — Gmail, Google Calendar, Notion integrations |
| Account Detail | `/account/[id]` | Working — signals, opportunities, milestones, tasks, contacts, referral info, emails |
| Meeting Detail | `/meeting/[id]` | Working — meeting prep brief |
| Recap Review | `/review/[id]` | Working — extraction preview and approval |
| Referral Guide | `/referral-guide` | Working — multi-site guide generator, email/text/share output |

### Core Features

- **Voice recap → structured extraction:** Rep submits a text recap; AI extracts accounts, contacts, signals, tasks, opportunities, risks, and referral pathway updates
- **Signal inbox:** Per-account signals with swipe-to-accept, dismiss, convert (opportunity / task / milestone)
- **Account snapshot:** AI-generated narrative summary of an account's status on demand
- **Prepare for Visit:** AI bullet-point brief before a site visit
- **Daily Brief:** On-demand AI summary of territory status, tasks, and meetings
- **Referral Guide:** Select one or more sites, generate a formatted referral email or text message; filters by Implant Center / Therapy Site / Eval Site
- **Recent Emails per account:** Gmail threads matched to account name/contacts, visible in account detail
- **Google Calendar integration:** Today's schedule, meeting prep
- **Notion sync:** Push account data to Notion database
- **Biometric unlock:** Face ID / Touch ID after initial auth

### Data Model

- **Accounts:** name, organization, city/state, momentum, priority, next action, address, phone, fax, referral contact, referral email, referral instructions, scheduling instructions, preferred referral method, insurance notes, is_implant_center, is_therapy_site, is_evaluation_site, vivistim_status
- **Contacts:** name, role, discipline, phone, champion level, relationship status, relationship notes
- **Signals:** type (relationship, implementation, momentum, opportunity, risk, milestone, continuity, referral_pathway, crm, task, win, question), title, summary, evidence, confidence score, impact level, urgency, suggested action
- **Tasks:** title, description, due date, priority, status, category (crm, follow_up, education, patient, travel, administrative, personal, other)
- **Opportunities:** title, status (new/active/waiting/won/lost), notes, next action
- **Milestones:** title, date, type, notes
- **Activity History:** completed tasks and activities log

---

## Security Architecture (P0)

Security is a product feature in Continuo, not an afterthought. The app touches clinical workflows, referral pathways, and patient-adjacent communication. Every security decision must be made as if a HIPAA auditor will eventually review it.

### Authentication

| Method | Status | Notes |
|--------|--------|-------|
| Email / password | Planned | Sprint 10 target |
| Google Sign-In | Planned | expo-auth-session |
| Sign in with Apple | Required | Apple guideline 4.8 — mandatory if Google is offered |
| Face ID / Touch ID (iOS) | Built | expo-local-authentication — re-prompt after timeout |
| Android Biometrics | Planned | Same library, Android path |
| MFA / TOTP | Future | Post-launch; required before enterprise accounts |

### Authorization

| Level | Description |
|-------|-------------|
| User | Can only read/write their own data |
| Organization | Can read org-wide accounts and contacts (future) |
| Admin | Can manage users within their org |
| Developer | Unlimited access, feature flags, debug tools, seed data |

Developer role is gated by account flag, not a separate build. Sarah's account is permanently `role = developer`. Ordinary users never see developer UI.

### Session Management

- JWT access tokens: short-lived (15 min)
- Refresh tokens: stored in expo-secure-store (iOS Keychain / Android Keystore), never in AsyncStorage
- Automatic session timeout after inactivity (configurable, default 30 min)
- Re-authentication prompt for sensitive actions: referral edits, data export, integration connect/disconnect
- Token refresh happens silently in background; expired refresh token forces full re-login

### Encryption

| Layer | Requirement |
|-------|-------------|
| In transit | TLS 1.2+ everywhere; no HTTP allowed |
| At rest — tokens | iOS Keychain / Android Keystore via expo-secure-store |
| At rest — database | PostgreSQL encryption at rest (provider-managed or pgcrypto) |
| OAuth tokens | Never stored as plaintext — currently a known blocker (see BLOCK-3) |
| AI prompts | No PHI in prompts sent to Anthropic; strip or anonymize before sending |

### Audit Logs

The `audit_logs` table is already in the database schema. The following events must be written:

| Event | When |
|-------|------|
| `login` | Successful authentication |
| `logout` | User-initiated or session expiration |
| `failed_login` | Unsuccessful auth attempt (track IP + count for lockout) |
| `export` | Any data export or share (Referral Guide, data download) |
| `referral_edit` | Any change to referral instructions, fax, or contact |
| `integration_connect` | Gmail, Calendar, or Notion connected |
| `integration_disconnect` | Any integration revoked |
| `account_delete` | User account deletion |
| `data_access` | Future — PHI-adjacent record access (patient-linked records) |

---

## Developer Mode

Sarah is simultaneously the developer, the first customer, the admin, and the tester. Those roles must not be permanently merged.

**Developer Mode** is a role-gated overlay visible only when `user.role == "developer"`. Ordinary users never see it.

```
Developer Mode (Settings → Developer)

Developer Account
  ✓ Unlimited access
  ✓ Feature flags (toggle unreleased features)
  ✓ Seed data (reset to clean demo state)
  ✓ Debug tools (API request log, response inspector)
  ✓ Analytics (usage metrics, AI call counts)
  ✓ AI prompt testing (send custom prompts, view raw output)
  ✓ Sync inspector (last sync time, token status, error log)
  ✓ Database viewer (read-only row counts and recent records)
  ✓ Force daily brief regeneration
  ✓ Clear local cache
```

When a second user is added, they get no developer UI regardless of what they request. Developer mode is assigned by Sarah from the admin panel, not self-serve.

---

## HIPAA Readiness

Continuo is not yet claiming HIPAA compliance. However, it is intentionally designed toward handling sensitive clinical workflows and will eventually need a Business Associate Agreement (BAA) with customers. The checklist below tracks progress toward that goal.

```
HIPAA Readiness Checklist

Technical Safeguards
  □ No PHI in logs (app logs, server logs, crash reports)
  □ No PHI in analytics events
  □ No PHI in AI prompts sent to Anthropic
  □ Encryption at rest (database + tokens)
  □ TLS in transit (enforced, no HTTP fallback)
  □ Access controls (user-level data isolation)
  □ Audit logs (login, logout, export, referral edits)
  □ Automatic session timeout
  □ Screen privacy (prevent screenshots of sensitive screens — iOS .ignoredByRecorder)
  □ Failed login lockout (max attempts before temporary block)

Administrative Safeguards
  □ Minimum necessary display (show only what the user needs)
  □ PHI warning on Capture screen (no patient names in recaps)
  □ PHI warning on Review screen (flag when AI detects patient identifiers)
  □ User training documentation

Organizational Safeguards
  □ Vendor BAAs (Anthropic, cloud provider, any third-party processors)
  □ Disaster recovery plan
  □ Automated database backups (daily minimum)
  □ Key rotation policy
  □ Incident response plan
```

**Current status:** Encryption in transit is present (HTTPS). All other items are open. Target: complete technical safeguards before any non-Sarah user touches clinical data.

---

## Data Ownership

Every record in Continuo has a clear owner. Orphan records — data that belongs to no user or organization — are never created.

```
Ownership Hierarchy

Organization
  └── User
        ├── Accounts
        │     ├── Contacts
        │     ├── Signals
        │     ├── Tasks
        │     ├── Opportunities
        │     ├── Milestones
        │     ├── Activity History
        │     └── Referral Pathways
        └── Voice Journal Entries
```

**Rules:**
- Every record has a `user_id` foreign key. No nullable `user_id` on any data table.
- Organization-level records (shared accounts, shared contacts) have an `org_id` and are visible to all users in that org.
- Deleting a user cascades a soft-delete on their records; hard delete requires admin confirmation.
- Data export includes only records owned by or shared with the requesting user.
- AI features never use one user's data to inform another user's results.

**Current gap:** `user_id = "sarah"` is hardcoded everywhere. Sprint 10 introduces real user models. All tables must be verified to have proper `user_id` foreign keys before multi-user support goes live.

---

## Organization Support (Architectural Requirement)

This is the largest architectural decision remaining before commercial launch. Without organizations, Continuo cannot support a sales team, a distributor, or a hospital system.

```
Planned Hierarchy

Mobia (Organization)
  ├── Sarah Blair (Developer / TDS)
  ├── Chris Meketansky (TDS)
  └── Jacob Gritton (RSM)

Hospital XYZ (Future Organization Type)
  ├── Rehab Director
  ├── OT
  └── PT

Distributor (Future)
  └── ...
```

**Why this must be architected now:**
- Adding `org_id` to every data table after launch requires a full migration and likely a data freeze
- Role-based access control (RBAC) must be designed around org membership from the start
- Shared accounts (e.g., Franciscan Lafayette visible to all Mobia Indiana reps) require org-scoped records
- Billing and subscription will be org-level, not user-level

**Minimum viable org model for TestFlight:**
- `organizations` table: id, name, type (vendor / hospital / distributor)
- `org_users` join table: org_id, user_id, role (admin / member / readonly)
- All existing data migrated to Sarah's org
- No org UI required yet — just the schema and FK enforcement

---

## Onboarding Flow

First-run experience matters for TestFlight reviewers and future users. The current state (straight to sign-in, then an empty app) is not acceptable for public distribution.

```
Welcome to Continuo
        ↓
Create account (email or Google or Apple)
        ↓
Verify email
        ↓
Enable Face ID (or skip)
        ↓
Connect Google Calendar (or skip)
        ↓
Connect Gmail (or skip)
        ↓
Connect Notion (or skip)
        ↓
Choose territory / organization
        ↓
You're ready. Here's what Continuo does. →
```

Each step is skippable except account creation. Skipped integrations are surfaced again in Settings. The final screen is a one-time orientation card (not a tutorial) explaining the Capture → Review → Intelligence loop.

---

## Referral Info — Current State

As of 2026-06-28, referral data has been populated for 15 of 19 accounts from email and Notion sources.

**Remaining gaps:**
| Account | Missing |
|---------|---------|
| North Central PT (Logansport) | All fields |
| Rehab Hospital of Indiana | All fields — onboarding, no pathway yet |
| Riverview (Noblesville) | Phone + fax |
| IU Bloomington | Phone + address |
| Franciscan Crawfordsville | Address only |

**UI issues to fix before TestFlight:**
- Referral Info section is collapsed by default on Account Detail — should open by default
- `hasReferralInfo` badge in Referral Guide checks only 3 of 6+ referral fields — fix to check all
- City names for some imported accounts are ALL CAPS — normalize

---

## Critical Blockers — Must Fix Before TestFlight

### BLOCK-1: Authentication hardcoded to single user
Every backend route uses `USER_ID = "sarah"`. A second person installing the app sees all of Sarah's data.

**Status:** Sprint 10 built 2026-06-28. Needs verification against checklist below.
**Required:** Real JWT auth, Google Sign-In, Sign in with Apple, expo-secure-store for all tokens.

### BLOCK-2: Backend API URL hardcoded to local machine
`mobile/src/api/client.ts:31` — `http://192.168.1.204:8001`
TestFlight testers cannot reach this URL.

**Required:** Deploy FastAPI backend to cloud (Railway / Render / Fly.io). Update `API_BASE_URL` via `app.json` config per environment.

### BLOCK-3: OAuth tokens stored as plaintext
`CalendarToken` and `EmailToken` rows store access and refresh tokens as unencrypted text in SQLite.

**Required:** Encrypt at rest before any user connects a Google account.

### BLOCK-4: No production backend
SQLite on a laptop is not a production database.

**Required:** PostgreSQL on a managed cloud provider. Automated daily backups. Connection pooling (pgBouncer or provider-managed).

### BLOCK-5: Apple requirements
- Bundle identifier registered in App Store Connect
- `eas.json` production profile configured
- Privacy policy URL (required for TestFlight)
- Sign in with Apple implemented (Apple guideline 4.8)

---

## High Priority — Fix Before Other Users

| ID | Issue |
|----|-------|
| HIGH-1 | PHI warning not shown on Review screen — `possible_phi_warning` flag is extracted but never displayed |
| HIGH-2 | No offline mode — app crashes without network; critical in hospitals |
| HIGH-3 | City names in ALL CAPS from Salesforce import |
| HIGH-4 | Voice capture is a placeholder — core product vision unbuilt |
| HIGH-5 | No onboarding — new users land on an empty app with no guidance |
| HIGH-6 | No failed login protection — no lockout, rate limiting, or attempt logging |

---

## Medium Priority — Rough Edges

| ID | Issue |
|----|-------|
| UX-1 | Daily Brief is on-demand only — no auto-generation or push notification |
| UX-2 | PHI guidance missing on Capture screen |
| UX-3 | Referral Info section collapsed by default on Account Detail |
| BACKEND-1 | Email signal extraction scans only last 48 hours |
| POLISH-1 | Account Snapshot re-fetches every screen open; should cache 24 hours |
| POLISH-2 | Search results unranked |
| POLISH-3 | `hasReferralInfo` badge logic incomplete |

---

## Not Built Yet (Confirmed Future)

- Settings + Privacy screen (Sprint 11)
- Organization support + RBAC
- Voice recording + transcription (Whisper)
- Visit Mode ("I'm here" flow)
- Quick Add floating button
- Offline mode with sync on reconnect
- Gmail Phase 2 — draft follow-up emails
- Push notifications (Daily Brief, visit reminders, task due)
- Attachments per account
- Analytics dashboard (developer role)
- MFA / TOTP
- Screen privacy (iOS screenshot suppression)
- Admin panel (user management, org management)

---

## Privacy Policy (Required for App Store)

A privacy policy is required before App Store submission. For TestFlight it can be a simple hosted page. For the App Store it must cover all of the following:

```
Privacy Policy — Required Sections

1. What data is collected
   - Account information (name, email)
   - Territory data (accounts, contacts, referral info)
   - Voice/text recap content
   - Google Calendar events (read-only)
   - Gmail thread content (read-only, scoped to account matching)
   - Notion database content (write, for sync)
   - Device identifiers

2. Why it is collected
   - To provide field intelligence features
   - To enable AI-powered extraction and summarization

3. AI processing
   - Transcripts are sent to Anthropic for processing
   - Anthropic's data usage policy applies
   - PHI should not be entered; no warranty for PHI handling

4. Third-party integrations
   - Google (Calendar, Gmail) — OAuth, data accessed per user session
   - Notion — OAuth, data written on user request
   - Anthropic — AI processing

5. Data storage and retention
   - Data stored on [cloud provider] servers in [region]
   - Retained until account deletion
   - OAuth tokens encrypted at rest

6. Account deletion
   - User can request deletion from Settings → Privacy → Delete My Data
   - All records permanently deleted within [X] days

7. Contact
   - sarah.blair@mobia.com
```

---

## TestFlight Readiness Checklist

### Infrastructure
- [ ] Backend deployed to cloud with public HTTPS URL
- [ ] PostgreSQL replacing SQLite in production
- [ ] `API_BASE_URL` updated to deployed URL in mobile config
- [ ] Automated daily database backups configured
- [ ] Environment separation: dev / staging / prod

### Authentication Tests
- [ ] Apple Sign-In — new user creates account
- [ ] Apple Sign-In — returning user logs in
- [ ] Google Sign-In — new user creates account
- [ ] Google Sign-In — returning user logs in
- [ ] Email / password — sign up
- [ ] Email / password — log in
- [ ] Password reset flow
- [ ] Email verification
- [ ] MFA enrollment and login (when built)
- [ ] Face ID unlock after app backgrounded
- [ ] Touch ID unlock (alternate)
- [ ] Token refresh — access token expires, app silently refreshes
- [ ] Session expiration — refresh token expires, user is sent to login
- [ ] Offline launch — app opens without network, shows cached data
- [ ] Logout — tokens cleared, user sent to sign-in
- [ ] Account deletion — all data removed
- [ ] Failed login lockout — 5 failed attempts triggers temporary block
- [ ] SQL injection test — malformed input does not reach database
- [ ] Cross-user isolation — User A cannot see User B's data

### Security
- [ ] No plaintext OAuth tokens in database
- [ ] All tokens stored in expo-secure-store (Keychain / Keystore)
- [ ] No credentials in logs or crash reports
- [ ] TLS enforced — no HTTP fallback
- [ ] Audit log writes verified for login, logout, export, referral edits

### Apple / EAS Build
- [ ] Apple Developer account active
- [ ] Bundle identifier registered in App Store Connect
- [ ] `eas.json` with production build profile
- [ ] `app.json` with correct name, version, bundle ID
- [ ] Sign in with Apple entitlement added
- [ ] EAS production build passes on physical iOS device

### App Store / TestFlight Metadata
- [ ] Privacy policy URL live and linked in App Store Connect
- [ ] App name, subtitle, description written
- [ ] App category selected (Business or Medical)
- [ ] Screenshots: 6.7", 6.5", 5.5" iPhone sizes
- [ ] TestFlight beta description and what-to-test notes

### HIPAA / Safety
- [ ] PHI warning displayed on Review screen
- [ ] PHI guidance on Capture screen
- [ ] No PHI sent to Anthropic in prompts
- [ ] Failed login lockout active

### Data Quality
- [ ] Referral info complete for all active Indiana sites
- [ ] City names normalized (no ALL CAPS)
- [ ] Referral Info section expanded by default
- [ ] `hasReferralInfo` badge checks all referral fields

### Core Flow Validation
- [ ] New user signs in → sees empty but functional app → onboarding completes
- [ ] Capture → extraction → review → approve → signals appear on account
- [ ] Referral Guide generates correct email and text output
- [ ] Google Calendar shows real events, meeting prep works
- [ ] Gmail shows recent emails per account
- [ ] Account detail shows complete referral info for Indiana territory sites
- [ ] Developer Mode visible only to developer account
- [ ] Ordinary test user sees no developer UI

---

## App Store Submission Checklist (Post-TestFlight)

- [ ] All TestFlight blockers resolved
- [ ] Organization model in place (at minimum: schema + single-org support)
- [ ] Onboarding flow complete
- [ ] Settings + Privacy screen live
- [ ] Account deletion self-serve in app
- [ ] Privacy policy finalized and linked
- [ ] App Store screenshots polished
- [ ] Age rating completed (likely 4+ or 12+ depending on clinical content review)
- [ ] Export compliance answered (uses standard encryption = Yes)
- [ ] Contact information for App Review team
- [ ] App Review notes explaining Vivistim / medical device context

---

## Open Questions for External Review

1. Is SQLite acceptable for a single-user TestFlight build, or is PostgreSQL a hard requirement to pass Apple review?
2. What does Sign in with Apple require specifically in an Expo managed workflow — `expo-apple-authentication` vs `expo-auth-session`?
3. At what point does handling referral pathway information for a medical device trigger HIPAA or FDA oversight?
4. What is the minimum viable org model for the first non-Sarah user — is a single `org_id` column on the user table sufficient, or does the full hierarchy need to be in place?
5. What is the fastest production-ready path for FastAPI + PostgreSQL deployment for a solo developer — Railway vs. Render vs. Fly.io in 2026?
6. Does Anthropic offer a BAA for HIPAA-adjacent use cases, and what is required to get one?
7. What App Store category minimizes review friction for a medical field sales tool — Business, Medical, or Productivity?
