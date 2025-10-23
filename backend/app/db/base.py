"""
Database base configuration and imports
"""
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Import all models here for Alembic to detect them
from app.db.models.user import User, Profile
from app.db.models.resume import Resume, ResumeVersion
from app.db.models.cover_letter import CoverLetter
from app.db.models.job import Job, JobSource, MatchScore
from app.db.models.application import Application
from app.db.models.billing import CreditWallet, CreditLedger, Subscription
from app.db.models.audit import EventAudit
from app.db.models.interview import InterviewSession

__all__ = [
    "Base",
    "User",
    "Profile",
    "Resume",
    "ResumeVersion",
    "CoverLetter",
    "Job",
    "JobSource",
    "MatchScore",
    "Application",
    "CreditWallet",
    "CreditLedger",
    "Subscription",
    "EventAudit",
    "InterviewSession",
]
