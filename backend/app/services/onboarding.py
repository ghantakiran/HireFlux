"""Onboarding service"""
from sqlalchemy.orm import Session
from typing import Dict, Any
import uuid

from app.db.models.user import Profile
from app.schemas.onboarding import (
    BasicProfileUpdate,
    JobPreferencesUpdate,
    SkillsUpdate,
    WorkPreferencesUpdate,
    OnboardingProgress,
    CompleteProfileResponse
)
from app.core.exceptions import NotFoundError


class OnboardingService:
    """Service for handling user onboarding"""

    def __init__(self, db: Session):
        self.db = db

    def _get_profile(self, user_id: uuid.UUID) -> Profile:
        """Get user profile or raise NotFoundError"""
        profile = self.db.query(Profile).filter(Profile.user_id == user_id).first()
        if not profile:
            raise NotFoundError("Profile not found")
        return profile

    def update_basic_profile(
        self,
        user_id: uuid.UUID,
        profile_data: BasicProfileUpdate
    ) -> Profile:
        """
        Update basic profile information (Step 1 of onboarding)

        Args:
            user_id: User's UUID
            profile_data: Basic profile data

        Returns:
            Updated profile

        Raises:
            NotFoundError: If profile doesn't exist
        """
        profile = self._get_profile(user_id)

        # Update basic fields
        profile.first_name = profile_data.first_name
        profile.last_name = profile_data.last_name
        profile.phone = profile_data.phone
        profile.location = profile_data.location

        self.db.commit()
        self.db.refresh(profile)
        return profile

    def update_job_preferences(
        self,
        user_id: uuid.UUID,
        preferences_data: JobPreferencesUpdate
    ) -> Profile:
        """
        Update job preferences (Step 2 of onboarding)

        Args:
            user_id: User's UUID
            preferences_data: Job preferences data

        Returns:
            Updated profile

        Raises:
            NotFoundError: If profile doesn't exist
        """
        profile = self._get_profile(user_id)

        # Update job preferences with duplicate removal
        # Remove case-insensitive duplicates from target_titles
        seen_lower = set()
        unique_titles = []
        for title in (preferences_data.target_titles or []):
            title_lower = title.lower()
            if title_lower not in seen_lower:
                seen_lower.add(title_lower)
                unique_titles.append(title)

        profile.target_titles = unique_titles
        profile.salary_min = preferences_data.salary_min
        profile.salary_max = preferences_data.salary_max
        profile.industries = preferences_data.industries

        self.db.commit()
        self.db.refresh(profile)
        return profile

    def update_skills(
        self,
        user_id: uuid.UUID,
        skills_data: SkillsUpdate
    ) -> Profile:
        """
        Update skills (Step 3 of onboarding)

        Args:
            user_id: User's UUID
            skills_data: Skills data

        Returns:
            Updated profile

        Raises:
            NotFoundError: If profile doesn't exist
        """
        profile = self._get_profile(user_id)

        # Convert skills to dict format for JSON storage
        skills_list = [
            {
                "name": skill.name,
                "proficiency": skill.proficiency.value
            }
            for skill in skills_data.skills
        ]

        profile.skills = skills_list

        self.db.commit()
        self.db.refresh(profile)
        return profile

    def update_work_preferences(
        self,
        user_id: uuid.UUID,
        work_prefs_data: WorkPreferencesUpdate
    ) -> Profile:
        """
        Update work preferences (Step 4 of onboarding)

        Args:
            user_id: User's UUID
            work_prefs_data: Work preferences data

        Returns:
            Updated profile

        Raises:
            NotFoundError: If profile doesn't exist
        """
        profile = self._get_profile(user_id)

        # Update work preferences
        profile.preferences = {
            "remote": work_prefs_data.remote,
            "visa_friendly": work_prefs_data.visa_friendly,
            "relocation": work_prefs_data.relocation,
            "contract": work_prefs_data.contract,
            "part_time": work_prefs_data.part_time,
        }

        # Check if all required steps are completed
        if self._is_onboarding_complete(profile):
            profile.onboarding_complete = True

        self.db.commit()
        self.db.refresh(profile)
        return profile

    def _is_profile_step_complete(self, profile: Profile) -> bool:
        """Check if basic profile step is complete"""
        return bool(profile.first_name and profile.last_name)

    def _is_preferences_step_complete(self, profile: Profile) -> bool:
        """Check if job preferences step is complete"""
        return bool(profile.target_titles and len(profile.target_titles) > 0)

    def _is_skills_step_complete(self, profile: Profile) -> bool:
        """Check if skills step is complete"""
        return bool(profile.skills and len(profile.skills) > 0)

    def _is_work_prefs_step_complete(self, profile: Profile) -> bool:
        """Check if work preferences step is complete"""
        return bool(profile.preferences and len(profile.preferences) > 0)

    def _is_onboarding_complete(self, profile: Profile) -> bool:
        """Check if all onboarding steps are complete"""
        return (
            self._is_profile_step_complete(profile) and
            self._is_preferences_step_complete(profile) and
            self._is_skills_step_complete(profile) and
            self._is_work_prefs_step_complete(profile)
        )

    def _get_current_step(self, profile: Profile) -> int:
        """
        Determine current onboarding step

        Returns:
            Current step number (1-4)
        """
        if not self._is_profile_step_complete(profile):
            return 1
        elif not self._is_preferences_step_complete(profile):
            return 2
        elif not self._is_skills_step_complete(profile):
            return 3
        elif not self._is_work_prefs_step_complete(profile):
            return 4
        else:
            return 4  # All complete

    def get_onboarding_progress(self, user_id: uuid.UUID) -> Dict[str, Any]:
        """
        Get user's onboarding progress

        Args:
            user_id: User's UUID

        Returns:
            Dictionary with onboarding progress

        Raises:
            NotFoundError: If profile doesn't exist
        """
        profile = self._get_profile(user_id)

        return {
            "current_step": self._get_current_step(profile),
            "onboarding_complete": profile.onboarding_complete,
            "profile_completed": self._is_profile_step_complete(profile),
            "preferences_completed": self._is_preferences_step_complete(profile),
            "skills_completed": self._is_skills_step_complete(profile),
            "work_preferences_completed": self._is_work_prefs_step_complete(profile),
        }

    def get_complete_profile(self, user_id: uuid.UUID) -> CompleteProfileResponse:
        """
        Get complete user profile

        Args:
            user_id: User's UUID

        Returns:
            Complete profile data

        Raises:
            NotFoundError: If profile doesn't exist
        """
        profile = self._get_profile(user_id)

        return CompleteProfileResponse(
            id=str(profile.id),
            first_name=profile.first_name,
            last_name=profile.last_name,
            phone=profile.phone,
            location=profile.location,
            target_titles=profile.target_titles or [],
            salary_min=profile.salary_min,
            salary_max=profile.salary_max,
            industries=profile.industries or [],
            skills=profile.skills or [],
            preferences=profile.preferences or {},
            onboarding_complete=profile.onboarding_complete,
        )

    def skip_step(self, user_id: uuid.UUID, step: int) -> Dict[str, Any]:
        """
        Skip an optional onboarding step

        Args:
            user_id: User's UUID
            step: Step number to skip (2, 3, or 4)

        Returns:
            Updated onboarding progress

        Raises:
            NotFoundError: If profile doesn't exist
        """
        profile = self._get_profile(user_id)

        # Step 1 (basic profile) is required, cannot be skipped
        # Steps 2, 3, 4 can be skipped but won't mark onboarding as complete

        return self.get_onboarding_progress(user_id)
