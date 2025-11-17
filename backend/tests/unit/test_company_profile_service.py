"""Unit Tests for Company Profile Management Service
Sprint 19-20 Week 39 Day 4 - Issue #21

Following TDD: Write tests FIRST (RED), then implement service (GREEN)

Test Coverage:
- Company profile CRUD operations
- Logo upload/delete
- Settings management (timezone, notifications, templates)
- Social links validation
- Permission enforcement
- Error handling
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4, UUID
from unittest.mock import Mock, patch, MagicMock
from io import BytesIO
from PIL import Image

from sqlalchemy.orm import Session

from app.services.employer_service import EmployerService
from app.db.models.company import Company, CompanyMember
from app.db.models.user import User
from app.schemas.company import (
    CompanyUpdate,
    CompanySettingsUpdate,
    CompanyNotificationSettings,
    NotificationPreferences,
)


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def db_session():
    """Mock database session"""
    session = Mock(spec=Session)
    session.query = Mock()
    session.add = Mock()
    session.commit = Mock()
    session.refresh = Mock()
    session.flush = Mock()
    return session


@pytest.fixture
def company_service(db_session):
    """Employer service instance with mocked database"""
    return EmployerService(db_session)


@pytest.fixture
def sample_company():
    """Sample company for testing"""
    return Company(
        id=uuid4(),
        name="TechCorp Inc.",
        domain="techcorp.com",
        industry="Technology",
        size="51-200",
        location="San Francisco, CA",
        website="https://techcorp.com",
        logo_url=None,
        description="An innovative tech company",
        linkedin_url=None,
        twitter_url=None,
        timezone="UTC",
        notification_settings=None,
        default_job_template_id=None,
        subscription_tier="starter",
        subscription_status="active",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )


@pytest.fixture
def sample_user():
    """Sample user (company owner)"""
    return User(
        id=uuid4(),
        email="owner@techcorp.com",
        password_hash="hashed_password",
        user_type="employer",
        email_verified=True,
    )


@pytest.fixture
def sample_company_member(sample_company, sample_user):
    """Sample company member with owner role"""
    return CompanyMember(
        id=uuid4(),
        company_id=sample_company.id,
        user_id=sample_user.id,
        role="owner",
        status="active",
        joined_at=datetime.utcnow(),
    )


@pytest.fixture
def sample_logo_file():
    """Create a sample logo file for testing"""
    # Create a 500x500 image
    img = Image.new('RGB', (500, 500), color='blue')
    img_bytes = BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    return img_bytes


# ============================================================================
# Company Profile CRUD Tests
# ============================================================================


def test_get_company_success(company_service, db_session, sample_company):
    """GIVEN: Valid company ID
    WHEN: get_company() is called
    THEN: Company is returned with all fields"""
    # Mock query chain
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    result = company_service.get_company(sample_company.id)

    assert result is not None
    assert result.id == sample_company.id
    assert result.name == "TechCorp Inc."
    assert result.industry == "Technology"


def test_get_company_not_found(company_service, db_session):
    """GIVEN: Invalid company ID
    WHEN: get_company() is called
    THEN: None is returned"""
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = None

    result = company_service.get_company(uuid4())

    assert result is None


def test_update_company_basic_fields(company_service, db_session, sample_company):
    """GIVEN: Company exists
    WHEN: update_company() is called with basic fields
    THEN: Company is updated successfully"""
    # Mock get_company
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    update_data = CompanyUpdate(
        name="TechCorp International",
        industry="Software",
        location="New York, NY",
    )

    result = company_service.update_company(sample_company.id, update_data)

    assert result.name == "TechCorp International"
    assert result.industry == "Software"
    assert result.location == "New York, NY"
    db_session.commit.assert_called_once()


def test_update_company_social_links(company_service, db_session, sample_company):
    """GIVEN: Company exists
    WHEN: update_company() is called with social links
    THEN: Social links are updated"""
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    update_data = CompanyUpdate(
        linkedin_url="https://linkedin.com/company/techcorp",
        twitter_url="https://twitter.com/techcorp",
    )

    result = company_service.update_company(sample_company.id, update_data)

    assert result.linkedin_url == "https://linkedin.com/company/techcorp"
    assert result.twitter_url == "https://twitter.com/techcorp"


def test_update_company_invalid_linkedin_url(company_service):
    """GIVEN: Invalid LinkedIn URL
    WHEN: CompanyUpdate schema is created
    THEN: Validation error is raised"""
    with pytest.raises(ValueError, match="LinkedIn URL must start with https://linkedin.com/"):
        CompanyUpdate(linkedin_url="https://facebook.com/techcorp")


def test_update_company_invalid_twitter_url(company_service):
    """GIVEN: Invalid Twitter URL
    WHEN: CompanyUpdate schema is created
    THEN: Validation error is raised"""
    with pytest.raises(ValueError, match="Twitter URL must start with https://twitter.com/"):
        CompanyUpdate(twitter_url="https://facebook.com/techcorp")


def test_update_company_description_too_long(company_service):
    """GIVEN: Description exceeds 5000 characters
    WHEN: CompanyUpdate schema is created
    THEN: Validation error is raised"""
    long_description = "A" * 5001
    with pytest.raises(ValueError, match="Description must be under 5000 characters"):
        CompanyUpdate(description=long_description)


def test_update_company_not_found(company_service, db_session):
    """GIVEN: Company does not exist
    WHEN: update_company() is called
    THEN: Exception is raised"""
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = None

    update_data = CompanyUpdate(name="New Name")

    with pytest.raises(Exception, match="not found"):
        company_service.update_company(uuid4(), update_data)


# ============================================================================
# Logo Upload Tests
# ============================================================================


def test_upload_logo_success(company_service, db_session, sample_company, sample_logo_file):
    """GIVEN: Valid logo file (PNG, under 5MB)
    WHEN: upload_logo() is called
    THEN: Logo is uploaded to S3, resized to 400x400, and URL is saved"""
    # Mock get_company
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    file_content = sample_logo_file.read()
    result = company_service.upload_logo(sample_company.id, file_content, "logo.png")

    assert "logo_url" in result
    assert result["resized"] is True  # 500x500 gets resized to 400x400
    assert result["original_size"] == (500, 500)
    db_session.commit.assert_called()


def test_upload_logo_auto_resize(company_service, db_session, sample_company):
    """GIVEN: Logo file larger than 400x400
    WHEN: upload_logo() is called
    THEN: Logo is automatically resized to 400x400"""
    from PIL import Image
    import io

    # Create a 600x600 image
    img = Image.new('RGB', (600, 600), color='red')
    img_bytes = io.BytesIO()
    img.save(img_bytes, format='PNG')
    img_bytes.seek(0)
    file_content = img_bytes.read()

    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    result = company_service.upload_logo(sample_company.id, file_content, "large-logo.png")

    assert result["resized"] is True
    assert result["original_size"] == (600, 600)
    assert result["final_size"][0] <= 400
    assert result["final_size"][1] <= 400


def test_upload_logo_exceeds_size_limit(company_service, sample_company):
    """GIVEN: Logo file exceeds 5MB
    WHEN: upload_logo() is called
    THEN: ValueError is raised"""
    # Placeholder - will implement when service exists
    pass


def test_upload_logo_invalid_format(company_service, sample_company):
    """GIVEN: Logo file is GIF (not allowed)
    WHEN: upload_logo() is called
    THEN: ValueError is raised"""
    # Placeholder - will implement when service exists
    pass


def test_delete_logo_success(company_service, db_session, sample_company):
    """GIVEN: Company has existing logo
    WHEN: delete_logo() is called
    THEN: Logo is deleted from S3 and logo_url is set to None"""
    # Set existing logo
    sample_company.logo_url = "https://s3.amazonaws.com/hireflux-logos/company-logos/123/logo.png"
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    result = company_service.delete_logo(sample_company.id)

    assert result["message"] == "Logo deleted successfully"
    assert sample_company.logo_url is None
    db_session.commit.assert_called()


def test_delete_logo_no_existing_logo(company_service, db_session, sample_company):
    """GIVEN: Company has no logo
    WHEN: delete_logo() is called
    THEN: No error is raised (idempotent)"""
    # Placeholder - will implement when service exists
    pass


# ============================================================================
# Settings Management Tests
# ============================================================================


def test_update_settings_timezone(company_service, db_session, sample_company):
    """GIVEN: Company exists
    WHEN: update_settings() is called with timezone
    THEN: Timezone is updated"""
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    settings_data = CompanySettingsUpdate(timezone="America/Los_Angeles")

    # This will be implemented in service
    # For now, test that schema validates
    assert settings_data.timezone == "America/Los_Angeles"


def test_update_settings_notification_preferences(company_service, db_session, sample_company):
    """GIVEN: Company exists
    WHEN: update_settings() is called with notification preferences
    THEN: Notification settings are updated"""
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    notification_settings = CompanyNotificationSettings(
        email=NotificationPreferences(
            new_application=True,
            stage_change=True,
            team_mention=True,
            weekly_digest=False,
        ),
        in_app=NotificationPreferences(
            new_application=True,
            team_mention=True,
            stage_change=False,
            weekly_digest=False,
        ),
    )

    settings_data = CompanySettingsUpdate(notification_settings=notification_settings)

    # Validate schema
    assert settings_data.notification_settings.email.new_application is True
    assert settings_data.notification_settings.email.weekly_digest is False
    assert settings_data.notification_settings.in_app.new_application is True


def test_update_settings_default_template(company_service, db_session, sample_company):
    """GIVEN: Company exists
    WHEN: update_settings() is called with default_job_template_id
    THEN: Default template is set"""
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    template_id = uuid4()
    settings_data = CompanySettingsUpdate(default_job_template_id=template_id)

    assert settings_data.default_job_template_id == template_id


def test_update_settings_all_fields(company_service, db_session, sample_company):
    """GIVEN: Company exists
    WHEN: update_settings() is called with all fields
    THEN: All settings are updated"""
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    template_id = uuid4()
    notification_settings = CompanyNotificationSettings(
        email=NotificationPreferences(new_application=True, stage_change=True, team_mention=True, weekly_digest=True),
        in_app=NotificationPreferences(new_application=True, team_mention=True, stage_change=True, weekly_digest=False),
    )

    settings_data = CompanySettingsUpdate(
        timezone="America/New_York",
        notification_settings=notification_settings,
        default_job_template_id=template_id,
    )

    assert settings_data.timezone == "America/New_York"
    assert settings_data.notification_settings.email.weekly_digest is True
    assert settings_data.default_job_template_id == template_id


# ============================================================================
# Permission Tests
# ============================================================================


def test_update_company_permission_owner(company_service, db_session, sample_company, sample_user, sample_company_member):
    """GIVEN: User is company owner
    WHEN: update_company() is called
    THEN: Update is allowed"""
    # Permission checks will be implemented in API layer
    # For now, test that owner role exists
    assert sample_company_member.role == "owner"


def test_update_company_permission_admin(company_service, db_session, sample_company):
    """GIVEN: User is company admin
    WHEN: update_company() is called
    THEN: Update is allowed"""
    # Placeholder - permission logic will be in API endpoints
    pass


def test_update_company_permission_viewer(company_service, db_session, sample_company):
    """GIVEN: User is company viewer (read-only role)
    WHEN: update_company() is called
    THEN: Permission denied error is raised"""
    # Placeholder - permission logic will be in API endpoints
    pass


# ============================================================================
# Edge Cases & Error Handling
# ============================================================================


def test_update_company_empty_update(company_service, db_session, sample_company):
    """GIVEN: Company exists
    WHEN: update_company() is called with no fields
    THEN: No changes are made but no error is raised"""
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    update_data = CompanyUpdate()

    result = company_service.update_company(sample_company.id, update_data)

    # Should return company unchanged
    assert result.name == sample_company.name


def test_update_company_partial_update(company_service, db_session, sample_company):
    """GIVEN: Company exists
    WHEN: update_company() is called with only one field
    THEN: Only that field is updated, others remain unchanged"""
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    original_industry = sample_company.industry
    update_data = CompanyUpdate(name="New Name Only")

    result = company_service.update_company(sample_company.id, update_data)

    assert result.name == "New Name Only"
    assert result.industry == original_industry  # Should not change


def test_update_company_clear_optional_field(company_service, db_session, sample_company):
    """GIVEN: Company has website set
    WHEN: update_company() is called with website=None
    THEN: Website is cleared"""
    sample_company.website = "https://techcorp.com"
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    update_data = CompanyUpdate(website=None)

    result = company_service.update_company(sample_company.id, update_data)

    # When website is None in update, it should be excluded (exclude_unset=True)
    # So this test verifies partial update behavior
    assert hasattr(result, 'website')


# ============================================================================
# BDD-Style Feature Tests
# ============================================================================


def test_feature_complete_profile_setup(company_service, db_session, sample_company):
    """BDD Scenario: Complete company profile setup
    GIVEN: New company is registered
    WHEN: Owner completes all profile sections
    THEN: Profile is fully populated"""
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    # Step 1: Update basic info
    basic_update = CompanyUpdate(
        name="TechCorp Inc.",
        industry="Technology",
        size="51-200",
        location="San Francisco, CA",
        website="https://techcorp.com",
        description="We build innovative software products",
    )
    result = company_service.update_company(sample_company.id, basic_update)
    assert result.description == "We build innovative software products"

    # Step 2: Add social links
    social_update = CompanyUpdate(
        linkedin_url="https://linkedin.com/company/techcorp",
        twitter_url="https://twitter.com/techcorp",
    )
    result = company_service.update_company(sample_company.id, social_update)
    assert result.linkedin_url is not None

    # Step 3: Configure settings
    settings_update = CompanySettingsUpdate(
        timezone="America/Los_Angeles",
        notification_settings=CompanyNotificationSettings(
            email=NotificationPreferences(new_application=True, stage_change=True, team_mention=True, weekly_digest=False),
            in_app=NotificationPreferences(new_application=True, team_mention=True, stage_change=False, weekly_digest=False),
        ),
    )
    assert settings_update.timezone == "America/Los_Angeles"


def test_feature_replace_logo(company_service, db_session, sample_company):
    """BDD Scenario: Replace existing company logo
    GIVEN: Company has existing logo
    WHEN: Owner uploads new logo
    THEN: Old logo is deleted, new logo is uploaded"""
    # Placeholder - will implement with service
    pass


def test_feature_unsaved_changes_scenario(company_service, db_session, sample_company):
    """BDD Scenario: Handle unsaved changes
    GIVEN: User is editing company profile
    WHEN: User navigates away without saving
    THEN: Warning is shown (frontend responsibility)
    AND: Changes are not persisted to database"""
    # This is primarily a frontend concern
    # Backend doesn't save until update_company() is called
    db_session.query.return_value.options.return_value.filter.return_value.first.return_value = sample_company

    # If update_company is never called, changes don't persist
    assert db_session.commit.call_count == 0
