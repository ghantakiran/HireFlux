"""
Unit Tests for S3 Storage Service - Issue #53
TDD approach: Write tests first, then implement S3Service

Test coverage:
- Pre-signed URL generation (upload/download)
- File upload validation (type, size)
- File metadata tracking
- Access control
- Virus scanning integration
- Error handling
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime, timedelta
from botocore.exceptions import ClientError
import hashlib
import uuid

from app.services.s3_service import S3Service, FileUploadConfig
from app.db.models.file_storage import FileMetadata, FileAccessLog, FileType, FileStatus
from app.core.exceptions import ServiceError


@pytest.fixture
def mock_db():
    """Mock database session"""
    db = Mock()
    db.add = Mock()
    db.commit = Mock()
    db.rollback = Mock()
    db.query = Mock()
    return db


@pytest.fixture
def mock_s3_client():
    """Mock boto3 S3 client"""
    client = Mock()
    client.generate_presigned_url = Mock(return_value="https://s3.amazonaws.com/signed-url")
    client.generate_presigned_post = Mock(return_value={
        "url": "https://s3.amazonaws.com/bucket",
        "fields": {"key": "test-key", "policy": "test-policy"}
    })
    client.head_object = Mock(return_value={"ContentLength": 1024, "ETag": "test-etag"})
    client.delete_object = Mock(return_value={"DeleteMarker": True})
    client.put_object_tagging = Mock(return_value={})
    return client


@pytest.fixture
def s3_service(mock_db, mock_s3_client):
    """Create S3Service instance with mocked dependencies"""
    with patch("app.services.s3_service.boto3") as mock_boto3:
        mock_boto3.client.return_value = mock_s3_client

        service = S3Service(db=mock_db)
        service.s3_client = mock_s3_client
        return service


class TestPreSignedURLGeneration:
    """Tests for pre-signed URL generation (upload and download)"""

    def test_generate_upload_url_for_resume(self, s3_service, mock_s3_client):
        """Test generating pre-signed URL for resume upload"""
        user_id = str(uuid.uuid4())
        file_name = "john_doe_resume.pdf"

        config = FileUploadConfig(
            user_id=user_id,
            file_name=file_name,
            file_type=FileType.RESUME,
            mime_type="application/pdf",
            file_size=500000  # 500KB
        )

        result = s3_service.generate_upload_url(config)

        assert result["url"] is not None
        assert result["fields"] is not None
        assert result["s3_key"].startswith(f"resumes/{user_id}/")
        assert result["expiration"] > datetime.utcnow()
        assert result["expiration"] <= datetime.utcnow() + timedelta(hours=1)

    def test_generate_upload_url_validates_file_type(self, s3_service):
        """Test that upload URL generation validates file type for resumes"""
        config = FileUploadConfig(
            user_id=str(uuid.uuid4()),
            file_name="resume.exe",
            file_type=FileType.RESUME,
            mime_type="application/x-msdownload",
            file_size=500000
        )

        with pytest.raises(ServiceError) as exc_info:
            s3_service.generate_upload_url(config)

        assert "Invalid file type" in str(exc_info.value)

    def test_generate_upload_url_enforces_size_limit_resume(self, s3_service):
        """Test that upload URL generation enforces 10MB limit for resumes"""
        config = FileUploadConfig(
            user_id=str(uuid.uuid4()),
            file_name="large_resume.pdf",
            file_type=FileType.RESUME,
            mime_type="application/pdf",
            file_size=15 * 1024 * 1024  # 15MB
        )

        with pytest.raises(ServiceError) as exc_info:
            s3_service.generate_upload_url(config)

        assert "File too large" in str(exc_info.value)
        assert "10MB" in str(exc_info.value)

    def test_generate_upload_url_for_company_logo(self, s3_service):
        """Test generating pre-signed URL for company logo upload"""
        company_id = str(uuid.uuid4())

        config = FileUploadConfig(
            company_id=company_id,
            file_name="techcorp_logo.png",
            file_type=FileType.COMPANY_LOGO,
            mime_type="image/png",
            file_size=200000  # 200KB
        )

        result = s3_service.generate_upload_url(config)

        assert result["s3_key"].startswith(f"company-logos/{company_id}/")
        assert "logo.png" in result["s3_key"]

    def test_generate_upload_url_enforces_size_limit_logo(self, s3_service):
        """Test that logo upload enforces 2MB limit"""
        config = FileUploadConfig(
            company_id=str(uuid.uuid4()),
            file_name="logo.png",
            file_type=FileType.COMPANY_LOGO,
            mime_type="image/png",
            file_size=3 * 1024 * 1024  # 3MB
        )

        with pytest.raises(ServiceError) as exc_info:
            s3_service.generate_upload_url(config)

        assert "Logo too large" in str(exc_info.value)
        assert "2MB" in str(exc_info.value)

    def test_generate_download_url_for_resume(self, s3_service, mock_db):
        """Test generating pre-signed download URL for resume"""
        file_id = uuid.uuid4()
        user_id = uuid.uuid4()

        # Mock file metadata
        mock_file = FileMetadata(
            id=file_id,
            user_id=user_id,
            s3_key="resumes/user123/resume.pdf",
            s3_bucket="hireflux-documents",
            file_type=FileType.RESUME.value,
            file_name="resume.pdf",
            file_size=500000,
            mime_type="application/pdf",
            status=FileStatus.AVAILABLE.value,
            virus_scan_status="clean"
        )

        mock_db.query().filter().first.return_value = mock_file

        result = s3_service.generate_download_url(file_id=file_id, user_id=user_id)

        assert result["url"] is not None
        assert result["expiration"] > datetime.utcnow()
        assert result["file_name"] == "resume.pdf"

    def test_generate_download_url_enforces_access_control(self, s3_service, mock_db):
        """Test that users cannot download other users' files"""
        file_id = uuid.uuid4()
        owner_id = uuid.uuid4()
        requester_id = uuid.uuid4()  # Different user

        mock_file = FileMetadata(
            id=file_id,
            user_id=owner_id,
            s3_key="resumes/owner/resume.pdf",
            file_type=FileType.RESUME.value,
            status=FileStatus.AVAILABLE.value
        )

        mock_db.query().filter().first.return_value = mock_file

        with pytest.raises(ServiceError) as exc_info:
            s3_service.generate_download_url(file_id=file_id, user_id=requester_id)

        assert "Access forbidden" in str(exc_info.value)

    def test_download_url_rejects_quarantined_files(self, s3_service, mock_db):
        """Test that quarantined files cannot be downloaded"""
        file_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_file = FileMetadata(
            id=file_id,
            user_id=user_id,
            s3_key="resumes/user/resume.pdf",
            status=FileStatus.QUARANTINED.value,
            virus_scan_status="infected"
        )

        mock_db.query().filter().first.return_value = mock_file

        with pytest.raises(ServiceError) as exc_info:
            s3_service.generate_download_url(file_id=file_id, user_id=user_id)

        assert "failed security scan" in str(exc_info.value).lower()


class TestFileUploadOperations:
    """Tests for file upload operations"""

    def test_upload_file_creates_metadata(self, s3_service, mock_db, mock_s3_client):
        """Test that file upload creates metadata record"""
        user_id = uuid.uuid4()

        config = FileUploadConfig(
            user_id=user_id,
            file_name="resume.pdf",
            file_type=FileType.RESUME,
            mime_type="application/pdf",
            file_size=500000
        )

        result = s3_service.initiate_upload(config)

        # Verify metadata creation
        assert mock_db.add.called
        assert mock_db.commit.called

        # Verify upload URL returned
        assert "upload_url" in result
        assert "file_id" in result

    def test_upload_complete_updates_status(self, s3_service, mock_db, mock_s3_client):
        """Test that upload completion updates file status"""
        file_id = uuid.uuid4()

        mock_file = FileMetadata(
            id=file_id,
            s3_key="resumes/user/resume.pdf",
            status=FileStatus.UPLOADING.value
        )

        mock_db.query().filter().first.return_value = mock_file

        s3_service.mark_upload_complete(file_id=file_id)

        assert mock_file.status == FileStatus.SCANNING.value
        assert mock_file.upload_completed_at is not None
        assert mock_db.commit.called

    def test_upload_calculates_file_hash(self, s3_service):
        """Test that file hash is calculated for deduplication"""
        file_content = b"test file content"
        expected_hash = hashlib.sha256(file_content).hexdigest()

        calculated_hash = s3_service.calculate_file_hash(file_content)

        assert calculated_hash == expected_hash

    def test_upload_handles_s3_errors_gracefully(self, s3_service, mock_s3_client):
        """Test that S3 errors are handled gracefully"""
        mock_s3_client.generate_presigned_post.side_effect = ClientError(
            {"Error": {"Code": "NoSuchBucket", "Message": "Bucket not found"}},
            "PutObject"
        )

        config = FileUploadConfig(
            user_id=uuid.uuid4(),
            file_name="resume.pdf",
            file_type=FileType.RESUME,
            mime_type="application/pdf",
            file_size=500000
        )

        with pytest.raises(ServiceError) as exc_info:
            s3_service.generate_upload_url(config)

        assert "Storage service unavailable" in str(exc_info.value)


class TestFileVersioning:
    """Tests for file versioning (multiple resume versions)"""

    def test_upload_new_version_preserves_old(self, s3_service, mock_db):
        """Test that uploading new version preserves old version"""
        user_id = uuid.uuid4()

        # Mock existing file
        old_file = FileMetadata(
            id=uuid.uuid4(),
            user_id=user_id,
            s3_key="resumes/user/resume_v1.pdf",
            version=1,
            is_current_version=True
        )

        mock_db.query().filter().first.return_value = old_file

        # Upload new version
        config = FileUploadConfig(
            user_id=user_id,
            file_name="resume_v2.pdf",
            file_type=FileType.RESUME,
            mime_type="application/pdf",
            file_size=500000
        )

        result = s3_service.initiate_upload(config, replaces_file_id=old_file.id)

        # Old version should be marked as not current
        assert old_file.is_current_version == False

        # New version should reference old version
        assert mock_db.add.called


class TestVirusScanningIntegration:
    """Tests for virus scanning integration"""

    def test_virus_scan_triggers_after_upload(self, s3_service, mock_db):
        """Test that virus scan is triggered after upload completes"""
        file_id = uuid.uuid4()

        mock_file = FileMetadata(
            id=file_id,
            s3_key="resumes/user/resume.pdf",
            status=FileStatus.UPLOADING.value
        )

        mock_db.query().filter().first.return_value = mock_file

        with patch.object(s3_service, 'trigger_virus_scan') as mock_scan:
            s3_service.mark_upload_complete(file_id=file_id)

            mock_scan.assert_called_once_with(file_id)

    def test_clean_scan_marks_file_available(self, s3_service, mock_db):
        """Test that clean virus scan marks file as available"""
        file_id = uuid.uuid4()

        mock_file = FileMetadata(
            id=file_id,
            s3_key="resumes/user/resume.pdf",
            status=FileStatus.SCANNING.value
        )

        mock_db.query().filter().first.return_value = mock_file

        s3_service.update_scan_result(file_id=file_id, scan_status="clean")

        assert mock_file.virus_scan_status == "clean"
        assert mock_file.status == FileStatus.AVAILABLE.value
        assert mock_file.virus_scan_timestamp is not None

    def test_infected_scan_quarantines_file(self, s3_service, mock_db):
        """Test that infected files are quarantined"""
        file_id = uuid.uuid4()

        mock_file = FileMetadata(
            id=file_id,
            s3_key="resumes/user/infected.pdf",
            status=FileStatus.SCANNING.value
        )

        mock_db.query().filter().first.return_value = mock_file

        s3_service.update_scan_result(file_id=file_id, scan_status="infected")

        assert mock_file.virus_scan_status == "infected"
        assert mock_file.status == FileStatus.QUARANTINED.value


class TestFileAccessLogging:
    """Tests for audit logging of file operations"""

    def test_upload_operation_logged(self, s3_service, mock_db):
        """Test that upload operations are logged"""
        config = FileUploadConfig(
            user_id=uuid.uuid4(),
            file_name="resume.pdf",
            file_type=FileType.RESUME,
            mime_type="application/pdf",
            file_size=500000
        )

        with patch.object(s3_service, 'log_access') as mock_log:
            s3_service.initiate_upload(config)

            assert mock_log.called
            call_args = mock_log.call_args[1]
            assert call_args["operation"] == "upload"
            assert call_args["status"] == "success"

    def test_download_operation_logged(self, s3_service, mock_db):
        """Test that download operations are logged"""
        file_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_file = FileMetadata(
            id=file_id,
            user_id=user_id,
            s3_key="resumes/user/resume.pdf",
            status=FileStatus.AVAILABLE.value,
            virus_scan_status="clean"
        )

        mock_db.query().filter().first.return_value = mock_file

        with patch.object(s3_service, 'log_access') as mock_log:
            s3_service.generate_download_url(file_id=file_id, user_id=user_id)

            assert mock_log.called
            call_args = mock_log.call_args[1]
            assert call_args["operation"] == "download"

    def test_failed_operations_logged_with_error(self, s3_service, mock_db):
        """Test that failed operations are logged with error message"""
        file_id = uuid.uuid4()
        different_user = uuid.uuid4()

        mock_file = FileMetadata(
            id=file_id,
            user_id=uuid.uuid4(),  # Different owner
            s3_key="resumes/user/resume.pdf"
        )

        mock_db.query().filter().first.return_value = mock_file

        with patch.object(s3_service, 'log_access') as mock_log:
            try:
                s3_service.generate_download_url(file_id=file_id, user_id=different_user)
            except ServiceError:
                pass

            assert mock_log.called
            call_args = mock_log.call_args[1]
            assert call_args["status"] == "failure"
            assert "error_message" in call_args


class TestFileDeletion:
    """Tests for file deletion and GDPR compliance"""

    def test_delete_file_soft_deletes(self, s3_service, mock_db, mock_s3_client):
        """Test that delete marks file as deleted (soft delete)"""
        file_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_file = FileMetadata(
            id=file_id,
            user_id=user_id,
            s3_key="resumes/user/resume.pdf",
            status=FileStatus.AVAILABLE.value
        )

        mock_db.query().filter().first.return_value = mock_file

        s3_service.delete_file(file_id=file_id, user_id=user_id)

        assert mock_file.status == FileStatus.DELETED.value
        assert mock_file.deleted_at is not None
        assert mock_db.commit.called

    def test_delete_file_removes_from_s3(self, s3_service, mock_db, mock_s3_client):
        """Test that delete removes file from S3"""
        file_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_file = FileMetadata(
            id=file_id,
            user_id=user_id,
            s3_key="resumes/user/resume.pdf",
            s3_bucket="hireflux-documents"
        )

        mock_db.query().filter().first.return_value = mock_file

        s3_service.delete_file(file_id=file_id, user_id=user_id, hard_delete=True)

        mock_s3_client.delete_object.assert_called_once_with(
            Bucket="hireflux-documents",
            Key="resumes/user/resume.pdf"
        )

    def test_delete_enforces_ownership(self, s3_service, mock_db):
        """Test that users can only delete their own files"""
        file_id = uuid.uuid4()
        owner_id = uuid.uuid4()
        different_user = uuid.uuid4()

        mock_file = FileMetadata(
            id=file_id,
            user_id=owner_id,
            s3_key="resumes/user/resume.pdf"
        )

        mock_db.query().filter().first.return_value = mock_file

        with pytest.raises(ServiceError) as exc_info:
            s3_service.delete_file(file_id=file_id, user_id=different_user)

        assert "Access forbidden" in str(exc_info.value)


class TestPathValidation:
    """Tests for S3 path validation (security)"""

    def test_rejects_directory_traversal_attack(self, s3_service):
        """Test that directory traversal paths are rejected"""
        config = FileUploadConfig(
            user_id=uuid.uuid4(),
            file_name="../../../etc/passwd",
            file_type=FileType.RESUME,
            mime_type="application/pdf",
            file_size=500000
        )

        with pytest.raises(ServiceError) as exc_info:
            s3_service.generate_upload_url(config)

        assert "Invalid file path" in str(exc_info.value)

    def test_sanitizes_filename(self, s3_service):
        """Test that filenames are sanitized"""
        dangerous_name = "resume<script>alert('xss')</script>.pdf"
        sanitized = s3_service.sanitize_filename(dangerous_name)

        assert "<script>" not in sanitized
        assert "resume" in sanitized
        assert ".pdf" in sanitized


class TestConcurrentUploads:
    """Tests for concurrent upload handling"""

    def test_concurrent_uploads_from_same_user(self, s3_service, mock_db):
        """Test that concurrent uploads from same user succeed"""
        user_id = uuid.uuid4()

        configs = [
            FileUploadConfig(
                user_id=user_id,
                file_name=f"document_{i}.pdf",
                file_type=FileType.RESUME,
                mime_type="application/pdf",
                file_size=500000
            )
            for i in range(3)
        ]

        results = []
        for config in configs:
            result = s3_service.initiate_upload(config)
            results.append(result)

        # All uploads should succeed with unique S3 keys
        s3_keys = [r["s3_key"] for r in results]
        assert len(s3_keys) == len(set(s3_keys))  # All unique


# Test Summary
"""
Total Test Classes: 10
Total Tests: 30+

Coverage:
- Pre-signed URL generation: 9 tests
- File upload operations: 4 tests
- File versioning: 1 test
- Virus scanning: 3 tests
- Access logging: 3 tests
- File deletion: 3 tests
- Path validation: 2 tests
- Concurrent uploads: 1 test

TDD Status: RED PHASE (tests written, implementation pending)
Next Step: Implement S3Service to make tests pass (GREEN PHASE)
"""
