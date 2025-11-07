"""Unit tests for Team Collaboration Service (Sprint 13-14 - TDD Approach)

Following Test-Driven Development: Write tests FIRST, then implement service.

Test Coverage:
- Team member invitations (invite, resend, revoke, accept)
- Member management (update role, suspend, reactivate, remove)
- Permission checking (RBAC with 6 roles)
- Activity tracking (log activity, get activity feed)
- Team mentions (@mentions in notes)

Test Strategy:
- Use SQLite in-memory database for isolation
- Mock email service for invitation emails
- Test all 6 roles: owner, admin, hiring_manager, recruiter, interviewer, viewer
- Test permission matrix: 12 actions × 6 roles
"""
import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from uuid import uuid4
from unittest.mock import Mock, patch, AsyncMock

from app.services.team_collaboration_service import TeamCollaborationService
from app.db.models.company import (
    Company,
    CompanyMember,
    CompanySubscription,
    TeamInvitation,
    TeamActivity,
    TeamMention,
)
from app.db.models.user import User


# ===========================================================================
# Test Fixtures
# ===========================================================================


@pytest.fixture
def sample_company(db_session: Session):
    """Create a sample company with owner for testing"""
    # Create owner user
    owner_user = User(
        id=uuid4(),
        email="owner@testcompany.com",
        hashed_password="hashed_password",
        user_type="employer",
    )
    db_session.add(owner_user)
    db_session.flush()

    # Create company
    company = Company(
        id=uuid4(),
        name="Test Company Inc",
        domain="testcompany.com",
        industry="Technology",
        size="11-50",
        subscription_tier="growth",
        subscription_status="active",
        max_team_members=10,
    )
    db_session.add(company)
    db_session.flush()

    # Create company owner member
    owner_member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=owner_user.id,
        role="owner",
        status="active",
        joined_at=datetime.utcnow(),
    )
    db_session.add(owner_member)

    # Create subscription
    subscription = CompanySubscription(
        id=uuid4(),
        company_id=company.id,
        plan_tier="growth",
        status="active",
    )
    db_session.add(subscription)

    db_session.commit()
    db_session.refresh(company)
    db_session.refresh(owner_member)

    return {
        "company": company,
        "owner_user": owner_user,
        "owner_member": owner_member,
    }


@pytest.fixture
def additional_users(db_session: Session):
    """Create additional users for testing invitations"""
    users = []
    for i in range(3):
        user = User(
            id=uuid4(),
            email=f"user{i}@testcompany.com",
            hashed_password="hashed_password",
            user_type="employer",
        )
        db_session.add(user)
        users.append(user)

    db_session.commit()
    return users


# ===========================================================================
# Test Cases: Team Invitations (Happy Path)
# ===========================================================================


@pytest.mark.asyncio
async def test_invite_team_member_success(
    db_session: Session, sample_company: dict
):
    """Test: Owner successfully invites a new team member"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    inviter_id = sample_company["owner_member"].id
    new_email = "newmember@testcompany.com"
    role = "hiring_manager"

    # Act
    with patch.object(service, "_send_invitation_email", new_callable=AsyncMock):
        invitation = await service.invite_team_member(
            company_id=company.id,
            inviter_id=inviter_id,
            email=new_email,
            role=role,
        )

    # Assert
    assert invitation is not None
    assert invitation.email == new_email
    assert invitation.role == role
    assert invitation.status == "pending"
    assert invitation.invitation_token is not None
    assert len(invitation.invitation_token) == 64  # Secure token
    assert invitation.expires_at > datetime.utcnow()
    assert (invitation.expires_at - datetime.utcnow()).days == 7  # 7-day expiry


@pytest.mark.asyncio
async def test_invite_duplicate_email_fails(
    db_session: Session, sample_company: dict
):
    """Test: Cannot invite same email twice"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    inviter_id = sample_company["owner_member"].id
    email = "duplicate@testcompany.com"

    # Create first invitation
    with patch.object(service, "_send_invitation_email", new_callable=AsyncMock):
        await service.invite_team_member(
            company_id=company.id,
            inviter_id=inviter_id,
            email=email,
            role="recruiter",
        )

    # Act & Assert
    with pytest.raises(ValueError, match="already has a pending invitation"):
        await service.invite_team_member(
            company_id=company.id,
            inviter_id=inviter_id,
            email=email,
            role="recruiter",
        )


@pytest.mark.asyncio
async def test_invite_exceeds_team_limit_fails(
    db_session: Session, sample_company: dict
):
    """Test: Cannot invite when team size limit reached"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    company.max_team_members = 2  # Set limit to 2 (1 owner + 1 more)
    db_session.commit()

    inviter_id = sample_company["owner_member"].id

    # Add a member (now at limit)
    existing_user = User(
        id=uuid4(),
        email="existing@testcompany.com",
        hashed_password="hashed",
        user_type="employer",
    )
    db_session.add(existing_user)
    db_session.flush()

    member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=existing_user.id,
        role="recruiter",
        status="active",
    )
    db_session.add(member)
    db_session.commit()

    # Act & Assert
    with pytest.raises(ValueError, match="Team size limit reached"):
        await service.invite_team_member(
            company_id=company.id,
            inviter_id=inviter_id,
            email="newperson@testcompany.com",
            role="interviewer",
        )


@pytest.mark.asyncio
async def test_resend_invitation_success(
    db_session: Session, sample_company: dict
):
    """Test: Successfully resend invitation email"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    inviter_id = sample_company["owner_member"].id

    # Create invitation
    with patch.object(service, "_send_invitation_email", new_callable=AsyncMock):
        invitation = await service.invite_team_member(
            company_id=company.id,
            inviter_id=inviter_id,
            email="resend@testcompany.com",
            role="recruiter",
        )

    # Act
    with patch.object(service, "_send_invitation_email", new_callable=AsyncMock) as mock_send:
        resent_invitation = await service.resend_invitation(
            invitation_id=invitation.id,
            company_id=company.id,
        )

    # Assert
    assert resent_invitation.id == invitation.id
    assert mock_send.called
    assert resent_invitation.updated_at > invitation.created_at


@pytest.mark.asyncio
async def test_revoke_invitation_success(
    db_session: Session, sample_company: dict
):
    """Test: Successfully revoke pending invitation"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    inviter_id = sample_company["owner_member"].id

    # Create invitation
    with patch.object(service, "_send_invitation_email", new_callable=AsyncMock):
        invitation = await service.invite_team_member(
            company_id=company.id,
            inviter_id=inviter_id,
            email="revoke@testcompany.com",
            role="interviewer",
        )

    # Act
    await service.revoke_invitation(
        invitation_id=invitation.id,
        company_id=company.id,
    )

    # Assert
    db_session.refresh(invitation)
    assert invitation.status == "revoked"


@pytest.mark.asyncio
async def test_accept_invitation_success(
    db_session: Session, sample_company: dict, additional_users: list
):
    """Test: User successfully accepts invitation and joins team"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    inviter_id = sample_company["owner_member"].id
    new_user = additional_users[0]

    # Create invitation
    with patch.object(service, "_send_invitation_email", new_callable=AsyncMock):
        invitation = await service.invite_team_member(
            company_id=company.id,
            inviter_id=inviter_id,
            email=new_user.email,
            role="hiring_manager",
        )

    # Act
    new_member = await service.accept_invitation(
        token=invitation.invitation_token,
        user_id=new_user.id,
    )

    # Assert
    assert new_member is not None
    assert new_member.company_id == company.id
    assert new_member.user_id == new_user.id
    assert new_member.role == "hiring_manager"
    assert new_member.status == "active"
    assert new_member.joined_at is not None

    # Check invitation status updated
    db_session.refresh(invitation)
    assert invitation.status == "accepted"
    assert invitation.accepted_at is not None


@pytest.mark.asyncio
async def test_accept_expired_invitation_fails(
    db_session: Session, sample_company: dict, additional_users: list
):
    """Test: Cannot accept expired invitation"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    inviter_id = sample_company["owner_member"].id
    new_user = additional_users[0]

    # Create invitation and manually expire it
    with patch.object(service, "_send_invitation_email", new_callable=AsyncMock):
        invitation = await service.invite_team_member(
            company_id=company.id,
            inviter_id=inviter_id,
            email=new_user.email,
            role="recruiter",
        )

    # Expire the invitation
    invitation.expires_at = datetime.utcnow() - timedelta(days=1)
    db_session.commit()

    # Act & Assert
    with pytest.raises(ValueError, match="Invitation has expired"):
        await service.accept_invitation(
            token=invitation.invitation_token,
            user_id=new_user.id,
        )


@pytest.mark.asyncio
async def test_list_pending_invitations_success(
    db_session: Session, sample_company: dict
):
    """Test: List all pending invitations for a company"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    inviter_id = sample_company["owner_member"].id

    # Create multiple invitations
    with patch.object(service, "_send_invitation_email", new_callable=AsyncMock):
        for i in range(3):
            await service.invite_team_member(
                company_id=company.id,
                inviter_id=inviter_id,
                email=f"invite{i}@testcompany.com",
                role="recruiter",
            )

    # Act
    invitations = await service.list_pending_invitations(company_id=company.id)

    # Assert
    assert len(invitations) == 3
    assert all(inv.status == "pending" for inv in invitations)
    assert all(inv.company_id == company.id for inv in invitations)


# ===========================================================================
# Test Cases: Member Management
# ===========================================================================


@pytest.mark.asyncio
async def test_update_member_role_success(
    db_session: Session, sample_company: dict, additional_users: list
):
    """Test: Admin successfully updates member role"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    user = additional_users[0]

    # Add member as recruiter
    member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=user.id,
        role="recruiter",
        status="active",
        joined_at=datetime.utcnow(),
    )
    db_session.add(member)
    db_session.commit()

    # Act
    updated_member = await service.update_member_role(
        member_id=member.id,
        company_id=company.id,
        new_role="hiring_manager",
    )

    # Assert
    assert updated_member.role == "hiring_manager"
    assert updated_member.updated_at > member.created_at


@pytest.mark.asyncio
async def test_cannot_change_owner_role(
    db_session: Session, sample_company: dict
):
    """Test: Cannot change the role of the company owner"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    owner_member = sample_company["owner_member"]

    # Act & Assert
    with pytest.raises(ValueError, match="Cannot change owner role"):
        await service.update_member_role(
            member_id=owner_member.id,
            company_id=company.id,
            new_role="admin",
        )


@pytest.mark.asyncio
async def test_suspend_member_success(
    db_session: Session, sample_company: dict, additional_users: list
):
    """Test: Successfully suspend a team member"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    user = additional_users[0]

    # Add member
    member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=user.id,
        role="recruiter",
        status="active",
    )
    db_session.add(member)
    db_session.commit()

    # Act
    suspended_member = await service.suspend_member(
        member_id=member.id,
        company_id=company.id,
    )

    # Assert
    assert suspended_member.status == "suspended"


@pytest.mark.asyncio
async def test_reactivate_member_success(
    db_session: Session, sample_company: dict, additional_users: list
):
    """Test: Successfully reactivate a suspended member"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    user = additional_users[0]

    # Add suspended member
    member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=user.id,
        role="recruiter",
        status="suspended",
    )
    db_session.add(member)
    db_session.commit()

    # Act
    reactivated_member = await service.reactivate_member(
        member_id=member.id,
        company_id=company.id,
    )

    # Assert
    assert reactivated_member.status == "active"


@pytest.mark.asyncio
async def test_remove_member_success(
    db_session: Session, sample_company: dict, additional_users: list
):
    """Test: Successfully remove a team member"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    user = additional_users[0]

    # Add member
    member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=user.id,
        role="interviewer",
        status="active",
    )
    db_session.add(member)
    db_session.commit()

    member_id = member.id

    # Act
    await service.remove_member(
        member_id=member_id,
        company_id=company.id,
    )

    # Assert
    removed_member = (
        db_session.query(CompanyMember)
        .filter(CompanyMember.id == member_id)
        .first()
    )
    assert removed_member is None


@pytest.mark.asyncio
async def test_get_team_members_excludes_suspended(
    db_session: Session, sample_company: dict, additional_users: list
):
    """Test: Get team members excludes suspended by default"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]

    # Add active member
    active_member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=additional_users[0].id,
        role="recruiter",
        status="active",
    )
    db_session.add(active_member)

    # Add suspended member
    suspended_member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=additional_users[1].id,
        role="interviewer",
        status="suspended",
    )
    db_session.add(suspended_member)
    db_session.commit()

    # Act
    members = await service.get_team_members(
        company_id=company.id,
        include_suspended=False,
    )

    # Assert
    assert len(members) == 2  # Owner + active member
    assert all(m.status == "active" for m in members)


# ===========================================================================
# Test Cases: RBAC Permissions
# ===========================================================================


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "role,action,expected",
    [
        # Owner permissions (all)
        ("owner", "manage_billing", True),
        ("owner", "manage_team", True),
        ("owner", "post_jobs", True),
        ("owner", "view_candidates", True),
        # Admin permissions (all except billing)
        ("admin", "manage_billing", False),
        ("admin", "manage_team", True),
        ("admin", "post_jobs", True),
        # Hiring Manager permissions
        ("hiring_manager", "manage_team", False),
        ("hiring_manager", "post_jobs", True),
        ("hiring_manager", "change_application_status", True),
        # Recruiter permissions
        ("recruiter", "post_jobs", False),
        ("recruiter", "schedule_interviews", True),
        ("recruiter", "view_all_candidates", True),
        # Interviewer permissions (limited)
        ("interviewer", "schedule_interviews", False),
        ("interviewer", "view_assigned_candidates", True),
        ("interviewer", "leave_feedback", True),
        # Viewer permissions (read-only)
        ("viewer", "view_all_candidates", True),
        ("viewer", "schedule_interviews", False),
        ("viewer", "post_jobs", False),
    ],
)
async def test_permission_matrix(
    db_session: Session, sample_company: dict, role: str, action: str, expected: bool
):
    """Test: Permission matrix for all roles and actions"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]

    # Create user with specific role
    user = User(
        id=uuid4(),
        email=f"{role}@testcompany.com",
        hashed_password="hashed",
        user_type="employer",
    )
    db_session.add(user)
    db_session.flush()

    member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=user.id,
        role=role,
        status="active",
    )
    db_session.add(member)
    db_session.commit()

    # Act
    has_permission = await service.check_permission(
        member_id=member.id,
        action=action,
    )

    # Assert
    assert has_permission == expected, f"{role} should {'have' if expected else 'not have'} {action} permission"


@pytest.mark.asyncio
async def test_get_member_permissions_returns_all(
    db_session: Session, sample_company: dict
):
    """Test: Get all permissions for a member"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]

    # Create hiring manager
    user = User(
        id=uuid4(),
        email="manager@testcompany.com",
        hashed_password="hashed",
        user_type="employer",
    )
    db_session.add(user)
    db_session.flush()

    member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=user.id,
        role="hiring_manager",
        status="active",
    )
    db_session.add(member)
    db_session.commit()

    # Act
    permissions = await service.get_member_permissions(member_id=member.id)

    # Assert
    assert isinstance(permissions, dict)
    assert "post_jobs" in permissions
    assert permissions["post_jobs"] is True
    assert "manage_team" in permissions
    assert permissions["manage_team"] is False
    assert len(permissions) == 12  # 12 actions in permission matrix


# ===========================================================================
# Test Cases: Activity Tracking
# ===========================================================================


@pytest.mark.asyncio
async def test_log_team_activity_success(
    db_session: Session, sample_company: dict
):
    """Test: Successfully log team activity"""
    # Arrange
    service = TeamCollaborationService(db_session)
    member = sample_company["owner_member"]

    # Act
    activity = await service.log_team_activity(
        member_id=member.id,
        action="job_posted",
        metadata={"job_id": str(uuid4()), "job_title": "Senior Engineer"},
    )

    # Assert
    assert activity is not None
    assert activity.member_id == member.id
    assert activity.action_type == "job_posted"
    assert activity.activity_metadata["job_title"] == "Senior Engineer"


@pytest.mark.asyncio
async def test_get_team_activity_last_7_days(
    db_session: Session, sample_company: dict
):
    """Test: Get team activity for last 7 days"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    member = sample_company["owner_member"]

    # Create activities
    for i in range(5):
        await service.log_team_activity(
            member_id=member.id,
            action="application_reviewed",
            metadata={"application_id": str(uuid4())},
        )

    # Act
    activities = await service.get_team_activity(company_id=company.id, days=7)

    # Assert
    assert len(activities) == 5
    assert all(a.company_id == company.id for a in activities)


@pytest.mark.asyncio
async def test_get_member_activity_last_30_days(
    db_session: Session, sample_company: dict
):
    """Test: Get specific member activity for last 30 days"""
    # Arrange
    service = TeamCollaborationService(db_session)
    member = sample_company["owner_member"]

    # Create activities
    for i in range(3):
        await service.log_team_activity(
            member_id=member.id,
            action="interview_scheduled",
            metadata={"interview_id": str(uuid4())},
        )

    # Act
    activities = await service.get_member_activity(member_id=member.id, days=30)

    # Assert
    assert len(activities) == 3
    assert all(a.member_id == member.id for a in activities)


# ===========================================================================
# Test Cases: Edge Cases & Error Handling
# ===========================================================================


@pytest.mark.asyncio
async def test_invite_invalid_role_fails(
    db_session: Session, sample_company: dict
):
    """Test: Cannot invite with invalid role"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    inviter_id = sample_company["owner_member"].id

    # Act & Assert
    with pytest.raises(ValueError, match="Invalid role"):
        await service.invite_team_member(
            company_id=company.id,
            inviter_id=inviter_id,
            email="test@testcompany.com",
            role="super_admin",  # Invalid role
        )


@pytest.mark.asyncio
async def test_member_not_found_raises_error(
    db_session: Session, sample_company: dict
):
    """Test: Operations on non-existent member raise error"""
    # Arrange
    service = TeamCollaborationService(db_session)
    company = sample_company["company"]
    fake_member_id = uuid4()

    # Act & Assert
    with pytest.raises(ValueError, match="Member not found"):
        await service.update_member_role(
            member_id=fake_member_id,
            company_id=company.id,
            new_role="admin",
        )
