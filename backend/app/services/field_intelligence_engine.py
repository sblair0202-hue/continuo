import json
import os

import anthropic

from app.schemas.extraction import (
    ExtractedAccount,
    ExtractedActivity,
    ExtractedContact,
    ExtractedReferralPathwayUpdate,
    ExtractedSignal,
    ExtractedTask,
    ExtractionResult,
)

_client: anthropic.Anthropic | None = None


def _get_client() -> anthropic.Anthropic:
    global _client
    if _client is None:
        _client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    return _client


_SYSTEM = """You are a field intelligence extraction engine for medical device sales reps.
Extract structured intelligence from voice recap transcripts.

Return ONLY valid JSON matching this exact schema — no markdown, no explanation:
{
  "summary": "1-2 sentence summary of the visit/recap",
  "accounts": [{"name": str, "city": str|null, "state": str|null, "status": str|null, "momentum": str|null, "next_action": str|null}],
  "contacts": [{"name": str, "account_name": str|null, "role": str|null, "discipline": str|null, "relationship_note": str|null, "relationship_status": str|null, "champion_level": str|null}],
  "activities": [{"account_name": str|null, "activity_type": str, "summary": str, "details": str|null, "outcome": str|null, "momentum": str|null, "next_step": str|null, "confidence_score": float}],
  "signals": [{"account_name": str|null, "contact_names": [str], "signal_type": str, "title": str, "summary": str|null, "evidence_text": str|null, "confidence_score": float, "impact_level": str, "urgency": str, "suggested_action": str|null, "status": "accepted"}],
  "tasks": [{"account_name": str|null, "title": str, "description": str|null, "priority": str, "task_type": str|null}],
  "referral_pathway_updates": [],
  "risks": [],
  "opportunities": [],
  "wins": [],
  "open_questions": [],
  "possible_phi_warning": false
}

Always return empty arrays [] for referral_pathway_updates, risks, opportunities, wins, and open_questions.

Signal types (pick the most specific): opportunity, win, risk, milestone, relationship, crm, continuity, referral_pathway, implementation, momentum, task, question
Impact levels: high, medium, low
Urgency levels: high, medium, low, none
Momentum values: rising, stable, declining, unknown
Champion levels: champion, supportive, emerging, neutral, unknown
Activity types: site_visit, therapist_training, lunch_and_learn, call, email, patient_eval, other

Rules:
- Extract ALL signals visible in the transcript — don't summarize, extract each one as its own signal
- Signals are the most important output — prioritize quantity and quality
- suggested_action should be a concrete next step for the sales rep
- If a patient is mentioned, set possible_phi_warning: true
- confidence_score range: 0.0 to 1.0"""


def extract_text_from_image(image_base64: str, media_type: str = "image/jpeg") -> str:
    """Use Claude vision to extract field-relevant text from a photo."""
    valid_types = {"image/jpeg", "image/png", "image/gif", "image/webp"}
    if media_type not in valid_types:
        media_type = "image/jpeg"
    msg = _get_client().messages.create(
        model="claude-haiku-4-5-20251001",
        max_tokens=1024,
        messages=[{
            "role": "user",
            "content": [
                {
                    "type": "image",
                    "source": {
                        "type": "base64",
                        "media_type": media_type,
                        "data": image_base64,
                    },
                },
                {
                    "type": "text",
                    "text": (
                        "You are a medical device sales rep assistant. "
                        "Describe everything in this image that is relevant to field intelligence: "
                        "names, titles, organizations, contact information, meeting notes, whiteboard content, "
                        "business cards, schedules, product names, or any clinical/facility context. "
                        "Write in plain sentences as if the sales rep is dictating their field notes from what they see. "
                        "If you see a business card, capture all contact details. "
                        "If you see handwritten notes, transcribe them. "
                        "If the image contains no useful field intelligence, say so briefly."
                    ),
                },
            ],
        }],
    )
    return msg.content[0].text.strip()


def extract_field_intelligence(transcript: str) -> ExtractionResult:
    try:
        msg = _get_client().messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=4096,
            system=_SYSTEM,
            messages=[{"role": "user", "content": f"Extract field intelligence from this recap:\n\n{transcript}"}],
        )
        raw = msg.content[0].text.strip()
        # Strip markdown code blocks if present
        if raw.startswith("```"):
            raw = raw.split("```")[1]
            if raw.startswith("json"):
                raw = raw[4:]
        data = json.loads(raw)

        def _parse_list(cls, items):
            result = []
            for item in items:
                try:
                    result.append(cls(**item))
                except Exception:
                    pass
            return result

        return ExtractionResult(
            summary=data.get("summary", "Field recap processed."),
            accounts=_parse_list(ExtractedAccount, data.get("accounts", [])),
            contacts=_parse_list(ExtractedContact, data.get("contacts", [])),
            activities=_parse_list(ExtractedActivity, data.get("activities", [])),
            signals=_parse_list(ExtractedSignal, data.get("signals", [])),
            tasks=_parse_list(ExtractedTask, data.get("tasks", [])),
            referral_pathway_updates=[],
            risks=[],
            opportunities=[],
            wins=[],
            open_questions=[],
            possible_phi_warning=data.get("possible_phi_warning", False),
        )
    except Exception as exc:
        raise RuntimeError(f"AI extraction failed: {exc}") from exc
