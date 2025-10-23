"""Unit tests for resume service"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import uuid
from datetime import datetime
import io

from app.services.resume_service import ResumeService
from app.db.models.resume import Resume
from app.schemas.resume import (
    ParsedResumeData,
    ContactInfo,
    ResumeUploadResponse,
    ResumeMetadata,
    ParseStatus
)
from app.core.exceptions import NotFoundError, ValidationError


@pytest.fixture
def mock_db():
    """Create a mock database session"""
    return Mock()


@pytest.fixture
def mock_parser():
    """Create a mock resume parser"""
    return Mock()


@pytest.fixture
def resume_service(mock_db, mock_parser):
    """Create resume service with mocked dependencies"""
    service = ResumeService(mock_db)
    service.parser = mock_parser
    return service


@pytest.fixture
def mock_user_id():
    """Create a mock user ID"""
    return uuid.uuid4()


@pytest.fixture
def sample_parsed_data():
    """Create sample parsed resume data"""
    return ParsedResumeData(
        contact_info=ContactInfo(
            full_name="John Doe",
            email="john@example.com",
            phone="+1234567890"
        ),
        skills=["Python", "JavaScript", "React"],
        work_experience=[],
        education=[]
    )


class TestUploadResume:
    """Test resume upload functionality"""

    def test_upload_resume_success(self, resume_service, mock_db, mock_user_id, sample_parsed_data):
        """Test successful resume upload"""
        file = io.BytesIO(b"mock pdf content")
        filename = "resume.pdf"
        file_size = 1024
        mime_type = "application/pdf"

        # Mock parser
        resume_service.parser.extract_text_from_pdf.return_value = "John Doe\njohn@example.com"
        resume_service.parser.parse_resume_text.return_value = sample_parsed_data

        # Mock database
        mock_resume = Mock(spec=Resume)
        mock_resume.id = uuid.uuid4()
        mock_resume.user_id = mock_user_id
        mock_resume.file_name = filename
        mock_resume.parse_status = "completed"
        mock_db.add = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock(side_effect=lambda x: None)

        with patch.object(resume_service, '_save_file', return_value="http://storage.example.com/resume.pdf"):
            result = resume_service.upload_resume(
                user_id=mock_user_id,
                file=file,
                filename=filename,
                file_size=file_size,
                mime_type=mime_type
            )

            assert isinstance(result, Resume)
            mock_db.add.assert_called_once()
            mock_db.commit.assert_called_once()

    def test_upload_resume_invalid_file_type(self, resume_service, mock_user_id):
        """Test upload with invalid file type"""
        file = io.BytesIO(b"content")

        with pytest.raises(ValidationError) as exc_info:
            resume_service.upload_resume(
                user_id=mock_user_id,
                file=file,
                filename="resume.txt",
                file_size=100,
                mime_type="text/plain"
            )

        assert "not supported" in str(exc_info.value).lower()

    def test_upload_resume_file_too_large(self, resume_service, mock_user_id):
        """Test upload with file exceeding size limit"""
        file = io.BytesIO(b"content")
        large_size = 11 * 1024 * 1024  # 11MB (over 10MB limit)

        with pytest.raises(ValidationError) as exc_info:
            resume_service.upload_resume(
                user_id=mock_user_id,
                file=file,
                filename="resume.pdf",
                file_size=large_size,
                mime_type="application/pdf"
            )

        assert "size" in str(exc_info.value).lower()

    def test_upload_resume_parsing_failure(self, resume_service, mock_db, mock_user_id):
        """Test resume upload when parsing fails"""
        file = io.BytesIO(b"mock pdf content")

        # Mock parser to raise exception
        resume_service.parser.extract_text_from_pdf.side_effect = Exception("Parse error")

        mock_db.add = Mock()
        mock_db.commit = Mock()
        mock_db.refresh = Mock()

        with patch.object(resume_service, '_save_file', return_value="http://storage.example.com/resume.pdf"):
            result = resume_service.upload_resume(
                user_id=mock_user_id,
                file=file,
                filename="resume.pdf",
                file_size=1024,
                mime_type="application/pdf"
            )

            # Should still save resume but with failed status
            assert mock_db.add.called
            assert mock_db.commit.called


class TestGetResume:
    """Test retrieving resume"""

    def test_get_resume_by_id_success(self, resume_service, mock_db, mock_user_id):
        """Test getting resume by ID"""
        resume_id = uuid.uuid4()
        mock_resume = Mock(spec=Resume)
        mock_resume.id = resume_id
        mock_resume.user_id = mock_user_id
        mock_resume.is_deleted = False

        mock_db.query().filter().first.return_value = mock_resume

        result = resume_service.get_resume(resume_id, mock_user_id)

        assert result == mock_resume
        mock_db.query.assert_called_once()

    def test_get_resume_not_found(self, resume_service, mock_db, mock_user_id):
        """Test getting non-existent resume"""
        resume_id = uuid.uuid4()
        mock_db.query().filter().first.return_value = None

        with pytest.raises(NotFoundError):
            resume_service.get_resume(resume_id, mock_user_id)

    def test_get_resume_deleted(self, resume_service, mock_db, mock_user_id):
        """Test getting deleted resume"""
        resume_id = uuid.uuid4()
        mock_resume = Mock(spec=Resume)
        mock_resume.is_deleted = True

        mock_db.query().filter().first.return_value = mock_resume

        with pytest.raises(NotFoundError):
            resume_service.get_resume(resume_id, mock_user_id)

    def test_get_resume_wrong_user(self, resume_service, mock_db):
        """Test accessing another user's resume"""
        resume_id = uuid.uuid4()
        owner_id = uuid.uuid4()
        requester_id = uuid.uuid4()

        mock_resume = Mock(spec=Resume)
        mock_resume.user_id = owner_id
        mock_resume.is_deleted = False

        mock_db.query().filter().first.return_value = mock_resume

        with pytest.raises(NotFoundError):
            resume_service.get_resume(resume_id, requester_id)


class TestListResumes:
    """Test listing user resumes"""

    def test_list_resumes_success(self, resume_service, mock_db, mock_user_id):
        """Test listing user's resumes"""
        mock_resumes = [
            Mock(spec=Resume, id=uuid.uuid4(), is_deleted=False),
            Mock(spec=Resume, id=uuid.uuid4(), is_deleted=False)
        ]

        mock_db.query().filter().all.return_value = mock_resumes

        result = resume_service.list_resumes(mock_user_id)

        assert len(result) == 2
        mock_db.query.assert_called_once()

    def test_list_resumes_excludes_deleted(self, resume_service, mock_db, mock_user_id):
        """Test that deleted resumes are excluded"""
        mock_resumes = [
            Mock(spec=Resume, id=uuid.uuid4(), is_deleted=False),
        ]

        mock_db.query().filter().all.return_value = mock_resumes

        result = resume_service.list_resumes(mock_user_id)

        assert all(not r.is_deleted for r in result)

    def test_list_resumes_empty(self, resume_service, mock_db, mock_user_id):
        """Test listing resumes when user has none"""
        mock_db.query().filter().all.return_value = []

        result = resume_service.list_resumes(mock_user_id)

        assert result == []


class TestDeleteResume:
    """Test deleting resume"""

    def test_delete_resume_success(self, resume_service, mock_db, mock_user_id):
        """Test successful resume deletion (soft delete)"""
        resume_id = uuid.uuid4()
        mock_resume = Mock(spec=Resume)
        mock_resume.id = resume_id
        mock_resume.user_id = mock_user_id
        mock_resume.is_deleted = False

        mock_db.query().filter().first.return_value = mock_resume
        mock_db.commit = Mock()

        resume_service.delete_resume(resume_id, mock_user_id)

        assert mock_resume.is_deleted == True
        mock_db.commit.assert_called_once()

    def test_delete_resume_not_found(self, resume_service, mock_db, mock_user_id):
        """Test deleting non-existent resume"""
        resume_id = uuid.uuid4()
        mock_db.query().filter().first.return_value = None

        with pytest.raises(NotFoundError):
            resume_service.delete_resume(resume_id, mock_user_id)


class TestSetDefaultResume:
    """Test setting default resume"""

    def test_set_default_resume_success(self, resume_service, mock_db, mock_user_id):
        """Test setting a resume as default"""
        resume_id = uuid.uuid4()

        # Mock current default resume
        mock_current_default = Mock(spec=Resume)
        mock_current_default.is_default = True

        # Mock target resume
        mock_target_resume = Mock(spec=Resume)
        mock_target_resume.id = resume_id
        mock_target_resume.user_id = mock_user_id
        mock_target_resume.is_deleted = False
        mock_target_resume.is_default = False

        # Mock queries
        mock_db.query().filter().all.return_value = [mock_current_default]
        mock_db.query().filter().first.return_value = mock_target_resume
        mock_db.commit = Mock()

        resume_service.set_default_resume(resume_id, mock_user_id)

        assert mock_current_default.is_default == False
        assert mock_target_resume.is_default == True
        assert mock_db.commit.call_count == 2

    def test_set_default_resume_not_found(self, resume_service, mock_db, mock_user_id):
        """Test setting non-existent resume as default"""
        resume_id = uuid.uuid4()

        mock_db.query().filter().all.return_value = []
        mock_db.query().filter().first.return_value = None

        with pytest.raises(NotFoundError):
            resume_service.set_default_resume(resume_id, mock_user_id)


class TestUpdateParsedData:
    """Test updating parsed resume data"""

    def test_update_parsed_data_success(self, resume_service, mock_db, mock_user_id, sample_parsed_data):
        """Test updating parsed data"""
        resume_id = uuid.uuid4()
        mock_resume = Mock(spec=Resume)
        mock_resume.id = resume_id
        mock_resume.user_id = mock_user_id
        mock_resume.is_deleted = False

        mock_db.query().filter().first.return_value = mock_resume
        mock_db.commit = Mock()
        mock_db.refresh = Mock()

        result = resume_service.update_parsed_data(resume_id, mock_user_id, sample_parsed_data)

        assert result == mock_resume
        mock_db.commit.assert_called_once()

    def test_update_parsed_data_not_found(self, resume_service, mock_db, mock_user_id, sample_parsed_data):
        """Test updating non-existent resume"""
        resume_id = uuid.uuid4()
        mock_db.query().filter().first.return_value = None

        with pytest.raises(NotFoundError):
            resume_service.update_parsed_data(resume_id, mock_user_id, sample_parsed_data)


class TestGetDefaultResume:
    """Test getting default resume"""

    def test_get_default_resume_success(self, resume_service, mock_db, mock_user_id):
        """Test getting user's default resume"""
        mock_resume = Mock(spec=Resume)
        mock_resume.is_default = True
        mock_resume.is_deleted = False

        mock_db.query().filter().first.return_value = mock_resume

        result = resume_service.get_default_resume(mock_user_id)

        assert result == mock_resume

    def test_get_default_resume_none(self, resume_service, mock_db, mock_user_id):
        """Test when user has no default resume"""
        mock_db.query().filter().first.return_value = None

        result = resume_service.get_default_resume(mock_user_id)

        assert result is None


class TestFileStorage:
    """Test file storage operations"""

    def test_save_file_local(self, resume_service):
        """Test saving file locally"""
        file = io.BytesIO(b"content")
        filename = "resume.pdf"
        user_id = uuid.uuid4()

        with patch('builtins.open', create=True) as mock_open:
            with patch('os.makedirs') as mock_makedirs:
                result = resume_service._save_file(file, filename, user_id)

                assert filename in result
                mock_makedirs.assert_called_once()

    def test_generate_unique_filename(self, resume_service):
        """Test generating unique filename"""
        original_filename = "resume.pdf"
        user_id = uuid.uuid4()

        result = resume_service._generate_unique_filename(original_filename, user_id)

        assert result.endswith(".pdf")
        assert str(user_id) in result

    def test_validate_file_extension(self, resume_service):
        """Test file extension validation"""
        assert resume_service._validate_file_extension("resume.pdf") == True
        assert resume_service._validate_file_extension("resume.docx") == True
        assert resume_service._validate_file_extension("resume.txt") == False
        assert resume_service._validate_file_extension("resume.jpg") == False
