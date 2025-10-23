"""Resume service for handling resume operations"""
import os
import uuid
from typing import List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
import io

from app.db.models.resume import Resume
from app.schemas.resume import (
    ParsedResumeData,
    ResumeUploadValidation,
    ParseStatus
)
from app.services.resume_parser import ResumeParser
from app.core.exceptions import NotFoundError, ValidationError


class ResumeService:
    """Service for managing resume uploads, storage, and retrieval"""

    def __init__(self, db: Session):
        self.db = db
        self.parser = ResumeParser()
        self.upload_dir = os.path.join(os.getcwd(), "uploads", "resumes")

    def upload_resume(
        self,
        user_id: uuid.UUID,
        file: io.BytesIO,
        filename: str,
        file_size: int,
        mime_type: str
    ) -> Resume:
        """
        Upload and parse a resume

        Args:
            user_id: User's UUID
            file: File content as BytesIO
            filename: Original filename
            file_size: File size in bytes
            mime_type: MIME type of file

        Returns:
            Created Resume object

        Raises:
            ValidationError: If file validation fails
        """
        # Validate file
        self._validate_upload(filename, file_size, mime_type)

        # Save file to storage
        file_url = self._save_file(file, filename, user_id)

        # Create resume record
        resume = Resume(
            id=uuid.uuid4(),
            user_id=user_id,
            file_name=filename,
            file_size=str(file_size),
            file_type=mime_type,
            original_file_url=file_url,
            parse_status=ParseStatus.PROCESSING.value,
            is_default=False,
            is_deleted=False
        )

        self.db.add(resume)
        self.db.commit()
        self.db.refresh(resume)

        # Parse resume in background (for now, synchronous)
        try:
            parsed_data = self._parse_resume(file, mime_type)
            resume.parsed_data = parsed_data.model_dump()
            resume.parse_status = ParseStatus.COMPLETED.value
            resume.parsed_at = datetime.utcnow()
        except Exception as e:
            resume.parse_status = ParseStatus.FAILED.value
            resume.parse_error = {
                "error_code": "PARSE_ERROR",
                "error_message": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }

        self.db.commit()
        self.db.refresh(resume)

        return resume

    def get_resume(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> Resume:
        """
        Get resume by ID

        Args:
            resume_id: Resume UUID
            user_id: User UUID (for authorization)

        Returns:
            Resume object

        Raises:
            NotFoundError: If resume not found or doesn't belong to user
        """
        resume = self.db.query(Resume).filter(
            Resume.id == resume_id,
            Resume.user_id == user_id,
            Resume.is_deleted == False
        ).first()

        if not resume:
            raise NotFoundError("Resume not found")

        return resume

    def list_resumes(self, user_id: uuid.UUID) -> List[Resume]:
        """
        List all resumes for a user

        Args:
            user_id: User UUID

        Returns:
            List of Resume objects
        """
        resumes = self.db.query(Resume).filter(
            Resume.user_id == user_id,
            Resume.is_deleted == False
        ).order_by(Resume.created_at.desc()).all()

        return resumes

    def delete_resume(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> None:
        """
        Delete resume (soft delete)

        Args:
            resume_id: Resume UUID
            user_id: User UUID (for authorization)

        Raises:
            NotFoundError: If resume not found
        """
        resume = self.get_resume(resume_id, user_id)
        resume.is_deleted = True
        self.db.commit()

    def set_default_resume(self, resume_id: uuid.UUID, user_id: uuid.UUID) -> Resume:
        """
        Set a resume as the default

        Args:
            resume_id: Resume UUID
            user_id: User UUID

        Returns:
            Updated Resume object

        Raises:
            NotFoundError: If resume not found
        """
        # Unset current default
        current_defaults = self.db.query(Resume).filter(
            Resume.user_id == user_id,
            Resume.is_default == True,
            Resume.is_deleted == False
        ).all()

        for resume in current_defaults:
            resume.is_default = False

        if current_defaults:
            self.db.commit()

        # Set new default
        resume = self.get_resume(resume_id, user_id)
        resume.is_default = True
        self.db.commit()
        self.db.refresh(resume)

        return resume

    def get_default_resume(self, user_id: uuid.UUID) -> Optional[Resume]:
        """
        Get user's default resume

        Args:
            user_id: User UUID

        Returns:
            Default Resume or None
        """
        return self.db.query(Resume).filter(
            Resume.user_id == user_id,
            Resume.is_default == True,
            Resume.is_deleted == False
        ).first()

    def update_parsed_data(
        self,
        resume_id: uuid.UUID,
        user_id: uuid.UUID,
        parsed_data: ParsedResumeData
    ) -> Resume:
        """
        Update parsed resume data manually

        Args:
            resume_id: Resume UUID
            user_id: User UUID
            parsed_data: Updated parsed data

        Returns:
            Updated Resume object

        Raises:
            NotFoundError: If resume not found
        """
        resume = self.get_resume(resume_id, user_id)
        resume.parsed_data = parsed_data.model_dump()
        self.db.commit()
        self.db.refresh(resume)

        return resume

    def _validate_upload(self, filename: str, file_size: int, mime_type: str) -> None:
        """
        Validate file upload

        Args:
            filename: Original filename
            file_size: File size in bytes
            mime_type: MIME type

        Raises:
            ValidationError: If validation fails
        """
        # Validate file size
        if not ResumeUploadValidation.validate_file_size(file_size):
            raise ValidationError(
                f"File size exceeds maximum allowed size of {ResumeUploadValidation.MAX_FILE_SIZE / (1024 * 1024)}MB"
            )

        # Validate file type
        if not ResumeUploadValidation.validate_file_type(mime_type):
            raise ValidationError(
                f"File type '{mime_type}' is not supported. Supported types: PDF, DOCX"
            )

        # Validate file extension
        if not ResumeUploadValidation.validate_file_extension(filename):
            raise ValidationError(
                f"File extension is not supported. Supported extensions: {', '.join(ResumeUploadValidation.ALLOWED_EXTENSIONS)}"
            )

    def _parse_resume(self, file: io.BytesIO, mime_type: str) -> ParsedResumeData:
        """
        Parse resume file

        Args:
            file: File content
            mime_type: MIME type

        Returns:
            ParsedResumeData object

        Raises:
            Exception: If parsing fails
        """
        # Reset file pointer
        file.seek(0)

        # Extract text based on file type
        if "pdf" in mime_type.lower():
            text = self.parser.extract_text_from_pdf(file)
        elif "wordprocessingml" in mime_type.lower() or "docx" in mime_type.lower():
            text = self.parser.extract_text_from_docx(file)
        else:
            raise ValueError(f"Unsupported MIME type: {mime_type}")

        # Parse extracted text
        return self.parser.parse_resume_text(text)

    def _save_file(self, file: io.BytesIO, filename: str, user_id: uuid.UUID) -> str:
        """
        Save file to storage (local filesystem for development)

        Args:
            file: File content
            filename: Original filename
            user_id: User UUID

        Returns:
            File URL or path
        """
        # Create user-specific directory
        user_dir = os.path.join(self.upload_dir, str(user_id))
        os.makedirs(user_dir, exist_ok=True)

        # Generate unique filename
        unique_filename = self._generate_unique_filename(filename, user_id)
        file_path = os.path.join(user_dir, unique_filename)

        # Reset file pointer and save
        file.seek(0)
        with open(file_path, 'wb') as f:
            f.write(file.read())

        # Return relative path (in production, would return S3/Supabase URL)
        return f"/uploads/resumes/{user_id}/{unique_filename}"

    def _generate_unique_filename(self, original_filename: str, user_id: uuid.UUID) -> str:
        """
        Generate unique filename

        Args:
            original_filename: Original filename
            user_id: User UUID

        Returns:
            Unique filename
        """
        # Extract extension
        _, ext = os.path.splitext(original_filename)

        # Generate unique name with timestamp
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        unique_id = str(uuid.uuid4())[:8]

        return f"{user_id}_{timestamp}_{unique_id}{ext}"

    def _validate_file_extension(self, filename: str) -> bool:
        """
        Validate file extension

        Args:
            filename: Filename to validate

        Returns:
            True if valid, False otherwise
        """
        return any(filename.lower().endswith(ext) for ext in ResumeUploadValidation.ALLOWED_EXTENSIONS)
