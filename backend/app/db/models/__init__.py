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
from app.db.models.job_template import JobTemplate
from app.db.models.application import Application, ApplicationNote
from app.db.models.billing import (
    CreditWallet,
    CreditLedger,
    Subscription,
    PaymentMethod,
)
from app.db.models.audit import EventAudit
from app.db.models.interview import InterviewSession
from app.db.models.company import (
    Company,
    CompanyMember,
    CompanySubscription,
    TeamInvitation,
    TeamActivity,
    TeamMention,
)
from app.db.models.notification import Notification, NotificationPreference
from app.db.models.candidate_profile import CandidateProfile, CandidateView
from app.db.models.auto_apply import AutoApplyConfig, AutoApplyJob
from app.db.models.webhook import (
    WebhookEvent,
    InterviewSchedule,
    InterviewFeedback,
    CandidateAvailability,
)
from app.db.models.bulk_job_posting import (
    BulkJobUpload,
    JobDistribution,
    BulkUploadStatus,
    DistributionStatus,
    DistributionChannel,
)
from app.db.models.analytics import (
    AnalyticsSnapshot,
    ApplicationStageHistory,
    CompanyAnalyticsConfig,
)
from app.db.models.api_key import (
    APIKey,
    APIKeyUsage,
    Webhook,
    WebhookDelivery,
)
from app.db.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentAttempt,
    AssessmentResponse,
    QuestionBankItem,
    JobAssessmentRequirement,
)
from app.db.models.file_storage import (
    FileMetadata,
    FileAccessLog,
    PreSignedURL,
    FileType,
    FileStatus,
    StorageClass,
)

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
    "JobTemplate",
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
    "TeamInvitation",
    "TeamActivity",
    "TeamMention",
    "Notification",
    "NotificationPreference",
    "CandidateProfile",
    "CandidateView",
    "AutoApplyConfig",
    "AutoApplyJob",
    "WebhookEvent",
    "InterviewSchedule",
    "InterviewFeedback",
    "CandidateAvailability",
    "PaymentMethod",
    "BulkJobUpload",
    "JobDistribution",
    "BulkUploadStatus",
    "DistributionStatus",
    "DistributionChannel",
    "AnalyticsSnapshot",
    "ApplicationStageHistory",
    "CompanyAnalyticsConfig",
    "APIKey",
    "APIKeyUsage",
    "Webhook",
    "WebhookDelivery",
    "Assessment",
    "AssessmentQuestion",
    "AssessmentAttempt",
    "AssessmentResponse",
    "QuestionBankItem",
    "JobAssessmentRequirement",
    "FileMetadata",
    "FileAccessLog",
    "PreSignedURL",
    "FileType",
    "FileStatus",
    "StorageClass",
]
