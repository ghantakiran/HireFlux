"""Unit Tests for WhiteLabelService - Sprint 17-18 Phase 3

Test-Driven Development (TDD) approach:
- Write tests BEFORE implementation
- Test core business logic and edge cases
- Mock external dependencies (S3, DNS checks)

Test Coverage:
- White-label configuration CRUD
- Logo upload and validation
- Color scheme validation (WCAG compliance)
- Custom domain setup and verification
- Custom application fields management
- Email template rendering with branding
- Career page rendering with branding
- Enterprise plan enforcement
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4
from unittest.mock import Mock, patch, MagicMock
from io import BytesIO

from sqlalchemy.orm import Session

from app.services.white_label_service import WhiteLabelService
from app.db.models.api_key import WhiteLabelBranding, WhiteLabelApplicationField, WhiteLabelDomainVerification
from app.db.models.company import Company
from app.db.models.user import User
from app.schemas.api_key import (
    WhiteLabelBrandingUpdate,
    CustomApplicationFieldCreate,
    CustomApplicationFieldUpdate,
)


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def db_session():
    """Mock database session"""
    return Mock(spec=Session)


@pytest.fixture
def white_label_service(db_session):
    """WhiteLabelService instance with mocked dependencies"""
    return WhiteLabelService(db=db_session)


@pytest.fixture
def test_company(db_session):
    """Test company with Enterprise plan"""
    company = Company(
        id=uuid4(),
        name="Acme Corp",
        subscription_tier="enterprise",
        subscription_status="active",
    )
    return company


@pytest.fixture
def test_user(db_session):
    """Test user (company owner)"""
    user = User(
        id=uuid4(),
        email="owner@acme.com",
        user_type="employer",
    )
    return user


@pytest.fixture
def test_branding(test_company):
    """Test white-label branding configuration"""
    branding = WhiteLabelBranding(
        id=uuid4(),
        company_id=test_company.id,
        is_enabled=True,
        company_display_name="Acme Corporation",
        logo_url="https://s3.amazonaws.com/hireflux/logos/acme-primary.png",
        primary_color="#FF0000",
        secondary_color="#00FF00",
        accent_color="#0000FF",
        custom_domain="careers.acme.com",
        custom_domain_verified=False,
        email_from_name="Acme Careers",
        email_from_address="careers@acme.com",
    )
    return branding


# ============================================================================
# TEST: GET WHITE-LABEL CONFIGURATION
# ============================================================================

class TestGetBranding:
    """Test suite for retrieving white-label branding configuration"""

    def test_get_branding_success(self, white_label_service, db_session, test_company, test_branding):
        """
        GIVEN: A company with white-label configuration
        WHEN: get_branding(company_id)
        THEN: Returns WhiteLabelBranding object
        """
        db_session.query.return_value.filter.return_value.first.return_value = test_branding

        result = white_label_service.get_branding(test_company.id)

        assert result is not None
        assert result.company_id == test_company.id
        assert result.is_enabled is True
        assert result.company_display_name == "Acme Corporation"

    def test_get_branding_not_found_creates_default(
        self, white_label_service, db_session, test_company
    ):
        """
        GIVEN: A company without white-label configuration
        WHEN: get_branding(company_id)
        THEN: Creates and returns default configuration
        """
        db_session.query.return_value.filter.return_value.first.return_value = None

        result = white_label_service.get_branding(test_company.id)

        assert result is not None
        assert result.company_id == test_company.id
        assert result.is_enabled is False  # Disabled by default
        assert result.primary_color == "#3B82F6"  # Default blue


# ============================================================================
# TEST: UPDATE WHITE-LABEL CONFIGURATION
# ============================================================================

class TestUpdateBranding:
    """Test suite for updating white-label branding configuration"""

    def test_update_branding_success(
        self, white_label_service, db_session, test_company, test_branding
    ):
        """
        GIVEN: Valid branding update data
        WHEN: update_branding(company_id, update_data)
        THEN: Updates and returns updated configuration
        """
        db_session.query.return_value.filter.return_value.first.return_value = test_branding

        update_data = WhiteLabelBrandingUpdate(
            company_display_name="Acme Inc.",
            primary_color="#00FF00",
            email_from_name="Acme Recruiting",
        )

        result = white_label_service.update_branding(test_company.id, update_data)

        assert result.company_display_name == "Acme Inc."
        assert result.primary_color == "#00FF00"
        assert result.email_from_name == "Acme Recruiting"
        db_session.commit.assert_called_once()

    def test_update_branding_invalid_color_format(
        self, white_label_service, db_session, test_company, test_branding
    ):
        """
        GIVEN: Invalid hex color format
        WHEN: update_branding(company_id, update_data)
        THEN: Raises ValueError
        """
        update_data = WhiteLabelBrandingUpdate(
            primary_color="not-a-color",
        )

        with pytest.raises(ValueError, match="Invalid hex color format"):
            white_label_service.update_branding(test_company.id, update_data)

    def test_update_branding_low_contrast_ratio(
        self, white_label_service, db_session, test_company, test_branding
    ):
        """
        GIVEN: Color combination with insufficient contrast (WCAG AA)
        WHEN: update_branding(company_id, update_data)
        THEN: Raises ValueError
        """
        update_data = WhiteLabelBrandingUpdate(
            primary_color="#FFFF00",  # Yellow
            background_color="#FFFFFF",  # White (low contrast)
        )

        with pytest.raises(ValueError, match="Insufficient contrast ratio"):
            white_label_service.update_branding(test_company.id, update_data)


# ============================================================================
# TEST: ENABLE/DISABLE WHITE-LABEL
# ============================================================================

class TestEnableDisableWhiteLabel:
    """Test suite for enabling/disabling white-label features"""

    def test_enable_white_label_enterprise_plan(
        self, white_label_service, db_session, test_company, test_branding
    ):
        """
        GIVEN: Company with Enterprise plan
        WHEN: enable_white_label(company_id)
        THEN: Enables white-label and returns configuration
        """
        db_session.query.return_value.filter.return_value.first.side_effect = [
            test_company,
            test_branding,
        ]

        result = white_label_service.enable_white_label(test_company.id)

        assert result.is_enabled is True
        assert result.enabled_at is not None
        db_session.commit.assert_called_once()

    def test_enable_white_label_non_enterprise_plan(
        self, white_label_service, db_session, test_company, test_branding
    ):
        """
        GIVEN: Company without Enterprise plan
        WHEN: enable_white_label(company_id)
        THEN: Raises PermissionError
        """
        test_company.subscription_tier = "professional"  # Not Enterprise
        db_session.query.return_value.filter.return_value.first.return_value = test_company

        with pytest.raises(PermissionError, match="Enterprise plan required"):
            white_label_service.enable_white_label(test_company.id)

    def test_disable_white_label(
        self, white_label_service, db_session, test_company, test_branding
    ):
        """
        GIVEN: White-label enabled
        WHEN: disable_white_label(company_id)
        THEN: Disables white-label
        """
        db_session.query.return_value.filter.return_value.first.return_value = test_branding

        result = white_label_service.disable_white_label(test_company.id)

        assert result.is_enabled is False
        db_session.commit.assert_called_once()


# ============================================================================
# TEST: LOGO UPLOAD
# ============================================================================

class TestLogoUpload:
    """Test suite for uploading logo assets"""

    @patch("app.services.white_label_service.boto3")
    def test_upload_logo_primary_success(
        self, mock_boto3, white_label_service, db_session, test_company, test_branding
    ):
        """
        GIVEN: Valid PNG logo file
        WHEN: upload_logo(company_id, "primary", file)
        THEN: Uploads to S3 and returns URL
        """
        mock_s3 = MagicMock()
        mock_boto3.client.return_value = mock_s3

        db_session.query.return_value.filter.return_value.first.return_value = test_branding

        # Mock file upload
        file_data = BytesIO(b"fake-png-data")
        file_data.name = "logo.png"
        file_data.content_type = "image/png"

        result_url = white_label_service.upload_logo(
            company_id=test_company.id,
            logo_type="primary",
            file=file_data,
        )

        assert result_url.startswith("https://s3.amazonaws.com/")
        assert "logo.png" in result_url
        mock_s3.upload_fileobj.assert_called_once()

    def test_upload_logo_invalid_format(
        self, white_label_service, db_session, test_company
    ):
        """
        GIVEN: Invalid file format (not PNG/JPG/SVG)
        WHEN: upload_logo(company_id, "primary", file)
        THEN: Raises ValueError
        """
        file_data = BytesIO(b"fake-pdf-data")
        file_data.name = "logo.pdf"
        file_data.content_type = "application/pdf"

        with pytest.raises(ValueError, match="Invalid file format"):
            white_label_service.upload_logo(
                company_id=test_company.id,
                logo_type="primary",
                file=file_data,
            )

    def test_upload_logo_file_too_large(
        self, white_label_service, db_session, test_company
    ):
        """
        GIVEN: Logo file exceeds 2MB size limit
        WHEN: upload_logo(company_id, "primary", file)
        THEN: Raises ValueError
        """
        file_data = BytesIO(b"x" * (3 * 1024 * 1024))  # 3MB
        file_data.name = "logo.png"
        file_data.content_type = "image/png"

        with pytest.raises(ValueError, match="File size exceeds 2MB limit"):
            white_label_service.upload_logo(
                company_id=test_company.id,
                logo_type="primary",
                file=file_data,
            )


# ============================================================================
# TEST: COLOR VALIDATION
# ============================================================================

class TestColorValidation:
    """Test suite for color scheme validation"""

    def test_validate_color_scheme_valid_hex(self, white_label_service):
        """
        GIVEN: Valid hex colors
        WHEN: validate_color_scheme(colors)
        THEN: Returns True
        """
        colors = {
            "primary_color": "#3B82F6",
            "secondary_color": "#10B981",
            "text_color": "#1F2937",
        }

        result = white_label_service.validate_color_scheme(colors)

        assert result is True

    def test_validate_color_scheme_invalid_hex(self, white_label_service):
        """
        GIVEN: Invalid hex color
        WHEN: validate_color_scheme(colors)
        THEN: Raises ValueError
        """
        colors = {
            "primary_color": "blue",  # Not hex format
        }

        with pytest.raises(ValueError, match="Invalid hex color format"):
            white_label_service.validate_color_scheme(colors)

    def test_validate_color_scheme_contrast_ratio(self, white_label_service):
        """
        GIVEN: Color combination with low contrast
        WHEN: validate_color_scheme(colors)
        THEN: Raises ValueError for WCAG AA violation
        """
        colors = {
            "text_color": "#FFFF00",  # Yellow text
            "background_color": "#FFFFFF",  # White background (1.07:1 ratio)
        }

        with pytest.raises(ValueError, match="Insufficient contrast ratio"):
            white_label_service.validate_color_scheme(colors)


# ============================================================================
# TEST: CUSTOM DOMAIN SETUP
# ============================================================================

class TestCustomDomain:
    """Test suite for custom domain configuration"""

    def test_set_custom_domain_success(
        self, white_label_service, db_session, test_company, test_branding
    ):
        """
        GIVEN: Valid custom domain
        WHEN: set_custom_domain(company_id, domain)
        THEN: Creates verification record and returns instructions
        """
        db_session.query.return_value.filter.return_value.first.return_value = test_branding

        result = white_label_service.set_custom_domain(
            company_id=test_company.id,
            domain="careers.acme.com",
        )

        assert result is not None
        assert result.domain == "careers.acme.com"
        assert result.verification_token is not None
        assert len(result.dns_records) > 0
        db_session.add.assert_called_once()
        db_session.commit.assert_called_once()

    def test_set_custom_domain_invalid_format(
        self, white_label_service, db_session, test_company
    ):
        """
        GIVEN: Invalid domain format
        WHEN: set_custom_domain(company_id, domain)
        THEN: Raises ValueError
        """
        with pytest.raises(ValueError, match="Invalid domain format"):
            white_label_service.set_custom_domain(
                company_id=test_company.id,
                domain="not a domain!",
            )

    def test_set_custom_domain_hireflux_subdomain(
        self, white_label_service, db_session, test_company
    ):
        """
        GIVEN: HireFlux subdomain (not allowed)
        WHEN: set_custom_domain(company_id, domain)
        THEN: Raises ValueError
        """
        with pytest.raises(ValueError, match="Cannot use HireFlux subdomain"):
            white_label_service.set_custom_domain(
                company_id=test_company.id,
                domain="acme.hireflux.com",
            )

    @patch("app.services.white_label_service.socket.gethostbyname")
    def test_verify_custom_domain_success(
        self, mock_gethostbyname, white_label_service, db_session, test_company, test_branding
    ):
        """
        GIVEN: Custom domain with correct DNS records
        WHEN: verify_custom_domain(company_id)
        THEN: Marks domain as verified
        """
        # Mock DNS lookup returning correct IP
        mock_gethostbyname.return_value = "52.0.0.1"  # HireFlux IP

        verification = WhiteLabelDomainVerification(
            id=uuid4(),
            company_id=test_company.id,
            domain="careers.acme.com",
            verification_token="abc123",
            status="pending",
        )

        db_session.query.return_value.filter.return_value.first.side_effect = [
            test_branding,
            verification,
        ]

        result = white_label_service.verify_custom_domain(test_company.id)

        assert result is True
        assert verification.status == "verified"
        assert test_branding.custom_domain_verified is True
        db_session.commit.assert_called()

    @patch("app.services.white_label_service.socket.gethostbyname")
    def test_verify_custom_domain_incorrect_dns(
        self, mock_gethostbyname, white_label_service, db_session, test_company, test_branding
    ):
        """
        GIVEN: Custom domain with incorrect DNS records
        WHEN: verify_custom_domain(company_id)
        THEN: Returns False and sets error message
        """
        # Mock DNS lookup returning wrong IP
        mock_gethostbyname.return_value = "1.2.3.4"  # Wrong IP

        verification = WhiteLabelDomainVerification(
            id=uuid4(),
            company_id=test_company.id,
            domain="careers.acme.com",
            verification_token="abc123",
            status="pending",
        )

        db_session.query.return_value.filter.return_value.first.side_effect = [
            test_branding,
            verification,
        ]

        result = white_label_service.verify_custom_domain(test_company.id)

        assert result is False
        assert verification.status == "failed"
        assert verification.error_message is not None


# ============================================================================
# TEST: CUSTOM APPLICATION FIELDS
# ============================================================================

class TestCustomApplicationFields:
    """Test suite for custom application form fields"""

    def test_create_custom_field_success(
        self, white_label_service, db_session, test_company
    ):
        """
        GIVEN: Valid custom field data
        WHEN: create_custom_field(company_id, field_data)
        THEN: Creates and returns custom field
        """
        field_data = CustomApplicationFieldCreate(
            field_name="diversity_statement",
            field_label="Diversity Statement",
            field_type="textarea",
            is_required=False,
            help_text="Tell us about your commitment to diversity",
        )

        result = white_label_service.create_custom_field(test_company.id, field_data)

        assert result is not None
        assert result.company_id == test_company.id
        assert result.field_name == "diversity_statement"
        assert result.field_type == "textarea"
        db_session.add.assert_called_once()
        db_session.commit.assert_called_once()

    def test_create_custom_field_invalid_type(
        self, white_label_service, db_session, test_company
    ):
        """
        GIVEN: Invalid field type
        WHEN: create_custom_field(company_id, field_data)
        THEN: Raises ValueError
        """
        field_data = CustomApplicationFieldCreate(
            field_name="test_field",
            field_label="Test Field",
            field_type="invalid_type",
        )

        with pytest.raises(ValueError, match="Invalid field type"):
            white_label_service.create_custom_field(test_company.id, field_data)

    def test_reorder_custom_fields_success(
        self, white_label_service, db_session, test_company
    ):
        """
        GIVEN: List of field IDs in desired order
        WHEN: reorder_custom_fields(company_id, field_ids)
        THEN: Updates display_order for each field
        """
        field_ids = [uuid4(), uuid4(), uuid4()]

        # Mock existing fields
        fields = [
            WhiteLabelApplicationField(id=field_id, company_id=test_company.id, display_order=i)
            for i, field_id in enumerate(field_ids)
        ]
        db_session.query.return_value.filter.return_value.all.return_value = fields

        result = white_label_service.reorder_custom_fields(test_company.id, field_ids)

        assert result is True
        assert fields[0].display_order == 0
        assert fields[1].display_order == 1
        assert fields[2].display_order == 2
        db_session.commit.assert_called_once()


# ============================================================================
# TEST: EMAIL RENDERING WITH BRANDING
# ============================================================================

class TestBrandedEmailRendering:
    """Test suite for rendering branded email templates"""

    def test_render_branded_email_with_custom_header(
        self, white_label_service, db_session, test_company, test_branding
    ):
        """
        GIVEN: Company with custom email branding
        WHEN: render_branded_email(company_id, template_type, data)
        THEN: Returns HTML email with company branding
        """
        test_branding.email_header_html = "<div>Acme Corp</div>"
        db_session.query.return_value.filter.return_value.first.return_value = test_branding

        result = white_label_service.render_branded_email(
            company_id=test_company.id,
            template_type="application_received",
            data={"candidate_name": "John Doe", "job_title": "Software Engineer"},
        )

        assert result is not None
        assert "Acme Corp" in result
        assert "John Doe" in result
        assert "Software Engineer" in result

    def test_render_branded_email_fallback_to_default(
        self, white_label_service, db_session, test_company
    ):
        """
        GIVEN: Company without custom email branding
        WHEN: render_branded_email(company_id, template_type, data)
        THEN: Returns HTML email with default HireFlux branding
        """
        # No branding configured
        db_session.query.return_value.filter.return_value.first.return_value = None

        result = white_label_service.render_branded_email(
            company_id=test_company.id,
            template_type="application_received",
            data={"candidate_name": "John Doe"},
        )

        assert result is not None
        assert "HireFlux" in result  # Default branding


# ============================================================================
# TEST: CAREER PAGE RENDERING
# ============================================================================

class TestBrandedCareerPage:
    """Test suite for rendering branded career pages"""

    def test_render_career_page_with_branding(
        self, white_label_service, db_session, test_company, test_branding
    ):
        """
        GIVEN: Company with custom career page branding
        WHEN: render_career_page(company_id, jobs)
        THEN: Returns HTML career page with company branding
        """
        test_branding.career_page_header_html = "<h1>Join Acme Corp</h1>"
        db_session.query.return_value.filter.return_value.first.return_value = test_branding

        jobs = [
            {"id": uuid4(), "title": "Software Engineer", "location": "San Francisco"},
            {"id": uuid4(), "title": "Product Manager", "location": "Remote"},
        ]

        result = white_label_service.render_career_page(
            company_id=test_company.id,
            jobs=jobs,
        )

        assert result is not None
        assert "Join Acme Corp" in result
        assert "Software Engineer" in result
        assert "Product Manager" in result

    def test_render_career_page_hide_hireflux_branding(
        self, white_label_service, db_session, test_company, test_branding
    ):
        """
        GIVEN: Company with hide_hireflux_branding enabled
        WHEN: render_career_page(company_id, jobs)
        THEN: Returns HTML without "Powered by HireFlux" footer
        """
        test_branding.hide_hireflux_branding = True
        db_session.query.return_value.filter.return_value.first.return_value = test_branding

        result = white_label_service.render_career_page(
            company_id=test_company.id,
            jobs=[],
        )

        assert result is not None
        assert "Powered by HireFlux" not in result
