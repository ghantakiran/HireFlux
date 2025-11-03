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
    CandidateViewCreate
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

    def create_profile(self, user_id: UUID, profile_data: CandidateProfileCreate) -> CandidateProfile:
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
        existing_profile = self.db.query(CandidateProfile).filter(
            CandidateProfile.user_id == user_id
        ).first()
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
            invites_received=0
        )

        self.db.add(profile)
        self.db.commit()
        self.db.refresh(profile)

        return profile

    # ===========================================================================
    # Profile Updates
    # ===========================================================================

    def update_profile(self, profile_id: UUID, profile_data: CandidateProfileUpdate) -> CandidateProfile:
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
        profile = self.db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
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
        if visibility not in ['public', 'private']:
            raise ValueError("Visibility must be 'public' or 'private'")

        profile = self.db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
        if not profile:
            raise ValueError("Profile not found")

        profile.visibility = visibility
        self.db.commit()
        self.db.refresh(profile)

        return profile

    # ===========================================================================
    # Portfolio Management
    # ===========================================================================

    def add_portfolio_item(self, profile_id: UUID, item: PortfolioItemCreate) -> CandidateProfile:
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
        profile = self.db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
        if not profile:
            raise ValueError("Profile not found")

        # Convert Pydantic model to dict
        item_dict = item.dict()

        # Add to portfolio array
        if profile.portfolio is None:
            profile.portfolio = []

        profile.portfolio = profile.portfolio + [item_dict]  # Create new list to trigger update

        self.db.commit()
        self.db.refresh(profile)

        return profile

    def remove_portfolio_item(self, profile_id: UUID, item_index: int) -> CandidateProfile:
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
        profile = self.db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
        if not profile:
            raise ValueError("Profile not found")

        if profile.portfolio is None or item_index < 0 or item_index >= len(profile.portfolio):
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

    def update_availability(self, profile_id: UUID, availability_data: AvailabilityUpdate) -> CandidateProfile:
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
        valid_statuses = ['actively_looking', 'open_to_offers', 'not_looking']
        if availability_data.availability_status not in valid_statuses:
            raise ValueError(f"Status must be one of {valid_statuses}")

        profile = self.db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
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
        context_job_id: Optional[UUID] = None
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
        profile = self.db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
        if not profile:
            raise ValueError("Profile not found")

        # Create view record
        view = CandidateView(
            company_id=company_id,
            viewer_id=viewer_id,
            candidate_id=profile.user_id,
            candidate_profile_id=profile_id,
            source=source,
            context_job_id=context_job_id
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
        views = self.db.query(CandidateView).filter(
            CandidateView.candidate_profile_id == profile_id
        ).order_by(CandidateView.created_at.desc()).all()

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
        profile = self.db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
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
        return self.db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()

    def get_profile_by_user_id(self, user_id: UUID) -> Optional[CandidateProfile]:
        """
        Get profile by user ID.

        Args:
            user_id: UUID of the user

        Returns:
            CandidateProfile or None if not found
        """
        return self.db.query(CandidateProfile).filter(CandidateProfile.user_id == user_id).first()

    def get_public_profiles(self, limit: int = 100, offset: int = 0) -> List[CandidateProfile]:
        """
        Get all public profiles.

        Args:
            limit: Maximum number of profiles to return
            offset: Number of profiles to skip

        Returns:
            List of public CandidateProfiles
        """
        profiles = self.db.query(CandidateProfile).filter(
            CandidateProfile.visibility == 'public'
        ).limit(limit).offset(offset).all()

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
        profile = self.db.query(CandidateProfile).filter(CandidateProfile.id == profile_id).first()
        if not profile:
            return False

        self.db.delete(profile)
        self.db.commit()

        return True

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
        if profile_data.visibility not in ['public', 'private']:
            raise ValueError("Visibility must be 'public' or 'private'")

        # Validate experience level
        if profile_data.experience_level:
            valid_levels = ['entry', 'mid', 'senior', 'lead', 'executive']
            if profile_data.experience_level not in valid_levels:
                raise ValueError(f"Experience level must be one of {valid_levels}")

        # Validate location type
        if profile_data.preferred_location_type:
            valid_types = ['remote', 'hybrid', 'onsite', 'any']
            if profile_data.preferred_location_type not in valid_types:
                raise ValueError(f"Location type must be one of {valid_types}")

        # Validate availability status
        if hasattr(profile_data, 'availability_status') and profile_data.availability_status:
            valid_statuses = ['actively_looking', 'open_to_offers', 'not_looking']
            if profile_data.availability_status not in valid_statuses:
                raise ValueError(f"Availability status must be one of {valid_statuses}")
