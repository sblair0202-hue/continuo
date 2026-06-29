from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship, backref

from app.database import Base


class Account(Base):
    __tablename__ = "accounts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False, unique=True)
    organization = Column(String, nullable=True)
    city = Column(String, nullable=True)
    state = Column(String, nullable=True)
    status = Column(String, default="prospect")
    priority = Column(String, nullable=True)
    momentum = Column(String, default="unknown")
    momentum_score = Column(Float, default=0)
    last_activity_at = Column(DateTime, nullable=True)
    next_action = Column(Text, nullable=True)
    salesforce_account_id = Column(String, nullable=True)

    # Basic contact info
    address = Column(Text, nullable=True)
    phone = Column(String, nullable=True)
    fax = Column(String, nullable=True)
    website = Column(String, nullable=True)
    account_type = Column(String, nullable=True)

    # Referral info
    referral_instructions = Column(Text, nullable=True)
    scheduling_instructions = Column(Text, nullable=True)
    referral_contact = Column(String, nullable=True)
    referral_email = Column(String, nullable=True)
    preferred_referral_method = Column(String, nullable=True)
    insurance_notes = Column(Text, nullable=True)

    # Clinical flags
    is_implant_center = Column(Boolean, default=False)
    is_therapy_site = Column(Boolean, default=False)
    is_evaluation_site = Column(Boolean, default=False)
    vivistim_status = Column(String, nullable=True)
    pm_r_available = Column(Boolean, default=False)
    neurosurgery_available = Column(Boolean, default=False)

    contacts = relationship("Contact", back_populates="account")
    activities = relationship("Activity", back_populates="account")
    tasks = relationship("Task", back_populates="account")
    signals = relationship("Signal", back_populates="account")
    opportunities = relationship("Opportunity", back_populates="account")
    milestones = relationship("Milestone", back_populates="account")
    activity_history = relationship("ActivityHistory", back_populates="account")


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    name = Column(String, index=True, nullable=False)
    role = Column(String, nullable=True)
    discipline = Column(String, nullable=True)
    email = Column(String, nullable=True)
    phone = Column(String, nullable=True)
    champion_level = Column(String, default="unknown")
    relationship_status = Column(String, default="active")
    relationship_notes = Column(Text, nullable=True)
    last_contacted_at = Column(DateTime, nullable=True)
    next_follow_up_at = Column(DateTime, nullable=True)
    salesforce_contact_id = Column(String, nullable=True)

    account = relationship("Account", back_populates="contacts")
    signals = relationship("Signal", back_populates="contact")


class VoiceJournalEntry(Base):
    __tablename__ = "voice_journal_entries"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    transcript = Column(Text, nullable=False)
    ai_summary = Column(Text, nullable=True)
    reviewed = Column(Boolean, default=False)
    approved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class Activity(Base):
    __tablename__ = "activities"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    voice_journal_entry_id = Column(Integer, ForeignKey("voice_journal_entries.id"), nullable=True)
    activity_type = Column(String, nullable=False)
    activity_date = Column(DateTime, default=datetime.utcnow)
    summary = Column(Text, nullable=False)
    details = Column(Text, nullable=True)
    outcome = Column(Text, nullable=True)
    momentum = Column(String, nullable=True)
    next_step = Column(Text, nullable=True)
    confidence_score = Column(Float, default=0.7)
    source_type = Column(String, default="voice")

    account = relationship("Account", back_populates="activities")
    signals = relationship("Signal", back_populates="activity")


class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    priority = Column(String, default="medium")
    status = Column(String, default="open")
    category = Column(String, nullable=True)
    task_type = Column(String, nullable=True)
    source_type = Column(String, default="voice")
    source_id = Column(Integer, nullable=True)
    salesforce_task_id = Column(String, nullable=True)

    account = relationship("Account", back_populates="tasks")


class Signal(Base):
    __tablename__ = "signals"

    id = Column(Integer, primary_key=True, index=True)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    contact_id = Column(Integer, ForeignKey("contacts.id"), nullable=True)
    signal_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    summary = Column(Text, nullable=True)
    evidence_text = Column(Text, nullable=True)
    confidence_score = Column(Float, default=0.8)
    impact_level = Column(String, default="medium")
    urgency = Column(String, default="low")
    suggested_action = Column(Text, nullable=True)
    status = Column(String, default="new")
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", back_populates="signals")
    activity = relationship("Activity", back_populates="signals")
    contact = relationship("Contact", back_populates="signals")


class Opportunity(Base):
    __tablename__ = "opportunities"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    title = Column(String, nullable=False)
    status = Column(String, default="new")  # new/active/waiting/won/lost
    probability = Column(Float, nullable=True)
    next_action = Column(Text, nullable=True)
    owner = Column(String, nullable=True)
    notes = Column(Text, nullable=True)
    last_activity_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", back_populates="opportunities")
    milestones = relationship("Milestone", back_populates="opportunity")


class Milestone(Base):
    __tablename__ = "milestones"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    opportunity_id = Column(Integer, ForeignKey("opportunities.id"), nullable=True)
    title = Column(String, nullable=False)
    milestone_type = Column(String, nullable=True)  # delivery/training/evaluation/implant/screening/meeting/other
    date = Column(DateTime, nullable=False)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    account = relationship("Account", back_populates="milestones")
    opportunity = relationship("Opportunity", back_populates="milestones")


class ActivityHistory(Base):
    __tablename__ = "activity_history"

    id = Column(Integer, primary_key=True, index=True)
    account_id = Column(Integer, ForeignKey("accounts.id"), nullable=True)
    title = Column(String, nullable=False)
    category = Column(String, nullable=True)
    source = Column(String, default="manual")  # task/milestone/voice/manual
    source_id = Column(Integer, nullable=True)
    completed_at = Column(DateTime, default=datetime.utcnow)
    notes = Column(Text, nullable=True)

    account = relationship("Account", back_populates="activity_history")


class CalendarToken(Base):
    __tablename__ = "calendar_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, unique=True, index=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_uri = Column(String, nullable=True)
    expiry = Column(DateTime, nullable=True)
    scopes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class EmailToken(Base):
    __tablename__ = "email_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False, unique=True, index=True)
    access_token = Column(Text, nullable=False)
    refresh_token = Column(Text, nullable=True)
    token_uri = Column(String, nullable=True)
    expiry = Column(DateTime, nullable=True)
    scopes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=True)  # null for OAuth-only users
    display_name = Column(String, nullable=True)
    role = Column(String, default="standard")  # admin / standard
    is_active = Column(Boolean, default=True)
    oauth_provider = Column(String, nullable=True)  # 'google' | 'apple' | null
    oauth_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login_at = Column(DateTime, nullable=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    event_type = Column(String, nullable=False)
    user_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
