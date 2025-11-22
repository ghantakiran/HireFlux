"""
Candidate Profile Service

Business logic for candidate discovery and profile management.
Enables job seekers to create public profiles for employer discovery.
"""

from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List, Optional
from uuid import UUID
from datetime import datetime

from app.db.models.candidate_profile import CandidateProfile, CandidateView
from app.db.models.user import User
from app.schemas.candidate_profile import (
    CandidateProfileCreate,
    CandidateProfileUpdate,
    PortfolioItemCreate,
    AvailabilityUpdate,
    CandidateViewCreate,
)


class CandidateProfileService:
    """
    Service for managing candidate profiles and discovery features.
    """

    def __init__(self, db: Session):
        self.db = db

    # ===========================================================================
    # Profile Creation
    # ===========================================================================

    def create_profile(
        self, user_id: UUID, profile_data: CandidateProfileCreate
    ) -> CandidateProfile:
        """
        Create a new candidate profile.

        Args:
            user_id: UUID of the user
            profile_data: Profile creation data

        Returns:
            Created CandidateProfile

        Raises:
            ValueError: If user not found or already has a profile or validation fails
        """
        # Verify user exists
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        # Check if profile already exists
        existing_profile = (
            self.db.query(CandidateProfile)
            .filter(CandidateProfile.user_id == user_id)
            .first()
        )
        if existing_profile:
            raise ValueError(f"User {user_id} already has a profile")

        # Validate fields
        self._validate_profile_data(profile_data)

        # Create profile
        profile = CandidateProfile(
            user_id=user_id,
            headline=profile_data.headline,
            bio=profile_data.bio,
            location=profile_data.location,
            profile_picture_url=profile_data.profile_picture_url,
            skills=profile_data.skills,
            years_experience=profile_data.years_experience,
            experience_level=profile_data.experience_level,
            preferred_roles=profile_data.preferred_roles,
            preferred_location_type=profile_data.preferred_location_type,
            expected_salary_min=profile_data.expected_salary_min,
            expected_salary_max=profile_data.expected_salary_max,
            expected_salary_currency=profile_data.expected_salary_currency,
            visibility=profile_data.visibility,
            open_to_work=profile_data.open_to_work or False,
            open_to_remote=profile_data.open_to_remote or False,
            availability_status=profile_data.availability_status or "not_looking",
            availability_start_date=profile_data.availability_start_date,
            resume_summary=profile_data.resume_summary,
            latest_resume_url=profile_data.latest_resume_url,
            portfolio=[],
            profile_views=0,
            invites_received=0,
        )

        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)

        return profile

    # ===========================================================================
    # Profile Updates
    # ===========================================================================

    def update_profile(
        self, profile_id: UUID, profile_data: CandidateProfileUpdate
    ) -> CandidateProfile:
        """
        Update an existing profile.

        Args:
            profile_id: UUID of the profile
            profile_data: Profile update data

        Returns:
            Updated CandidateProfile

        Raises:
            ValueError: If profile not found or validation fails
        """
        profile = (
            self.db.query(CandidateProfile)
            .filter(CandidateProfile.id == profile_id)
            .first()
        )
        if not profile:
            raise ValueError("Profile not found")

        # Update only provided fields
        update_dict = profile_data.dict(exclude_unset=True)
        for key, value in update_dict.items():
            setattr(profile, key, value)

        self.db.commit()
        self.db.refresh(profile)

        return profile

    def set_visibility(self, profile_id: UUID, visibility: str) -> CandidateProfile:
        """
        Set profile visibility (public/private).

        Args:
            profile_id: UUID of the profile
            visibility: 'public' or 'private'

        Returns:
            Updated CandidateProfile

        Raises:
            ValueError: If profile not found or invalid visibility
        """
        if visibility not in ["public", "private"]:
            raise ValueError("Visibility must be 'public' or 'private'")

        profile = (
            self.db.query(CandidateProfile)
            .filter(CandidateProfile.id == profile_id)
            .first()
        )
        if not profile:
            raise ValueError("Profile not found")

        profile.visibility = visibility
        self.db.commit()
        self.db.refresh(profile)

        return profile

    # ===========================================================================
    # Portfolio Management
    # ===========================================================================

    def add_portfolio_item(
        self, profile_id: UUID, item: PortfolioItemCreate
    ) -> CandidateProfile:
        """
        Add a portfolio item to profile.

        Args:
            profile_id: UUID of the profile
            item: Portfolio item data

        Returns:
            Updated CandidateProfile

        Raises:
            ValueError: If profile not found
        """
        profile = (
            self.db.query(CandidateProfile)
            .filter(CandidateProfile.id == profile_id)
            .first()
        )
        if not profile:
            raise ValueError("Profile not found")

        # Convert Pydantic model to dict
        item_dict = item.dict()

        # Add to portfolio array
        if profile.portfolio is None:
            profile.portfolio = []

        profile.portfolio = profile.portfolio + [
            item_dict
        ]  # Create new list to trigger update

        self.db.commit()
        self.db.refresh(profile)

        return profile

    def remove_portfolio_item(
        self, profile_id: UUID, item_index: int
    ) -> CandidateProfile:
        """
        Remove a portfolio item by index.

        Args:
            profile_id: UUID of the profile
            item_index: Index of item to remove

        Returns:
            Updated CandidateProfile

        Raises:
            ValueError: If profile not found or invalid index
        """
        profile = (
            self.db.query(CandidateProfile)
            .filter(CandidateProfile.id == profile_id)
            .first()
        )
        if not profile:
            raise ValueError("Profile not found")

        if (
            profile.portfolio is None
            or item_index < 0
            or item_index >= len(profile.portfolio)
        ):
            raise ValueError("Invalid portfolio item index")

        # Remove item and create new list to trigger update
        portfolio_copy = list(profile.portfolio)
        portfolio_copy.pop(item_index)
        profile.portfolio = portfolio_copy

        self.db.commit()
        self.db.refresh(profile)

        return profile

    # ===========================================================================
    # Availability Management
    # ===========================================================================

    def update_availability(
        self, profile_id: UUID, availability_data: AvailabilityUpdate
    ) -> CandidateProfile:
        """
        Update candidate availability status.

        Args:
            profile_id: UUID of the profile
            availability_data: Availability update data

        Returns:
            Updated CandidateProfile

        Raises:
            ValueError: If profile not found or invalid status
        """
        valid_statuses = ["actively_looking", "open_to_offers", "not_looking"]
        if availability_data.availability_status not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")

        profile = (
            self.db.query(CandidateProfile)
            .filter(CandidateProfile.id == profile_id)
            .first()
        )
        if not profile:
            raise ValueError("Profile not found")

        profile.availability_status = availability_data.availability_status
        if availability_data.availability_start_date:
            profile.availability_start_date = availability_data.availability_start_date
        profile.availability_updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(profile)

        return profile

    # ===========================================================================
    # View Tracking
    # ===========================================================================

    def track_profile_view(
        self,
        profile_id: UUID,
        company_id: UUID,
        viewer_id: UUID,
        source: Optional[str] = None,
        context_job_id: Optional[UUID] = None,
    ) -> CandidateView:
        """
        Track an employer's view of a candidate profile.

        Args:
            profile_id: UUID of the profile
            company_id: UUID of the viewing company
            viewer_id: UUID of the user viewing
            source: Source of the view (search, application, etc.)
            context_job_id: Job context if applicable

        Returns:
            CandidateView record

        Raises:
            ValueError: If profile not found
        """
        profile = (
            self.db.query(CandidateProfile)
            .filter(CandidateProfile.id == profile_id)
            .first()
        )
        if not profile:
            raise ValueError("Profile not found")

        # Create view record
        view = CandidateView(
            company_id=company_id,
            viewer_id=viewer_id,
            candidate_id=profile.user_id,
            candidate_profile_id=profile_id,
            source=source,
            context_job_id=context_job_id,
        )

        self.db.add(view)

        # Increment profile view count
        profile.profile_views += 1

        self.db.commit()
        self.db.refresh(view)

        return view

    def get_profile_views(self, profile_id: UUID) -> List[CandidateView]:
        """
        Get all views for a profile.

        Args:
            profile_id: UUID of the profile

        Returns:
            List of CandidateView records
        """
        views = (
            self.db.query(CandidateView)
            .filter(CandidateView.candidate_profile_id == profile_id)
            .order_by(CandidateView.created_at.desc())
            .all()
        )

        return views

    # ===========================================================================
    # Invite Tracking
    # ===========================================================================

    def increment_invite_count(self, profile_id: UUID) -> CandidateProfile:
        """
        Increment invite received count.

        Args:
            profile_id: UUID of the profile

        Returns:
            Updated CandidateProfile

        Raises:
            ValueError: If profile not found
        """
        profile = (
            self.db.query(CandidateProfile)
            .filter(CandidateProfile.id == profile_id)
            .first()
        )
        if not profile:
            raise ValueError("Profile not found")

        profile.invites_received += 1

        self.db.commit()
        self.db.refresh(profile)

        return profile

    # ===========================================================================
    # Profile Retrieval
    # ===========================================================================

    def get_profile_by_id(self, profile_id: UUID) -> Optional[CandidateProfile]:
        """
        Get profile by ID.

        Args:
            profile_id: UUID of the profile

        Returns:
            CandidateProfile or None if not found
        """
        return (
            self.db.query(CandidateProfile)
            .filter(CandidateProfile.id == profile_id)
            .first()
        )

    def get_profile_by_user_id(self, user_id: UUID) -> Optional[CandidateProfile]:
        """
        Get profile by user ID.

        Args:
            user_id: UUID of the user

        Returns:
            CandidateProfile or None if not found
        """
        return (
            self.db.query(CandidateProfile)
            .filter(CandidateProfile.user_id == user_id)
            .first()
        )

    def get_public_profiles(
        self, limit: int = 100, offset: int = 0
    ) -> List[CandidateProfile]:
        """
        Get all public profiles.

        Args:
            limit: Maximum number of profiles to return
            offset: Number of profiles to skip

        Returns:
            List of public CandidateProfiles
        """
        profiles = (
            self.db.query(CandidateProfile)
            .filter(CandidateProfile.visibility == "public")
            .limit(limit)
            .offset(offset)
            .all()
        )

        return profiles

    # ===========================================================================
    # Profile Deletion
    # ===========================================================================

    def delete_profile(self, profile_id: UUID) -> bool:
        """
        Delete a profile.

        Args:
            profile_id: UUID of the profile

        Returns:
            True if deleted, False if not found
        """
        profile = (
            self.db.query(CandidateProfile)
            .filter(CandidateProfile.id == profile_id)
            .first()
        )
        if not profile:
            return False

        self.db.delete(profile)
        self.db.commit()

        return True

    # ===========================================================================
    # Profile Completeness Calculation - Issue #57
    # ===========================================================================

    def calculate_profile_completeness(self, profile: CandidateProfile) -> dict:
        """
        Calculate profile completeness percentage and identify missing fields.

        Args:
            profile: CandidateProfile to evaluate

        Returns:
            {
                "percentage": int (0-100),
                "missing_fields": List[str],
                "is_complete": bool
            }
        """
        weights = self.get_field_weights()
        total_score = 0
        missing_fields = []

        for field, weight in weights.items():
            value = getattr(profile, field, None)

            # Check if field is filled
            is_filled = False
            if isinstance(value, list):
                is_filled = len(value) > 0
            elif isinstance(value, str):
                is_filled = bool(value and value.strip())
            elif value is not None:
                is_filled = True

            if is_filled:
                total_score += weight
            else:
                missing_fields.append(field)

        percentage = min(100, int(total_score))

        return {
            "percentage": percentage,
            "missing_fields": missing_fields,
            "is_complete": percentage == 100,
        }

    def get_field_weights(self) -> dict:
        """
        Get field weights for completeness calculation.

        Total must sum to 100.

        Required fields (higher weight):
        - headline (15%)
        - bio (15%)
        - skills (15%)
        - years_experience (10%)
        - location (10%)
        - experience_level (10%)

        Optional fields (lower weight):
        - profile_picture_url (5%)
        - preferred_roles (5%)
        - expected_salary_min (5%)
        - portfolio (5%)
        - resume_summary (5%)

        Returns:
            Dict of field names to weight percentages
        """
        return {
            # Required fields (75% total)
            "headline": 15,
            "bio": 15,
            "skills": 15,
            "years_experience": 10,
            "location": 10,
            "experience_level": 10,
            # Optional fields (25% total)
            "profile_picture_url": 5,
            "preferred_roles": 5,
            "expected_salary_min": 5,
            "portfolio": 5,
            "resume_summary": 5,
        }

    def get_required_profile_fields(self) -> List[str]:
        """Get list of required fields for public profile."""
        return [
            "headline",
            "bio",
            "skills",
            "years_experience",
            "location",
            "experience_level",
        ]

    def get_optional_profile_fields(self) -> List[str]:
        """Get list of optional fields for profile completeness."""
        return [
            "profile_picture_url",
            "preferred_roles",
            "expected_salary_min",
            "portfolio",
            "resume_summary",
        ]

    def validate_public_profile(self, profile: CandidateProfile):
        """
        Validate that profile meets requirements for public visibility.

        Args:
            profile: CandidateProfile to validate

        Raises:
            ValueError: If profile doesn't meet public requirements
        """
        completeness = self.calculate_profile_completeness(profile)

        # Must be at least 50% complete
        if completeness["percentage"] < 50:
            raise ValueError(
                f"Profile must be at least 50% complete to make public (currently {completeness['percentage']}%)"
            )

        # Must have all required fields
        required_fields = self.get_required_profile_fields()
        missing_required = [
            field for field in required_fields if field in completeness["missing_fields"]
        ]

        if missing_required:
            raise ValueError(
                f"Please fill in required fields: {', '.join(missing_required)}"
            )

    # ===========================================================================
    # Privacy Controls - Issue #57
    # ===========================================================================

    def get_public_profile_data(self, profile: CandidateProfile) -> dict:
        """
        Get public profile data respecting privacy controls.

        Args:
            profile: CandidateProfile

        Returns:
            Dict of publicly visible profile fields
        """
        data = {
            "id": str(profile.id),
            "headline": profile.headline,
            "bio": profile.bio,
            "skills": profile.skills,
            "years_experience": profile.years_experience,
            "experience_level": profile.experience_level,
            "preferred_roles": profile.preferred_roles,
            "preferred_location_type": profile.preferred_location_type,
            "availability_status": profile.availability_status,
            "open_to_work": profile.open_to_work,
            "open_to_remote": profile.open_to_remote,
            "portfolio": profile.portfolio,
            "profile_picture_url": profile.profile_picture_url,
            "profile_views": profile.profile_views,
        }

        # Privacy controls
        show_salary = getattr(profile, "show_salary", True)
        show_contact = getattr(profile, "show_contact", False)
        show_location = getattr(profile, "show_location", True)

        # Salary expectations (privacy controlled)
        if show_salary:
            data["expected_salary_min"] = profile.expected_salary_min
            data["expected_salary_max"] = profile.expected_salary_max
            data["expected_salary_currency"] = profile.expected_salary_currency

        # Location (privacy controlled)
        if show_location:
            data["location"] = profile.location
        else:
            # Show only country if location is hidden
            if profile.location:
                parts = profile.location.split(",")
                data["location"] = parts[-1].strip() if parts else "Not specified"

        # Contact info (privacy controlled)
        if show_contact and hasattr(profile, "user") and profile.user:
            data["email"] = profile.user.email

        return data

    def get_profile_preview(self, profile: CandidateProfile) -> dict:
        """
        Get profile preview showing what employers will see.

        Args:
            profile: CandidateProfile

        Returns:
            Dict with preview data and completeness info
        """
        public_data = self.get_public_profile_data(profile)
        completeness = self.calculate_profile_completeness(profile)

        return {
            **public_data,
            "completeness_percentage": completeness["percentage"],
            "missing_fields": completeness["missing_fields"],
            "is_complete": completeness["is_complete"],
        }

    # ===========================================================================
    # Private Helper Methods
    # ===========================================================================

    def _validate_profile_data(self, profile_data):
        """
        Validate profile data.

        Raises:
            ValueError: If validation fails
        """
        # Validate visibility
        if profile_data.visibility not in ["public", "private"]:
            raise ValueError("Visibility must be 'public' or 'private'")

        # Validate experience level
        if profile_data.experience_level:
            valid_levels = ["entry", "mid", "senior", "lead", "executive"]
            if profile_data.experience_level not in valid_levels:
                raise ValueError(f"Experience level must be one of {valid_levels}")

        # Validate location type
        if profile_data.preferred_location_type:
            valid_types = ["remote", "hybrid", "onsite", "any"]
            if profile_data.preferred_location_type not in valid_types:
                raise ValueError(f"Location type must be one of {valid_types}")

        # Validate availability status
        if (
            hasattr(profile_data, "availability_status")
            and profile_data.availability_status
        ):
            valid_statuses = ["actively_looking", "open_to_offers", "not_looking"]
            if profile_data.availability_status not in valid_statuses:
                raise ValueError(f"Availability status must be one of {valid_statuses}")
