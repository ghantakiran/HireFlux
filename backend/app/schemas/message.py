"""
Pydantic Schemas for Two-Way Messaging System (Issue #70)

Request/Response models for messaging API endpoints
Following Pydantic V2 best practices
"""

from pydantic import BaseModel, Field, validator, field_validator
from typing import Optional, List
from datetime import datetime
from uuid import UUID
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

class MessageType(str, Enum):
    """Message classification for analytics and filtering"""
    APPLICATION_QUESTION = "application_question"
    INTERVIEW_INVITATION = "interview_invitation"
    OFFER_LETTER = "offer_letter"
    REJECTION = "rejection"
    AVAILABILITY_UPDATE = "availability_update"
    OFFER_NEGOTIATION = "offer_negotiation"
    GENERAL = "general"


class BlockReason(str, Enum):
    """Reason for blocking a user"""
    SPAM = "spam"
    HARASSMENT = "harassment"
    INAPPROPRIATE_CONTENT = "inappropriate_content"
    OTHER = "other"


class BodyFormat(str, Enum):
    """Message body format"""
    PLAIN = "plain"
    HTML = "html"


# ============================================================================
# ATTACHMENT SCHEMA
# ============================================================================

class MessageAttachment(BaseModel):
    """File attachment metadata"""
    filename: str = Field(..., max_length=255)
    url: str = Field(..., description="S3 pre-signed URL or CDN URL")
    size: int = Field(..., gt=0, le=10_000_000, description="File size in bytes (max 10MB)")
    mime_type: str = Field(..., max_length=100)

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "filename": "resume.pdf",
                "url": "https://s3.amazonaws.com/hireflux-documents/resumes/abc123.pdf",
                "size": 524288,
                "mime_type": "application/pdf"
            }
        }


# ============================================================================
# REQUEST SCHEMAS
# ============================================================================

class MessageCreate(BaseModel):
    """Create a new message"""
    recipient_id: UUID = Field(..., description="User ID of the recipient")
    application_id: Optional[UUID] = Field(None, description="Related job application (optional)")
    subject: Optional[str] = Field(None, max_length=500, description="Message subject (optional)")
    body: str = Field(..., min_length=1, max_length=10000, description="Message content")
    body_format: BodyFormat = Field(default=BodyFormat.PLAIN, description="Message format")
    message_type: Optional[MessageType] = Field(None, description="Message classification")
    attachments: List[MessageAttachment] = Field(default=[], max_items=5)

    @field_validator("body")
    @classmethod
    def validate_body(cls, v: str) -> str:
        """Ensure message body is not empty or whitespace only"""
        if not v or not v.strip():
            raise ValueError("Message body cannot be empty")
        return v.strip()

    @field_validator("subject")
    @classmethod
    def validate_subject(cls, v: Optional[str]) -> Optional[str]:
        """Trim subject if provided"""
        if v:
            return v.strip()
        return v

    class Config:
        json_schema_extra = {
            "example": {
                "recipient_id": "123e4567-e89b-12d3-a456-426614174000",
                "application_id": "987fcdeb-51a2-43d7-8c9f-123456789abc",
                "subject": "Interview Invitation for Senior Software Engineer",
                "body": "Hi John, we'd like to invite you for an interview...",
                "body_format": "plain",
                "message_type": "interview_invitation",
                "attachments": []
            }
        }


class MessageUpdate(BaseModel):
    """Update message status"""
    is_read: Optional[bool] = None
    is_flagged: Optional[bool] = None
    flagged_reason: Optional[str] = Field(None, max_length=255)

    class Config:
        json_schema_extra = {
            "example": {
                "is_read": True
            }
        }


class ThreadListRequest(BaseModel):
    """Query parameters for listing threads"""
    application_id: Optional[UUID] = None
    unread_only: bool = Field(default=False)
    archived: bool = Field(default=False)
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=100)

    class Config:
        json_schema_extra = {
            "example": {
                "unread_only": True,
                "page": 1,
                "limit": 20
            }
        }


class BlockUserRequest(BaseModel):
    """Block a user from sending messages"""
    user_id: UUID = Field(..., description="User ID to block")
    reason: BlockReason = Field(..., description="Reason for blocking")

    class Config:
        json_schema_extra = {
            "example": {
                "user_id": "123e4567-e89b-12d3-a456-426614174000",
                "reason": "spam"
            }
        }


# ============================================================================
# RESPONSE SCHEMAS
# ============================================================================

class MessageResponse(BaseModel):
    """Message response model"""
    id: UUID
    thread_id: UUID
    sender_id: UUID
    recipient_id: UUID
    subject: Optional[str]
    body: str
    body_format: str
    attachments: List[MessageAttachment]
    is_read: bool
    read_at: Optional[datetime]
    message_type: Optional[str]
    created_at: datetime
    updated_at: datetime

    # Email fallback info
    email_sent: bool
    email_opened: bool

    # Spam info
    is_flagged: bool
    flagged_reason: Optional[str]

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174001",
                "thread_id": "123e4567-e89b-12d3-a456-426614174002",
                "sender_id": "123e4567-e89b-12d3-a456-426614174000",
                "recipient_id": "987fcdeb-51a2-43d7-8c9f-123456789abc",
                "subject": "Interview Invitation",
                "body": "We'd like to invite you for an interview...",
                "body_format": "plain",
                "attachments": [],
                "is_read": False,
                "read_at": None,
                "message_type": "interview_invitation",
                "created_at": "2025-11-26T10:30:00Z",
                "updated_at": "2025-11-26T10:30:00Z",
                "email_sent": True,
                "email_opened": False,
                "is_flagged": False,
                "flagged_reason": None
            }
        }


class MessageThreadParticipant(BaseModel):
    """Thread participant info"""
    id: UUID
    email: str
    first_name: Optional[str]
    last_name: Optional[str]
    role: str  # "employer" or "candidate"

    class Config:
        from_attributes = True


class MessageThreadResponse(BaseModel):
    """Message thread response with metadata"""
    id: UUID
    application_id: Optional[UUID]
    employer_id: UUID
    candidate_id: UUID
    subject: Optional[str]
    last_message_at: Optional[datetime]
    unread_count: int  # Unread count for current user
    created_at: datetime
    updated_at: datetime

    # Participants
    employer: MessageThreadParticipant
    candidate: MessageThreadParticipant

    # Latest message preview
    latest_message: Optional[MessageResponse]

    # Status for current user
    is_blocked: bool
    is_archived: bool

    class Config:
        from_attributes = True
        json_schema_extra = {
            "example": {
                "id": "123e4567-e89b-12d3-a456-426614174002",
                "application_id": "987fcdeb-51a2-43d7-8c9f-123456789abc",
                "employer_id": "123e4567-e89b-12d3-a456-426614174000",
                "candidate_id": "987fcdeb-51a2-43d7-8c9f-123456789def",
                "subject": "Application for Senior Software Engineer",
                "last_message_at": "2025-11-26T10:30:00Z",
                "unread_count": 2,
                "created_at": "2025-11-26T09:00:00Z",
                "updated_at": "2025-11-26T10:30:00Z",
                "employer": {
                    "id": "123e4567-e89b-12d3-a456-426614174000",
                    "email": "hr@company.com",
                    "first_name": "Jane",
                    "last_name": "Recruiter",
                    "role": "employer"
                },
                "candidate": {
                    "id": "987fcdeb-51a2-43d7-8c9f-123456789def",
                    "email": "john@example.com",
                    "first_name": "John",
                    "last_name": "Doe",
                    "role": "candidate"
                },
                "latest_message": None,
                "is_blocked": False,
                "is_archived": False
            }
        }


class ThreadDetailResponse(BaseModel):
    """Thread detail with full message history"""
    thread: MessageThreadResponse
    messages: List[MessageResponse]
    total_messages: int

    class Config:
        from_attributes = True


class ThreadListResponse(BaseModel):
    """Paginated thread list"""
    threads: List[MessageThreadResponse]
    total: int
    page: int
    limit: int
    unread_count: int  # Total unread count across all threads

    class Config:
        from_attributes = True


class MessageSendResponse(BaseModel):
    """Response after sending a message"""
    message: MessageResponse
    thread: MessageThreadResponse

    class Config:
        from_attributes = True


class BlockUserResponse(BaseModel):
    """Response after blocking a user"""
    success: bool
    blocked_user_id: UUID
    reason: str

    class Config:
        json_schema_extra = {
            "example": {
                "success": True,
                "blocked_user_id": "123e4567-e89b-12d3-a456-426614174000",
                "reason": "spam"
            }
        }


class UnreadCountResponse(BaseModel):
    """Unread message count"""
    unread_count: int
    unread_threads: int

    class Config:
        json_schema_extra = {
            "example": {
                "unread_count": 5,
                "unread_threads": 2
            }
        }


# ============================================================================
# VALIDATION HELPERS
# ============================================================================

def validate_attachment_size(attachments: List[MessageAttachment]) -> None:
    """Validate total attachment size doesn't exceed limit"""
    total_size = sum(att.size for att in attachments)
    MAX_TOTAL_SIZE = 25_000_000  # 25MB total
    if total_size > MAX_TOTAL_SIZE:
        raise ValueError(f"Total attachment size ({total_size} bytes) exceeds limit ({MAX_TOTAL_SIZE} bytes)")


def validate_attachment_types(attachments: List[MessageAttachment]) -> None:
    """Validate attachment MIME types"""
    ALLOWED_MIME_TYPES = [
        "application/pdf",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "image/png",
        "image/jpeg",
        "image/jpg",
        "text/plain",
        "text/csv"
    ]
    for att in attachments:
        if att.mime_type not in ALLOWED_MIME_TYPES:
            raise ValueError(f"Unsupported attachment type: {att.mime_type}")
