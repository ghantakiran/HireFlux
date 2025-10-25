"""Unit tests for JobMatchingService"""
import pytest
from unittest.mock import Mock, MagicMock, patch
import uuid
from datetime import datetime

from app.services.job_matching_service import JobMatchingService
from app.schemas.job_matching import (
    JobMatchRequest,
    # JobFilters,  # TODO: Add to schema if needed
    SkillVector,
    MatchQuality
)
from app.db.models.job import Job
from app.db.models.resume import Resume


@pytest.fixture
def mock_db():
    """Create mock database session"""
    return Mock()


@pytest.fixture
def job_matching_service(mock_db):
    """Create JobMatchingService instance with mocked dependencies"""
    with patch('app.services.job_matching_service.PineconeService') as mock_pinecone_class:
        # Configure the mock instance
        mock_pinecone_instance = mock_pinecone_class.return_value
        mock_pinecone_instance.calculate_semantic_similarity.return_value = 0.0  # Default low similarity

        service = JobMatchingService(mock_db)
        return service


@pytest.fixture
def sample_user_skills():
    """Sample user skills"""
    return [
        SkillVector(skill="Python", years_experience=5, proficiency="expert"),
        SkillVector(skill="FastAPI", years_experience=2, proficiency="advanced"),
        SkillVector(skill="SQL", years_experience=4, proficiency="advanced"),
        SkillVector(skill="Docker", years_experience=3, proficiency="intermediate"),
        SkillVector(skill="AWS", years_experience=2, proficiency="intermediate")
    ]


@pytest.fixture
def sample_job():
    """Sample job posting"""
    job = Mock(spec=Job)
    job.id = uuid.uuid4()
    job.title = "Senior Backend Engineer"
    job.company = "Tech Corp"
    job.location = "San Francisco, CA"
    job.location_type = "hybrid"
    job.salary_min = 150000
    job.salary_max = 200000
    job.required_skills = ["Python", "FastAPI", "SQL", "Docker"]
    job.preferred_skills = ["AWS", "Kubernetes", "Redis"]
    job.experience_min_years = 3
    job.experience_max_years = 7
    job.experience_level = "senior"
    job.experience_requirement = "5+ years"
    job.posted_date = datetime.utcnow()
    job.source = "greenhouse"
    job.external_url = "https://example.com/jobs/123"
    job.requires_visa_sponsorship = False
    job.is_active = True
    return job


@pytest.fixture
def sample_resume(sample_user_skills):
    """Sample user resume"""
    resume = Mock(spec=Resume)
    resume.id = uuid.uuid4()
    resume.user_id = uuid.uuid4()
    resume.is_default = True
    resume.is_deleted = False
    resume.parsed_data = {
        "skills": [
            {"name": "Python", "years": 5},
            {"name": "FastAPI", "years": 2},
            {"name": "SQL", "years": 4},
            {"name": "Docker", "years": 3},
            {"name": "AWS", "years": 2}
        ],
        "work_experience": [
            {"start_year": 2018, "end_year": 2021},
            {"start_year": 2021, "end_year": None}  # Current job
        ]
    }
    return resume


class TestSkillMatching:
    """Test skill matching logic"""

    def test_perfect_skill_match(self, job_matching_service, sample_user_skills):
        """Test when user has all required skills"""
        required_skills = ["Python", "FastAPI", "SQL"]
        preferred_skills = []

        score, matches = job_matching_service._calculate_skill_match(
            sample_user_skills,
            required_skills,
            preferred_skills
        )

        assert score == 60  # 50 (all required) + 10 (no preferred)
        assert len(matches) == 3
        assert all(m.user_has for m in matches)

    def test_partial_skill_match(self, job_matching_service, sample_user_skills):
        """Test when user has some required skills"""
        required_skills = ["Python", "FastAPI", "Rust", "Go"]  # Missing Rust and Go
        preferred_skills = []

        score, matches = job_matching_service._calculate_skill_match(
            sample_user_skills,
            required_skills,
            preferred_skills
        )

        assert score == 35  # 25 (50 * 2/4 required) + 10 (no preferred gives full 10)
        assert len(matches) == 4
        assert sum(1 for m in matches if m.user_has) == 2

    def test_preferred_skills_bonus(self, job_matching_service, sample_user_skills):
        """Test preferred skills add bonus points"""
        required_skills = ["Python", "FastAPI"]
        preferred_skills = ["AWS", "Docker"]  # User has both

        score, matches = job_matching_service._calculate_skill_match(
            sample_user_skills,
            required_skills,
            preferred_skills
        )

        assert score == 60  # 50 (all required) + 10 (all preferred)

    def test_no_skills_match(self, job_matching_service):
        """Test when user has none of the required skills"""
        user_skills = [
            SkillVector(skill="Java", years_experience=5),
            SkillVector(skill="Spring", years_experience=3)
        ]
        required_skills = ["Python", "FastAPI", "Django"]
        preferred_skills = []

        score, matches = job_matching_service._calculate_skill_match(
            user_skills,
            required_skills,
            preferred_skills
        )

        assert score == 10  # 0 (no required matches) + 10 (no preferred gives full 10)
        assert all(not m.user_has for m in matches)


class TestExperienceMatching:
    """Test experience matching logic"""

    def test_perfect_experience_match(self, job_matching_service):
        """Test when user experience is within range"""
        score, label = job_matching_service._calculate_experience_score(
            user_years=5,
            job_min=3,
            job_max=7,
            job_requirement="3-7 years"
        )

        assert score == 20
        assert label == "perfect"

    def test_appropriate_experience(self, job_matching_service):
        """Test when user is within 1 year of minimum"""
        score, label = job_matching_service._calculate_experience_score(
            user_years=2,
            job_min=3,
            job_max=7,
            job_requirement="3-7 years"
        )

        assert score == 15
        assert label == "appropriate"

    def test_stretch_opportunity(self, job_matching_service):
        """Test when user is within 2 years of minimum"""
        score, label = job_matching_service._calculate_experience_score(
            user_years=1,
            job_min=3,
            job_max=7,
            job_requirement="3-7 years"
        )

        assert score == 10
        assert label == "stretch"

    def test_underqualified(self, job_matching_service):
        """Test when user has significantly less experience"""
        score, label = job_matching_service._calculate_experience_score(
            user_years=0,
            job_min=5,
            job_max=10,
            job_requirement="5-10 years"
        )

        assert score == 5
        assert label == "under-qualified"

    def test_no_experience_requirement(self, job_matching_service):
        """Test when job has no experience requirement"""
        score, label = job_matching_service._calculate_experience_score(
            user_years=3,
            job_min=None,
            job_max=None,
            job_requirement=None
        )

        assert score == 20
        assert label == "appropriate"


class TestSeniorityMatching:
    """Test seniority level matching logic"""

    def test_exact_seniority_match(self, job_matching_service):
        """Test when user and job seniority levels match exactly"""
        score = job_matching_service._calculate_seniority_score(
            user_years=6,  # Maps to "senior"
            job_level="senior"
        )

        assert score == 10

    def test_adjacent_seniority_level(self, job_matching_service):
        """Test when user is one level adjacent"""
        score = job_matching_service._calculate_seniority_score(
            user_years=4,  # Maps to "mid"
            job_level="senior"
        )

        assert score == 7

    def test_two_levels_apart(self, job_matching_service):
        """Test when user is two levels apart"""
        score = job_matching_service._calculate_seniority_score(
            user_years=1,  # Maps to "entry"
            job_level="senior"
        )

        assert score == 3

    def test_no_job_level(self, job_matching_service):
        """Test when job has no specified level"""
        score = job_matching_service._calculate_seniority_score(
            user_years=5,
            job_level=None
        )

        assert score == 10  # Full points when not specified


class TestYearsToLevel:
    """Test experience years to seniority level conversion"""

    def test_entry_level(self, job_matching_service):
        """Test entry level mapping"""
        assert job_matching_service._years_to_level(0) == "entry"
        assert job_matching_service._years_to_level(2) == "entry"

    def test_mid_level(self, job_matching_service):
        """Test mid level mapping"""
        assert job_matching_service._years_to_level(3) == "mid"
        assert job_matching_service._years_to_level(5) == "mid"

    def test_senior_level(self, job_matching_service):
        """Test senior level mapping"""
        assert job_matching_service._years_to_level(6) == "senior"
        assert job_matching_service._years_to_level(10) == "senior"

    def test_staff_level(self, job_matching_service):
        """Test staff level mapping"""
        assert job_matching_service._years_to_level(11) == "staff"
        assert job_matching_service._years_to_level(15) == "staff"

    def test_principal_level(self, job_matching_service):
        """Test principal level mapping"""
        assert job_matching_service._years_to_level(16) == "principal"
        assert job_matching_service._years_to_level(20) == "principal"


class TestMatchQuality:
    """Test match quality label assignment"""

    def test_excellent_match(self, job_matching_service):
        """Test excellent match label (90-100)"""
        assert job_matching_service._get_match_quality(95) == MatchQuality.EXCELLENT
        assert job_matching_service._get_match_quality(90) == MatchQuality.EXCELLENT

    def test_good_match(self, job_matching_service):
        """Test good match label (70-89)"""
        assert job_matching_service._get_match_quality(80) == MatchQuality.GOOD
        assert job_matching_service._get_match_quality(70) == MatchQuality.GOOD

    def test_partial_match(self, job_matching_service):
        """Test partial match label (40-69)"""
        assert job_matching_service._get_match_quality(50) == MatchQuality.PARTIAL
        assert job_matching_service._get_match_quality(40) == MatchQuality.PARTIAL

    def test_low_match(self, job_matching_service):
        """Test low match label (0-39)"""
        assert job_matching_service._get_match_quality(30) == MatchQuality.LOW
        assert job_matching_service._get_match_quality(0) == MatchQuality.LOW


class TestFitIndexCalculation:
    """Test comprehensive Fit Index calculation"""

    def test_high_fit_index(self, job_matching_service, sample_user_skills, sample_job):
        """Test calculation for a high-fit match"""
        user_experience_years = 5

        fit_index, breakdown, rationale, skill_matches = job_matching_service._calculate_fit_index(
            user_skills=sample_user_skills,
            user_experience_years=user_experience_years,
            job=sample_job,
            semantic_score=0.85
        )

        # Should be high fit (all required skills, good experience, right level)
        assert 80 <= fit_index <= 100
        assert breakdown.total == fit_index
        assert breakdown.skill_match_score >= 50
        assert breakdown.experience_score >= 15
        assert breakdown.seniority_score >= 7

    def test_low_fit_index(self, job_matching_service, sample_job):
        """Test calculation for a low-fit match"""
        # User with no relevant skills or experience
        user_skills = [
            SkillVector(skill="Java", years_experience=1),
            SkillVector(skill="Spring", years_experience=1)
        ]
        user_experience_years = 1

        fit_index, breakdown, rationale, skill_matches = job_matching_service._calculate_fit_index(
            user_skills=user_skills,
            user_experience_years=user_experience_years,
            job=sample_job,
            semantic_score=0.3
        )

        # Should be low fit
        assert fit_index < 40
        assert rationale.summary.lower().find("low match") >= 0

    def test_fit_index_components_sum(self, job_matching_service, sample_user_skills, sample_job):
        """Test that breakdown components sum to total"""
        fit_index, breakdown, rationale, skill_matches = job_matching_service._calculate_fit_index(
            user_skills=sample_user_skills,
            user_experience_years=5,
            job=sample_job,
            semantic_score=0.8
        )

        component_sum = (
            breakdown.skill_match_score +
            breakdown.experience_score +
            breakdown.seniority_score +
            breakdown.semantic_similarity
        )

        assert breakdown.total == min(100, component_sum)


class TestResumeDataExtraction:
    """Test resume data extraction methods"""

    def test_extract_skills_from_resume(self, job_matching_service, sample_resume):
        """Test skill extraction from resume"""
        skills = job_matching_service._extract_skills_from_resume(sample_resume)

        assert len(skills) == 5
        assert any(s.skill == "Python" and s.years_experience == 5 for s in skills)
        assert any(s.skill == "FastAPI" and s.years_experience == 2 for s in skills)

    def test_extract_skills_simple_format(self, job_matching_service):
        """Test skill extraction with simple string format"""
        resume = Mock(spec=Resume)
        resume.parsed_data = {
            "skills": ["Python", "JavaScript", "SQL"]
        }

        skills = job_matching_service._extract_skills_from_resume(resume)

        assert len(skills) == 3
        assert all(isinstance(s, SkillVector) for s in skills)
        assert all(s.years_experience is None for s in skills)

    def test_calculate_experience_years(self, job_matching_service, sample_resume):
        """Test total experience calculation"""
        years = job_matching_service._calculate_experience_years(sample_resume)

        # Should be around 7 years (2018-2025)
        assert 6 <= years <= 8

    def test_calculate_experience_no_work_history(self, job_matching_service):
        """Test experience calculation with no work history"""
        resume = Mock(spec=Resume)
        resume.parsed_data = {"work_experience": []}

        years = job_matching_service._calculate_experience_years(resume)

        assert years == 0


class TestPineconeFilters:
    """Test Pinecone filter building"""

    def test_build_filters_with_all_options(self, job_matching_service):
        """Test filter building with all filter options"""
        from app.schemas.job_matching import LocationType

        filters = Mock()
        filters.visa_sponsorship = True
        filters.min_salary = 100000
        filters.location_types = [LocationType.REMOTE, LocationType.HYBRID]

        pinecone_filter = job_matching_service._build_pinecone_filters(filters)

        assert pinecone_filter["visa_sponsorship"]["$eq"] is True
        assert pinecone_filter["salary_min"]["$gte"] == 100000
        assert pinecone_filter["location_type"]["$in"] == ["remote", "hybrid"]

    def test_build_filters_minimal(self, job_matching_service):
        """Test filter building with minimal options"""
        filters = Mock()
        filters.visa_sponsorship = None
        filters.min_salary = None
        filters.location_types = None

        pinecone_filter = job_matching_service._build_pinecone_filters(filters)

        assert pinecone_filter is None


class TestRationaleGeneration:
    """Test match rationale generation"""

    def test_excellent_match_rationale(self, job_matching_service):
        """Test rationale for excellent match"""
        rationale = job_matching_service._generate_rationale(
            total=95,
            matching_skills=["Python", "FastAPI", "SQL", "Docker"],
            skill_gaps=[],
            transferable_skills=["AWS"],
            experience_label="perfect",
            user_years=5,
            job_requirement="3-7 years"
        )

        assert "Excellent match" in rationale.summary
        assert len(rationale.matching_skills) == 4
        assert len(rationale.skill_gaps) == 0
        assert "recommend applying" in rationale.recommendations[-1].lower()

    def test_low_match_rationale(self, job_matching_service):
        """Test rationale for low match"""
        rationale = job_matching_service._generate_rationale(
            total=25,
            matching_skills=["Python"],
            skill_gaps=["FastAPI", "Docker", "Kubernetes"],
            transferable_skills=[],
            experience_label="under-qualified",
            user_years=1,
            job_requirement="5+ years"
        )

        assert "Low match" in rationale.summary
        assert len(rationale.skill_gaps) == 3
        assert len(rationale.recommendations) > 0
        assert "Consider learning" in rationale.recommendations[0]

    def test_rationale_includes_recommendations(self, job_matching_service):
        """Test that rationale includes actionable recommendations"""
        rationale = job_matching_service._generate_rationale(
            total=60,
            matching_skills=["Python", "SQL"],
            skill_gaps=["Docker", "Kubernetes"],
            transferable_skills=["FastAPI"],
            experience_label="appropriate",
            user_years=3,
            job_requirement="3-5 years"
        )

        assert len(rationale.recommendations) >= 1
        # Should recommend learning missing skills
        assert any("learning" in rec.lower() or "consider" in rec.lower()
                   for rec in rationale.recommendations)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
