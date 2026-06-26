# Claude Code Instructions

You are working on Continuo, an AI-powered Field Intelligence Platform for field teams.

## Priority

Build Sprint 1 only unless explicitly instructed otherwise.

Do not overbuild. Do not add auth, real Salesforce sync, Gmail sync, calendar sync, polished UI, or mobile app until requested.

## Product Concept

Continuo converts field recaps into structured field intelligence:
- Accounts
- Contacts
- Activities
- Tasks
- Referral pathway updates
- Risks
- Opportunities
- Open questions
- Relationship notes

## Product Principles

1. Never lose the thread.
2. Continuity over documentation.
3. The user speaks, the AI organizes.
4. Review before automation.
5. One source of truth.
6. Relationships first.
7. Everything becomes intelligence.
8. Preserve the story.
9. Reduce cognitive load.
10. CRM-compatible, not CRM-dependent.

## Architecture Rules

- Keep domain models neutral and Salesforce-ready.
- Do not hard-code Salesforce into core models.
- Use provider abstractions for future integrations.
- Keep extraction logic in services, not routes.
- Keep API routes thin.
- Use Pydantic schemas for request/response validation.
- Use SQLite locally, but keep database code PostgreSQL-compatible.

## Sprint 1 Goal

Implement this flow:

1. User submits a transcript to `/voice-journal`.
2. System returns structured extraction preview.
3. User approves extraction via `/voice-journal/{id}/approve`.
4. System saves Accounts, Contacts, Activities, and Tasks.
5. User can view saved records through GET endpoints.

## Suggested Next Step

After installing dependencies, run:

```bash
cd backend
uvicorn app.main:app --reload
```

Open:

```text
http://127.0.0.1:8000/docs
```

Test the endpoints manually before adding features.
