"""Unit tests for onboarding service"""

import pytest
import uuid
from unittest.mock import Mock, MagicMock
from sqlalchemy.orm import Session

from app.services.onboarding import OnboardingService
from app.db.models.user import User, Profile
from app.schemas.onboarding import (
    BasicProfileUpdate,
    JobPreferencesUpdate,
    SkillsUpdate,
    WorkPreferencesUpdate,
    SkillInput,
    ProficiencyLevel,
)
from app.core.exceptions import NotFoundError, BadRequestError


@pytest.fixture
def mock_db():
    """Create a mock database session"""
    return Mock(spec=Session)


@pytest.fixture
def mock_user():
    """Create a mock user"""
    user = Mock(spec=User)
    user.id = uuid.uuid4()
    user.email = "test@example.com"
    return user


@pytest.fixture
def mock_profile():
    """Create a mock profile"""
    profile = Mock(spec=Profile)
    profile.id = uuid.uuid4()
    profile.user_id = uuid.uuid4()
    profile.first_name = None
    profile.last_name = None
    profile.phone = None
    profile.location = None
    profile.target_titles = []
    profile.salary_min = None
    profile.salary_max = None
    profile.industries = []
    profile.skills = []
    profile.preferences = {}
    profile.onboarding_complete = False
    return profile


@pytest.fixture
def onboarding_service(mock_db):
    """Create onboarding service instance"""
    return OnboardingService(mock_db)


class TestUpdateBasicProfile:
    """Test basic profile update (Step 1)"""

    def test_update_basic_profile_success(
        self, onboarding_service, mock_db, mock_user, mock_profile
    ):
        """Test successful basic profile update"""
        # Arrange
        profile_data = BasicProfileUpdate(
            first_name="John",
            last_name="Doe",
            phone="+1234567890",
            location="New York, NY",
        )
        mock_db.query().filter().first.return_value = mock_profile

        # Act
        result = onboarding_service.update_basic_profile(mock_user.id, profile_data)

        # Assert
        assert result.first_name == "John"
        assert result.last_name == "Doe"
        assert result.phone == "+1234567890"
        assert result.location == "New York, NY"
        mock_db.commit.assert_called_once()

    def test_update_basic_profile_not_found(
        self, onboarding_service, mock_db, mock_user
    ):
        """Test update when profile doesn't exist"""
        # Arrange
        profile_data = BasicProfileUpdate(first_name="John", last_name="Doe")
        mock_db.query().filter().first.return_value = None

        # Act & Assert
        with pytest.raises(NotFoundError, match="Profile not found"):
            onboarding_service.update_basic_profile(mock_user.id, profile_data)


class TestUpdateJobPreferences:
    """Test job preferences update (Step 2)"""

    def test_update_job_preferences_success(
        self, onboarding_service, mock_db, mock_user, mock_profile
    ):
        """Test successful job preferences update"""
        # Arrange
        preferences_data = JobPreferencesUpdate(
            target_titles=["Software Engineer", "Developer"],
            salary_min=80000,
            salary_max=150000,
            industries=["Technology", "Finance"],
        )
        mock_db.query().filter().first.return_value = mock_profile

        # Act
        result = onboarding_service.update_job_preferences(
            mock_user.id, preferences_data
        )

        # Assert
        assert len(result.target_titles) == 2
        assert result.salary_min == 80000
        assert result.salary_max == 150000
        assert len(result.industries) == 2
        mock_db.commit.assert_called_once()

    def test_update_job_preferences_removes_duplicates(
        self, onboarding_service, mock_db, mock_user, mock_profile
    ):
        """Test that duplicate target titles are removed"""
        # Arrange
        preferences_data = JobPreferencesUpdate(
            target_titles=["Software Engineer", "software engineer", "Developer"],
            salary_min=80000,
            salary_max=150000,
        )
        mock_db.query().filter().first.return_value = mock_profile

        # Act
        result = onboarding_service.update_job_preferences(
            mock_user.id, preferences_data
        )

        # Assert
        # Should have 2 unique titles (case-insensitive duplicates removed)
        assert len(result.target_titles) <= 2


class TestUpdateSkills:
    """Test skills update (Step 3)"""

    def test_update_skills_success(
        self, onboarding_service, mock_db, mock_user, mock_profile
    ):
        """Test successful skills update"""
        # Arrange
        skills_data = SkillsUpdate(
            skills=[
                SkillInput(name="Python", proficiency=ProficiencyLevel.EXPERT),
                SkillInput(name="JavaScript", proficiency=ProficiencyLevel.ADVANCED),
                SkillInput(name="React", proficiency=ProficiencyLevel.INTERMEDIATE),
            ]
        )
        mock_db.query().filter().first.return_value = mock_profile

        # Act
        result = onboarding_service.update_skills(mock_user.id, skills_data)

        # Assert
        assert len(result.skills) == 3
        assert any(s["name"] == "Python" for s in result.skills)
        mock_db.commit.assert_called_once()

    def test_update_skills_validates_duplicates(
        self, onboarding_service, mock_db, mock_user, mock_profile
    ):
        """Test that duplicate skills are rejected"""
        # Arrange - This should be validated at schema level
        with pytest.raises(ValueError):
            SkillsUpdate(
                skills=[
                    SkillInput(name="Python", proficiency=ProficiencyLevel.EXPERT),
                    SkillInput(name="python", proficiency=ProficiencyLevel.ADVANCED),
                ]
            )


class TestUpdateWorkPreferences:
    """Test work preferences update (Step 4)"""

    def test_update_work_preferences_success(
        self, onboarding_service, mock_db, mock_user, mock_profile
    ):
        """Test successful work preferences update"""
        # Arrange
        work_prefs_data = WorkPreferencesUpdate(
            remote=True, visa_friendly=True, relocation=False, contract=False
        )
        mock_db.query().filter().first.return_value = mock_profile

        # Act
        result = onboarding_service.update_work_preferences(
            mock_user.id, work_prefs_data
        )

        # Assert
        assert result.preferences["remote"] is True
        assert result.preferences["visa_friendly"] is True
        assert result.preferences["relocation"] is False
        mock_db.commit.assert_called_once()

    def test_update_work_preferences_marks_onboarding_complete(
        self, onboarding_service, mock_db, mock_user, mock_profile
    ):
        """Test that completing work preferences marks onboarding as complete"""
        # Arrange
        mock_profile.first_name = "John"
        mock_profile.last_name = "Doe"
        mock_profile.target_titles = ["Software Engineer"]
        mock_profile.skills = [{"name": "Python", "proficiency": "expert"}]
        work_prefs_data = WorkPreferencesUpdate(remote=True)
        mock_db.query().filter().first.return_value = mock_profile

        # Act
        result = onboarding_service.update_work_preferences(
            mock_user.id, work_prefs_data
        )

        # Assert
        assert result.onboarding_complete is True


class TestGetOnboardingProgress:
    """Test getting onboarding progress"""

    def test_get_progress_initial_state(
        self, onboarding_service, mock_db, mock_user, mock_profile
    ):
        """Test progress when nothing is completed"""
        # Arrange
        mock_db.query().filter().first.return_value = mock_profile

        # Act
        result = onboarding_service.get_onboarding_progress(mock_user.id)

        # Assert
        assert result["current_step"] == 1
        assert result["onboarding_complete"] is False
        assert result["profile_completed"] is False
        assert result["preferences_completed"] is False
        assert result["skills_completed"] is False

    def test_get_progress_partial_completion(
        self, onboarding_service, mock_db, mock_user, mock_profile
    ):
        """Test progress when some steps are completed"""
        # Arrange
        mock_profile.first_name = "John"
        mock_profile.last_name = "Doe"
        mock_profile.target_titles = ["Software Engineer"]
        mock_db.query().filter().first.return_value = mock_profile

        # Act
        result = onboarding_service.get_onboarding_progress(mock_user.id)

        # Assert
        assert result["current_step"] == 3
        assert result["profile_completed"] is True
        assert result["preferences_completed"] is True
        assert result["skills_completed"] is False

    def test_get_progress_fully_completed(
        self, onboarding_service, mock_db, mock_user, mock_profile
    ):
        """Test progress when all steps are completed"""
        # Arrange
        mock_profile.first_name = "John"
        mock_profile.last_name = "Doe"
        mock_profile.target_titles = ["Software Engineer"]
        mock_profile.skills = [{"name": "Python", "proficiency": "expert"}]
        mock_profile.preferences = {"remote": True}
        mock_profile.onboarding_complete = True
        mock_db.query().filter().first.return_value = mock_profile

        # Act
        result = onboarding_service.get_onboarding_progress(mock_user.id)

        # Assert
        assert result["current_step"] == 4
        assert result["onboarding_complete"] is True
        assert result["profile_completed"] is True
        assert result["preferences_completed"] is True
        assert result["skills_completed"] is True
        assert result["work_preferences_completed"] is True


class TestGetCompleteProfile:
    """Test getting complete profile"""

    def test_get_complete_profile_success(
        self, onboarding_service, mock_db, mock_user, mock_profile
    ):
        """Test successful retrieval of complete profile"""
        # Arrange
        mock_profile.first_name = "John"
        mock_profile.last_name = "Doe"
        mock_profile.target_titles = ["Software Engineer"]
        mock_profile.skills = [{"name": "Python", "proficiency": "expert"}]
        mock_profile.preferences = {"remote": True}
        mock_db.query().filter().first.return_value = mock_profile

        # Act
        result = onboarding_service.get_complete_profile(mock_user.id)

        # Assert
        assert result.first_name == "John"
        assert result.last_name == "Doe"
        assert len(result.target_titles) == 1
        assert len(result.skills) == 1

    def test_get_complete_profile_not_found(
        self, onboarding_service, mock_db, mock_user
    ):
        """Test retrieval when profile doesn't exist"""
        # Arrange
        mock_db.query().filter().first.return_value = None

        # Act & Assert
        with pytest.raises(NotFoundError, match="Profile not found"):
            onboarding_service.get_complete_profile(mock_user.id)
