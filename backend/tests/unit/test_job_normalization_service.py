"""Unit tests for JobNormalizationService"""
import pytest
from datetime import datetime

from app.services.job_normalization_service import JobNormalizationService
from app.schemas.job_feed import (
    JobSource,
    GreenhouseJob,
    GreenhouseDepartment,
    GreenhouseOffice,
    LeverJob,
    LeverCategory
)


@pytest.fixture
def normalization_service():
    """Create JobNormalizationService instance"""
    return JobNormalizationService()


@pytest.fixture
def sample_job_description():
    """Sample job description with various extractable elements"""
    return """
    We are looking for a Senior Backend Engineer with 5-7 years of experience.

    Required Skills:
    - Python with 3+ years experience
    - FastAPI or Django
    - PostgreSQL and SQL
    - Docker and Kubernetes
    - AWS or GCP

    Preferred Skills:
    - Redis
    - GraphQL
    - Microservices architecture

    Experience: 5-7 years of backend development

    Compensation: $150,000 - $200,000 per year

    We offer visa sponsorship for qualified candidates.

    This is a hybrid role based in San Francisco.
    """


class TestSkillExtraction:
    """Test skill extraction from job descriptions"""

    def test_extract_required_skills(self, normalization_service):
        """Test extraction of required skills"""
        text = """
        Required Skills:
        - Python
        - JavaScript (React)
        - SQL (PostgreSQL)
        - Docker
        """

        skills = normalization_service.extract_skills(text, is_required=True)

        assert "python" in skills
        assert "javascript" in skills
        assert "react" in skills
        assert "sql" in skills
        assert "docker" in skills

    def test_extract_preferred_skills(self, normalization_service):
        """Test extraction of preferred skills"""
        text = """
        Required: Python, SQL

        Preferred:
        - AWS experience
        - Kubernetes knowledge
        - GraphQL
        """

        preferred = normalization_service.extract_skills(text, is_required=False)

        assert "aws" in preferred
        assert "kubernetes" in preferred
        assert "graphql" in preferred

    def test_skill_pattern_matching(self, normalization_service):
        """Test various skill pattern variations"""
        text = "nodejs, node.js, Node JS, k8s, kubernetes"

        skills = normalization_service.extract_skills(text, is_required=True)

        assert "javascript" in skills  # Matches nodejs/node.js
        assert "kubernetes" in skills  # Matches k8s

    def test_skill_limit(self, normalization_service):
        """Test that skill extraction is limited to 20 skills"""
        # Text with many skills
        text = " ".join([f"skill{i}" for i in range(50)])
        # Add some real skills
        text += " Python JavaScript SQL Docker AWS GCP"

        skills = normalization_service.extract_skills(text, is_required=True)

        assert len(skills) <= 20


class TestExperienceExtraction:
    """Test experience requirement extraction"""

    def test_extract_years_range(self, normalization_service):
        """Test extraction of experience range"""
        text = "We require 3-5 years of experience"

        min_years, max_years = normalization_service.extract_years_experience(text)

        assert min_years == 3
        assert max_years == 5

    def test_extract_years_with_to(self, normalization_service):
        """Test extraction with 'to' keyword"""
        text = "5 to 7 years of experience required"

        min_years, max_years = normalization_service.extract_years_experience(text)

        assert min_years == 5
        assert max_years == 7

    def test_extract_years_plus(self, normalization_service):
        """Test extraction of '5+' years format"""
        text = "Minimum 5+ years experience"

        min_years, max_years = normalization_service.extract_years_experience(text)

        assert min_years == 5
        assert max_years is None

    def test_extract_years_at_least(self, normalization_service):
        """Test extraction with 'at least' phrase"""
        text = "At least 3 years of relevant experience"

        min_years, max_years = normalization_service.extract_years_experience(text)

        assert min_years == 3
        assert max_years is None

    def test_extract_exact_years(self, normalization_service):
        """Test extraction of exact years"""
        text = "3 years of experience required"

        min_years, max_years = normalization_service.extract_years_experience(text)

        assert min_years == 3
        assert max_years == 3

    def test_no_experience_found(self, normalization_service):
        """Test when no experience pattern is found"""
        text = "Great opportunity for motivated candidates"

        min_years, max_years = normalization_service.extract_years_experience(text)

        assert min_years is None
        assert max_years is None


class TestExperienceLevel:
    """Test experience level detection"""

    def test_explicit_entry_level(self, normalization_service):
        """Test explicit entry level keywords"""
        text = "Entry-level position for new graduates"

        level = normalization_service.extract_experience_level(text)

        assert level == "entry"

    def test_explicit_senior_level(self, normalization_service):
        """Test explicit senior level keywords"""
        text = "Senior Engineer with 7+ years experience"

        level = normalization_service.extract_experience_level(text)

        assert level == "senior"

    def test_infer_from_years_entry(self, normalization_service):
        """Test inferring entry level from years"""
        text = "1-2 years of experience required"

        level = normalization_service.extract_experience_level(text)

        assert level == "entry"

    def test_infer_from_years_mid(self, normalization_service):
        """Test inferring mid level from years"""
        text = "3-5 years of experience"

        level = normalization_service.extract_experience_level(text)

        assert level == "mid"

    def test_infer_from_years_senior(self, normalization_service):
        """Test inferring senior level from years"""
        text = "7+ years of experience"

        level = normalization_service.extract_experience_level(text)

        assert level == "senior"

    def test_principal_level(self, normalization_service):
        """Test principal level detection"""
        text = "Principal Engineer role requiring 15+ years"

        level = normalization_service.extract_experience_level(text)

        assert level == "principal"


class TestSalaryExtraction:
    """Test salary range extraction"""

    def test_extract_salary_with_commas(self, normalization_service):
        """Test salary extraction with comma separators"""
        text = "Salary range: $150,000 - $200,000"

        salary = normalization_service.extract_salary_range(text)

        assert salary is not None
        assert salary.min_salary == 150000
        assert salary.max_salary == 200000
        assert salary.currency == "USD"

    def test_extract_salary_with_k_suffix(self, normalization_service):
        """Test salary extraction with 'k' suffix"""
        text = "Compensation: 120k-180k"

        salary = normalization_service.extract_salary_range(text)

        assert salary is not None
        assert salary.min_salary == 120000
        assert salary.max_salary == 180000

    def test_extract_salary_to_keyword(self, normalization_service):
        """Test salary extraction with 'to' keyword"""
        text = "Salary: $100,000 to $150,000"

        salary = normalization_service.extract_salary_range(text)

        assert salary is not None
        assert salary.min_salary == 100000
        assert salary.max_salary == 150000

    def test_no_salary_found(self, normalization_service):
        """Test when no salary range is found"""
        text = "Competitive compensation package"

        salary = normalization_service.extract_salary_range(text)

        assert salary is None


class TestVisaSponsorshipDetection:
    """Test visa sponsorship detection"""

    def test_detect_visa_sponsorship_explicit(self, normalization_service):
        """Test explicit visa sponsorship mention"""
        text = "We provide visa sponsorship for qualified candidates"

        has_visa = normalization_service.detect_visa_sponsorship(text)

        assert has_visa is True

    def test_detect_h1b_sponsorship(self, normalization_service):
        """Test H1B sponsorship detection"""
        text = "H1B sponsor available"

        has_visa = normalization_service.detect_visa_sponsorship(text)

        assert has_visa is True

    def test_detect_work_authorization(self, normalization_service):
        """Test work authorization mention"""
        text = "Eligible for work authorization support"

        has_visa = normalization_service.detect_visa_sponsorship(text)

        assert has_visa is True

    def test_no_visa_sponsorship(self, normalization_service):
        """Test when no visa sponsorship is mentioned"""
        text = "US work authorization required"

        has_visa = normalization_service.detect_visa_sponsorship(text)

        assert has_visa is False


class TestRemoteTypeDetection:
    """Test location type detection"""

    def test_detect_fully_remote(self, normalization_service):
        """Test fully remote detection"""
        location = "Remote - US"
        description = "This is a fully remote position"

        location_type = normalization_service.detect_remote_type(location, description)

        assert location_type == "remote"

    def test_detect_hybrid(self, normalization_service):
        """Test hybrid detection"""
        location = "San Francisco, CA"
        description = "Hybrid work model with 3 days in office"

        location_type = normalization_service.detect_remote_type(location, description)

        assert location_type == "hybrid"

    def test_detect_onsite(self, normalization_service):
        """Test onsite detection (default)"""
        location = "New York, NY"
        description = "In-person role at our headquarters"

        location_type = normalization_service.detect_remote_type(location, description)

        assert location_type == "onsite"

    def test_remote_in_location_string(self, normalization_service):
        """Test remote keyword in location"""
        location = "Remote"
        description = "Standard job description"

        location_type = normalization_service.detect_remote_type(location, description)

        assert location_type == "remote"


class TestGreenhouseJobNormalization:
    """Test Greenhouse job normalization"""

    def test_normalize_greenhouse_job(self, normalization_service):
        """Test full Greenhouse job normalization"""
        gh_job = GreenhouseJob(
            id="12345",
            title="Senior Backend Engineer",
            location="San Francisco, CA",
            location_type="hybrid",
            absolute_url="https://example.com/jobs/12345",
            metadata=[],
            updated_at="2025-10-24T00:00:00Z",
            departments=[GreenhouseDepartment(id="1", name="Engineering")],
            offices=[GreenhouseOffice(id="1", name="SF Office", location="San Francisco")],
            content="""
            Required: Python, FastAPI, SQL, 5-7 years experience
            Preferred: AWS, Docker
            Salary: $150,000-$200,000
            """
        )

        normalized = normalization_service.normalize_greenhouse_job(gh_job, "Tech Corp")

        assert normalized.external_id == "12345"
        assert normalized.source == JobSource.GREENHOUSE
        assert normalized.title == "Senior Backend Engineer"
        assert normalized.company == "Tech Corp"
        assert normalized.location == "San Francisco, CA"
        assert normalized.location_type == "hybrid"
        assert "python" in normalized.required_skills
        assert "aws" in normalized.preferred_skills or "docker" in normalized.preferred_skills
        assert normalized.department == "Engineering"

    def test_normalize_greenhouse_job_remote(self, normalization_service):
        """Test Greenhouse job with remote location"""
        gh_job = GreenhouseJob(
            id="123",
            title="Software Engineer",
            location="Remote",
            location_type="remote",
            absolute_url="https://example.com/jobs/123",
            metadata=[],
            departments=[],
            offices=[],
            content="Python developer needed"
        )

        normalized = normalization_service.normalize_greenhouse_job(gh_job, "Company")

        assert normalized.location_type == "remote"


class TestLeverJobNormalization:
    """Test Lever job normalization"""

    def test_normalize_lever_job(self, normalization_service):
        """Test full Lever job normalization"""
        lever_job = LeverJob(
            id="abc-123",
            text="Backend Engineer",
            hostedUrl="https://jobs.lever.co/company/abc-123",
            applyUrl="https://jobs.lever.co/company/abc-123/apply",
            location_type="hybrid",
            employment_type="full-time",
            createdAt=1698105600000,  # Timestamp in milliseconds
            categories=[
                LeverCategory(
                    commitment="Full-time",
                    department="Engineering",
                    level="Senior",
                    location="San Francisco",
                    team="Backend"
                )
            ],
            description="<p>Backend engineer role</p>",
            descriptionPlain="""
            Required: Python, FastAPI, 5+ years
            Salary: $140k-$190k
            """,
            lists=[],
            additional="",
            additionalPlain=""
        )

        normalized = normalization_service.normalize_lever_job(lever_job, "Tech Startup")

        assert normalized.external_id == "abc-123"
        assert normalized.source == JobSource.LEVER
        assert normalized.title == "Backend Engineer"
        assert normalized.company == "Tech Startup"
        assert normalized.location == "San Francisco"
        assert normalized.department == "Backend"
        assert normalized.employment_type == "full-time"
        assert "python" in normalized.required_skills

    def test_normalize_lever_job_no_categories(self, normalization_service):
        """Test Lever job without categories"""
        lever_job = LeverJob(
            id="123",
            text="Engineer",
            hostedUrl="https://example.com",
            applyUrl="https://example.com/apply",
            createdAt=1698105600000,
            categories=[],
            description="Simple job",
            descriptionPlain="Simple job description"
        )

        normalized = normalization_service.normalize_lever_job(lever_job, "Company")

        assert normalized.location == "Remote"  # Default
        assert normalized.department is None


class TestExperienceRequirementExtraction:
    """Test experience requirement text extraction"""

    def test_extract_requirement_text(self, normalization_service):
        """Test extraction of experience requirement text"""
        text = "We require 5-7 years of backend development experience"

        requirement = normalization_service.extract_experience_requirement(text)

        assert requirement is not None
        assert "5" in requirement
        assert "years" in requirement.lower()

    def test_extract_plus_years(self, normalization_service):
        """Test extraction of plus years format"""
        text = "3+ years required"

        requirement = normalization_service.extract_experience_requirement(text)

        assert requirement is not None
        assert "3" in requirement

    def test_no_requirement_text(self, normalization_service):
        """Test when no requirement text is found"""
        text = "Great opportunity for motivated individuals"

        requirement = normalization_service.extract_experience_requirement(text)

        assert requirement is None


class TestComprehensiveNormalization:
    """Test comprehensive job normalization"""

    def test_full_normalization_pipeline(
        self,
        normalization_service,
        sample_job_description
    ):
        """Test complete normalization with all fields"""
        # Extract all components
        required_skills = normalization_service.extract_skills(
            sample_job_description,
            is_required=True
        )
        min_years, max_years = normalization_service.extract_years_experience(
            sample_job_description
        )
        level = normalization_service.extract_experience_level(sample_job_description)
        salary = normalization_service.extract_salary_range(sample_job_description)
        has_visa = normalization_service.detect_visa_sponsorship(sample_job_description)
        location_type = normalization_service.detect_remote_type(
            "San Francisco",
            sample_job_description
        )

        # Verify all extractions
        assert "python" in required_skills
        assert "fastapi" in required_skills or "django" in required_skills
        assert min_years == 5
        assert max_years == 7
        assert level == "senior"
        assert salary.min_salary == 150000
        assert salary.max_salary == 200000
        assert has_visa is True
        assert location_type == "hybrid"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
