"""Unit tests for AI resume generation service"""
import pytest
from unittest.mock import Mock, patch, MagicMock
import uuid
from datetime import datetime

from app.services.ai_generation_service import AIGenerationService
from app.schemas.ai_generation import (
    ResumeTone,
    ResumeLength,
    OptimizationStyle,
    AIResumeGenerationRequest
)
from app.schemas.resume import ParsedResumeData, ContactInfo
from app.core.exceptions import NotFoundError, ServiceError, ValidationError


@pytest.fixture
def mock_db():
    """Create mock database session"""
    return Mock()


@pytest.fixture
def mock_openai_service():
    """Create mock OpenAI service"""
    mock = Mock()
    mock.generate_completion.return_value = {
        "content": '{"summary": "Test", "work_experience": [], "skills": []}',
        "usage": {"total_tokens": 500, "prompt_tokens": 300, "completion_tokens": 200}
    }
    mock.calculate_cost.return_value = 0.015
    return mock


@pytest.fixture
def ai_service(mock_db, mock_openai_service):
    """Create AI generation service"""
    service = AIGenerationService(mock_db)
    service.openai_service = mock_openai_service
    return service


@pytest.fixture
def sample_resume_data():
    """Sample parsed resume data"""
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


class TestGenerateOptimizedResume:
    """Test optimized resume generation"""

    def test_generate_resume_success(self, ai_service, mock_db, sample_resume_data):
        """Test successful resume generation"""
        request = AIResumeGenerationRequest(
            resume_id=str(uuid.uuid4()),
            target_title="Software Engineer",
            tone=ResumeTone.FORMAL
        )

        # Mock resume retrieval
        mock_resume = Mock()
        mock_resume.id = uuid.uuid4()
        mock_resume.parsed_data = sample_resume_data.model_dump()

        # Properly mock the chained query
        mock_query = Mock()
        mock_filter = Mock()
        mock_filter.first.return_value = mock_resume
        mock_query.filter.return_value = mock_filter
        mock_db.query.return_value = mock_query

        result = ai_service.generate_optimized_resume(
            user_id=uuid.uuid4(),
            request=request
        )

        assert result is not None
        assert result.status == "completed"

    def test_generate_resume_with_keywords(self, ai_service, mock_db, sample_resume_data):
        """Test generation with specific keywords"""
        request = AIResumeGenerationRequest(
            resume_id=str(uuid.uuid4()),
            target_title="Full Stack Developer",
            include_keywords=["React", "Node.js", "AWS"]
        )

        mock_resume = Mock()
        mock_resume.parsed_data = sample_resume_data.model_dump()
        mock_db.query().filter().first.return_value = mock_resume

        result = ai_service.generate_optimized_resume(
            user_id=uuid.uuid4(),
            request=request
        )

        # Verify keywords were included in prompt
        ai_service.openai_service.generate_completion.assert_called_once()

    def test_generate_resume_resume_not_found(self, ai_service, mock_db):
        """Test generation when resume doesn't exist"""
        request = AIResumeGenerationRequest(
            resume_id=str(uuid.uuid4())
        )

        mock_db.query().filter().first.return_value = None

        with pytest.raises(NotFoundError):
            ai_service.generate_optimized_resume(
                user_id=uuid.uuid4(),
                request=request
            )


class TestToneCustomization:
    """Test different tone styles"""

    def test_formal_tone(self, ai_service, mock_db, sample_resume_data):
        """Test formal tone generation"""
        request = AIResumeGenerationRequest(
            resume_id=str(uuid.uuid4()),
            tone=ResumeTone.FORMAL
        )

        mock_resume = Mock()
        mock_resume.parsed_data = sample_resume_data.model_dump()
        mock_db.query().filter().first.return_value = mock_resume

        ai_service.generate_optimized_resume(uuid.uuid4(), request)

        # Verify formal tone in prompt
        call_args = ai_service.openai_service.generate_completion.call_args
        assert "formal" in str(call_args).lower()

    def test_conversational_tone(self, ai_service, mock_db, sample_resume_data):
        """Test conversational tone generation"""
        request = AIResumeGenerationRequest(
            resume_id=str(uuid.uuid4()),
            tone=ResumeTone.CONVERSATIONAL
        )

        mock_resume = Mock()
        mock_resume.parsed_data = sample_resume_data.model_dump()
        mock_db.query().filter().first.return_value = mock_resume

        ai_service.generate_optimized_resume(uuid.uuid4(), request)

        call_args = ai_service.openai_service.generate_completion.call_args
        assert "conversational" in str(call_args).lower()


class TestCostTracking:
    """Test cost tracking for AI generation"""

    def test_tracks_token_usage(self, ai_service, mock_db, sample_resume_data):
        """Test that token usage is tracked"""
        request = AIResumeGenerationRequest(
            resume_id=str(uuid.uuid4())
        )

        mock_resume = Mock()
        mock_resume.parsed_data = sample_resume_data.model_dump()
        mock_db.query().filter().first.return_value = mock_resume

        result = ai_service.generate_optimized_resume(uuid.uuid4(), request)

        assert result.token_usage > 0
        assert result.cost > 0

    def test_calculates_cost_correctly(self, ai_service, mock_db, sample_resume_data):
        """Test cost calculation"""
        request = AIResumeGenerationRequest(
            resume_id=str(uuid.uuid4())
        )

        mock_resume = Mock()
        mock_resume.parsed_data = sample_resume_data.model_dump()
        mock_db.query().filter().first.return_value = mock_resume

        ai_service.openai_service.calculate_cost.return_value = 0.025

        result = ai_service.generate_optimized_resume(uuid.uuid4(), request)

        assert result.cost == 0.025


class TestVersionManagement:
    """Test resume version management"""

    def test_creates_version_record(self, ai_service, mock_db, sample_resume_data):
        """Test that version is saved to database"""
        request = AIResumeGenerationRequest(
            resume_id=str(uuid.uuid4()),
            version_name="Software Engineer Resume"
        )

        mock_resume = Mock()
        mock_resume.id = uuid.uuid4()
        mock_resume.parsed_data = sample_resume_data.model_dump()
        mock_db.query().filter().first.return_value = mock_resume

        ai_service.generate_optimized_resume(uuid.uuid4(), request)

        # Verify version was added to database
        assert mock_db.add.called
        assert mock_db.commit.called

    def test_version_has_correct_metadata(self, ai_service, mock_db, sample_resume_data):
        """Test version metadata"""
        request = AIResumeGenerationRequest(
            resume_id=str(uuid.uuid4()),
            target_title="Tech Lead",
            tone=ResumeTone.FORMAL
        )

        mock_resume = Mock()
        mock_resume.parsed_data = sample_resume_data.model_dump()
        mock_db.query().filter().first.return_value = mock_resume

        result = ai_service.generate_optimized_resume(uuid.uuid4(), request)

        # Check metadata
        added_version = mock_db.add.call_args[0][0]
        assert added_version.target_title == "Tech Lead"
        assert added_version.tone == "formal"


class TestErrorHandling:
    """Test error handling"""

    def test_handles_openai_error(self, ai_service, mock_db, sample_resume_data):
        """Test handling OpenAI API errors"""
        request = AIResumeGenerationRequest(
            resume_id=str(uuid.uuid4())
        )

        mock_resume = Mock()
        mock_resume.parsed_data = sample_resume_data.model_dump()
        mock_db.query().filter().first.return_value = mock_resume

        ai_service.openai_service.generate_completion.side_effect = ServiceError("API Error")

        with pytest.raises(ServiceError):
            ai_service.generate_optimized_resume(uuid.uuid4(), request)

    def test_handles_invalid_json_response(self, ai_service, mock_db, sample_resume_data):
        """Test handling invalid JSON from OpenAI"""
        request = AIResumeGenerationRequest(
            resume_id=str(uuid.uuid4())
        )

        mock_resume = Mock()
        mock_resume.parsed_data = sample_resume_data.model_dump()
        mock_db.query().filter().first.return_value = mock_resume

        ai_service.openai_service.generate_completion.return_value = {
            "content": "Not valid JSON",
            "usage": {"total_tokens": 100, "prompt_tokens": 50, "completion_tokens": 50}
        }

        with pytest.raises(ValueError):
            ai_service.generate_optimized_resume(uuid.uuid4(), request)


class TestStrictFactualMode:
    """Test strict factual mode"""

    def test_strict_mode_in_prompt(self, ai_service, mock_db, sample_resume_data):
        """Test that strict mode is reflected in prompt"""
        request = AIResumeGenerationRequest(
            resume_id=str(uuid.uuid4()),
            strict_factual=True
        )

        mock_resume = Mock()
        mock_resume.parsed_data = sample_resume_data.model_dump()
        mock_db.query().filter().first.return_value = mock_resume

        ai_service.generate_optimized_resume(uuid.uuid4(), request)

        # Verify strict mode instruction in prompt
        call_args = ai_service.openai_service.generate_completion.call_args
        messages = call_args.kwargs.get('messages', call_args[0][0])
        prompt_content = str(messages)
        assert "not fabricate" in prompt_content.lower() or "only use" in prompt_content.lower()


class TestRegenerateSection:
    """Test section regeneration"""

    def test_regenerate_work_experience(self, ai_service, mock_db):
        """Test regenerating work experience section"""
        version_id = uuid.uuid4()
        user_id = uuid.uuid4()

        mock_version = Mock()
        mock_version.id = version_id
        mock_version.content = {"work_experience": [], "skills": []}
        mock_db.query().filter().first.return_value = mock_version

        ai_service.openai_service.generate_completion.return_value = {
            "content": '{"work_experience": [{"title": "Engineer"}]}',
            "usage": {"total_tokens": 200, "prompt_tokens": 100, "completion_tokens": 100}
        }

        result = ai_service.regenerate_section(
            user_id=user_id,
            version_id=version_id,
            section="work_experience"
        )

        assert "work_experience" in result.content
        assert mock_db.commit.called


class TestGetVersionHistory:
    """Test version history retrieval"""

    def test_list_versions_for_resume(self, ai_service, mock_db):
        """Test listing all versions"""
        user_id = uuid.uuid4()
        resume_id = uuid.uuid4()

        mock_versions = [
            Mock(id=uuid.uuid4(), version_name="V1"),
            Mock(id=uuid.uuid4(), version_name="V2")
        ]
        mock_db.query().filter().all.return_value = mock_versions

        versions = ai_service.get_version_history(user_id, resume_id)

        assert len(versions) == 2


class TestCompareVersions:
    """Test version comparison"""

    def test_compare_two_versions(self, ai_service, mock_db):
        """Test comparing original and generated versions"""
        user_id = uuid.uuid4()
        version1_id = uuid.uuid4()
        version2_id = uuid.uuid4()

        mock_v1 = Mock(content={"skills": ["Python"]})
        mock_v2 = Mock(content={"skills": ["Python", "JavaScript"]})

        mock_db.query().filter().first.side_effect = [mock_v1, mock_v2]

        comparison = ai_service.compare_versions(user_id, version1_id, version2_id)

        assert "differences" in comparison
        assert "improvements" in comparison
