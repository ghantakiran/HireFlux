"""Team Collaboration Service - Sprint 13-14

Following Test-Driven Development: This service is implemented to satisfy the tests
in test_team_collaboration_service.py.

Service Responsibilities:
- Team member invitations (invite, resend, revoke, accept)
- Member management (update role, suspend, reactivate, remove)
- RBAC permission checking (6 roles, 12 actions)
- Activity tracking (log activity, get feeds)
- Team mentions (@mentions in notes)
"""
import secrets
from datetime import datetime, timedelta
from typing import Optional, List, Dict
from uuid import UUID

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.db.models.company import (
    Company,
    CompanyMember,
    TeamInvitation,
    TeamActivity,
    TeamMention,
)
from app.db.models.user import User


# Permission matrix: role -> action -> bool
PERMISSION_MATRIX = {
    "owner": {
        "manage_billing": True,
        "manage_team": True,
        "post_jobs": True,
        "edit_jobs": True,
        "delete_jobs": True,
        "view_all_candidates": True,
        "search_candidates": True,
        "view_assigned_candidates": True,
        "change_application_status": True,
        "schedule_interviews": True,
        "leave_feedback": True,
        "view_analytics": True,
    },
    "admin": {
        "manage_billing": False,
        "manage_team": True,
        "post_jobs": True,
        "edit_jobs": True,
        "delete_jobs": True,
        "view_all_candidates": True,
        "search_candidates": True,
        "view_assigned_candidates": True,
        "change_application_status": True,
        "schedule_interviews": True,
        "leave_feedback": True,
        "view_analytics": True,
    },
    "hiring_manager": {
        "manage_billing": False,
        "manage_team": False,
        "post_jobs": True,
        "edit_jobs": True,
        "delete_jobs": True,
        "view_all_candidates": True,
        "search_candidates": True,
        "view_assigned_candidates": True,
        "change_application_status": True,
        "schedule_interviews": True,
        "leave_feedback": True,
        "view_analytics": True,
    },
    "recruiter": {
        "manage_billing": False,
        "manage_team": False,
        "post_jobs": False,
        "edit_jobs": False,
        "delete_jobs": False,
        "view_all_candidates": True,
        "search_candidates": True,
        "view_assigned_candidates": True,
        "change_application_status": False,
        "schedule_interviews": True,
        "leave_feedback": True,
        "view_analytics": False,
    },
    "interviewer": {
        "manage_billing": False,
        "manage_team": False,
        "post_jobs": False,
        "edit_jobs": False,
        "delete_jobs": False,
        "view_all_candidates": False,
        "search_candidates": False,
        "view_assigned_candidates": True,
        "change_application_status": False,
        "schedule_interviews": False,
        "leave_feedback": True,
        "view_analytics": False,
    },
    "viewer": {
        "manage_billing": False,
        "manage_team": False,
        "post_jobs": False,
        "edit_jobs": False,
        "delete_jobs": False,
        "view_all_candidates": True,
        "search_candidates": False,
        "view_assigned_candidates": False,
        "change_application_status": False,
        "schedule_interviews": False,
        "leave_feedback": False,
        "view_analytics": True,
    },
}

VALID_ROLES = list(PERMISSION_MATRIX.keys())


class TeamCollaborationService:
    """Service for team collaboration and RBAC"""

    def __init__(self, db: Session):
        self.db = db

    # ============================================================================
    # TEAM INVITATIONS
    # ============================================================================

    async def invite_team_member(
        self,
        company_id: UUID,
        inviter_id: UUID,
        email: str,
        role: str,
    ) -> TeamInvitation:
        """
        Invite a new team member to the company

        Steps:
        1. Validate role is valid
        2. Check team size limit not exceeded
        3. Check no existing pending invitation for this email
        4. Generate secure 64-character token
        5. Set expiry to 7 days from now
        6. Create TeamInvitation with status='pending'
        7. Send invitation email (async)
        8. Return invitation

        Args:
            company_id: Company ID
            inviter_id: ID of member sending invitation
            email: Email address to invite
            role: Role to assign when accepted

        Returns:
            TeamInvitation: Created invitation

        Raises:
            ValueError: If role invalid, limit exceeded, or duplicate invitation
        """
        # Validate role
        if role not in VALID_ROLES:
            raise ValueError(f"Invalid role: {role}. Must be one of {VALID_ROLES}")

        # Check team size limit
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if not company:
            raise ValueError("Company not found")

        active_members_count = (
            self.db.query(CompanyMember)
            .filter(
                CompanyMember.company_id == company_id,
                CompanyMember.status == "active",
            )
            .count()
        )

        if active_members_count >= company.max_team_members:
            raise ValueError(
                f"Team size limit reached. Current: {active_members_count}, Max: {company.max_team_members}"
            )

        # Check for existing pending invitation
        existing_invitation = (
            self.db.query(TeamInvitation)
            .filter(
                TeamInvitation.company_id == company_id,
                TeamInvitation.email == email,
                TeamInvitation.status == "pending",
            )
            .first()
        )

        if existing_invitation:
            raise ValueError(
                f"{email} already has a pending invitation to this company"
            )

        # Generate secure token (64 characters)
        invitation_token = secrets.token_urlsafe(48)  # 48 bytes = 64 characters base64

        # Create invitation
        invitation = TeamInvitation(
            company_id=company_id,
            email=email,
            role=role,
            invited_by=inviter_id,
            invitation_token=invitation_token,
            expires_at=datetime.utcnow() + timedelta(days=7),
            status="pending",
        )

        self.db.add(invitation)
        self.db.commit()
        self.db.refresh(invitation)

        # Send invitation email (mocked in tests)
        await self._send_invitation_email(invitation)

        return invitation

    async def _send_invitation_email(self, invitation: TeamInvitation):
        """Send invitation email (to be implemented with email service)"""
        # This will be implemented with actual email service
        # For now, it's a placeholder for testing
        pass

    async def resend_invitation(
        self,
        invitation_id: UUID,
        company_id: UUID,
    ) -> TeamInvitation:
        """
        Resend an existing invitation email

        Args:
            invitation_id: Invitation ID
            company_id: Company ID for authorization

        Returns:
            TeamInvitation: Updated invitation

        Raises:
            ValueError: If invitation not found or not pending
        """
        invitation = (
            self.db.query(TeamInvitation)
            .filter(
                TeamInvitation.id == invitation_id,
                TeamInvitation.company_id == company_id,
            )
            .first()
        )

        if not invitation:
            raise ValueError("Invitation not found")

        if invitation.status != "pending":
            raise ValueError("Can only resend pending invitations")

        # Update timestamp
        invitation.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(invitation)

        # Resend email
        await self._send_invitation_email(invitation)

        return invitation

    async def revoke_invitation(
        self,
        invitation_id: UUID,
        company_id: UUID,
    ) -> None:
        """
        Revoke a pending invitation

        Args:
            invitation_id: Invitation ID
            company_id: Company ID for authorization

        Raises:
            ValueError: If invitation not found
        """
        invitation = (
            self.db.query(TeamInvitation)
            .filter(
                TeamInvitation.id == invitation_id,
                TeamInvitation.company_id == company_id,
            )
            .first()
        )

        if not invitation:
            raise ValueError("Invitation not found")

        invitation.status = "revoked"
        invitation.updated_at = datetime.utcnow()
        self.db.commit()

    async def accept_invitation(
        self,
        token: str,
        user_id: UUID,
    ) -> CompanyMember:
        """
        Accept an invitation and join the team

        Steps:
        1. Find invitation by token
        2. Validate invitation is pending
        3. Validate invitation hasn't expired
        4. Validate user email matches invitation email
        5. Create CompanyMember with role from invitation
        6. Mark invitation as accepted
        7. Return new member

        Args:
            token: Invitation token
            user_id: User accepting invitation

        Returns:
            CompanyMember: New team member

        Raises:
            ValueError: If invitation invalid, expired, or email mismatch
        """
        invitation = (
            self.db.query(TeamInvitation)
            .filter(TeamInvitation.invitation_token == token)
            .first()
        )

        if not invitation:
            raise ValueError("Invalid invitation token")

        if invitation.status != "pending":
            raise ValueError("Invitation is not pending")

        if invitation.expires_at < datetime.utcnow():
            invitation.status = "expired"
            self.db.commit()
            raise ValueError("Invitation has expired")

        # Get user and verify email matches
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user:
            raise ValueError("User not found")

        if user.email != invitation.email:
            raise ValueError("Email mismatch")

        # Create company member
        member = CompanyMember(
            company_id=invitation.company_id,
            user_id=user_id,
            role=invitation.role,
            status="active",
            invited_by=invitation.invited_by,
            invited_at=invitation.created_at,
            joined_at=datetime.utcnow(),
        )

        self.db.add(member)

        # Update invitation
        invitation.status = "accepted"
        invitation.accepted_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(member)

        return member

    async def list_pending_invitations(
        self,
        company_id: UUID,
    ) -> List[TeamInvitation]:
        """
        List all pending invitations for a company

        Args:
            company_id: Company ID

        Returns:
            List[TeamInvitation]: List of pending invitations
        """
        invitations = (
            self.db.query(TeamInvitation)
            .filter(
                TeamInvitation.company_id == company_id,
                TeamInvitation.status == "pending",
            )
            .order_by(TeamInvitation.created_at.desc())
            .all()
        )

        return invitations

    # ============================================================================
    # MEMBER MANAGEMENT
    # ============================================================================

    async def update_member_role(
        self,
        member_id: UUID,
        company_id: UUID,
        new_role: str,
    ) -> CompanyMember:
        """
        Update a team member's role

        Args:
            member_id: Member ID
            company_id: Company ID for authorization
            new_role: New role to assign

        Returns:
            CompanyMember: Updated member

        Raises:
            ValueError: If member not found, invalid role, or trying to change owner
        """
        if new_role not in VALID_ROLES:
            raise ValueError(f"Invalid role: {new_role}")

        member = (
            self.db.query(CompanyMember)
            .filter(
                CompanyMember.id == member_id,
                CompanyMember.company_id == company_id,
            )
            .first()
        )

        if not member:
            raise ValueError("Member not found")

        # Cannot change owner role
        if member.role == "owner":
            raise ValueError("Cannot change owner role")

        member.role = new_role
        member.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(member)

        return member

    async def suspend_member(
        self,
        member_id: UUID,
        company_id: UUID,
    ) -> CompanyMember:
        """
        Suspend a team member (temporarily disable access)

        Args:
            member_id: Member ID
            company_id: Company ID for authorization

        Returns:
            CompanyMember: Suspended member

        Raises:
            ValueError: If member not found
        """
        member = (
            self.db.query(CompanyMember)
            .filter(
                CompanyMember.id == member_id,
                CompanyMember.company_id == company_id,
            )
            .first()
        )

        if not member:
            raise ValueError("Member not found")

        member.status = "suspended"
        member.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(member)

        return member

    async def reactivate_member(
        self,
        member_id: UUID,
        company_id: UUID,
    ) -> CompanyMember:
        """
        Reactivate a suspended team member

        Args:
            member_id: Member ID
            company_id: Company ID for authorization

        Returns:
            CompanyMember: Reactivated member

        Raises:
            ValueError: If member not found
        """
        member = (
            self.db.query(CompanyMember)
            .filter(
                CompanyMember.id == member_id,
                CompanyMember.company_id == company_id,
            )
            .first()
        )

        if not member:
            raise ValueError("Member not found")

        member.status = "active"
        member.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(member)

        return member

    async def remove_member(
        self,
        member_id: UUID,
        company_id: UUID,
    ) -> None:
        """
        Permanently remove a team member

        Args:
            member_id: Member ID
            company_id: Company ID for authorization

        Raises:
            ValueError: If member not found
        """
        member = (
            self.db.query(CompanyMember)
            .filter(
                CompanyMember.id == member_id,
                CompanyMember.company_id == company_id,
            )
            .first()
        )

        if not member:
            raise ValueError("Member not found")

        self.db.delete(member)
        self.db.commit()

    async def get_team_members(
        self,
        company_id: UUID,
        include_suspended: bool = False,
    ) -> List[CompanyMember]:
        """
        Get all team members for a company

        Args:
            company_id: Company ID
            include_suspended: Whether to include suspended members

        Returns:
            List[CompanyMember]: List of team members
        """
        query = self.db.query(CompanyMember).filter(
            CompanyMember.company_id == company_id
        )

        if not include_suspended:
            query = query.filter(CompanyMember.status == "active")

        members = query.order_by(CompanyMember.created_at.asc()).all()

        return members

    # ============================================================================
    # RBAC PERMISSIONS
    # ============================================================================

    async def check_permission(
        self,
        member_id: UUID,
        action: str,
    ) -> bool:
        """
        Check if a member has permission for an action

        Args:
            member_id: Member ID
            action: Action to check (e.g., 'post_jobs', 'manage_team')

        Returns:
            bool: True if member has permission

        Raises:
            ValueError: If member not found
        """
        member = (
            self.db.query(CompanyMember).filter(CompanyMember.id == member_id).first()
        )

        if not member:
            raise ValueError("Member not found")

        # Check role permission matrix
        role_permissions = PERMISSION_MATRIX.get(member.role, {})
        return role_permissions.get(action, False)

    async def get_member_permissions(
        self,
        member_id: UUID,
    ) -> Dict[str, bool]:
        """
        Get all permissions for a member

        Args:
            member_id: Member ID

        Returns:
            Dict[str, bool]: Map of action -> has_permission

        Raises:
            ValueError: If member not found
        """
        member = (
            self.db.query(CompanyMember).filter(CompanyMember.id == member_id).first()
        )

        if not member:
            raise ValueError("Member not found")

        # Return copy of permission matrix for this role
        return PERMISSION_MATRIX.get(member.role, {}).copy()

    # ============================================================================
    # ACTIVITY TRACKING
    # ============================================================================

    async def log_team_activity(
        self,
        member_id: UUID,
        action: str,
        metadata: Optional[Dict] = None,
    ) -> TeamActivity:
        """
        Log a team activity for audit trail

        Args:
            member_id: Member performing action
            action: Action type (e.g., 'job_posted', 'application_reviewed')
            metadata: Additional metadata about the action

        Returns:
            TeamActivity: Created activity record

        Raises:
            ValueError: If member not found
        """
        member = (
            self.db.query(CompanyMember).filter(CompanyMember.id == member_id).first()
        )

        if not member:
            raise ValueError("Member not found")

        activity = TeamActivity(
            company_id=member.company_id,
            member_id=member_id,
            user_id=member.user_id,
            action_type=action,
            activity_metadata=metadata or {},
        )

        self.db.add(activity)
        self.db.commit()
        self.db.refresh(activity)

        return activity

    async def get_team_activity(
        self,
        company_id: UUID,
        days: int = 7,
    ) -> List[TeamActivity]:
        """
        Get team activity feed for last N days

        Args:
            company_id: Company ID
            days: Number of days to look back (default 7)

        Returns:
            List[TeamActivity]: List of activities
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        activities = (
            self.db.query(TeamActivity)
            .filter(
                TeamActivity.company_id == company_id,
                TeamActivity.created_at >= cutoff_date,
            )
            .order_by(TeamActivity.created_at.desc())
            .all()
        )

        return activities

    async def get_member_activity(
        self,
        member_id: UUID,
        days: int = 30,
    ) -> List[TeamActivity]:
        """
        Get specific member's activity history

        Args:
            member_id: Member ID
            days: Number of days to look back (default 30)

        Returns:
            List[TeamActivity]: List of member's activities
        """
        cutoff_date = datetime.utcnow() - timedelta(days=days)

        activities = (
            self.db.query(TeamActivity)
            .filter(
                TeamActivity.member_id == member_id,
                TeamActivity.created_at >= cutoff_date,
            )
            .order_by(TeamActivity.created_at.desc())
            .all()
        )

        return activities
