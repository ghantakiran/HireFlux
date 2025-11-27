"""
Database Models for Two-Way Messaging System (Issue #70)

Purpose: Enable direct communication between employers and candidates
Business Impact: 60% on-platform communication target, improve engagement
"""

from sqlalchemy import Column, String, Text, Integer, DateTime, Boolean, ForeignKey, ARRAY
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

from app.db.base import Base


class MessageThread(Base):
    """
    Message thread linking employer and candidate communication

    Represents a conversation thread between two users, typically tied to a job application.
    Tracks unread counts separately for each participant.
    """
    __tablename__ = "message_threads"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Application context (optional - threads can exist without application)
    application_id = Column(
        UUID(as_uuid=True),
        ForeignKey("job_applications.id", ondelete="SET NULL"),
        nullable=True,
        index=True
    )

    # Participants (2-person threads only for MVP)
    employer_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    candidate_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Thread metadata
    subject = Column(String(500), nullable=True)  # Optional thread subject
    last_message_at = Column(DateTime, nullable=True, index=True)

    # Unread counts (denormalized for performance)
    unread_count_employer = Column(Integer, default=0, nullable=False)
    unread_count_candidate = Column(Integer, default=0, nullable=False)

    # Soft delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    # Blocking/archiving
    blocked_by_employer = Column(Boolean, default=False, nullable=False)
    blocked_by_candidate = Column(Boolean, default=False, nullable=False)
    archived_by_employer = Column(Boolean, default=False, nullable=False)
    archived_by_candidate = Column(Boolean, default=False, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    application = relationship("JobApplication", back_populates="message_threads")
    employer = relationship("User", foreign_keys=[employer_id], back_populates="employer_threads")
    candidate = relationship("User", foreign_keys=[candidate_id], back_populates="candidate_threads")
    messages = relationship("Message", back_populates="thread", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<MessageThread {self.id} employer={self.employer_id} candidate={self.candidate_id}>"


class Message(Base):
    """
    Individual message within a thread

    Stores the actual message content, attachments, and delivery status.
    Supports rich text, file attachments, and read receipts.
    """
    __tablename__ = "messages"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Thread relationship
    thread_id = Column(
        UUID(as_uuid=True),
        ForeignKey("message_threads.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Sender and recipient
    sender_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    recipient_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Message content
    subject = Column(String(500), nullable=True)  # Optional subject (first message in thread)
    body = Column(Text, nullable=False)  # Message body (supports plain text or HTML)
    body_format = Column(String(20), default="plain", nullable=False)  # "plain" or "html"

    # Attachments (stored in S3)
    attachments = Column(JSONB, default=list, nullable=False)
    # Format: [{"filename": "resume.pdf", "url": "s3://...", "size": 1024000, "mime_type": "application/pdf"}]

    # Message status
    is_read = Column(Boolean, default=False, nullable=False, index=True)
    read_at = Column(DateTime, nullable=True)

    # Email fallback tracking
    email_sent = Column(Boolean, default=False, nullable=False)
    email_sent_at = Column(DateTime, nullable=True)
    email_opened = Column(Boolean, default=False, nullable=False)
    email_opened_at = Column(DateTime, nullable=True)

    # Spam/moderation
    is_flagged = Column(Boolean, default=False, nullable=False)
    flagged_reason = Column(String(255), nullable=True)
    flagged_at = Column(DateTime, nullable=True)

    # Soft delete
    is_deleted = Column(Boolean, default=False, nullable=False)
    deleted_at = Column(DateTime, nullable=True)

    # Message type (for analytics and filtering)
    message_type = Column(String(50), nullable=True, index=True)
    # Types: "application_question", "interview_invitation", "offer_letter", "rejection", "general"

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    thread = relationship("MessageThread", back_populates="messages")
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    recipient = relationship("User", foreign_keys=[recipient_id], back_populates="received_messages")

    def __repr__(self):
        return f"<Message {self.id} from={self.sender_id} to={self.recipient_id} read={self.is_read}>"


class MessageBlocklist(Base):
    """
    User blocking/spam prevention

    Allows users to block other users from sending them messages.
    Used for spam prevention and harassment protection.
    """
    __tablename__ = "message_blocklist"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4, index=True)

    # Who is blocking whom
    blocker_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    blocked_id = Column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    # Reason for blocking
    reason = Column(String(255), nullable=True)
    # Reasons: "spam", "harassment", "inappropriate_content", "other"

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    blocker = relationship("User", foreign_keys=[blocker_id], back_populates="blocked_users")
    blocked = relationship("User", foreign_keys=[blocked_id], back_populates="blocked_by_users")

    def __repr__(self):
        return f"<MessageBlocklist blocker={self.blocker_id} blocked={self.blocked_id}>"


# Migration Notes:
# 1. Add to User model:
#    - employer_threads = relationship("MessageThread", foreign_keys=[MessageThread.employer_id])
#    - candidate_threads = relationship("MessageThread", foreign_keys=[MessageThread.candidate_id])
#    - sent_messages = relationship("Message", foreign_keys=[Message.sender_id])
#    - received_messages = relationship("Message", foreign_keys=[Message.recipient_id])
#    - blocked_users = relationship("MessageBlocklist", foreign_keys=[MessageBlocklist.blocker_id])
#    - blocked_by_users = relationship("MessageBlocklist", foreign_keys=[MessageBlocklist.blocked_id])
#
# 2. Add to JobApplication model:
#    - message_threads = relationship("MessageThread", back_populates="application")
