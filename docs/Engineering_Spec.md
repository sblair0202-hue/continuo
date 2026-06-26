# Engineering Spec

## Architecture

Frontend:
- React Native / Expo later
- For Sprint 1, use FastAPI docs or a minimal web UI later

Backend:
- FastAPI
- SQLAlchemy ORM
- Pydantic schemas

Database:
- SQLite locally
- PostgreSQL-ready later

AI:
- Sprint 1 uses heuristic extraction stub
- Later replace with LLM strict JSON extraction

## Core Pipeline

1. User creates voice journal entry with transcript.
2. AI extraction creates structured preview.
3. User reviews extraction.
4. Approved entities are saved:
   - Accounts
   - Contacts
   - Activities
   - Tasks
   - Referral pathway updates
5. Future integration sync writes approved updates to Salesforce or other systems.

## Salesforce-Ready Design

Do not hard-code Salesforce into core domain models.

Use provider abstraction later:

- search_accounts
- create_account
- update_account
- search_contacts
- create_contact
- update_contact
- create_task
- create_event
- create_note
- create_custom_object

## Security

- Encrypt tokens later
- Log AI-generated updates
- Require review before CRM writeback
- Avoid PHI storage
- Redact likely PHI when possible

## Sprint 1 API

- POST /voice-journal
- POST /voice-journal/{id}/approve
- GET /accounts
- GET /accounts/{id}
- GET /contacts
- GET /activities
- GET /tasks
