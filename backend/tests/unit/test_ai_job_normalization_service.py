"""Unit tests for AIJobNormalizationService (Sprint 11-12 Phase 3 TDD)"""

import pytest
from unittest.mock import Mock, AsyncMock, patch
import uuid
from typing import Dict, Any

from app.services.ai_job_normalization_service import AIJobNormalizationService
from app.schemas.bulk_job_posting import CSVJobRow
from app.core.exceptions import ServiceError


@pytest.fixture
def mock_openai_service():
    """Mock OpenAI service"""
    mock = Mock()
    mock.generate_completion = AsyncMock()
    mock.count_tokens = Mock(return_value=50)
    mock.calculate_cost = Mock(return_value=0.001)
    mock.parse_json_response = Mock(return_value={"skills": [], "confidence": 0.8})
    return mock


@pytest.fixture
def service(mock_openai_service):
    """AIJobNormalizationService instance with mocked OpenAI service"""
    with patch(
        "app.services.ai_job_normalization_service.OpenAIService",
        return_value=mock_openai_service,
    ):
        return AIJobNormalizationService()


@pytest.fixture
def sample_job():
    """Sample job data"""
    return CSVJobRow(
        title="Sr. SW Eng",
        department="Engineering",
        location="San Francisco, CA",
        location_type="hybrid",
        employment_type="full-time",
        experience_level="senior",
        salary_min=130000,
        salary_max=170000,
        description="We need a software engineer with React, Node.js, TypeScript, AWS, Docker experience",
        requirements="5+ years experience",
    )


class TestAIJobNormalizationService:
    """Test suite for AIJobNormalizationService"""

    # ==================== Job Title Normalization Tests ====================

    @pytest.mark.asyncio
    async def test_normalize_job_title_success(self, service, mock_openai_service):
        """Test normalizing a non-standard job title"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": "Senior Software Engineer",
            "usage": {"prompt_tokens": 30, "completion_tokens": 5, "total_tokens": 35},
        }

        # Act
        result = await service.normalize_job_title("Sr. SW Eng", "Engineering")

        # Assert
        assert result["normalized_title"] == "Senior Software Engineer"
        assert result["original_title"] == "Sr. SW Eng"
        assert result["confidence"] > 0.8
        assert "cost" in result
        mock_openai_service.generate_completion.assert_called_once()

    @pytest.mark.asyncio
    async def test_normalize_job_title_with_context(self, service, mock_openai_service):
        """Test normalizing job title with department context"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": "Product Manager",
            "usage": {"prompt_tokens": 35, "completion_tokens": 5, "total_tokens": 40},
        }

        # Act
        result = await service.normalize_job_title(
            "PM", "Product", experience_level="mid"
        )

        # Assert
        assert result["normalized_title"] == "Product Manager"
        assert result["confidence"] > 0.0

    @pytest.mark.asyncio
    async def test_normalize_job_title_already_standard(
        self, service, mock_openai_service
    ):
        """Test that standard job titles pass through unchanged"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": "Senior Software Engineer",
            "usage": {"prompt_tokens": 30, "completion_tokens": 5, "total_tokens": 35},
        }

        # Act
        result = await service.normalize_job_title(
            "Senior Software Engineer", "Engineering"
        )

        # Assert
        assert result["normalized_title"] == "Senior Software Engineer"
        assert (
            result["confidence"] >= 0.9
        )  # High confidence for already-standard titles

    @pytest.mark.asyncio
    async def test_normalize_job_title_handles_openai_errors(
        self, service, mock_openai_service
    ):
        """Test error handling when OpenAI API fails"""
        # Arrange
        mock_openai_service.generate_completion.side_effect = Exception("API Error")

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            await service.normalize_job_title("Sr. Eng", "Engineering")

        assert "API Error" in str(exc_info.value) or "Failed to normalize" in str(
            exc_info.value
        )

    @pytest.mark.asyncio
    async def test_normalize_job_title_empty_input(self, service):
        """Test normalizing empty job title"""
        # Act & Assert
        with pytest.raises(ValueError) as exc_info:
            await service.normalize_job_title("", "Engineering")

        assert "title" in str(exc_info.value).lower()

    # ==================== Skills Extraction Tests ====================

    @pytest.mark.asyncio
    async def test_extract_skills_success(
        self, service, mock_openai_service, sample_job
    ):
        """Test extracting skills from job description"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": '{"skills": ["React", "Node.js", "TypeScript", "AWS", "Docker"], "confidence": 0.95}',
            "usage": {"prompt_tokens": 50, "completion_tokens": 30, "total_tokens": 80},
        }
        mock_openai_service.parse_json_response.return_value = {
            "skills": ["React", "Node.js", "TypeScript", "AWS", "Docker"],
            "confidence": 0.95,
        }

        # Act
        result = await service.extract_skills(
            description=sample_job.description,
            requirements=sample_job.requirements,
            title=sample_job.title,
        )

        # Assert
        assert "skills" in result
        assert len(result["skills"]) > 0
        assert "React" in result["skills"]
        assert "Node.js" in result["skills"]
        assert "TypeScript" in result["skills"]
        assert "AWS" in result["skills"]
        assert "Docker" in result["skills"]
        assert result["confidence"] >= 0.9
        assert "cost" in result

    @pytest.mark.asyncio
    async def test_extract_skills_from_requirements_only(
        self, service, mock_openai_service
    ):
        """Test extracting skills when description is minimal"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": '{"skills": ["Python", "Django", "PostgreSQL"], "confidence": 0.85}',
            "usage": {"prompt_tokens": 40, "completion_tokens": 20, "total_tokens": 60},
        }
        mock_openai_service.parse_json_response.return_value = {
            "skills": ["Python", "Django", "PostgreSQL"],
            "confidence": 0.85,
        }

        # Act
        result = await service.extract_skills(
            description="Backend developer needed",
            requirements="Python, Django, PostgreSQL experience required",
            title="Backend Engineer",
        )

        # Assert
        assert len(result["skills"]) > 0
        assert "Python" in result["skills"]
        assert "Django" in result["skills"]
        assert "PostgreSQL" in result["skills"]

    @pytest.mark.asyncio
    async def test_extract_skills_no_skills_found(self, service, mock_openai_service):
        """Test when no skills can be extracted"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": '{"skills": [], "confidence": 0.1}',
            "usage": {"prompt_tokens": 30, "completion_tokens": 10, "total_tokens": 40},
        }
        mock_openai_service.parse_json_response.return_value = {
            "skills": [],
            "confidence": 0.1,
        }

        # Act
        result = await service.extract_skills(
            description="We need a great team player",
            requirements="Good communication skills",
            title="Manager",
        )

        # Assert
        assert "skills" in result
        assert len(result["skills"]) == 0
        assert result["confidence"] < 0.5

    @pytest.mark.asyncio
    async def test_extract_skills_deduplication(self, service, mock_openai_service):
        """Test that duplicate skills are deduplicated"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": '{"skills": ["Python", "python", "PYTHON", "React", "react"], "confidence": 0.9}',
            "usage": {"prompt_tokens": 40, "completion_tokens": 25, "total_tokens": 65},
        }
        mock_openai_service.parse_json_response.return_value = {
            "skills": ["Python", "python", "PYTHON", "React", "react"],
            "confidence": 0.9,
        }

        # Act
        result = await service.extract_skills(
            description="Python and React developer",
            requirements="Python, React",
            title="Full Stack Developer",
        )

        # Assert
        assert len(result["skills"]) == 2  # Should have deduplicated case-insensitive
        skills_lower = [s.lower() for s in result["skills"]]
        assert "python" in skills_lower
        assert "react" in skills_lower

    # ==================== Salary Suggestion Tests ====================

    @pytest.mark.asyncio
    async def test_suggest_salary_range_success(self, service, mock_openai_service):
        """Test suggesting salary range based on role and location"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": '{"salary_min": 130000, "salary_max": 170000, "confidence": 0.85, "market_data": "Based on 2025 market data for SF Bay Area"}',
            "usage": {
                "prompt_tokens": 60,
                "completion_tokens": 40,
                "total_tokens": 100,
            },
        }
        mock_openai_service.parse_json_response.return_value = {
            "salary_min": 130000,
            "salary_max": 170000,
            "confidence": 0.85,
            "market_data": "Based on 2025 market data for SF Bay Area",
        }

        # Act
        result = await service.suggest_salary_range(
            title="Senior Software Engineer",
            location="San Francisco, CA",
            experience_level="senior",
            skills=["Python", "React", "AWS"],
        )

        # Assert
        assert "salary_min" in result
        assert "salary_max" in result
        assert result["salary_min"] == 130000
        assert result["salary_max"] == 170000
        assert result["salary_min"] < result["salary_max"]
        assert result["confidence"] > 0.8
        assert "market_data" in result

    @pytest.mark.asyncio
    async def test_suggest_salary_range_remote_position(
        self, service, mock_openai_service
    ):
        """Test salary suggestion for remote positions"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": '{"salary_min": 100000, "salary_max": 140000, "confidence": 0.8, "market_data": "Remote positions typically have national average ranges"}',
            "usage": {"prompt_tokens": 55, "completion_tokens": 38, "total_tokens": 93},
        }
        mock_openai_service.parse_json_response.return_value = {
            "salary_min": 100000,
            "salary_max": 140000,
            "confidence": 0.8,
            "market_data": "Remote positions typically have national average ranges",
        }

        # Act
        result = await service.suggest_salary_range(
            title="Product Manager",
            location="Remote",
            experience_level="mid",
            skills=["Product Strategy", "Agile"],
        )

        # Assert
        assert result["salary_min"] > 0
        assert result["salary_max"] > result["salary_min"]
        assert "Remote" in result.get("market_data", "")

    @pytest.mark.asyncio
    async def test_suggest_salary_range_entry_level(self, service, mock_openai_service):
        """Test salary suggestion for entry-level positions"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": '{"salary_min": 70000, "salary_max": 90000, "confidence": 0.75, "market_data": "Entry-level software engineer"}',
            "usage": {"prompt_tokens": 50, "completion_tokens": 35, "total_tokens": 85},
        }
        mock_openai_service.parse_json_response.return_value = {
            "salary_min": 70000,
            "salary_max": 90000,
            "confidence": 0.75,
            "market_data": "Entry-level software engineer",
        }

        # Act
        result = await service.suggest_salary_range(
            title="Software Engineer",
            location="Austin, TX",
            experience_level="entry",
            skills=["JavaScript", "Python"],
        )

        # Assert
        assert result["salary_min"] < 100000  # Entry level should be lower
        assert result["salary_max"] < 120000

    @pytest.mark.asyncio
    async def test_suggest_salary_range_with_empty_skills(
        self, service, mock_openai_service
    ):
        """Test salary suggestion without skills"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": '{"salary_min": 90000, "salary_max": 120000, "confidence": 0.7, "market_data": "Generic range for title"}',
            "usage": {"prompt_tokens": 45, "completion_tokens": 32, "total_tokens": 77},
        }
        mock_openai_service.parse_json_response.return_value = {
            "salary_min": 90000,
            "salary_max": 120000,
            "confidence": 0.7,
            "market_data": "Generic range for title",
        }

        # Act
        result = await service.suggest_salary_range(
            title="Data Analyst",
            location="New York, NY",
            experience_level="mid",
            skills=[],
        )

        # Assert
        assert result["salary_min"] > 0
        assert result["salary_max"] > result["salary_min"]
        assert result["confidence"] < 0.9  # Lower confidence without skills

    @pytest.mark.asyncio
    async def test_suggest_salary_range_invalid_range(
        self, service, mock_openai_service
    ):
        """Test handling when AI returns invalid salary range"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": '{"salary_min": 150000, "salary_max": 100000, "confidence": 0.5}',  # Max < Min (invalid)
            "usage": {"prompt_tokens": 50, "completion_tokens": 30, "total_tokens": 80},
        }
        mock_openai_service.parse_json_response.return_value = {
            "salary_min": 150000,
            "salary_max": 100000,
            "confidence": 0.5,
        }

        # Act & Assert
        with pytest.raises(ServiceError) as exc_info:
            await service.suggest_salary_range(
                title="Engineer", location="Seattle, WA", experience_level="mid"
            )

        assert "salary" in str(exc_info.value).lower()

    # ==================== Batch Processing Tests ====================

    @pytest.mark.asyncio
    async def test_normalize_job_batch_success(
        self, service, mock_openai_service, sample_job
    ):
        """Test normalizing multiple jobs in batch"""
        # Arrange
        jobs = [sample_job, sample_job]

        mock_openai_service.generate_completion.return_value = {
            "content": "Senior Software Engineer",
            "usage": {"prompt_tokens": 30, "completion_tokens": 5, "total_tokens": 35},
        }
        mock_openai_service.parse_json_response.return_value = {
            "skills": ["React", "Node.js", "TypeScript"],
            "confidence": 0.9,
        }

        # Act
        results = await service.normalize_job_batch(jobs)

        # Assert
        assert len(results) == 2
        assert all("normalized_title" in r for r in results)
        assert all("extracted_skills" in r for r in results)

    @pytest.mark.asyncio
    async def test_normalize_job_batch_with_failures(
        self, service, mock_openai_service, sample_job
    ):
        """Test batch normalization handles partial failures"""
        # Arrange
        jobs = [sample_job, sample_job, sample_job]

        # Each job needs 2 calls (title + skills). Sample job has salary so no salary call.
        # Job 1: title, skills - succeeds
        # Job 2: title fails
        # Job 3: title, skills - succeeds
        mock_openai_service.generate_completion.side_effect = [
            # Job 1
            {
                "content": "Senior Software Engineer",
                "usage": {
                    "prompt_tokens": 30,
                    "completion_tokens": 5,
                    "total_tokens": 35,
                },
            },
            {
                "content": '{"skills": ["React"], "confidence": 0.9}',
                "usage": {
                    "prompt_tokens": 50,
                    "completion_tokens": 20,
                    "total_tokens": 70,
                },
            },
            # Job 2 - fails on title
            Exception("API Error"),
            # Job 3
            {
                "content": "Senior Software Engineer",
                "usage": {
                    "prompt_tokens": 30,
                    "completion_tokens": 5,
                    "total_tokens": 35,
                },
            },
            {
                "content": '{"skills": ["React"], "confidence": 0.9}',
                "usage": {
                    "prompt_tokens": 50,
                    "completion_tokens": 20,
                    "total_tokens": 70,
                },
            },
        ]
        mock_openai_service.parse_json_response.return_value = {
            "skills": ["React"],
            "confidence": 0.9,
        }

        # Act
        results = await service.normalize_job_batch(jobs, skip_on_error=True)

        # Assert
        assert len(results) == 3
        assert results[0]["success"] is True
        assert results[1]["success"] is False
        assert results[2]["success"] is True

    # ==================== Cost Tracking Tests ====================

    @pytest.mark.asyncio
    async def test_normalization_tracks_cost(self, service, mock_openai_service):
        """Test that normalization operations track API costs"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": "Senior Software Engineer",
            "usage": {"prompt_tokens": 30, "completion_tokens": 5, "total_tokens": 35},
        }
        mock_openai_service.calculate_cost.return_value = 0.0012

        # Act
        result = await service.normalize_job_title("Sr. Eng", "Engineering")

        # Assert
        assert "cost" in result
        assert result["cost"] > 0
        mock_openai_service.calculate_cost.assert_called()

    # ==================== Caching Tests ====================

    @pytest.mark.asyncio
    async def test_title_normalization_uses_cache(self, service, mock_openai_service):
        """Test that repeated normalizations use cache"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": "Senior Software Engineer",
            "usage": {"prompt_tokens": 30, "completion_tokens": 5, "total_tokens": 35},
        }

        # Act
        result1 = await service.normalize_job_title("Sr. SW Eng", "Engineering")
        result2 = await service.normalize_job_title("Sr. SW Eng", "Engineering")

        # Assert
        assert result1["normalized_title"] == result2["normalized_title"]
        # OpenAI should only be called once (second call uses cache)
        assert mock_openai_service.generate_completion.call_count == 1

    # ==================== Confidence Score Tests ====================

    @pytest.mark.asyncio
    async def test_confidence_score_high_for_standard_titles(
        self, service, mock_openai_service
    ):
        """Test confidence scores are high for standard titles"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": "Senior Software Engineer",
            "usage": {"prompt_tokens": 30, "completion_tokens": 5, "total_tokens": 35},
        }

        # Act
        result = await service.normalize_job_title(
            "Senior Software Engineer", "Engineering"
        )

        # Assert
        assert result["confidence"] >= 0.95  # Very high confidence

    @pytest.mark.asyncio
    async def test_confidence_score_lower_for_ambiguous_titles(
        self, service, mock_openai_service
    ):
        """Test confidence scores are lower for ambiguous titles"""
        # Arrange
        mock_openai_service.generate_completion.return_value = {
            "content": "Software Engineer",  # Could be junior, mid, senior
            "usage": {"prompt_tokens": 30, "completion_tokens": 5, "total_tokens": 35},
        }

        # Act
        result = await service.normalize_job_title("Eng", "Engineering")

        # Assert
        assert result["confidence"] < 0.9  # Lower confidence for ambiguous input

    # ==================== Integration Tests ====================

    @pytest.mark.asyncio
    async def test_complete_normalization_workflow(
        self, service, mock_openai_service, sample_job
    ):
        """Test complete job normalization workflow"""
        # Arrange
        mock_openai_service.generate_completion.side_effect = [
            # Title normalization
            {
                "content": "Senior Software Engineer",
                "usage": {
                    "prompt_tokens": 30,
                    "completion_tokens": 5,
                    "total_tokens": 35,
                },
            },
            # Skills extraction
            {
                "content": '{"skills": ["React", "Node.js", "TypeScript"], "confidence": 0.9}',
                "usage": {
                    "prompt_tokens": 50,
                    "completion_tokens": 25,
                    "total_tokens": 75,
                },
            },
            # Salary suggestion (optional if salary exists)
        ]
        mock_openai_service.parse_json_response.return_value = {
            "skills": ["React", "Node.js", "TypeScript"],
            "confidence": 0.9,
        }

        # Act
        enriched_job = await service.enrich_job(sample_job)

        # Assert
        assert enriched_job["original_job"] == sample_job
        assert "normalized_title" in enriched_job
        assert "extracted_skills" in enriched_job
        assert "suggested_salary" in enriched_job
        assert (
            enriched_job["normalized_title"]["normalized_title"]
            == "Senior Software Engineer"
        )
        assert len(enriched_job["extracted_skills"]["skills"]) > 0
        # suggested_salary is None because sample_job already has salary_min and salary_max
        assert enriched_job["suggested_salary"] is None
