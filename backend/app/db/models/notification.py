"""
Notification Models (NOT-001)
Database schema for user notifications and email tracking
"""

from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    Text,
    Boolean,
    ForeignKey,
    JSON,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from app.db.base import Base


class Notification(Base):
    """User notifications (in-app and email)"""

    __tablename__ = "notifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Notification details
    type = Column(
        String(50), nullable=False, index=True
    )  # job_match, application_status, interview_reminder, credit_low, etc.
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    action_url = Column(String(500), nullable=True)  # Link to relevant page

    # Notification metadata
    priority = Column(String(20), default="normal")  # low, normal, high, urgent
    category = Column(String(50), nullable=True)  # jobs, applications, account, etc.
    data = Column(JSON, nullable=True)  # Additional context data

    # Status tracking
    is_read = Column(Boolean, default=False, index=True)
    is_archived = Column(Boolean, default=False)
    read_at = Column(DateTime, nullable=True)

    # Email tracking (if notification was sent via email)
    email_sent = Column(Boolean, default=False)
    email_sent_at = Column(DateTime, nullable=True)
    email_message_id = Column(String(255), nullable=True)  # External email provider ID

    # Timestamps
    created_at = Column(DateTime, default=func.now(), index=True)
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    expires_at = Column(
        DateTime, nullable=True
    )  # Optional expiration for time-sensitive notifications

    # Relationships
    user = relationship("User", back_populates="notifications")

    def __repr__(self):
        return f"<Notification(id={self.id}, user_id={self.user_id}, type='{self.type}', is_read={self.is_read})>"

    @property
    def is_expired(self) -> bool:
        """Check if notification is expired"""
        if not self.expires_at:
            return False
        from datetime import datetime

        return datetime.now() > self.expires_at

    @property
    def is_unread(self) -> bool:
        """Check if notification is unread"""
        return not self.is_read


class NotificationPreference(Base):
    """User notification preferences"""

    __tablename__ = "notification_preferences"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True
    )

    # Email notification preferences
    email_job_matches = Column(Boolean, default=True)  # High-fit job matches
    email_application_updates = Column(
        Boolean, default=True
    )  # Application status changes
    email_interview_reminders = Column(
        Boolean, default=True
    )  # Interview prep reminders
    email_credit_alerts = Column(Boolean, default=True)  # Credit balance alerts
    email_weekly_digest = Column(Boolean, default=True)  # Weekly summary email
    email_marketing = Column(Boolean, default=False)  # Marketing emails

    # In-app notification preferences
    inapp_job_matches = Column(Boolean, default=True)
    inapp_application_updates = Column(Boolean, default=True)
    inapp_interview_reminders = Column(Boolean, default=True)
    inapp_credit_alerts = Column(Boolean, default=True)
    inapp_system_updates = Column(Boolean, default=True)

    # Notification frequency
    job_match_frequency = Column(
        String(20), default="immediate"
    )  # immediate, daily, weekly
    digest_day = Column(String(10), default="monday")  # Day for weekly digest
    quiet_hours_start = Column(
        Integer, nullable=True
    )  # Hour (0-23) to start quiet hours
    quiet_hours_end = Column(Integer, nullable=True)  # Hour (0-23) to end quiet hours

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="notification_preferences")

    def __repr__(self):
        return f"<NotificationPreference(id={self.id}, user_id={self.user_id})>"

    def should_send_email(self, notification_type: str) -> bool:
        """Check if email should be sent for this notification type"""
        type_mapping = {
            "job_match": self.email_job_matches,
            "application_status": self.email_application_updates,
            "interview_reminder": self.email_interview_reminders,
            "credit_low": self.email_credit_alerts,
            "credit_refund": self.email_credit_alerts,
            "weekly_digest": self.email_weekly_digest,
            "marketing": self.email_marketing,
        }
        return type_mapping.get(notification_type, False)

    def should_send_inapp(self, notification_type: str) -> bool:
        """Check if in-app notification should be sent for this notification type"""
        type_mapping = {
            "job_match": self.inapp_job_matches,
            "application_status": self.inapp_application_updates,
            "interview_reminder": self.inapp_interview_reminders,
            "credit_low": self.inapp_credit_alerts,
            "credit_refund": self.inapp_credit_alerts,
            "system_update": self.inapp_system_updates,
        }
        return type_mapping.get(notification_type, True)  # Default to True

    def is_quiet_hours(self) -> bool:
        """Check if currently in quiet hours"""
        if self.quiet_hours_start is None or self.quiet_hours_end is None:
            return False

        from datetime import datetime

        current_hour = datetime.now().hour

        # Handle quiet hours that span midnight
        if self.quiet_hours_start < self.quiet_hours_end:
            return self.quiet_hours_start <= current_hour < self.quiet_hours_end
        else:
            return (
                current_hour >= self.quiet_hours_start
                or current_hour < self.quiet_hours_end
            )


class EmailTemplate(Base):
    """Email templates for different notification types"""

    __tablename__ = "email_templates"

    id = Column(Integer, primary_key=True, index=True)

    # Template identification
    name = Column(String(100), nullable=False, unique=True, index=True)
    type = Column(String(50), nullable=False)  # Matches notification type
    description = Column(Text, nullable=True)

    # Template content
    subject = Column(String(255), nullable=False)
    html_body = Column(Text, nullable=False)  # HTML email body with placeholders
    text_body = Column(Text, nullable=True)  # Plain text alternative

    # Template variables (JSON array of variable names)
    variables = Column(
        JSON, nullable=True
    )  # e.g., ["user_name", "job_title", "company_name"]

    # Template status
    is_active = Column(Boolean, default=True)
    version = Column(Integer, default=1)

    # Timestamps
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())

    def __repr__(self):
        return f"<EmailTemplate(id={self.id}, name='{self.name}', type='{self.type}')>"
