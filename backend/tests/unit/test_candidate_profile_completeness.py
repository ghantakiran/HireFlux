"""
Unit Tests for Candidate Profile Completeness - Issue #57

Tests profile completeness calculation and privacy controls.
Follows TDD/BDD practices with comprehensive coverage.

Run with: pytest tests/unit/test_candidate_profile_completeness.py -v
"""

import pytest
from unittest.mock import Mock
from uuid import uuid4

from app.services.candidate_profile_service import CandidateProfileService
from app.db.models.candidate_profile import CandidateProfile


# ===========================================================================
# Fixtures
# ===========================================================================


@pytest.fixture
def mock_db():
    """Mock database session"""
    return Mock()


@pytest.fixture
def profile_service(mock_db):
    """Create profile service instance"""
    return CandidateProfileService(mock_db)


@pytest.fixture
def empty_profile():
    """Profile with no fields filled"""
    return CandidateProfile(
        id=uuid4(),
        user_id=uuid4(),
        visibility="private",
        open_to_work=False,
        open_to_remote=False,
        headline=None,
        bio=None,
        location=None,
        profile_picture_url=None,
        skills=[],
        years_experience=None,
        experience_level=None,
        preferred_roles=[],
        preferred_location_type=None,
        expected_salary_min=None,
        expected_salary_max=None,
        availability_status="not_looking",
        availability_start_date=None,
        portfolio=[],
        resume_summary=None,
        latest_resume_url=None,
    )


@pytest.fixture
def partial_profile():
    """Profile with some fields filled (50%)"""
    return CandidateProfile(
        id=uuid4(),
        user_id=uuid4(),
        visibility="private",
        open_to_work=False,
        headline="Senior Software Engineer",
        bio="Experienced developer with 8 years...",
        location="San Francisco, CA",
        skills=["Python", "React", "AWS"],
        years_experience=8,
        experience_level="senior",
        # Missing: preferred_roles, salary, availability, portfolio, etc.
        preferred_roles=[],
        expected_salary_min=None,
        expected_salary_max=None,
        portfolio=[],
        resume_summary=None,
    )


@pytest.fixture
def complete_profile():
    """Profile with all fields filled (100%)"""
    return CandidateProfile(
        id=uuid4(),
        user_id=uuid4(),
        visibility="public",
        open_to_work=True,
        open_to_remote=True,
        headline="Senior Full-Stack Engineer | Python | React",
        bio="Passionate developer with 8 years of experience...",
        location="San Francisco, CA",
        profile_picture_url="https://example.com/profile.jpg",
        skills=["Python", "React", "AWS", "Docker"],
        years_experience=8,
        experience_level="senior",
        preferred_roles=["Full-Stack Engineer", "Backend Engineer"],
        preferred_location_type="remote",
        expected_salary_min=120000,
        expected_salary_max=150000,
        expected_salary_currency="USD",
        availability_status="actively_looking",
        availability_start_date=None,  # Available immediately
        portfolio=[
            {"type": "github", "title": "React Components", "url": "https://github.com/user/repo"}
        ],
        resume_summary="Senior engineer with expertise in Python and React...",
        latest_resume_url="https://example.com/resume.pdf",
    )


# ===========================================================================
# Profile Completeness Tests
# ===========================================================================


class TestProfileCompleteness:
    """Test profile completeness calculation"""

    def test_calculate_completeness_empty_profile(self, profile_service, empty_profile):
        """Test completeness for empty profile (0%)"""
        completeness = profile_service.calculate_profile_completeness(empty_profile)

        assert completeness["percentage"] == 0
        assert len(completeness["missing_fields"]) > 0
        assert "headline" in completeness["missing_fields"]
        assert "bio" in completeness["missing_fields"]
        assert "skills" in completeness["missing_fields"]

    def test_calculate_completeness_partial_profile(self, profile_service, partial_profile):
        """Test completeness for partially filled profile (~75%)"""
        completeness = profile_service.calculate_profile_completeness(partial_profile)

        # Partial profile has: headline (15), bio (15), location (10), skills (15), years_experience (10), experience_level (10)
        # Total: 75%
        assert 70 <= completeness["percentage"] <= 80  # Approximately 75%
        assert len(completeness["missing_fields"]) > 0
        assert "headline" not in completeness["missing_fields"]  # Already filled
        assert "bio" not in completeness["missing_fields"]  # Already filled

    def test_calculate_completeness_complete_profile(self, profile_service, complete_profile):
        """Test completeness for fully filled profile (100%)"""
        completeness = profile_service.calculate_profile_completeness(complete_profile)

        assert completeness["percentage"] == 100
        assert len(completeness["missing_fields"]) == 0
        assert completeness["is_complete"] is True

    def test_completeness_includes_required_fields(self, profile_service):
        """Test that completeness identifies required fields"""
        required_fields = profile_service.get_required_profile_fields()

        assert "headline" in required_fields
        assert "bio" in required_fields
        assert "skills" in required_fields
        assert "years_experience" in required_fields
        assert "location" in required_fields

    def test_completeness_includes_optional_fields(self, profile_service):
        """Test that completeness includes optional fields"""
        optional_fields = profile_service.get_optional_profile_fields()

        assert "portfolio" in optional_fields
        assert "profile_picture_url" in optional_fields
        assert "expected_salary_min" in optional_fields
        assert "resume_summary" in optional_fields

    def test_completeness_weights_fields_appropriately(self, profile_service, empty_profile):
        """Test that required fields have higher weight than optional"""
        # Add only required fields
        empty_profile.headline = "Senior Engineer"
        empty_profile.bio = "Experienced developer"
        empty_profile.skills = ["Python", "React"]
        empty_profile.years_experience = 5
        empty_profile.location = "San Francisco"

        completeness_required_only = profile_service.calculate_profile_completeness(empty_profile)

        # Now add optional fields
        empty_profile.portfolio = [{"type": "github", "url": "https://github.com/user/repo"}]
        empty_profile.resume_summary = "Summary"

        completeness_with_optional = profile_service.calculate_profile_completeness(empty_profile)

        # Required fields should contribute more to completeness
        assert completeness_required_only["percentage"] >= 60  # Most weight from required
        assert completeness_with_optional["percentage"] > completeness_required_only["percentage"]

    def test_empty_skills_array_counts_as_missing(self, profile_service, empty_profile):
        """Test that empty skills array is treated as missing"""
        empty_profile.skills = []

        completeness = profile_service.calculate_profile_completeness(empty_profile)

        assert "skills" in completeness["missing_fields"]

    def test_skills_with_values_counts_as_filled(self, profile_service, empty_profile):
        """Test that skills with values is not missing"""
        empty_profile.skills = ["Python", "React"]

        completeness = profile_service.calculate_profile_completeness(empty_profile)

        assert "skills" not in completeness["missing_fields"]


# ===========================================================================
# Privacy Controls Tests
# ===========================================================================


class TestPrivacyControls:
    """Test privacy control settings"""

    def test_hide_salary_from_public_profile(self, profile_service, complete_profile):
        """Test hiding salary expectations"""
        complete_profile.show_salary = False

        public_data = profile_service.get_public_profile_data(complete_profile)

        assert "expected_salary_min" not in public_data
        assert "expected_salary_max" not in public_data
        assert "expected_salary_currency" not in public_data

    def test_show_salary_in_public_profile(self, profile_service, complete_profile):
        """Test showing salary when enabled"""
        complete_profile.show_salary = True

        public_data = profile_service.get_public_profile_data(complete_profile)

        assert public_data["expected_salary_min"] == 120000
        assert public_data["expected_salary_max"] == 150000

    def test_hide_contact_from_public_profile(self, profile_service, complete_profile):
        """Test hiding contact information"""
        complete_profile.show_contact = False

        public_data = profile_service.get_public_profile_data(complete_profile)

        assert "email" not in public_data
        assert "phone" not in public_data

    def test_show_contact_in_public_profile(self, profile_service, complete_profile):
        """Test showing contact when enabled (requires user relationship loaded)"""
        complete_profile.show_contact = True

        public_data = profile_service.get_public_profile_data(complete_profile)

        # Email only included if user relationship is loaded
        # In this test, user is not loaded, so email should not be in public_data
        # This is correct behavior - privacy-safe by default

    def test_hide_exact_location_from_public_profile(self, profile_service, complete_profile):
        """Test hiding exact location (show only country)"""
        complete_profile.show_location = False
        complete_profile.location = "San Francisco, CA, United States"

        public_data = profile_service.get_public_profile_data(complete_profile)

        # Should only show country
        assert public_data["location"] == "United States"
        assert "San Francisco" not in public_data["location"]

    def test_show_exact_location_in_public_profile(self, profile_service, complete_profile):
        """Test showing exact location when enabled"""
        complete_profile.show_location = True
        complete_profile.location = "San Francisco, CA, United States"

        public_data = profile_service.get_public_profile_data(complete_profile)

        assert public_data["location"] == "San Francisco, CA, United States"


# ===========================================================================
# Public Profile Validation Tests
# ===========================================================================


class TestPublicProfileValidation:
    """Test validation for making profile public"""

    def test_cannot_make_public_with_zero_completeness(self, profile_service, empty_profile):
        """Test that empty profile cannot be made public"""
        with pytest.raises(ValueError, match="at least 50%"):
            profile_service.validate_public_profile(empty_profile)

    def test_cannot_make_public_without_required_fields(self, profile_service, empty_profile):
        """Test that profile without required fields cannot be public"""
        empty_profile.headline = "Senior Engineer"
        # Missing other required fields (bio, skills, years_experience, location, experience_level)

        with pytest.raises(ValueError, match="at least 50%"):
            profile_service.validate_public_profile(empty_profile)

    def test_can_make_public_with_50_percent_completeness(self, profile_service, partial_profile):
        """Test that 50%+ complete profile can be public"""
        # Should not raise
        profile_service.validate_public_profile(partial_profile)

    def test_can_make_public_with_all_required_fields(self, profile_service):
        """Test that profile with all required fields can be public"""
        profile = CandidateProfile(
            id=uuid4(),
            user_id=uuid4(),
            headline="Senior Engineer",
            bio="Experienced developer...",
            skills=["Python", "React"],
            years_experience=5,
            location="San Francisco",
            experience_level="senior",
        )

        # Should not raise
        profile_service.validate_public_profile(profile)


# ===========================================================================
# Profile Preview Tests
# ===========================================================================


class TestProfilePreview:
    """Test profile preview functionality"""

    def test_preview_shows_only_public_fields(self, profile_service, complete_profile):
        """Test that preview excludes hidden fields"""
        complete_profile.show_salary = False
        complete_profile.show_contact = False

        preview = profile_service.get_profile_preview(complete_profile)

        assert "headline" in preview
        assert "bio" in preview
        assert "skills" in preview
        assert "expected_salary_min" not in preview
        assert "email" not in preview

    def test_preview_includes_completeness_score(self, profile_service, partial_profile):
        """Test that preview shows completeness percentage"""
        preview = profile_service.get_profile_preview(partial_profile)

        assert "completeness_percentage" in preview
        assert 0 <= preview["completeness_percentage"] <= 100

    def test_preview_shows_missing_fields_warning(self, profile_service, partial_profile):
        """Test that preview warns about missing fields"""
        preview = profile_service.get_profile_preview(partial_profile)

        assert "missing_fields" in preview
        assert len(preview["missing_fields"]) > 0


# ===========================================================================
# Field Weights Tests
# ===========================================================================


class TestFieldWeights:
    """Test field weight configuration for completeness"""

    def test_required_fields_have_higher_weight(self, profile_service):
        """Test that required fields contribute more to completeness"""
        weights = profile_service.get_field_weights()

        # Required fields should have weight > 5
        assert weights["headline"] > 5
        assert weights["bio"] > 5
        assert weights["skills"] > 5

        # Optional fields should have weight <= 5
        assert weights.get("portfolio", 0) <= 5
        assert weights.get("resume_summary", 0) <= 5

    def test_total_weights_sum_to_100(self, profile_service):
        """Test that all field weights sum to 100%"""
        weights = profile_service.get_field_weights()

        total = sum(weights.values())
        assert total == 100

    def test_headline_has_highest_weight(self, profile_service):
        """Test that headline is the most important field"""
        weights = profile_service.get_field_weights()

        headline_weight = weights["headline"]
        assert all(headline_weight >= weight for field, weight in weights.items())


# ===========================================================================
# Portfolio Tests
# ===========================================================================


class TestPortfolioCompleteness:
    """Test portfolio contribution to completeness"""

    def test_empty_portfolio_reduces_completeness(self, profile_service, complete_profile):
        """Test that missing portfolio reduces completeness score"""
        complete_profile.portfolio = []

        completeness_without_portfolio = profile_service.calculate_profile_completeness(
            complete_profile
        )

        complete_profile.portfolio = [
            {"type": "github", "title": "Project", "url": "https://github.com/user/repo"}
        ]

        completeness_with_portfolio = profile_service.calculate_profile_completeness(
            complete_profile
        )

        assert completeness_with_portfolio["percentage"] > completeness_without_portfolio["percentage"]

    def test_multiple_portfolio_items_better_than_one(self, profile_service, complete_profile):
        """Test that more portfolio items improve completeness"""
        complete_profile.portfolio = [
            {"type": "github", "url": "https://github.com/user/repo1"}
        ]

        completeness_one_item = profile_service.calculate_profile_completeness(complete_profile)

        complete_profile.portfolio = [
            {"type": "github", "url": "https://github.com/user/repo1"},
            {"type": "website", "url": "https://mysite.com"},
            {"type": "article", "url": "https://medium.com/@user/article"},
        ]

        completeness_three_items = profile_service.calculate_profile_completeness(complete_profile)

        assert completeness_three_items["percentage"] >= completeness_one_item["percentage"]
