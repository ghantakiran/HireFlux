"""Candidate Profile & Search endpoints

API endpoints for job seeker profile management and employer candidate discovery.
Enables two-sided marketplace functionality.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID
from decimal import Decimal

from app.db.session import get_db
from app.schemas.candidate_profile import (
    CandidateProfileCreate,
    CandidateProfileUpdate,
    CandidateProfile,
    CandidateProfilePublic,
    PortfolioItemCreate,
    AvailabilityUpdate,
    CandidateSearchFilters,
    CandidateSearchResult,
)
from app.services.candidate_profile_service import CandidateProfileService
from app.services.candidate_search_service import CandidateSearchService
from app.api.dependencies import get_current_user
from app.db.models.user import User


router = APIRouter(prefix="/candidate-profiles", tags=["Candidate Profiles"])


# ===========================================================================
# Job Seeker Profile Management Endpoints
# ===========================================================================


@router.post("", response_model=dict, status_code=status.HTTP_201_CREATED)
def create_candidate_profile(
    profile_data: CandidateProfileCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a candidate profile for the authenticated job seeker.

    **Profile Setup:**
    - Headline and bio for discovery
    - Skills and experience level
    - Salary expectations and location preferences
    - Availability status
    - Visibility control (public/private)

    **Visibility Options:**
    - **public**: Profile visible to employers in search results
    - **private**: Profile hidden from search (default)

    **Returns:**
    - Created profile with all fields
    - Profile ID for future updates
    """
    service = CandidateProfileService(db)

    try:
        profile = service.create_profile(current_user.id, profile_data)

        return {
            "success": True,
            "message": "Candidate profile created successfully",
            "data": CandidateProfile.from_orm(profile),
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create profile: {str(e)}",
        )


@router.get("/me", response_model=dict, status_code=status.HTTP_200_OK)
def get_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get the authenticated user's candidate profile.

    **Returns:**
    - Full profile details including private fields
    - Analytics (profile views, invites received)
    - Portfolio items

    **Note:** Returns 404 if profile doesn't exist yet.
    """
    service = CandidateProfileService(db)

    profile = service.get_profile_by_user_id(current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate profile not found. Create one to get started.",
        )

    return {
        "success": True,
        "data": CandidateProfile.from_orm(profile),
    }


@router.patch("/me", response_model=dict, status_code=status.HTTP_200_OK)
def update_my_profile(
    profile_data: CandidateProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update the authenticated user's candidate profile.

    **Updatable Fields:**
    - Headline, bio, location
    - Skills and experience
    - Salary expectations
    - Preferred roles and location type
    - Profile picture URL

    **Note:** Use separate endpoints for:
    - Visibility changes (PUT /me/visibility)
    - Availability updates (PUT /me/availability)
    - Portfolio management (POST /me/portfolio)
    """
    service = CandidateProfileService(db)

    profile = service.get_profile_by_user_id(current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found"
        )

    try:
        updated_profile = service.update_profile(profile.id, profile_data)

        return {
            "success": True,
            "message": "Profile updated successfully",
            "data": CandidateProfile.from_orm(updated_profile),
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}",
        )


@router.put("/me/visibility", response_model=dict, status_code=status.HTTP_200_OK)
def set_profile_visibility(
    visibility: str = Query(
        ..., regex="^(public|private)$", description="Profile visibility"
    ),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Set profile visibility (public/private).

    **Options:**
    - **public**: Profile visible to employers in search results
    - **private**: Profile hidden from search

    **Use Cases:**
    - Make profile public when actively job searching
    - Set to private when not looking to avoid recruiter spam
    - Toggle visibility without losing profile data
    """
    service = CandidateProfileService(db)

    profile = service.get_profile_by_user_id(current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found"
        )

    try:
        updated_profile = service.set_visibility(profile.id, visibility)

        return {
            "success": True,
            "message": f"Profile visibility set to {visibility}",
            "data": CandidateProfile.from_orm(updated_profile),
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.put("/me/availability", response_model=dict, status_code=status.HTTP_200_OK)
def update_availability(
    availability_data: AvailabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update availability status and start date.

    **Status Options:**
    - **actively_looking**: Actively seeking new opportunities
    - **open_to_offers**: Not actively looking but open to discussions
    - **not_looking**: Not interested in opportunities

    **Start Date:**
    - Optional: When you can start a new role
    - Helps employers filter by availability timeline
    """
    service = CandidateProfileService(db)

    profile = service.get_profile_by_user_id(current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found"
        )

    try:
        updated_profile = service.update_availability(profile.id, availability_data)

        return {
            "success": True,
            "message": "Availability updated successfully",
            "data": CandidateProfile.from_orm(updated_profile),
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/me/portfolio", response_model=dict, status_code=status.HTTP_201_CREATED)
def add_portfolio_item(
    item: PortfolioItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Add a portfolio item to profile.

    **Portfolio Types:**
    - **github**: GitHub repository
    - **website**: Personal website or blog
    - **article**: Published article or blog post
    - **project**: Side project or case study

    **Benefits:**
    - Showcase your work to employers
    - Stand out in search results
    - Demonstrate skills beyond resume
    """
    service = CandidateProfileService(db)

    profile = service.get_profile_by_user_id(current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found"
        )

    try:
        updated_profile = service.add_portfolio_item(profile.id, item)

        return {
            "success": True,
            "message": "Portfolio item added successfully",
            "data": CandidateProfile.from_orm(updated_profile),
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete(
    "/me/portfolio/{item_index}", response_model=dict, status_code=status.HTTP_200_OK
)
def remove_portfolio_item(
    item_index: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove a portfolio item by index.

    **Note:** Portfolio items are indexed starting at 0.
    """
    service = CandidateProfileService(db)

    profile = service.get_profile_by_user_id(current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found"
        )

    try:
        updated_profile = service.remove_portfolio_item(profile.id, item_index)

        return {
            "success": True,
            "message": "Portfolio item removed successfully",
            "data": CandidateProfile.from_orm(updated_profile),
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.delete("/me", response_model=dict, status_code=status.HTTP_200_OK)
def delete_my_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete the authenticated user's candidate profile.

    **Warning:** This action cannot be undone.
    All profile data, portfolio items, and view analytics will be permanently deleted.
    """
    service = CandidateProfileService(db)

    profile = service.get_profile_by_user_id(current_user.id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found"
        )

    success = service.delete_profile(profile.id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete profile",
        )

    return {
        "success": True,
        "message": "Candidate profile deleted successfully",
    }


# ===========================================================================
# Employer Candidate Search Endpoints
# ===========================================================================


@router.post("/search", response_model=dict, status_code=status.HTTP_200_OK)
def search_candidates(
    filters: CandidateSearchFilters,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Search for candidate profiles (employer-only).

    **Advanced Filters:**
    - **skills**: Required skills (AND logic - candidate must have ALL)
    - **experience_level**: Entry, mid, senior, lead, executive (OR logic)
    - **min_years_experience / max_years_experience**: Years of experience range
    - **location**: Location string (partial match)
    - **remote_only**: Filter candidates open to remote work
    - **location_type**: remote, hybrid, onsite, any
    - **min_salary / max_salary**: Salary range with overlap logic
    - **availability_status**: actively_looking, open_to_offers, not_looking (OR logic)
    - **preferred_roles**: Role titles (OR logic)

    **Pagination:**
    - **page**: Page number (starts at 1)
    - **limit**: Results per page (1-100, default 20)

    **Returns:**
    - List of public candidate profiles (limited fields for privacy)
    - Total count and pagination metadata
    - Profiles ordered by most recently updated

    **Privacy:**
    - Only public profiles are returned
    - Sensitive fields (email, phone) are not exposed
    - View tracking for billing and analytics

    **Note:** This endpoint is for employers only. Job seekers cannot search other candidates.
    """
    search_service = CandidateSearchService(db)

    try:
        result = search_service.search_candidates(filters)

        return {
            "success": True,
            "data": result,
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Search failed: {str(e)}",
        )


@router.get("/{profile_id}", response_model=dict, status_code=status.HTTP_200_OK)
def get_candidate_profile(
    profile_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a specific candidate profile by ID (employer-only).

    **Use Cases:**
    - View full profile details after search
    - Review candidate before sending interview invite
    - Access portfolio and work samples

    **Returns:**
    - Public profile fields only (privacy-protected)
    - Portfolio items with links
    - Availability information

    **Privacy:**
    - Only returns data if profile is public
    - Contact information not exposed (use invite system)

    **Note:** This endpoint tracks views for billing/analytics.
    """
    profile_service = CandidateProfileService(db)

    profile = profile_service.get_profile_by_id(profile_id)
    if not profile:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found"
        )

    # Only return public profiles
    if profile.visibility != "public":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Candidate profile not found"
        )

    # TODO: Track profile view for billing/analytics
    # This would require employer/company context from current_user

    return {
        "success": True,
        "data": CandidateProfilePublic.from_orm(profile),
    }
