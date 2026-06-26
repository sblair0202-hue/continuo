from pydantic import BaseModel

from app.schemas.extraction import ExtractionResult


class VoiceJournalCreate(BaseModel):
    user_id: str
    transcript: str


class VoiceJournalResponse(BaseModel):
    id: int
    transcript: str
    extraction_preview: ExtractionResult


class ApproveExtractionRequest(BaseModel):
    extraction: ExtractionResult
