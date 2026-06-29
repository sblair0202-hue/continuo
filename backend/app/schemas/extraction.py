from typing import List, Optional

from pydantic import BaseModel, Field


class ExtractedAccount(BaseModel):
    name: str
    city: Optional[str] = None
    state: Optional[str] = None
    status: Optional[str] = None
    momentum: Optional[str] = None
    next_action: Optional[str] = None


class ExtractedContact(BaseModel):
    name: str
    account_name: Optional[str] = None
    role: Optional[str] = None
    discipline: Optional[str] = None
    relationship_note: Optional[str] = None
    relationship_status: Optional[str] = None
    champion_level: Optional[str] = None


class ExtractedActivity(BaseModel):
    account_name: Optional[str] = None
    activity_type: str
    summary: str
    details: Optional[str] = None
    outcome: Optional[str] = None
    momentum: Optional[str] = None
    next_step: Optional[str] = None
    confidence_score: float = 0.7


class ExtractedTask(BaseModel):
    account_name: Optional[str] = None
    title: str
    description: Optional[str] = None
    priority: str = "medium"
    task_type: Optional[str] = None


class ExtractedReferralPathwayUpdate(BaseModel):
    account_name: Optional[str] = None
    update_type: str
    detail: str
    open_question: Optional[str] = None


class ExtractedSignal(BaseModel):
    account_name: Optional[str] = None
    contact_names: List[str] = Field(default_factory=list)
    signal_type: str
    title: str
    summary: Optional[str] = None
    evidence_text: Optional[str] = None
    confidence_score: float = 0.8
    impact_level: str = "medium"
    urgency: str = "low"
    suggested_action: Optional[str] = None
    status: str = "accepted"


class ExtractionResult(BaseModel):
    summary: str
    accounts: List[ExtractedAccount] = Field(default_factory=list)
    contacts: List[ExtractedContact] = Field(default_factory=list)
    activities: List[ExtractedActivity] = Field(default_factory=list)
    signals: List[ExtractedSignal] = Field(default_factory=list)
    tasks: List[ExtractedTask] = Field(default_factory=list)
    referral_pathway_updates: List[ExtractedReferralPathwayUpdate] = Field(default_factory=list)
    risks: List[str] = Field(default_factory=list)
    opportunities: List[str] = Field(default_factory=list)
    wins: List[str] = Field(default_factory=list)
    open_questions: List[str] = Field(default_factory=list)
    possible_phi_warning: bool = False
