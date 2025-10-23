"""Onboarding endpoints"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.onboarding import (
    BasicProfileUpdate,
    JobPreferencesUpdate,
    SkillsUpdate,
    WorkPreferencesUpdate,
    OnboardingProgress,
    CompleteProfileResponse
)
from app.services.onboarding import OnboardingService
from app.api.dependencies import get_current_user
from app.db.models.user import User

router = APIRouter(prefix="/onboarding", tags=["Onboarding"])


@router.put("/profile", response_model=dict, status_code=status.HTTP_200_OK)
def update_basic_profile(
    profile_data: BasicProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update basic profile information (Step 1 of onboarding).

    **Required fields:**
    - first_name: User's first name
    - last_name: User's last name

    **Optional fields:**
    - phone: Contact phone number
    - location: City, state/country

    This is the first step in the onboarding process and is required.
    """
    onboarding_service = OnboardingService(db)
    profile = onboarding_service.update_basic_profile(current_user.id, profile_data)

    return {
        "success": True,
        "message": "Basic profile updated successfully",
        "data": {
            "id": str(profile.id),
            "first_name": profile.first_name,
            "last_name": profile.last_name,
            "phone": profile.phone,
            "location": profile.location,
        },
    }


@router.put("/preferences", response_model=dict, status_code=status.HTTP_200_OK)
def update_job_preferences(
    preferences_data: JobPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update job preferences (Step 2 of onboarding).

    **Required fields:**
    - target_titles: List of desired job titles (1-10 titles)

    **Optional fields:**
    - salary_min: Minimum desired salary
    - salary_max: Maximum desired salary
    - industries: List of target industries

    **Validation:**
    - salary_max must be greater than salary_min
    - Duplicate job titles are automatically removed
    """
    onboarding_service = OnboardingService(db)
    profile = onboarding_service.update_job_preferences(current_user.id, preferences_data)

    return {
        "success": True,
        "message": "Job preferences updated successfully",
        "data": {
            "target_titles": profile.target_titles,
            "salary_min": profile.salary_min,
            "salary_max": profile.salary_max,
            "industries": profile.industries,
        },
    }


@router.put("/skills", response_model=dict, status_code=status.HTTP_200_OK)
def update_skills(
    skills_data: SkillsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update skills (Step 3 of onboarding).

    **Required fields:**
    - skills: List of skills with proficiency levels (1-50 skills)

    **Skill object:**
    - name: Skill name (e.g., "Python", "JavaScript")
    - proficiency: One of: "beginner", "intermediate", "advanced", "expert"

    **Validation:**
    - Duplicate skills are not allowed (case-insensitive)
    - At least 1 skill is required
    """
    onboarding_service = OnboardingService(db)
    profile = onboarding_service.update_skills(current_user.id, skills_data)

    return {
        "success": True,
        "message": "Skills updated successfully",
        "data": {
            "skills": profile.skills,
        },
    }


@router.put("/work-preferences", response_model=dict, status_code=status.HTTP_200_OK)
def update_work_preferences(
    work_prefs_data: WorkPreferencesUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update work preferences (Step 4 of onboarding).

    **Fields (all optional, defaults to false):**
    - remote: Open to remote work
    - visa_friendly: Requires visa sponsorship
    - relocation: Open to relocation
    - contract: Open to contract work
    - part_time: Open to part-time work

    Completing this step with all previous steps marks onboarding as complete.
    """
    onboarding_service = OnboardingService(db)
    profile = onboarding_service.update_work_preferences(current_user.id, work_prefs_data)

    return {
        "success": True,
        "message": "Work preferences updated successfully",
        "data": {
            "preferences": profile.preferences,
            "onboarding_complete": profile.onboarding_complete,
        },
    }


@router.get("/progress", response_model=dict, status_code=status.HTTP_200_OK)
def get_onboarding_progress(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get current onboarding progress.

    **Returns:**
    - current_step: Current step number (1-4)
    - onboarding_complete: Whether all steps are completed
    - profile_completed: Step 1 status
    - preferences_completed: Step 2 status
    - skills_completed: Step 3 status
    - work_preferences_completed: Step 4 status

    Use this endpoint to determine which step the user should see next.
    """
    onboarding_service = OnboardingService(db)
    progress = onboarding_service.get_onboarding_progress(current_user.id)

    return {
        "success": True,
        "data": progress,
    }


@router.get("/profile", response_model=dict, status_code=status.HTTP_200_OK)
def get_complete_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get complete user profile with all onboarding data.

    **Returns:**
    - Basic profile information (name, phone, location)
    - Job preferences (titles, salary range, industries)
    - Skills with proficiency levels
    - Work preferences
    - Onboarding completion status

    Use this endpoint to display the user's complete profile.
    """
    onboarding_service = OnboardingService(db)
    profile = onboarding_service.get_complete_profile(current_user.id)

    return {
        "success": True,
        "data": profile.model_dump(),
    }


@router.post("/skip/{step}", response_model=dict, status_code=status.HTTP_200_OK)
def skip_onboarding_step(
    step: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Skip an optional onboarding step.

    **Parameters:**
    - step: Step number to skip (2, 3, or 4)

    **Note:**
    - Step 1 (basic profile) cannot be skipped
    - Skipping steps means onboarding won't be marked as complete
    - Returns updated progress after skipping
    """
    if step < 2 or step > 4:
        return {
            "success": False,
            "error": {
                "code": "BAD_REQUEST",
                "message": "Only steps 2, 3, and 4 can be skipped",
            },
        }, 400

    onboarding_service = OnboardingService(db)
    progress = onboarding_service.skip_step(current_user.id, step)

    return {
        "success": True,
        "message": f"Step {step} skipped",
        "data": progress,
    }
