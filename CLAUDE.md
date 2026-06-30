# Claude Code Instructions

You are working on Continuo, an AI-powered Field Intelligence Platform for medical device field reps (Therapy Development Specialists).

## Product Concept

Continuo converts field recaps into structured field intelligence:
- Accounts, Contacts, Activities, Tasks
- Referral pathway updates, Risks, Opportunities
- Milestones, Relationship notes, Follow-ups

## Product Principles

### 0. Continuo complements Salesforce. It does not replace it.

Continuo exists to make field professionals dramatically more effective by capturing, organizing, and preparing information while they work. Salesforce remains the corporate system of record. Continuo is the intelligent field companion that sits beside Salesforce, not on top of it.

Continuo should answer questions like:
- What just happened?
- Who did I meet?
- What do I need to remember?
- What should I do next?
- What should I update in Salesforce?
- Can you draft my follow-up email?
- Prepare my CRM update from today's visits.

The user should spend their time talking to Continuo, not manually organizing information across multiple systems.

### 1. Tap the Orb.

If something happened, tap the Orb. Never ask the user where information belongs before capturing it.

### 2. Capture first. Organize later.

The user tells Continuo what happened. Continuo determines: Accounts, Contacts, Activities, Tasks, Milestones, Follow-ups, Opportunities, Relationships.

### 3. AI suggests. Humans approve.

AI organizes. The user reviews. Nothing important is committed without approval.

### 4. Never lose a thought.

If the network fails, if AI fails, if the app crashes — the capture is still preserved.

### 5. Conversations over forms.

Every workflow should feel like talking to an intelligent assistant. The user should never feel like they are filling out CRM fields.

### 6. Context is everything.

Continuo should quietly understand context from: Calendar, Gmail, current account, current contact, previous visits, location (when appropriate), past conversations. The user should not repeat information Continuo already knows.

### 7. One source of truth.

Information should exist once. Accounts, contacts, tasks, and activities should never be duplicated. Relationships should connect everything.

### 8. Calm software.

Continuo should reduce cognitive load. Avoid clutter. Avoid unnecessary notifications. Surface only what is helpful right now.

### 9. Review before Save.

Review is the user's moment of control. Everything can be edited. Everything can be approved. Everything can be saved for later.

### 10. Everything begins with the Orb.

The Orb is not just a button. The Orb is the primary way users interact with Continuo's intelligence. If something happened — Tap the Orb.

### 11. Time belongs with people, not software.

Every minute Continuo saves on note-taking, remembering names, organizing follow-ups, or preparing Salesforce updates is a minute the user can spend building relationships with therapists, physicians, and patients. If Continuo always optimizes for giving time back to the user, it will stay focused on solving the right problems.

## Language

Use these exact terms in UI copy and code:
- **Orb** — the center nav button / capture entry point ("Tap the Orb")
- **Capture** — the action of recording a field recap (not "voice journal")
- **Notes** — AI-extracted signals (not "Signals", not "Memories")
- **People** — contacts (not "Contacts")
- **Save** — commit approved items to knowledge base (not "Save Memory")
- **Save for Later** — park a draft in the Review Queue without committing
- **Review** — the editable AI-output screen (not "Review Memory")

Avoid: "Memory", "Signals", "Defer", technical AI labels.

## Architecture Rules

- Keep domain models neutral and Salesforce-ready.
- Do not hard-code Salesforce into core models.
- Use provider abstractions for future integrations.
- Keep extraction logic in services, not routes.
- Keep API routes thin.
- Use Pydantic schemas for request/response validation.
- Use SQLite locally, but keep database code PostgreSQL-compatible.
- Security: least privilege, user-owned data, iOS Keychain/Android Keystore, design for eventual HIPAA-readiness.
