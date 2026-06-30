# Continuo — System Architecture

## Stack Overview

| Layer | Technology |
|-------|-----------|
| Mobile | Expo 56 / React Native / expo-router / TypeScript |
| Backend | FastAPI (Python 3.11+) / SQLAlchemy / Uvicorn |
| Database | PostgreSQL (Railway production) / SQLite (local dev) |
| AI | Anthropic Claude API (Haiku for extraction, configurable) |
| Auth | JWT (python-jose) / bcrypt / Apple Sign-In / Google OAuth |
| Hosting | Railway (fulfilling-transformation project) |
| Build | EAS Build / TestFlight |

---

## Backend

### Deployment
- Platform: Railway — project `fulfilling-transformation`
- Service: `continuo` (GitHub-connected, auto-deploys on push to main)
- Domain: `https://continuo-production-2d36.up.railway.app`
- Process: `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (Procfile)

### Database
- Production: PostgreSQL on Railway (private URL: `postgres.railway.internal:5432`)
- Local: SQLite (`continuo_dev.db`) — auto-detected when `DATABASE_URL` is absent
- Schema creation: `Base.metadata.create_all()` runs on every startup (no Alembic)

### API Routes (10 files)

| Prefix | File | Purpose |
|--------|------|---------|
| `/auth` | auth_routes.py | Login, Google Sign-In, Apple Sign-In, JWT |
| `/` | routes.py | Voice journal, accounts, contacts, tasks, signals, debug |
| `/calendar` | calendar_routes.py | Google Calendar OAuth + events |
| `/email` | email_routes.py | Gmail OAuth + email scanning |
| `/notion` | notion_routes.py | Notion bidirectional sync |
| `/intelligence` | intelligence_routes.py | AI intelligence queries |
| `/daily-brief` | daily_brief_routes.py | Morning brief generation |
| `/opportunity` | opportunity_routes.py | Opportunity CRUD |
| `/milestone` | milestone_routes.py | Milestone CRUD |
| `/activity-history` | activity_history_routes.py | Completed activity log |

### Domain Models (13 tables)

| Model | Purpose |
|-------|---------|
| User | Authentication; email/password, Google OAuth, Apple OAuth |
| Account | Central entity — accounts/practices TDS visits; Salesforce-ready |
| Contact | People at accounts; linked to Account |
| VoiceJournalEntry | Raw capture (voice/typed/photo); source of truth for all extractions |
| Activity | Structured visit record extracted from VoiceJournalEntry |
| Task | Action items; links to Account and Opportunity |
| Signal | AI-detected intelligence flags (risks, opportunities, relationship notes) |
| Opportunity | Patient or referral opportunities linked to Account |
| Milestone | Clinical events (delivery, implant, screening, evaluation) |
| ActivityHistory | Immutable audit trail of completed actions |
| CalendarToken | Google Calendar OAuth credentials per user |
| EmailToken | Gmail OAuth credentials per user |
| AuditLog | Security audit trail |

---

## Mobile

### Key Dependencies

| Package | Purpose |
|---------|---------|
| expo-router | File-based navigation |
| expo-speech-recognition | On-device voice transcription (iOS) |
| expo-linear-gradient | Orb sphere gradients |
| expo-local-authentication | Face ID / biometric unlock |
| expo-secure-store | iOS Keychain token storage |
| expo-apple-authentication | Apple Sign-In |
| react-native-gesture-handler | Swipe gestures |
| react-native-svg | SVG icons in Orb and Quick Actions |
| @expo-google-fonts/hanken-grotesk | Primary UI font |
| @expo-google-fonts/newsreader | Orb prompt / editorial font |
| @expo-google-fonts/space-mono | Monospace / code font |

### Source Structure

```
mobile/
  app/                        # Expo Router screens
    (tabs)/                   # Tab bar screens
      index.tsx               # Today / Home
      accounts.tsx            # Accounts list
      tasks.tsx               # Tasks list
      settings.tsx            # Settings + integrations
      _layout.tsx             # Tab bar with Orb
    voice-capture.tsx         # Capture screen (full-screen modal)
    review/[id].tsx           # Review screen (editable AI output)
    account/[id].tsx          # Account detail
    sign-in.tsx               # Auth screen
    biometric-unlock.tsx      # Face ID unlock
    _layout.tsx               # Root stack + font loading
  src/
    api/client.ts             # API base URL + typed fetch methods
    components/
      Logo.tsx                # Bead-trail logo SVG
      OrbButton.tsx           # Center nav Orb (dark sphere)
      QuickActionsSheet.tsx   # Quick Actions bottom sheet
    constants/colors.ts       # OKLCH brand palette as hex
    context/
      AuthContext.tsx         # Auth state + login methods
      OrbContext.tsx          # Orb state (idle/listening/thinking)
    types/index.ts            # Shared TypeScript types
```

### App Identity

| Field | Value |
|-------|-------|
| Bundle ID | `com.sarahblair.continuo` |
| App Scheme | `continuo` |
| EAS Project ID | `290d2e7f-dd7d-4b15-8ba5-fc8786f9a8c2` |
| EAS Account | `sarblair` |
| ASC App ID | `6785342005` |
| Apple Team | `HR82ZR3953` |

---

## Environment Variables (Railway)

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `ADMIN_PASSWORD` | Seeded admin account password |
| `ANTHROPIC_API_KEY` | Claude API access |
| `GOOGLE_CLIENT_ID` | Google OAuth Web client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Web client secret |
| `GOOGLE_REDIRECT_URI` | Calendar OAuth callback URL |
| `GMAIL_REDIRECT_URI` | Gmail OAuth callback URL |
| `GOOGLE_AUTH_REDIRECT_URI` | Google Sign-In callback URL |
| `NOTION_TOKEN` | Notion integration token (optional) |
| `NOTION_DATABASE_ID` | Notion database ID (optional) |
