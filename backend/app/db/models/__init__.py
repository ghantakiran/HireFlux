"""Database models

Import all models here to ensure SQLAlchemy can resolve relationships.
These imports must happen before any database queries are made.
"""
# Import base first
from app.db.base import Base

# Import all models to ensure they are registered with SQLAlchemy
from app.db.models.user import User, Profile
from app.db.models.resume import Resume, ResumeVersion
from app.db.models.cover_letter import CoverLetter
from app.db.models.job import Job, JobSource, MatchScore
from app.db.models.application import Application, ApplicationNote
from app.db.models.billing import CreditWallet, CreditLedger, Subscription, PaymentMethod
from app.db.models.audit import EventAudit
from app.db.models.interview import InterviewSession
from app.db.models.company import Company, CompanyMember, CompanySubscription
from app.db.models.notification import Notification, NotificationPreference
from app.db.models.candidate_profile import CandidateProfile, CandidateView
from app.db.models.auto_apply import AutoApplyConfig, AutoApplyJob
from app.db.models.webhook import WebhookEvent, InterviewSchedule

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
    "ApplicationNote",
    "CreditWallet",
    "CreditLedger",
    "Subscription",
    "EventAudit",
    "InterviewSession",
    "Company",
    "CompanyMember",
    "CompanySubscription",
    "Notification",
    "NotificationPreference",
    "CandidateProfile",
    "CandidateView",
    "AutoApplyConfig",
    "AutoApplyJob",
    "WebhookEvent",
    "InterviewSchedule",
    "PaymentMethod",
]
