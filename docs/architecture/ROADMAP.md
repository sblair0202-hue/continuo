# Continuo — Roadmap

## Product Statement

> **Continuo is an AI-powered field companion that helps healthcare professionals capture, organize, and act on everything that happens between Salesforce updates.**

Not a CRM. Not an EHR. Not a note-taking app. The intelligent companion that rides along between hospitals, remembers everything you tell it, prepares you for what's next, and makes all the administrative work feel almost effortless.

---

## Now (Build 13 — active)

- Dark Orb nav button with halo + queue badge
- Capture screen: pearl Orb, live waveform, mode dock (mic / keyboard / camera), auto-analyze
- Review screen: editable soft cards, tap-to-edit, save overlay with Orb animation
- PostgreSQL on Railway (persistent data)
- Gmail account scanning (email → structured account data via Claude)
- Email/password sign-in + Apple Sign-In + Google Sign-In
- Google Calendar integration (today events, meeting prep)
- Notion import/sync

---

## Priority 1 — Perfect the Core Capture Experience

This is the foundation everything else builds on.

- The Orb
- Voice capture → type capture → photo capture
- AI extraction (accounts, contacts, tasks, activities, signals)
- Review screen (editable, approvable)
- Save / Save for Later / Review Queue
- Never lose a thought (local preservation if network fails)
- Beautiful, calm UI

**Goal:** From leaving a meeting to having everything organized in under 30 seconds.

---

## Priority 2 — Gmail & Calendar That Actually Feel Connected

Connecting integrations should immediately provide value.

**Gmail:**
- Read recent emails per account
- Draft follow-up emails from recap context
- Account email timeline
- Associate emails with accounts and contacts

**Calendar:**
- Today's schedule with account context
- Meeting prep (last visit, open tasks, related contacts, talking points)
- Upcoming follow-ups surfaced automatically

**Goal:** Continuo should know your day before you do.

---

## Priority 3 — AI Follow-up Assistant

Highest ROI feature after the core workflow.

After every recap:
> "Draft follow-up email?"

One tap. Review. Send.

Automatically linked to account, contact, activity.

**Future extensions:**
- Draft LinkedIn message
- Draft meeting recap
- Draft text message

---

## Priority 4 — Conversational Assistant

A grounded AI assistant that knows your territory.

Examples:
- "Prep me for tomorrow."
- "Who needs a follow-up?"
- "Summarize Franciscan."
- "Who are my therapist champions?"
- "What accounts are stalling?"
- "What should I do today?"

Becomes the daily command center. Grounded in your actual accounts, contacts, emails, and calendar — not generic AI.

---

## Priority 5 — Salesforce Companion

Strategic distinction: Continuo does **not** replace Salesforce.

Instead: prepare Salesforce updates with almost no effort.

- Prepare Salesforce activity summary from recap
- Prepare call notes
- Prepare opportunity update
- Future: push to Salesforce via API

**Mission:** Spend less time typing into Salesforce.

---

## Priority 6 — Account Intelligence

Implementation tracking, not patient tracking. The unit of organization is the account.

- Referral workflow status
- Therapist champions
- Surgeon engagement
- Therapy training status per site
- Account milestones and implementation blockers
- Opportunity health
- Relationship map

---

## Priority 7 — AI Visit Preparation

Before every meeting, Continuo prepares you automatically.

Example — Tomorrow: Parkview

> Last meeting summary · Recent emails · Outstanding follow-ups · Open tasks · Referral workflow updates · Suggested talking points · Materials to bring

Like having an executive assistant prep your day.

---

## Priority 8 — AI Checklists

Generated automatically based on visit type.

**Lunch & Learn:** sign-in sheet, CEU forms, brochures, SAPS, business cards  
**Screening Day:** referral forms, FMA packets, consent paperwork  
**Training Visit:** therapy protocol, printed articles, magnet demo

No manual checklist creation.

---

## Priority 9 — Weekly Territory Intelligence

Every Friday:
- Visits completed
- Accounts advanced
- New referrals
- Follow-ups sent
- Accounts needing attention
- Therapist engagement
- Goals for next week

Weekly executive briefing, auto-generated.

---

## Priority 10 — Notion Migration & Long-Term Knowledge Base

Import existing knowledge: accounts, contacts, tasks, activities, notes, referral workflows.

Continuo becomes your primary personal knowledge base while Salesforce remains the official CRM.

---

## Deliberately Deferred

### Patient Journey Tracking
Valuable but not foundational.
- PHI concerns require HIPAA compliance work
- Doesn't solve the biggest daily pain point
- Can be layered on later focused on implementation support, not patient records

### 8x8 SMS Integration
Research sprint required before building. PHI may be present in patient SMS. HIPAA/security review required first.

---

## Architecture Constraints (apply to all future work)

- Security is a product feature: least privilege, user-owned data, iOS Keychain, HIPAA-readiness
- Domain models stay Salesforce-neutral and Salesforce-ready
- Extraction logic stays in services, not routes
- Voice-first; signals are inbox not storage; every card editable/deletable
- No reload on back navigation
- Unit of organization is the account, not the patient
