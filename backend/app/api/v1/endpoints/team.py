"""Team Management endpoints (Sprint 13-14)

API endpoints for team collaboration:
- Team member invitations
- Member management (roles, suspend, remove)
- Activity feed and tracking
- Permission management (RBAC)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.session import get_db
from app.schemas.company import (
    TeamInvitationCreate,
    TeamInvitationResponse,
    CompanyMemberUpdate,
    TeamMemberResponse,
    TeamActivityResponse,
    PermissionMatrixResponse,
    TeamListResponse,
)
from app.services.team_collaboration_service import TeamCollaborationService
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.db.models.company import CompanyMember


router = APIRouter(prefix="/team", tags=["Team Management"])


# ============================================================================
# Helper Functions
# ============================================================================


def get_current_company_member(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> CompanyMember:
    """
    Get current user's company membership.

    Validates:
    - User is an employer
    - User belongs to a company

    Returns:
        CompanyMember: Current user's membership

    Raises:
        HTTPException: If not employer or no company found
    """
    if current_user.user_type != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can access team management",
        )

    member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No company membership found for this user",
        )

    return member


async def check_member_permission(
    action: str,
    member: CompanyMember,
    db: Session,
) -> None:
    """
    Check if member has permission for action.

    Args:
        action: Permission action to check
        member: Company member
        db: Database session

    Raises:
        HTTPException: If permission denied
    """
    service = TeamCollaborationService(db)
    has_permission = await service.check_permission(member.id, action)

    if not has_permission:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"You don't have permission to {action}",
        )


# ============================================================================
# Team Invitation Endpoints
# ============================================================================


@router.post(
    "/invite",
    response_model=TeamInvitationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def invite_team_member(
    invitation_data: TeamInvitationCreate,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Invite a new team member to the company.

    **Requires:** `manage_team` permission (Owner, Admin)

    **Features:**
    - Generates secure 64-character invitation token
    - Sets 7-day expiry
    - Validates team size limits
    - Prevents duplicate invitations
    - Sends invitation email (async)

    **Roles:**
    - owner: Full access + billing
    - admin: Full access except billing
    - hiring_manager: Post jobs, manage applications
    - recruiter: View candidates, schedule interviews
    - interviewer: View assigned candidates, leave feedback
    - viewer: Read-only access
    """
    # Check permission
    await check_member_permission("manage_team", member, db)

    service = TeamCollaborationService(db)

    try:
        invitation = await service.invite_team_member(
            company_id=member.company_id,
            inviter_id=member.id,
            email=invitation_data.email,
            role=invitation_data.role,
        )

        return invitation

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to send invitation: {str(e)}",
        )


@router.get("/invitations", response_model=List[TeamInvitationResponse])
async def list_pending_invitations(
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    List all pending invitations for the company.

    **Requires:** `manage_team` permission (Owner, Admin)
    """
    await check_member_permission("manage_team", member, db)

    service = TeamCollaborationService(db)
    invitations = await service.list_pending_invitations(company_id=member.company_id)

    return invitations


@router.post(
    "/invitations/{invitation_id}/resend", response_model=TeamInvitationResponse
)
async def resend_invitation(
    invitation_id: UUID,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Resend an invitation email.

    **Requires:** `manage_team` permission (Owner, Admin)
    """
    await check_member_permission("manage_team", member, db)

    service = TeamCollaborationService(db)

    try:
        invitation = await service.resend_invitation(
            invitation_id=invitation_id,
            company_id=member.company_id,
        )

        return invitation

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_invitation(
    invitation_id: UUID,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Revoke a pending invitation.

    **Requires:** `manage_team` permission (Owner, Admin)
    """
    await check_member_permission("manage_team", member, db)

    service = TeamCollaborationService(db)

    try:
        await service.revoke_invitation(
            invitation_id=invitation_id,
            company_id=member.company_id,
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/accept/{token}", response_model=dict)
async def accept_invitation(
    token: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Accept a team invitation (public endpoint - no team membership required).

    **Steps:**
    1. Validates invitation token
    2. Checks expiry
    3. Verifies email matches
    4. Creates company membership
    5. Marks invitation as accepted

    **Returns:**
    - Company details
    - Member role
    - Welcome message
    """
    service = TeamCollaborationService(db)

    try:
        new_member = await service.accept_invitation(
            token=token,
            user_id=current_user.id,
        )

        return {
            "success": True,
            "message": "Welcome to the team!",
            "data": {
                "company_id": str(new_member.company_id),
                "role": new_member.role,
                "member_id": str(new_member.id),
            },
        }

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ============================================================================
# Member Management Endpoints
# ============================================================================


@router.get("/members", response_model=TeamListResponse)
async def get_team_members(
    include_suspended: bool = False,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Get all team members for the company.

    **Requires:** Company membership

    **Query Parameters:**
    - include_suspended: Include suspended members (default: false)

    **Returns:**
    - Active members
    - Pending invitations (if manage_team permission)
    - Total counts
    """
    service = TeamCollaborationService(db)

    # Get active members
    members = await service.get_team_members(
        company_id=member.company_id,
        include_suspended=include_suspended,
    )

    # Get pending invitations (if has permission)
    pending_invitations = []
    has_manage_team = await service.check_permission(member.id, "manage_team")
    if has_manage_team:
        pending_invitations = await service.list_pending_invitations(
            company_id=member.company_id
        )

    return TeamListResponse(
        members=members,
        pending_invitations=pending_invitations,
        total_members=len(members),
        total_pending=len(pending_invitations),
    )


@router.patch("/members/{member_id}/role", response_model=TeamMemberResponse)
async def update_member_role(
    member_id: UUID,
    update_data: CompanyMemberUpdate,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Update a team member's role.

    **Requires:** `manage_team` permission (Owner, Admin)

    **Restrictions:**
    - Cannot change owner role
    - Cannot change your own role
    """
    await check_member_permission("manage_team", member, db)

    # Prevent changing own role
    if member_id == member.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own role",
        )

    service = TeamCollaborationService(db)

    try:
        updated_member = await service.update_member_role(
            member_id=member_id,
            company_id=member.company_id,
            new_role=update_data.role,
        )

        # Log activity
        await service.log_team_activity(
            member_id=member.id,
            action="member_role_updated",
            metadata={
                "target_member_id": str(member_id),
                "new_role": update_data.role,
            },
        )

        return updated_member

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post("/members/{member_id}/suspend", response_model=TeamMemberResponse)
async def suspend_member(
    member_id: UUID,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Suspend a team member (temporarily disable access).

    **Requires:** `manage_team` permission (Owner, Admin)
    """
    await check_member_permission("manage_team", member, db)

    service = TeamCollaborationService(db)

    try:
        suspended_member = await service.suspend_member(
            member_id=member_id,
            company_id=member.company_id,
        )

        # Log activity
        await service.log_team_activity(
            member_id=member.id,
            action="member_suspended",
            metadata={"target_member_id": str(member_id)},
        )

        return suspended_member

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.post("/members/{member_id}/reactivate", response_model=TeamMemberResponse)
async def reactivate_member(
    member_id: UUID,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Reactivate a suspended team member.

    **Requires:** `manage_team` permission (Owner, Admin)
    """
    await check_member_permission("manage_team", member, db)

    service = TeamCollaborationService(db)

    try:
        reactivated_member = await service.reactivate_member(
            member_id=member_id,
            company_id=member.company_id,
        )

        # Log activity
        await service.log_team_activity(
            member_id=member.id,
            action="member_reactivated",
            metadata={"target_member_id": str(member_id)},
        )

        return reactivated_member

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.delete("/members/{member_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    member_id: UUID,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Permanently remove a team member.

    **Requires:** `manage_team` permission (Owner, Admin)

    **Warning:** This action cannot be undone. Consider suspending instead.
    """
    await check_member_permission("manage_team", member, db)

    service = TeamCollaborationService(db)

    try:
        # Log activity before deletion
        await service.log_team_activity(
            member_id=member.id,
            action="member_removed",
            metadata={"target_member_id": str(member_id)},
        )

        await service.remove_member(
            member_id=member_id,
            company_id=member.company_id,
        )

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ============================================================================
# Activity & Permissions Endpoints
# ============================================================================


@router.get("/activity", response_model=List[TeamActivityResponse])
async def get_team_activity(
    days: int = 7,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Get team activity feed for last N days.

    **Requires:** Company membership

    **Query Parameters:**
    - days: Number of days to look back (default: 7, max: 90)

    **Activity Types:**
    - job_posted
    - application_reviewed
    - interview_scheduled
    - member_role_updated
    - member_suspended
    - member_removed
    """
    if days > 90:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot query more than 90 days of activity",
        )

    service = TeamCollaborationService(db)
    activities = await service.get_team_activity(
        company_id=member.company_id,
        days=days,
    )

    return activities


@router.get("/members/{member_id}/activity", response_model=List[TeamActivityResponse])
async def get_member_activity(
    member_id: UUID,
    days: int = 30,
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Get specific member's activity history.

    **Requires:** `manage_team` permission (Owner, Admin)

    **Query Parameters:**
    - days: Number of days to look back (default: 30, max: 90)
    """
    await check_member_permission("manage_team", member, db)

    if days > 90:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot query more than 90 days of activity",
        )

    service = TeamCollaborationService(db)
    activities = await service.get_member_activity(
        member_id=member_id,
        days=days,
    )

    return activities


@router.get("/permissions", response_model=PermissionMatrixResponse)
async def get_current_permissions(
    member: CompanyMember = Depends(get_current_company_member),
    db: Session = Depends(get_db),
):
    """
    Get all permissions for current user.

    **Requires:** Company membership

    **Returns:**
    - Member ID
    - Role
    - Permission matrix (12 actions)

    **Actions:**
    - manage_billing
    - manage_team
    - post_jobs
    - edit_jobs
    - delete_jobs
    - view_all_candidates
    - search_candidates
    - view_assigned_candidates
    - change_application_status
    - schedule_interviews
    - leave_feedback
    - view_analytics
    """
    service = TeamCollaborationService(db)
    permissions = await service.get_member_permissions(member_id=member.id)

    return PermissionMatrixResponse(
        member_id=member.id,
        role=member.role,
        permissions=permissions,
    )
