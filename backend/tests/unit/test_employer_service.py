"""Unit tests for Employer Service (TDD Approach)

Following Test-Driven Development: Write tests FIRST, then implement service.

Test Coverage:
- Company creation (happy path)
- Company creation (validation errors)
- Company creation (duplicate domain)
- Team member management
- Company updates
- Subscription limits
"""

import pytest
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from uuid import uuid4

from app.services.employer_service import EmployerService
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyMemberCreate
from app.db.models.company import Company, CompanyMember, CompanySubscription
from app.db.models.user import User


# ===========================================================================
# Test Fixtures
# ===========================================================================


@pytest.fixture
def company_create_data():
    """Valid company creation data"""
    return CompanyCreate(
        name="Test Company Inc",
        email="founder@testcompany.com",
        password="SecurePass123!",
        industry="Technology",
        size="1-10",
        location="San Francisco, CA",
        website="https://testcompany.com",
    )


@pytest.fixture
async def sample_company(db_session: Session):
    """Create a sample company for testing"""
    # Create user
    user = User(
        id=uuid4(),
        email="existing@company.com",
        hashed_password="hashed_password",
        user_type="employer",
    )
    db_session.add(user)
    db_session.flush()

    # Create company
    company = Company(
        id=uuid4(),
        name="Existing Company",
        domain="company.com",
        industry="Technology",
        size="11-50",
        subscription_tier="starter",
        subscription_status="active",
    )
    db_session.add(company)
    db_session.flush()

    # Create company owner
    member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=user.id,
        role="owner",
        status="active",
        joined_at=datetime.utcnow(),
    )
    db_session.add(member)

    # Create subscription
    subscription = CompanySubscription(
        id=uuid4(), company_id=company.id, plan_tier="starter", status="active"
    )
    db_session.add(subscription)

    db_session.commit()
    db_session.refresh(company)

    return company, user


# ===========================================================================
# Test Cases: Company Creation (Happy Path)
# ===========================================================================


def test_create_company_success(
    db_session: Session, company_create_data: CompanyCreate
):
    """
    GIVEN: Valid company registration data
    WHEN: create_company() is called
    THEN: Company, User, CompanyMember, and CompanySubscription are created successfully
    """
    service = EmployerService(db_session)

    # Execute
    company = service.create_company(company_create_data)

    # Assert company created
    assert company.id is not None
    assert company.name == "Test Company Inc"
    assert company.domain == "testcompany.com"  # Extracted from email
    assert company.industry == "Technology"
    assert company.size == "1-10"
    assert company.location == "San Francisco, CA"
    assert company.website == "https://testcompany.com"

    # Assert subscription defaults
    assert company.subscription_tier == "starter"
    assert company.subscription_status == "trial"
    assert company.max_active_jobs == 1
    assert company.max_candidate_views == 10
    assert company.max_team_members == 1

    # Assert trial period set (14 days from now)
    assert company.trial_ends_at is not None
    assert company.trial_ends_at > datetime.utcnow()

    # Assert founder user created
    assert len(company.members) == 1
    founder_member = company.members[0]
    assert founder_member.role == "owner"
    assert founder_member.status == "active"
    assert founder_member.joined_at is not None

    # Assert subscription created
    assert company.subscription is not None
    assert company.subscription.plan_tier == "starter"
    assert company.subscription.status == "trialing"
    assert company.subscription.jobs_posted_this_month == 0
    assert company.subscription.candidate_views_this_month == 0


def test_create_company_sets_trial_period(
    db_session: Session, company_create_data: CompanyCreate
):
    """
    GIVEN: New company registration
    WHEN: create_company() is called
    THEN: Trial period is set to 14 days from registration
    """
    service = EmployerService(db_session)

    company = service.create_company(company_create_data)

    expected_trial_end = datetime.utcnow() + timedelta(days=14)
    assert company.trial_ends_at is not None
    # Allow 1 minute tolerance for test execution time
    assert abs((company.trial_ends_at - expected_trial_end).total_seconds()) < 60


def test_create_company_hashes_password(
    db_session: Session, company_create_data: CompanyCreate
):
    """
    GIVEN: Company registration with plaintext password
    WHEN: create_company() is called
    THEN: Password is hashed and not stored in plaintext
    """
    service = EmployerService(db_session)

    company = service.create_company(company_create_data)
    founder_member = company.members[0]

    # Get the user from database
    user = db_session.get(User, founder_member.user_id)

    assert user.hashed_password is not None
    assert user.hashed_password != "SecurePass123!"
    assert user.hashed_password.startswith("$2b$")  # bcrypt hash prefix


# ===========================================================================
# Test Cases: Validation Errors
# ===========================================================================


def test_create_company_invalid_email(db_session: Session):
    """
    GIVEN: Company data with invalid email
    WHEN: create_company() is called
    THEN: ValidationError is raised
    """
    service = EmployerService(db_session)

    invalid_data = CompanyCreate(
        name="Test Company",
        email="not-an-email",  # Invalid email
        password="SecurePass123!",
        industry="Technology",
    )

    with pytest.raises(ValueError, match="email"):
        service.create_company(invalid_data)


def test_create_company_weak_password(db_session: Session):
    """
    GIVEN: Company data with weak password
    WHEN: create_company() is called
    THEN: ValidationError is raised
    """
    service = EmployerService(db_session)

    weak_password_data = CompanyCreate(
        name="Test Company",
        email="founder@test.com",
        password="weak",  # Too short, no uppercase, no digit
        industry="Technology",
    )

    with pytest.raises(ValueError, match="Password"):
        service.create_company(weak_password_data)


def test_create_company_invalid_size(db_session: Session):
    """
    GIVEN: Company data with invalid size value
    WHEN: create_company() is called
    THEN: ValidationError is raised
    """
    service = EmployerService(db_session)

    invalid_size_data = CompanyCreate(
        name="Test Company",
        email="founder@test.com",
        password="SecurePass123!",
        size="invalid-size",  # Invalid size
    )

    with pytest.raises(ValueError, match="Size must be one of"):
        service.create_company(invalid_size_data)


# ===========================================================================
# Test Cases: Duplicate Company
# ===========================================================================


def test_create_company_duplicate_domain(db_session: Session, sample_company):
    """
    GIVEN: Company already exists with domain "company.com"
    WHEN: Attempting to create new company with email @company.com
    THEN: IntegrityError is raised (duplicate domain constraint)
    """
    service = EmployerService(db_session)
    existing_company, _ = sample_company

    duplicate_data = CompanyCreate(
        name="Another Company",
        email="founder@company.com",  # Same domain as existing company
        password="SecurePass123!",
        industry="Finance",
    )

    with pytest.raises(Exception):  # Will be IntegrityError from database
        service.create_company(duplicate_data)


# ===========================================================================
# Test Cases: Company Updates
# ===========================================================================


def test_update_company_success(db_session: Session, sample_company):
    """
    GIVEN: Existing company
    WHEN: update_company() is called with new data
    THEN: Company is updated successfully
    """
    service = EmployerService(db_session)
    existing_company, _ = sample_company

    update_data = CompanyUpdate(
        name="Updated Company Name",
        industry="FinTech",
        size="51-200",
        location="New York, NY",
    )

    updated_company = service.update_company(existing_company.id, update_data)

    assert updated_company.name == "Updated Company Name"
    assert updated_company.industry == "FinTech"
    assert updated_company.size == "51-200"
    assert updated_company.location == "New York, NY"
    # Unchanged fields should remain the same
    assert updated_company.domain == "company.com"


def test_update_company_not_found(db_session: Session):
    """
    GIVEN: Non-existent company ID
    WHEN: update_company() is called
    THEN: NotFoundError is raised
    """
    service = EmployerService(db_session)
    non_existent_id = uuid4()

    update_data = CompanyUpdate(name="Updated Name")

    with pytest.raises(Exception, match="not found"):
        service.update_company(non_existent_id, update_data)


# ===========================================================================
# Test Cases: Team Member Management
# ===========================================================================


def test_add_team_member_success(db_session: Session, sample_company):
    """
    GIVEN: Existing company
    WHEN: add_team_member() is called
    THEN: New team member is added with "invited" status
    """
    service = EmployerService(db_session)
    existing_company, owner_user = sample_company

    member_data = CompanyMemberCreate(email="recruiter@company.com", role="recruiter")

    new_member = service.add_team_member(
        company_id=existing_company.id,
        member_data=member_data,
        invited_by_user_id=owner_user.id,
    )

    assert new_member.company_id == existing_company.id
    assert new_member.role == "recruiter"
    assert new_member.status == "invited"
    assert new_member.invited_by == owner_user.id
    assert new_member.invited_at is not None
    assert new_member.joined_at is None  # Not joined yet


def test_add_team_member_exceeds_limit(db_session: Session, sample_company):
    """
    GIVEN: Company on Starter plan (max 1 team member)
    WHEN: Attempting to add 2nd team member
    THEN: LimitExceededError is raised
    """
    service = EmployerService(db_session)
    existing_company, owner_user = sample_company

    # Starter plan allows only 1 member (owner already exists)
    assert existing_company.max_team_members == 1
    assert len(existing_company.members) == 1

    member_data = CompanyMemberCreate(email="recruiter@company.com", role="recruiter")

    with pytest.raises(Exception, match="team member limit"):
        service.add_team_member(
            company_id=existing_company.id,
            member_data=member_data,
            invited_by_user_id=owner_user.id,
        )


def test_remove_team_member_success(db_session: Session, sample_company):
    """
    GIVEN: Company with multiple team members
    WHEN: remove_team_member() is called
    THEN: Member is removed from company
    """
    service = EmployerService(db_session)
    existing_company, owner_user = sample_company

    # First upgrade to allow more members
    existing_company.max_team_members = 3
    db_session.commit()

    # Add a member
    member_data = CompanyMemberCreate(email="temp@company.com", role="viewer")
    member = service.add_team_member(existing_company.id, member_data, owner_user.id)

    # Remove the member
    service.remove_team_member(existing_company.id, member.id)

    # Verify member removed
    remaining_members = service.get_team_members(existing_company.id)
    assert len(remaining_members) == 1  # Only owner remains
    assert member.id not in [m.id for m in remaining_members]


# ===========================================================================
# Test Cases: Subscription Limits
# ===========================================================================


def test_check_job_posting_limit_starter(db_session: Session, sample_company):
    """
    GIVEN: Company on Starter plan (max 1 active job)
    WHEN: check_can_post_job() is called with 1 existing job
    THEN: Returns False (limit reached)
    """
    service = EmployerService(db_session)
    existing_company, _ = sample_company

    # Simulate 1 existing active job
    existing_company.subscription.jobs_posted_this_month = 1

    can_post = service.check_can_post_job(existing_company.id)

    assert can_post is False


def test_check_candidate_view_limit(db_session: Session, sample_company):
    """
    GIVEN: Company on Starter plan (max 10 candidate views/month)
    WHEN: check_can_view_candidate() is called with 10 existing views
    THEN: Returns False (limit reached)
    """
    service = EmployerService(db_session)
    existing_company, _ = sample_company

    # Simulate 10 candidate views this month
    existing_company.subscription.candidate_views_this_month = 10

    can_view = service.check_can_view_candidate(existing_company.id)

    assert can_view is False


# ===========================================================================
# Test Cases: Company Retrieval
# ===========================================================================


def test_get_company_by_id_success(db_session: Session, sample_company):
    """
    GIVEN: Existing company
    WHEN: get_company() is called with valid ID
    THEN: Company is returned with all relationships loaded
    """
    service = EmployerService(db_session)
    existing_company, _ = sample_company

    company = service.get_company(existing_company.id)

    assert company.id == existing_company.id
    assert company.name == existing_company.name
    assert len(company.members) > 0
    assert company.subscription is not None


def test_get_company_by_id_not_found(db_session: Session):
    """
    GIVEN: Non-existent company ID
    WHEN: get_company() is called
    THEN: None is returned
    """
    service = EmployerService(db_session)
    non_existent_id = uuid4()

    company = service.get_company(non_existent_id)

    assert company is None


# ===========================================================================
# BDD-Style Feature Tests
# ===========================================================================


def test_feature_complete_onboarding_flow(db_session: Session):
    """
    Feature: Complete employer onboarding flow

    Scenario: Founder registers company and invites team
      Given a new founder wants to register their company
      When they provide valid company details
      And complete registration
      Then their company is created with starter plan
      And they are set as company owner
      And they receive a 14-day trial period
      When they invite a recruiter to join
      Then the recruiter receives an invitation
      And the team member count increases
    """
    service = EmployerService(db_session)

    # Step 1: Founder registers company
    company_data = CompanyCreate(
        name="Startup Inc",
        email="founder@startup.com",
        password="Secure123!",
        industry="Technology",
        size="1-10",
    )

    company = service.create_company(company_data)

    # Verify company created with correct defaults
    assert company.subscription_tier == "starter"
    assert company.subscription_status == "trial"
    assert len(company.members) == 1
    assert company.members[0].role == "owner"
    assert company.trial_ends_at is not None

    # Step 2: Founder invites recruiter
    founder_user_id = company.members[0].user_id

    # First upgrade plan to allow more members
    company.max_team_members = 3
    db_session.commit()

    recruiter_data = CompanyMemberCreate(
        email="recruiter@startup.com", role="recruiter"
    )

    new_member = service.add_team_member(
        company_id=company.id,
        member_data=recruiter_data,
        invited_by_user_id=founder_user_id,
    )

    # Verify invitation sent
    assert new_member.status == "invited"
    assert new_member.role == "recruiter"

    # Verify team member count
    team_members = service.get_team_members(company.id)
    assert len(team_members) == 2  # Owner + Recruiter
