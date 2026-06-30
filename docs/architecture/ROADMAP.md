# Continuo — Roadmap

## Now (Build 13 — active)

- Dark Orb nav button with halo + queue badge
- Capture screen: pearl Orb, live waveform, mode dock (mic / keyboard / camera), auto-analyze
- Review screen: editable soft cards, tap-to-edit, save overlay with Orb animation
- PostgreSQL on Railway (persistent data)
- Gmail account scanning (email → structured account data via Claude)
- Email/password sign-in + Apple Sign-In + Google Sign-In (pending OAuth fix below)

---

## Next (unscheduled — prioritized backlog)

### Ticket 1 — Google Sign-In OAuth fix
- Add `GOOGLE_AUTH_REDIRECT_URI` to Railway variables
- Add `/auth/google-callback` URI to Google Cloud Console
- No code changes required

### Calendar + Gmail reconnect
- Reconnect in Settings after Railway domain change
- Verify `connected: true` in debug/db

### OrbContext queue count badge
- `OrbContext` needs `queueCount` / `setQueueCount` exposed
- Today screen sets count when drafts exist in `pending_review` status
- OrbButton clay badge appears when `queueCount > 0`

### Today screen — save toast
- Success toast after Save / Save for Later from Review screen
- Design spec calls for brief confirmation before returning to Today

### Review Queue card on Home
- Design spec shows a card on Today screen when queue count > 0
- Taps into the drafts list; consistent with new Review screen styling

---

## Future (do not build yet)

### Continuo 2.0 — The Orb
- Orb as unified intelligent center nav (not just capture entry)
- "Tap the Orb" as the primary interaction model for all intelligence surfaces
- Context-aware capture: Orb knows where you are, who you're with, what's next
- AI state animations: idle → listening → thinking → responding
- See memory: project_continuo_orb.md

### Morning Brief
- Auto-prepared every morning
- Weather + drive time + calendar + patient confirmations + follow-ups + inbox priorities
- No user action required to generate

### Live Visit Mode
- Auto-triggers when arriving at an account (location or calendar signal)
- Surfaces: recent emails, last visit, contacts, open tasks, promised documents, meeting objectives

### End-of-Day Review
- Signature feature: summary of visits, pending follow-ups, tomorrow's schedule
- Suggested actions with time estimate
- One-tap to draft follow-up emails, send confirmations, create opportunities

### 8x8 SMS Integration
- Research sprint required before building
- Patient confirmation workflows, reply detection, automatic logging
- HIPAA/security review required
- See INTEGRATIONS.md for research questions

### Salesforce Sync
- Fields already reserved in Account, Contact, Task models
- Full bidirectional sync (Continuo → Salesforce, not Salesforce → Continuo)
- Continuo complements Salesforce; does not replace it (see PRODUCT_VISION.md Principle 0)

---

## Architecture Constraints (apply to all future work)

- Security is a product feature: least privilege, user-owned data, iOS Keychain, HIPAA-readiness
- Domain models stay Salesforce-neutral
- Extraction logic stays in services, not routes
- Voice-first; signals are inbox not storage; every card editable/deletable
- No reload on back navigation
