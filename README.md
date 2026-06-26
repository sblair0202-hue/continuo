# Continuo

Continuo is an AI-powered Field Intelligence Platform.

It turns field activity such as voice recaps, meetings, emails, calendar events, site visits, and CRM activity into structured account memory, follow-ups, relationship intelligence, and CRM-ready updates.

## MVP Goal

Build the core loop:

**Typed or voice recap → transcript → AI extraction → review → approve → save structured field intelligence.**

## Current Stack

- Backend: FastAPI
- Database: SQLite for local development, PostgreSQL-ready
- ORM: SQLAlchemy
- Schemas: Pydantic
- Future frontend: React Native / Expo
- Future integrations: Salesforce, Notion, Gmail, Calendar

## First Local Run

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Then open:

```text
http://127.0.0.1:8000/docs
```

## First Test Transcript

Use `POST /voice-journal`:

```json
{
  "user_id": "sarah",
  "transcript": "Met Todd at North Central Physical Therapy in Logansport. Dropped off the UEDX kit. They have three possible stroke patients. Judy may be the first assessment. Need to follow up with Todd next week and add North Central to Salesforce."
}
```
