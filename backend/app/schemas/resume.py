"""Resume schemas for validation and serialization"""

from pydantic import BaseModel, Field, field_validator, HttpUrl
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class FileType(str, Enum):
    """Supported resume file types"""

    PDF = "application/pdf"
    DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"


class ParseStatus(str, Enum):
    """Resume parsing status"""

    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class ContactInfo(BaseModel):
    """Contact information extracted from resume"""

    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    website: Optional[str] = None

    @field_validator("email")
    @classmethod
    def validate_email(cls, v):
        if v and "@" not in v:
            raise ValueError("Invalid email format")
        return v


class WorkExperience(BaseModel):
    """Work experience entry"""

    company: str = Field(..., min_length=1, max_length=255)
    title: str = Field(..., min_length=1, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    start_date: Optional[str] = None  # Format: "YYYY-MM" or "Month YYYY"
    end_date: Optional[str] = None  # "Present" or "YYYY-MM"
    description: Optional[str] = None
    responsibilities: List[str] = Field(default=[])
    is_current: bool = False

    @field_validator("responsibilities")
    @classmethod
    def validate_responsibilities(cls, v):
        if len(v) > 20:
            raise ValueError("Maximum 20 responsibilities per role")
        return v


class Education(BaseModel):
    """Education entry"""

    institution: str = Field(..., min_length=1, max_length=255)
    degree: Optional[str] = Field(None, max_length=255)
    field_of_study: Optional[str] = Field(None, max_length=255)
    location: Optional[str] = Field(None, max_length=255)
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    gpa: Optional[str] = None
    honors: List[str] = Field(default=[])


class Certification(BaseModel):
    """Certification entry"""

    name: str = Field(..., min_length=1, max_length=255)
    issuing_organization: str = Field(..., min_length=1, max_length=255)
    issue_date: Optional[str] = None
    expiry_date: Optional[str] = None
    credential_id: Optional[str] = None
    credential_url: Optional[str] = None


class ParsedResumeData(BaseModel):
    """Complete parsed resume data structure"""

    contact_info: ContactInfo = Field(default_factory=ContactInfo)
    summary: Optional[str] = None
    work_experience: List[WorkExperience] = Field(default=[])
    education: List[Education] = Field(default=[])
    skills: List[str] = Field(default=[])
    certifications: List[Certification] = Field(default=[])
    languages: List[str] = Field(default=[])
    projects: List[Dict[str, Any]] = Field(default=[])
    awards: List[str] = Field(default=[])
    publications: List[str] = Field(default=[])
    raw_text: Optional[str] = None  # Full extracted text


class ResumeUploadResponse(BaseModel):
    """Response after resume upload"""

    id: str
    user_id: str
    file_name: str
    file_size: int
    file_type: str
    upload_url: Optional[str] = None
    parse_status: ParseStatus
    created_at: datetime


class ResumeMetadata(BaseModel):
    """Resume metadata"""

    id: str
    user_id: str
    file_name: str
    file_size: int
    file_type: str
    parse_status: ParseStatus
    is_default: bool = False
    created_at: datetime
    parsed_at: Optional[datetime] = None


class ResumeDetail(BaseModel):
    """Complete resume details with parsed data"""

    id: str
    user_id: str
    file_name: str
    file_size: int
    file_type: str
    original_file_url: Optional[str] = None
    parse_status: ParseStatus
    is_default: bool = False
    parsed_data: ParsedResumeData
    created_at: datetime
    parsed_at: Optional[datetime] = None


class ResumeListResponse(BaseModel):
    """Response for listing resumes"""

    resumes: List[ResumeMetadata]
    total: int
    default_resume_id: Optional[str] = None


class ResumeUpdateRequest(BaseModel):
    """Request to update resume parsed data"""

    parsed_data: ParsedResumeData

    @field_validator("parsed_data")
    @classmethod
    def validate_parsed_data(cls, v):
        # Ensure at least contact info or work experience exists
        if not v.contact_info.full_name and not v.work_experience:
            raise ValueError(
                "Resume must have at least contact info or work experience"
            )
        return v


class SetDefaultResumeRequest(BaseModel):
    """Request to set a resume as default"""

    resume_id: str = Field(..., min_length=1)


class ResumeParseStats(BaseModel):
    """Statistics about resume parsing"""

    total_resumes: int
    successfully_parsed: int
    failed_parses: int
    pending_parses: int
    success_rate: float


class ResumeExportResponse(BaseModel):
    """Exported resume data"""

    resume_id: str
    exported_at: datetime
    data: ParsedResumeData


class ResumeUploadValidation(BaseModel):
    """Validation schema for file upload"""

    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    ALLOWED_MIME_TYPES: List[str] = [FileType.PDF.value, FileType.DOCX.value]
    ALLOWED_EXTENSIONS: List[str] = [".pdf", ".docx"]

    @staticmethod
    def validate_file_size(file_size: int) -> bool:
        """Validate file size is within limits"""
        return file_size <= ResumeUploadValidation.MAX_FILE_SIZE

    @staticmethod
    def validate_file_type(mime_type: str) -> bool:
        """Validate file type is supported"""
        return mime_type in ResumeUploadValidation.ALLOWED_MIME_TYPES

    @staticmethod
    def validate_file_extension(filename: str) -> bool:
        """Validate file extension"""
        return any(
            filename.lower().endswith(ext)
            for ext in ResumeUploadValidation.ALLOWED_EXTENSIONS
        )


class ResumeParseError(BaseModel):
    """Error information when parsing fails"""

    error_code: str
    error_message: str
    error_details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)


class BatchResumeUploadRequest(BaseModel):
    """Request for batch resume upload (future feature)"""

    resume_files: List[str] = Field(..., min_items=1, max_items=5)

    @field_validator("resume_files")
    @classmethod
    def validate_batch_size(cls, v):
        if len(v) > 5:
            raise ValueError("Maximum 5 resumes can be uploaded at once")
        return v
