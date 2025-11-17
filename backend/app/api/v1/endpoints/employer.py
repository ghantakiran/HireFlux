"""Employer/Company endpoints

API endpoints for employer registration, company management, and team collaboration.
"""

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.db.session import get_db
from app.schemas.company import (
    CompanyCreate,
    CompanyResponse,
    CompanyUpdate,
    CompanySettingsUpdate,
    LogoUploadResponse,
    CompanyMemberCreate,
    CompanyMemberResponse,
    EmployerRegistrationResponse,
    DashboardResponse,
)
from app.schemas.dashboard import (
    DashboardStats,
    PipelineMetrics,
    RecentActivity,
    TeamActivity,
)
from app.services.employer_service import EmployerService
from app.services.dashboard_service import DashboardService
from app.services.auth import AuthService
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.db.models.company import CompanyMember


router = APIRouter(prefix="/employers", tags=["Employers"])


@router.post("/register", response_model=dict, status_code=status.HTTP_201_CREATED)
def register_company(
    company_data: CompanyCreate,
    db: Session = Depends(get_db),
):
    """
    Register a new employer company with founder account.

    Creates:
    - Company with starter plan (trial period: 14 days)
    - Founder user account with hashed password
    - Company owner membership
    - Company subscription (trialing status)

    **Starter Plan Limits:**
    - Max active jobs: 1
    - Max candidate views: 10/month
    - Max team members: 1

    **Trial Period:**
    - 14 days from registration
    - Full access to starter plan features

    Returns:
    - Company details
    - User ID
    - JWT access token
    """
    employer_service = EmployerService(db)
    auth_service = AuthService(db)

    try:
        # Create company with founder account
        company = employer_service.create_company(company_data)

        # Get the founder user (first member with owner role)
        founder_member = next((m for m in company.members if m.role == "owner"), None)
        if not founder_member:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to create founder account",
            )

        # Generate JWT tokens for founder
        tokens = auth_service.create_tokens(founder_member.user_id)

        return {
            "success": True,
            "message": "Company registered successfully. Welcome to HireFlux!",
            "data": {
                "company": company,
                "user_id": str(founder_member.user_id),
                "access_token": tokens["access_token"],
                "refresh_token": tokens["refresh_token"],
                "token_type": "bearer",
            },
        }

    except ValueError as e:
        # Validation errors (from Pydantic or service)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        # Check if it's a duplicate domain error
        if "unique constraint" in str(e).lower() or "duplicate" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="A company with this domain already exists",
            )
        # Generic error
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to register company: {str(e)}",
        )


@router.get("/me", response_model=dict)
def get_current_company(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get current company for authenticated employer.

    Requires:
    - Valid JWT token
    - User must be an employer (user_type='employer')

    Returns:
    - Company details with subscription and members
    """
    # Verify user is an employer
    if current_user.user_type != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can access this endpoint",
        )

    employer_service = EmployerService(db)

    # Find company where user is a member
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No company found for this user",
        )

    company = employer_service.get_company(company_member.company_id)

    return {
        "success": True,
        "data": {
            "company": company,
            "role": company_member.role,
            "permissions": company_member.permissions,
        },
    }


@router.put("/me", response_model=dict)
def update_current_company(
    update_data: CompanyUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update current company profile.

    Requires:
    - Valid JWT token
    - User must be company owner or admin

    Updatable Fields:
    - name
    - industry
    - size
    - location
    - website
    - logo_url
    - description
    """
    # Verify user is an employer
    if current_user.user_type != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can access this endpoint",
        )

    # Find company where user is a member
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No company found for this user",
        )

    # Check if user has permission to update (owner or admin)
    if company_member.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners or admins can update company profile",
        )

    employer_service = EmployerService(db)
    company = employer_service.update_company(company_member.company_id, update_data)

    return {
        "success": True,
        "message": "Company profile updated successfully",
        "data": {"company": company},
    }


@router.post("/me/members", response_model=dict, status_code=status.HTTP_201_CREATED)
def invite_team_member(
    member_data: CompanyMemberCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Invite new team member to company.

    Requires:
    - Valid JWT token
    - User must be company owner, admin, or hiring_manager
    - Company must not exceed team member limit

    **Role Hierarchy:**
    - owner: Full access, can manage all settings
    - admin: Can manage team, jobs, and candidates
    - hiring_manager: Can manage jobs and candidates
    - recruiter: Can view candidates and manage applications
    - interviewer: Can view assigned candidates
    - viewer: Read-only access

    **Subscription Limits:**
    - Starter: 1 team member (owner only)
    - Growth: 5 team members
    - Professional: 20 team members
    - Enterprise: Unlimited
    """
    # Verify user is an employer
    if current_user.user_type != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can access this endpoint",
        )

    # Find company where user is a member
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No company found for this user",
        )

    # Check if user has permission to invite (owner, admin, or hiring_manager)
    if company_member.role not in ["owner", "admin", "hiring_manager"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only owners, admins, or hiring managers can invite team members",
        )

    employer_service = EmployerService(db)

    try:
        new_member = employer_service.add_team_member(
            company_id=company_member.company_id,
            member_data=member_data,
            invited_by_user_id=current_user.id,
        )

        return {
            "success": True,
            "message": f"Invitation sent to {member_data.email}",
            "data": {"member": new_member},
        }

    except Exception as e:
        if "limit" in str(e).lower():
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED, detail=str(e)
            )
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to invite team member: {str(e)}",
        )


@router.get("/me/members", response_model=dict)
def get_team_members(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all team members for current company.

    Requires:
    - Valid JWT token
    - User must be employer

    Returns:
    - List of team members with roles and status
    """
    # Verify user is an employer
    if current_user.user_type != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can access this endpoint",
        )

    # Find company where user is a member
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No company found for this user",
        )

    employer_service = EmployerService(db)
    members = employer_service.get_team_members(company_member.company_id)

    return {
        "success": True,
        "data": {"members": members, "total_count": len(members)},
    }


@router.delete("/me/members/{member_id}", response_model=dict)
def remove_team_member(
    member_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Remove team member from company.

    Requires:
    - Valid JWT token
    - User must be company owner or admin
    - Cannot remove company owner

    Args:
    - member_id: UUID of team member to remove
    """
    # Verify user is an employer
    if current_user.user_type != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can access this endpoint",
        )

    # Find company where user is a member
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No company found for this user",
        )

    # Check if user has permission to remove (owner or admin)
    if company_member.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners or admins can remove team members",
        )

    # Check if trying to remove self
    if str(company_member.id) == member_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove yourself. Transfer ownership first.",
        )

    employer_service = EmployerService(db)

    try:
        import uuid

        employer_service.remove_team_member(
            company_id=company_member.company_id, member_id=uuid.UUID(member_id)
        )

        return {
            "success": True,
            "message": "Team member removed successfully",
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to remove team member: {str(e)}",
        )


# ===========================================================================
# Dashboard Endpoints
# ===========================================================================


@router.get("/dashboard/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get comprehensive dashboard statistics for employer.

    Returns metrics including:
    - Active jobs count
    - Total applications received
    - Applications by status (pipeline breakdown)
    - Top performing jobs
    - Usage tracking (jobs posted, candidate views)
    - Plan limits

    **Authentication Required:** Employer user

    **Permissions:** owner, admin, hiring_manager
    """
    # Get user's company membership
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company",
        )

    # Check permissions (only certain roles can view dashboard)
    allowed_roles = ["owner", "admin", "hiring_manager", "recruiter"]
    if company_member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}",
        )

    try:
        dashboard_service = DashboardService(db)
        stats = dashboard_service.get_dashboard_stats(company_member.company_id)
        return stats

    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch dashboard stats: {str(e)}",
        )


@router.get("/dashboard/pipeline", response_model=PipelineMetrics)
def get_pipeline_metrics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get hiring pipeline conversion metrics.

    Returns:
    - Total applicants
    - Candidates at each stage (interviewed, offered, hired, rejected)
    - Conversion rates (application→interview, interview→offer, offer→acceptance)

    **Use Cases:**
    - Analyze hiring funnel effectiveness
    - Identify bottlenecks in hiring process
    - Track conversion rates over time

    **Authentication Required:** Employer user

    **Permissions:** owner, admin, hiring_manager, recruiter
    """
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company",
        )

    allowed_roles = ["owner", "admin", "hiring_manager", "recruiter"]
    if company_member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}",
        )

    try:
        dashboard_service = DashboardService(db)
        pipeline = dashboard_service.get_pipeline_metrics(company_member.company_id)
        return pipeline

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch pipeline metrics: {str(e)}",
        )


@router.get("/dashboard/activity", response_model=RecentActivity)
def get_recent_activity(
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get recent activity feed for company.

    Returns chronological list of events:
    - Job postings
    - New applications received
    - Application status changes (future)
    - Team member actions (future)

    **Query Parameters:**
    - `limit` (optional): Number of events to return (default: 20, max: 100)

    **Authentication Required:** Employer user

    **Permissions:** owner, admin, hiring_manager, recruiter
    """
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company",
        )

    allowed_roles = ["owner", "admin", "hiring_manager", "recruiter", "viewer"]
    if company_member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}",
        )

    # Enforce max limit
    if limit > 100:
        limit = 100
    if limit < 1:
        limit = 20

    try:
        dashboard_service = DashboardService(db)
        activity = dashboard_service.get_recent_activity(
            company_member.company_id, limit=limit
        )
        return activity

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch recent activity: {str(e)}",
        )


@router.get("/dashboard/team-activity", response_model=TeamActivity)
def get_team_activity(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get team activity overview.

    Returns:
    - Total team members
    - Active members this week
    - Per-member breakdown (jobs posted, candidates reviewed)

    **Use Cases:**
    - Monitor team engagement
    - Track individual contributions
    - Identify inactive team members

    **Authentication Required:** Employer user

    **Permissions:** owner, admin
    """
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company",
        )

    # Only owners and admins can view team activity
    allowed_roles = ["owner", "admin"]
    if company_member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}",
        )

    try:
        dashboard_service = DashboardService(db)
        team_activity = dashboard_service.get_team_activity(company_member.company_id)
        return team_activity

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch team activity: {str(e)}",
        )


# ============================================================================
# Company Profile Management Endpoints (Issue #21)
# ============================================================================


@router.post("/me/logo", response_model=dict, status_code=status.HTTP_200_OK)
async def upload_company_logo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Upload company logo.

    **Requirements:**
    - Max file size: 5MB
    - Formats: PNG, JPG, JPEG, SVG
    - Auto-resize: Images resized to 400x400px

    **Process:**
    1. Validates file size and format
    2. Resizes image to 400x400px (if larger)
    3. Uploads to S3
    4. Updates company.logo_url
    5. Deletes old logo if exists

    **Returns:**
    - logo_url: S3 URL of uploaded logo
    - resized: Whether image was resized
    - original_size: Original dimensions (width, height)
    - final_size: Final dimensions (width, height)
    - file_size_bytes: File size

    **Authentication Required:** Employer user

    **Permissions:** owner, admin
    """

    # Get company member
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company",
        )

    # Check permissions (only owner and admin can upload logo)
    allowed_roles = ["owner", "admin"]
    if company_member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}",
        )

    try:
        # Read file content
        file_content = await file.read()
        filename = file.filename or "logo.png"

        # Upload logo
        employer_service = EmployerService(db)
        result = employer_service.upload_logo(
            company_member.company_id, file_content, filename
        )

        return {"success": True, "data": result}

    except ValueError as e:
        # Validation errors (file size, format)
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload logo: {str(e)}",
        )


@router.delete("/me/logo", response_model=dict, status_code=status.HTTP_200_OK)
def delete_company_logo(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete company logo.

    **Process:**
    1. Deletes logo from S3
    2. Sets company.logo_url to null

    **Returns:**
    - Success message

    **Authentication Required:** Employer user

    **Permissions:** owner, admin
    """
    # Get company member
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company",
        )

    # Check permissions
    allowed_roles = ["owner", "admin"]
    if company_member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}",
        )

    try:
        employer_service = EmployerService(db)
        result = employer_service.delete_logo(company_member.company_id)

        return {"success": True, "data": result}

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete logo: {str(e)}",
        )


@router.get("/me/settings", response_model=dict)
def get_company_settings(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get company settings (timezone, notification preferences, default template).

    **Returns:**
    - timezone: Company timezone (e.g., 'America/Los_Angeles')
    - notification_settings: Email and in-app notification preferences
    - default_job_template_id: Default job template UUID

    **Authentication Required:** Employer user

    **Permissions:** any company member
    """
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company",
        )

    try:
        employer_service = EmployerService(db)
        company = employer_service.get_company(company_member.company_id)

        if not company:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Company not found",
            )

        return {
            "success": True,
            "data": {
                "timezone": company.timezone,
                "notification_settings": company.notification_settings,
                "default_job_template_id": str(company.default_job_template_id)
                if company.default_job_template_id
                else None,
            },
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch settings: {str(e)}",
        )


@router.put("/me/settings", response_model=dict, status_code=status.HTTP_200_OK)
def update_company_settings(
    settings_data: CompanySettingsUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update company settings.

    **Fields:**
    - timezone: IANA timezone string (e.g., 'America/Los_Angeles', 'Europe/London')
    - notification_settings: Email and in-app notification preferences
    - default_job_template_id: UUID of default job template

    **Notification Preferences:**
    - email.new_application: Email on new application
    - email.stage_change: Email on application stage change
    - email.team_mention: Email when mentioned by team
    - email.weekly_digest: Weekly digest email
    - in_app.new_application: In-app notification on new application
    - in_app.team_activity: In-app notification on team activity

    **Returns:**
    - Updated company with new settings

    **Authentication Required:** Employer user

    **Permissions:** owner, admin
    """

    # Get company member
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is not associated with any company",
        )

    # Check permissions
    allowed_roles = ["owner", "admin"]
    if company_member.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Insufficient permissions. Required roles: {', '.join(allowed_roles)}",
        )

    try:
        employer_service = EmployerService(db)
        company = employer_service.update_settings(
            company_member.company_id, settings_data
        )

        return {
            "success": True,
            "message": "Settings updated successfully",
            "data": {
                "timezone": company.timezone,
                "notification_settings": company.notification_settings,
                "default_job_template_id": str(company.default_job_template_id)
                if company.default_job_template_id
                else None,
            },
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update settings: {str(e)}",
        )
