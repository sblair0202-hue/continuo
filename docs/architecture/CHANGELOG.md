# Continuo — Build Changelog

## Build 13 — 2026-06-30
**Status:** Submitted to TestFlight

- Full Capture + Review design handoff (Orb 2.0 nav)
- OrbButton: dark ink sphere gradient, ring mark SVG, raised 14px, halo animation, clay badge for queue
- QuickActionsSheet: SVG icon tiles, actions (Voice Note / Type Note / Photo / Document)
- voice-capture.tsx: full Capture screen — 138px pearl Orb, live waveform, mode dock, auto-analyze on stop
- review/[id].tsx: editable soft cards (Summary / Accounts / People / Tasks / Activities / Notes / Opportunities / Milestones), tap-to-edit inline, save overlay with Orb animation
- expo-linear-gradient added (Orb sphere gradients)
- Newsreader_400Regular font loaded
- Email account scanning in Settings (POST /email/scan-accounts)
- API URL updated to new Railway domain: continuo-production-2d36.up.railway.app
- PostgreSQL live on Railway (data persists across deploys)
- CLAUDE.md: Product Principles 0–11, Language glossary

## Build 12 — 2026-06-30
**Status:** Failed (expo-linear-gradient missing from package-lock.json)

## Build 11 — 2026-06-30
**Status:** Finished but wrong commit (built from June 29 commit before design handoff); not submitted

## Build 10 — 2026-06-29
**Status:** Cancelled

## Build 9 — 2026-06-29
- On-device speech recognition via expo-speech-recognition (replaced OpenAI Whisper)
- PKCE removed from Google OAuth (Calendar/Gmail); switched to direct HTTP token exchange
- Live transcription as you speak; no upload/wait cycle
- Removed expo-av, removed openai dependency

## Builds 1–8 — 2026-06-29
- Sprint 1–9 foundation: accounts, contacts, voice journal, review, auth
- Biometric unlock (Face ID)
- Apple Sign-In
- Google Calendar + Gmail OAuth
- Notion import/sync
- Daily brief
- Opportunities + milestones
- Activity history
- Build 8: branded icon (bead-trail logo)
