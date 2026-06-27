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

    contacts = relationship("Contact", back_populates="account")
    activities = relationship("Activity", back_populates="account")
    tasks = relationship("Task", back_populates="account")
    signals = relationship("Signal", back_populates="account")


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
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    due_date = Column(DateTime, nullable=True)
    priority = Column(String, default="medium")
    status = Column(String, default="open")
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
