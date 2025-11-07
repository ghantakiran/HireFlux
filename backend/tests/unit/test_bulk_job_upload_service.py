"""Unit tests for BulkJobUploadService (Sprint 11-12 TDD)"""

import pytest
from unittest.mock import Mock, patch, AsyncMock
from datetime import datetime, timedelta
import uuid
from sqlalchemy.ext.asyncio import AsyncSession

from app.services.bulk_job_upload_service import BulkJobUploadService
from app.schemas.bulk_job_posting import (
    CSVJobRow,
    BulkUploadCreate,
    BulkUploadStatusEnum,
    DistributionChannelEnum,
)
from app.db.models.bulk_job_posting import BulkJobUpload, BulkUploadStatus


@pytest.fixture
def mock_db():
    """Mock database session"""
    return Mock(spec=AsyncSession)


@pytest.fixture
def service(mock_db):
    """BulkJobUploadService instance"""
    return BulkJobUploadService(db=mock_db)


@pytest.fixture
def sample_csv_jobs():
    """Sample job data from CSV"""
    return [
        CSVJobRow(
            title="Senior Software Engineer",
            department="Engineering",
            location="San Francisco, CA",
            location_type="hybrid",
            employment_type="full-time",
            experience_level="senior",
            salary_min=150000,
            salary_max=200000,
            description="Build scalable systems",
            requirements="5+ years Python",
        ),
        CSVJobRow(
            title="Product Manager",
            department="Product",
            location="Remote",
            location_type="remote",
            employment_type="full-time",
            experience_level="mid",
            salary_min=120000,
            salary_max=160000,
            description="Define product roadmap",
            requirements="3+ years PM experience",
        ),
    ]


@pytest.fixture
def valid_upload_request(sample_csv_jobs):
    """Valid bulk upload request"""
    return BulkUploadCreate(
        filename="jobs_Q4_2025.csv",
        jobs_data=sample_csv_jobs,
        distribution_channels=[
            DistributionChannelEnum.LINKEDIN,
            DistributionChannelEnum.INDEED,
        ],
    )


class TestBulkJobUploadService:
    """Test suite for BulkJobUploadService"""

    @pytest.mark.asyncio
    async def test_create_upload_session_success(
        self, service, mock_db, valid_upload_request
    ):
        """Test creating a bulk upload session successfully"""
        # Arrange
        company_id = str(uuid.uuid4())
        user_id = str(uuid.uuid4())

        # Mock database add and commit
        mock_db.add = Mock()
        mock_db.commit = AsyncMock()
        mock_db.refresh = AsyncMock()

        # Act
        result = await service.create_upload_session(
            company_id=company_id,
            user_id=user_id,
            upload_request=valid_upload_request,
        )

        # Assert
        assert result is not None
        assert mock_db.add.called
        assert mock_db.commit.called
        assert mock_db.refresh.called

    @pytest.mark.asyncio
    async def test_validate_jobs_all_valid(self, service, sample_csv_jobs):
        """Test validation with all valid jobs"""
        # Act
        validation_result = await service.validate_jobs(sample_csv_jobs)

        # Assert
        assert validation_result["valid_count"] == 2
        assert validation_result["invalid_count"] == 0
        assert len(validation_result["errors"]) == 0

    @pytest.mark.asyncio
    async def test_validate_jobs_missing_required_fields(self, service):
        """Test validation with missing required fields"""
        # Arrange
        invalid_jobs = [
            CSVJobRow(title=" ", department="Engineering"),  # Whitespace-only title
            CSVJobRow(title="Valid Job", department="Product"),
        ]

        # Act
        validation_result = await service.validate_jobs(invalid_jobs)

        # Assert
        assert validation_result["valid_count"] == 1
        assert validation_result["invalid_count"] == 1
        assert len(validation_result["errors"]) == 1
        assert validation_result["errors"][0]["row_index"] == 0
        assert "title" in validation_result["errors"][0]["field"]

    @pytest.mark.asyncio
    async def test_validate_jobs_invalid_salary(self, service):
        """Test validation with invalid salary ranges"""
        # Arrange
        invalid_jobs = [
            CSVJobRow(
                title="Software Engineer",
                salary_min=200000,
                salary_max=150000,  # Max < Min
            )
        ]

        # Act
        validation_result = await service.validate_jobs(invalid_jobs)

        # Assert
        assert validation_result["invalid_count"] == 1
        assert len(validation_result["errors"]) > 0

    @pytest.mark.asyncio
    async def test_detect_duplicates_exact_match(self, service):
        """Test duplicate detection for exact title matches"""
        # Arrange
        jobs_with_duplicate = [
            CSVJobRow(title="Software Engineer", location="SF"),
            CSVJobRow(title="Software Engineer", location="SF"),  # Exact duplicate
            CSVJobRow(title="Product Manager", location="NY"),
        ]

        # Act
        duplicate_info = await service.detect_duplicates(jobs_with_duplicate)

        # Assert
        assert len(duplicate_info) > 0
        assert duplicate_info[0].row_index == 1
        assert duplicate_info[0].duplicate_of == 0
        assert duplicate_info[0].similarity_score >= 0.9

    @pytest.mark.asyncio
    async def test_detect_duplicates_similar_titles(self, service):
        """Test duplicate detection for similar titles (fuzzy matching)"""
        # Arrange
        jobs_with_similar = [
            CSVJobRow(title="Senior Software Engineer", location="SF"),
            CSVJobRow(title="Sr. Software Engineer", location="SF"),  # Similar
            CSVJobRow(title="Product Manager", location="NY"),
        ]

        # Act
        duplicate_info = await service.detect_duplicates(jobs_with_similar)

        # Assert
        # Should detect similarity above threshold (e.g., 85%)
        if len(duplicate_info) > 0:
            assert duplicate_info[0].similarity_score >= 0.85

    @pytest.mark.asyncio
    async def test_upload_exceeds_limit(self, service):
        """Test that uploads exceeding 500 jobs are rejected"""
        # Arrange
        too_many_jobs = [CSVJobRow(title=f"Job {i}") for i in range(501)]

        # Act & Assert
        with pytest.raises(ValueError, match="Maximum 500 jobs"):
            await service.validate_job_count(too_many_jobs)

    @pytest.mark.asyncio
    async def test_get_upload_by_id(self, service, mock_db):
        """Test retrieving upload session by ID"""
        # Arrange
        upload_id = str(uuid.uuid4())
        company_id = str(uuid.uuid4())

        mock_upload = Mock(spec=BulkJobUpload)
        mock_upload.id = upload_id
        mock_upload.company_id = company_id
        mock_upload.status = BulkUploadStatus.UPLOADED

        # Mock query
        mock_result = Mock()
        mock_result.scalar_one_or_none = Mock(return_value=mock_upload)
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Act
        result = await service.get_upload_by_id(upload_id, company_id)

        # Assert
        assert result is not None
        assert result.id == upload_id
        assert mock_db.execute.called

    @pytest.mark.asyncio
    async def test_update_upload_status(self, service, mock_db):
        """Test updating upload status"""
        # Arrange
        upload_id = str(uuid.uuid4())
        company_id = str(uuid.uuid4())

        mock_upload = Mock(spec=BulkJobUpload)
        mock_upload.status = BulkUploadStatus.UPLOADED

        mock_result = Mock()
        mock_result.scalar_one_or_none = Mock(return_value=mock_upload)
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()

        # Act
        await service.update_upload_status(
            upload_id, company_id, BulkUploadStatusEnum.VALIDATING
        )

        # Assert
        assert mock_upload.status == BulkUploadStatusEnum.VALIDATING
        assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_list_uploads_by_company(self, service, mock_db):
        """Test listing uploads for a company"""
        # Arrange
        company_id = str(uuid.uuid4())

        mock_uploads = [
            Mock(id=str(uuid.uuid4()), company_id=company_id) for _ in range(3)
        ]

        mock_result = Mock()
        mock_result.scalars = Mock(
            return_value=Mock(all=Mock(return_value=mock_uploads))
        )
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Act
        result = await service.list_uploads_by_company(company_id, page=1, limit=20)

        # Assert
        assert len(result) == 3
        assert mock_db.execute.called

    @pytest.mark.asyncio
    async def test_delete_upload(self, service, mock_db):
        """Test deleting an upload session"""
        # Arrange
        upload_id = str(uuid.uuid4())
        company_id = str(uuid.uuid4())

        mock_upload = Mock(spec=BulkJobUpload)
        mock_result = Mock()
        mock_result.scalar_one_or_none = Mock(return_value=mock_upload)
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.delete = AsyncMock()
        mock_db.commit = AsyncMock()

        # Act
        await service.delete_upload(upload_id, company_id)

        # Assert
        assert mock_db.delete.called
        assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_cancel_upload(self, service, mock_db):
        """Test cancelling an in-progress upload"""
        # Arrange
        upload_id = str(uuid.uuid4())
        company_id = str(uuid.uuid4())

        mock_upload = Mock(spec=BulkJobUpload)
        mock_upload.status = BulkUploadStatus.ENRICHING

        mock_result = Mock()
        mock_result.scalar_one_or_none = Mock(return_value=mock_upload)
        mock_db.execute = AsyncMock(return_value=mock_result)
        mock_db.commit = AsyncMock()

        # Act
        await service.cancel_upload(upload_id, company_id)

        # Assert
        assert mock_upload.status == BulkUploadStatusEnum.CANCELLED
        assert mock_db.commit.called

    @pytest.mark.asyncio
    async def test_cannot_cancel_completed_upload(self, service, mock_db):
        """Test that completed uploads cannot be cancelled"""
        # Arrange
        upload_id = str(uuid.uuid4())
        company_id = str(uuid.uuid4())

        mock_upload = Mock(spec=BulkJobUpload)
        mock_upload.status = BulkUploadStatus.COMPLETED

        mock_result = Mock()
        mock_result.scalar_one_or_none = Mock(return_value=mock_upload)
        mock_db.execute = AsyncMock(return_value=mock_result)

        # Act & Assert
        with pytest.raises(ValueError, match="cannot be cancelled"):
            await service.cancel_upload(upload_id, company_id)
