# Continuo CHANGELOG

---

## Version 0.9 – Sprint 9 (Current)

**Status:** In Progress

### New

#### Capture: Photo Import
- Added "Import from photo" button to the Capture screen.
- Supports Camera and Photo Library via expo-image-picker.
- Image sent to backend as base64; Claude Haiku vision extracts field-relevant text.
- Extracted text populates the transcript field for review before Analyze.
- Loading state ("Reading photo...") and thumbnail preview shown.

#### Referral Data Import
- Imported 12 therapy site accounts from Salesforce export (All Active Therapy Sites).
- Populated address, city, state, referral instructions, and fax numbers for all matched accounts.
- Both Franciscan Indianapolis rows merged correctly into South Emerson account.
- Fax numbers extracted from referral instruction text and stored in the fax field.

### Product Decisions
- Photo import populates transcript (not skip directly to analyze) so reps can review and edit before committing.
- Referral instructions stored verbatim from Salesforce to preserve exact wording clinicians and schedulers expect.

---

## Version 0.8 – Sprint 8

**Status:** Complete

### New

#### Territory Intelligence
- `GET /accounts/{id}/snapshot` — AI account snapshot (Claude Haiku, loads inline on account detail).
- `GET /accounts/{id}/visit-brief` — Visit preparation brief (opens as modal sheet).
- `POST /ask` — Natural language territory questions answered with full account context.
- `GET /search?q=` — Real-time account/contact/signal search with 350ms debounce.
- `GET /weekly-brief` — On-demand territory summary on Home screen.

#### Design System Overhaul
- Reduced signal type colors from 12 to 3 semantic groups: risk (red), opportunity/win (green), neutral (all others).
- Added `surface2`, `surface3`, `textTertiary`, `positive`, `critical`, `warning`, `neutral` tokens.
- Added `sp` spacing system (xs=4, sm=8, md=16, lg=24, xl=32, xxl=48).
- Home screen hierarchy: Greeting → Daily Brief → Today's Schedule → Priority → Needs Attention → Territory → Weekly Brief → Tools.
- Territory Pulse tiles renamed: On Track, Watch, Risks, Leads.
- Account detail header: name + colored momentum dot + clinical types as inline text string.
- All AI-labeled elements removed symbol decorations ("✦ Ask Continuo" → "Ask").
- Search screen: dual-mode Search / Ask. Answer card uses `surface2`, no colored border.

### Product Decisions
- Design philosophy: "If Apple built Salesforce for clinicians, with Linear's attention to detail and Notion's calmness."
- AI labels should be neutral and calm — no sparkle symbols, no colored borders on AI content.
- Territory Pulse tiles filter the Accounts list when tapped.

---

## Version 0.7 – Sprint 7

**Status:** Complete

### New

#### Referral Guide Generator
- Account selection with checkboxes and quick filter chips (All / Implant / Therapy / Eval).
- Select All toggle. Generate Guide button with format picker: Email / Text / Share.
- Email format: full guide with address, phone, fax, instructions, greeting, and signature.
- Text format: condensed bullet list with name and phone.
- Share format: native Share sheet with Copy option.
- Entry points: Home screen card, Accounts tab button, Account detail screen.

#### Account Model Expansion (17 new fields)
- Address, phone, fax, website, account_type.
- Referral instructions, scheduling instructions, referral contact, referral email, preferred referral method, insurance notes.
- Clinical flags: is_implant_center, is_therapy_site, is_evaluation_site.
- vivistim_status, pm_r_available, neurosurgery_available.

#### Account Detail Enhancements
- Clinical type badges in header (Implant Center, Therapy Site, Eval Site).
- Referral Info collapsible section with edit modal.
- Contacts now tappable with full edit modal (name, role, discipline, phone, notes, champion level).
- `PATCH /accounts/{id}` and `PATCH /contacts/{id}` endpoints added.

### Product Decisions
- Referral Guide is a generation tool, not a stored document — generate fresh each time.
- Clinical types shown as inline text in header, not as separate badge row.

---

## Version 0.6 – Sprint 6

**Status:** Complete

### New

#### Account Screen Rewrite
- Opportunities as first-class entities (title, status, notes).
- Milestones with timestamps.
- Enhanced Tasks with categories, due dates, and done state.
- Activity History auto-populated on task completion or signal acceptance.
- `Promise.allSettled` for resilient loading — account screen shows even on partial failure.

#### Signal Workflow
- One-tap Accept (swipe right) creates entity instantly — no modal.
- `dismissedSignalIds` module-level Set prevents reappear on back navigation.
- Tap signal → Edit sheet with Save and "Save & Accept" buttons.
- ⋯ menu → "Convert to different type..." for when AI picked the wrong type.

#### AI Extraction
- Replaced keyword heuristics with real Claude Haiku call.
- Model: `claude-haiku-4-5-20251001`, max_tokens: 2048.
- Extracts signals, accounts, contacts, activities, tasks from any transcript.
- Frontend timeout increased to 45 seconds.

### Fixed
- Signals no longer reappear after acceptance on back navigation.
- Keyboard fix on Capture screen (Analyze button inside ScrollView, keyboardVerticalOffset=88).
- Swipeable tasks on Today screen with module-level dismissedTaskIds Set.

### Product Decisions
- Back navigation must never trigger refetch — use module-level cache or cooldown.
- Signal inbox is a triage surface, not a storage layer — dismiss quickly.

---

## Version 0.5 – Sprint 5

**Status:** Complete

### New
- Email Intelligence: Google OAuth + Gmail token storage + fetch recent emails + Claude signal extraction.
- Notion Sync: read accounts/tasks from Notion database via API.
- Daily Brief: AI-generated summary of signals, tasks, and territory state.
- `/email/connect`, `/email/callback`, `/email/status`, `/email/extract-signals` endpoints.
- `/notion/status`, `/notion/sync` endpoints.
- `/daily-brief` endpoint.

---

## Version 0.4 – Sprint 4

**Status:** Complete

### New
- Calendar Intelligence: Google OAuth flow, CalendarToken model.
- `GET /calendar/status`, `GET /calendar/today`, `GET /calendar/meeting-prep/{eventId}`.
- Today's Schedule section on Home screen.
- Meeting prep screen (`/meeting/[id]`) with Claude Haiku preparation summary.
- OAuth uses Desktop app credential type (allows localhost redirect).

---

## Version 0.1–0.3 – Sprints 1–3

**Status:** Complete

### Established
- FastAPI backend + SQLite, domain models: Account, Contact, Activity, Signal, Task, VoiceJournalEntry.
- Voice journal submission, AI extraction, approval flow.
- Expo Router v6 mobile app with tabs: Today, Accounts, Capture, Search.
- Signal lifecycle: New → Accepted → Active → Resolved → Rejected → Historical.
- Review Memory screen, signal lifecycle actions.
- Account detail screen with contacts, activities, signals.
- Mobile-first design direction established.

---

## Product Milestones

### Achieved
- AI Recaps
- Signal Inbox and lifecycle
- Opportunities, Tasks, Milestones, Activity History
- Daily Brief
- Calendar Intelligence (Google OAuth + meeting prep)
- Email Intelligence (Gmail OAuth + signal extraction)
- Referral Guide Generator
- Territory Intelligence (Ask, Search, Snapshot, Visit Brief, Weekly Brief)
- Design system overhaul
- Photo import from Capture screen
- Real Indiana territory referral data imported

### Version 1.0 Definition

Version 1.0 is complete when I can:
- Start my day in Continuo.
- Prepare for every meeting in Continuo.
- Record every recap in Continuo.
- Track every opportunity in Continuo.
- Share referral information from Continuo.
- Finish the workday without needing Notion or scattered notes.

---

## Product Decisions — Running Log

| Sprint | Decision | Rationale |
|--------|----------|-----------|
| 3 | Signals are inbox, not storage | Triage-first model reduces cognitive load |
| 6 | Back nav must not refetch | Prevents signal reappear; module-level cache used |
| 6 | One-tap Accept, no modal | Speed of capture matters more than confirmation friction |
| 7 | Referral Guide generates fresh, not stored | Data changes frequently; stale PDFs are dangerous |
| 8 | AI labels: no symbols, no colored borders | Calm and trustworthy > flashy |
| 8 | Territory Pulse tiles filter Accounts list | Tiles should be actionable, not decorative |
| 9 | Photo import populates transcript for review | Rep should confirm before committing extracted content |
| 9 | Referral instructions stored verbatim | Exact wording matters for clinical scheduling |
