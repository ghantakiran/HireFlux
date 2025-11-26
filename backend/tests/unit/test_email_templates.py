"""
Unit Tests for Email Templates - Issue #52
Tests all email template methods in EmailService
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from app.services.email_service import EmailService
from app.core.config import settings


@pytest.fixture
def mock_db():
    """Mock database session"""
    db = Mock()
    db.add = Mock()
    db.commit = Mock()
    db.rollback = Mock()
    return db


@pytest.fixture
def email_service(mock_db):
    """Create EmailService instance with mocked Resend client"""
    with patch("app.services.email_service.resend") as mock_resend, \
         patch("app.services.email_service.settings") as mock_settings:

        # Mock settings
        mock_settings.RESEND_API_KEY = "test_api_key"
        mock_settings.FROM_EMAIL = "test@hireflux.com"
        mock_settings.FROM_NAME = "HireFlux"
        mock_settings.CORS_ORIGINS = ["https://hireflux.com"]

        # Mock resend client
        mock_resend.api_key = "test_api_key"
        mock_resend.emails.send = Mock(return_value={"id": "test_message_id"})

        service = EmailService(db=mock_db)
        service.client = mock_resend
        return service


class TestWelcomeEmail:
    """Tests for welcome email template"""

    def test_send_welcome_email_success(self, email_service, mock_db):
        """Test sending welcome email with all required fields"""
        result = email_service.send_welcome_email(
            to_email="newuser@example.com",
            user_name="John Doe",
            user_id="user123"
        )

        assert result["success"] is True
        assert result["message_id"] == "test_message_id"
        assert result["error"] is None

        # Verify email was sent with correct subject
        call_args = email_service.client.emails.send.call_args[0][0]
        assert "Welcome to HireFlux" in call_args["subject"]
        assert "John Doe" in call_args["subject"]

    def test_welcome_email_contains_onboarding_checklist(self, email_service):
        """Test that welcome email includes onboarding checklist"""
        result = email_service.send_welcome_email(
            to_email="newuser@example.com",
            user_name="Jane Smith"
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        html_body = call_args["html"]

        # Verify checklist items present
        assert "Complete your profile" in html_body
        assert "Generate your first AI-optimized resume" in html_body
        assert "Set your job preferences" in html_body
        assert "Browse high-fit job matches" in html_body
        assert "Apply to your first job" in html_body

    def test_welcome_email_includes_cta_button(self, email_service):
        """Test that welcome email has Get Started button"""
        result = email_service.send_welcome_email(
            to_email="newuser@example.com",
            user_name="Test User"
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        html_body = call_args["html"]

        assert "Get Started" in html_body
        assert "/dashboard/onboarding" in html_body


class TestEmailVerification:
    """Tests for email verification template"""

    def test_send_email_verification_success(self, email_service):
        """Test sending email verification with token"""
        result = email_service.send_email_verification(
            to_email="verify@example.com",
            user_name="John Doe",
            verification_token="abc123token",
            user_id="user123"
        )

        assert result["success"] is True
        assert result["message_id"] == "test_message_id"

        call_args = email_service.client.emails.send.call_args[0][0]
        assert "Verify your HireFlux email address" in call_args["subject"]

    def test_verification_email_includes_token_in_url(self, email_service):
        """Test that verification token is included in URL"""
        result = email_service.send_email_verification(
            to_email="verify@example.com",
            user_name="Jane",
            verification_token="test_token_xyz"
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        html_body = call_args["html"]

        assert "test_token_xyz" in html_body
        assert "/verify-email?token=test_token_xyz" in html_body

    def test_verification_email_has_expiry_notice(self, email_service):
        """Test that verification email mentions expiry time"""
        result = email_service.send_email_verification(
            to_email="verify@example.com",
            user_name="User",
            verification_token="token123"
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        html_body = call_args["html"]

        assert "24 hours" in html_body
        assert "expire" in html_body.lower()


class TestPasswordResetEmail:
    """Tests for password reset template"""

    def test_send_password_reset_success(self, email_service):
        """Test sending password reset email"""
        result = email_service.send_password_reset_email(
            to_email="reset@example.com",
            user_name="John Doe",
            reset_token="reset_abc123",
            user_id="user123"
        )

        assert result["success"] is True
        assert result["message_id"] == "test_message_id"

        call_args = email_service.client.emails.send.call_args[0][0]
        assert "Reset your HireFlux password" in call_args["subject"]

    def test_password_reset_includes_token_in_url(self, email_service):
        """Test that reset token is in the URL"""
        result = email_service.send_password_reset_email(
            to_email="reset@example.com",
            user_name="Jane",
            reset_token="reset_token_xyz"
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        html_body = call_args["html"]

        assert "reset_token_xyz" in html_body
        assert "/reset-password?token=reset_token_xyz" in html_body

    def test_password_reset_has_security_warning(self, email_service):
        """Test that password reset has security notice"""
        result = email_service.send_password_reset_email(
            to_email="reset@example.com",
            user_name="User",
            reset_token="token123"
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        html_body = call_args["html"]

        assert "Security Notice" in html_body or "⚠️" in html_body
        assert "1 hour" in html_body
        assert "expire" in html_body.lower()


class TestTeamInvitationEmail:
    """Tests for team invitation template (employer)"""

    def test_send_team_invitation_success(self, email_service):
        """Test sending team invitation email"""
        result = email_service.send_team_invitation_email(
            to_email="newmember@example.com",
            inviter_name="Sarah Manager",
            company_name="TechCorp Inc",
            role="Recruiter",
            invitation_token="invite_abc123"
        )

        assert result["success"] is True
        assert result["message_id"] == "test_message_id"

        call_args = email_service.client.emails.send.call_args[0][0]
        assert "Sarah Manager" in call_args["subject"]
        assert "TechCorp Inc" in call_args["subject"]

    def test_team_invitation_includes_all_details(self, email_service):
        """Test that invitation includes company name, role, and inviter"""
        result = email_service.send_team_invitation_email(
            to_email="newmember@example.com",
            inviter_name="John Admin",
            company_name="Awesome Company",
            role="Hiring Manager",
            invitation_token="invite_xyz"
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        html_body = call_args["html"]

        assert "John Admin" in html_body
        assert "Awesome Company" in html_body
        assert "Hiring Manager" in html_body
        assert "invite_xyz" in html_body

    def test_team_invitation_has_expiry_notice(self, email_service):
        """Test that invitation mentions expiry time"""
        result = email_service.send_team_invitation_email(
            to_email="newmember@example.com",
            inviter_name="Admin",
            company_name="Company",
            role="Member",
            invitation_token="token"
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        html_body = call_args["html"]

        assert "7 days" in html_body
        assert "expire" in html_body.lower()


class TestCompanyRegistrationEmail:
    """Tests for company registration template (employer)"""

    def test_send_company_registration_success(self, email_service):
        """Test sending company registration email"""
        result = email_service.send_company_registration_email(
            to_email="admin@techcorp.com",
            company_name="TechCorp",
            admin_name="Sarah Admin",
            user_id="user123"
        )

        assert result["success"] is True
        assert result["message_id"] == "test_message_id"

        call_args = email_service.client.emails.send.call_args[0][0]
        assert "Welcome to HireFlux" in call_args["subject"]
        assert "TechCorp" in call_args["subject"]

    def test_company_registration_includes_features(self, email_service):
        """Test that registration email lists key features"""
        result = email_service.send_company_registration_email(
            to_email="admin@company.com",
            company_name="My Company",
            admin_name="Admin User"
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        html_body = call_args["html"]

        # Key employer features
        assert "Post Your First Job" in html_body
        assert "AI Candidate Ranking" in html_body
        assert "Invite Your Team" in html_body
        assert "Track Applications" in html_body

    def test_company_registration_has_dashboard_cta(self, email_service):
        """Test that registration email has dashboard button"""
        result = email_service.send_company_registration_email(
            to_email="admin@company.com",
            company_name="Company",
            admin_name="Admin"
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        html_body = call_args["html"]

        assert "Go to Dashboard" in html_body
        assert "/employer/dashboard" in html_body


class TestSubscriptionStatusEmail:
    """Tests for subscription status change template"""

    def test_send_subscription_status_active(self, email_service):
        """Test sending subscription status email for active status"""
        result = email_service.send_subscription_status_email(
            to_email="user@example.com",
            user_name="John Doe",
            subscription_data={
                "status": "active",
                "plan_name": "Pro Plan",
                "next_billing_date": "2025-12-25",
                "amount": 49,
                "user_id": "user123"
            }
        )

        assert result["success"] is True
        assert result["message_id"] == "test_message_id"

        call_args = email_service.client.emails.send.call_args[0][0]
        assert "Subscription" in call_args["subject"]
        assert "Pro Plan" in call_args["subject"]

    def test_subscription_status_includes_all_details(self, email_service):
        """Test that subscription email includes plan, status, billing date"""
        result = email_service.send_subscription_status_email(
            to_email="user@example.com",
            user_name="Jane",
            subscription_data={
                "status": "upgraded",
                "plan_name": "Premium",
                "next_billing_date": "2025-11-30",
                "amount": 99
            }
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        html_body = call_args["html"]

        assert "Premium" in html_body
        assert "upgraded" in html_body.lower()
        assert "2025-11-30" in html_body
        assert "$99" in html_body

    def test_subscription_status_different_statuses(self, email_service):
        """Test different subscription statuses use correct icons"""
        statuses = ["active", "cancelled", "upgraded", "downgraded", "renewed"]

        for status in statuses:
            result = email_service.send_subscription_status_email(
                to_email="user@example.com",
                user_name="User",
                subscription_data={
                    "status": status,
                    "plan_name": "Plan",
                    "amount": 19
                }
            )

            assert result["success"] is True

            call_args = email_service.client.emails.send.call_args[0][0]
            assert status in call_args["subject"].lower()


class TestEmailValidationAndSecurity:
    """Tests for email validation and security"""

    def test_invalid_email_rejected(self, email_service):
        """Test that invalid email addresses are rejected by Pydantic validation"""
        from pydantic_core import ValidationError

        # Pydantic should reject invalid email at schema level
        with pytest.raises(ValidationError) as exc_info:
            result = email_service.send_welcome_email(
                to_email="not-an-email",
                user_name="Test User"
            )

        # Verify it's an email validation error
        assert "to_email" in str(exc_info.value)

    def test_html_sanitization_removes_scripts(self, email_service):
        """Test that HTML is sanitized (script tags removed)"""
        # This is tested indirectly through the sanitize method
        malicious_html = '<p>Hello</p><script>alert("xss")</script>'
        sanitized = email_service._sanitize_html(malicious_html)

        assert '<script>' not in sanitized
        assert 'alert' not in sanitized
        assert '<p>Hello</p>' in sanitized

    def test_html_sanitization_removes_event_handlers(self, email_service):
        """Test that event handlers are removed from HTML"""
        malicious_html = '<button onclick="alert(\'xss\')">Click</button>'
        sanitized = email_service._sanitize_html(malicious_html)

        assert 'onclick' not in sanitized
        assert '<button' in sanitized


class TestEmailLogging:
    """Tests for email delivery logging"""

    def test_email_logged_to_database(self, email_service, mock_db):
        """Test that sent emails are logged to database"""
        result = email_service.send_welcome_email(
            to_email="user@example.com",
            user_name="Test User",
            user_id="user123"
        )

        # Verify database add and commit were called
        assert mock_db.add.called
        assert mock_db.commit.called

    def test_email_logging_failure_doesnt_break_send(self, email_service, mock_db):
        """Test that logging errors don't prevent email from sending"""
        # Make database commit fail
        mock_db.commit.side_effect = Exception("Database error")

        result = email_service.send_welcome_email(
            to_email="user@example.com",
            user_name="Test User",
            user_id="user123"
        )

        # Email should still succeed even if logging fails
        assert result["success"] is True
        assert mock_db.rollback.called


class TestPlainTextFallbacks:
    """Tests for plain text email fallbacks"""

    def test_welcome_email_has_text_fallback(self, email_service):
        """Test that welcome email includes plain text version"""
        result = email_service.send_welcome_email(
            to_email="user@example.com",
            user_name="John Doe"
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        assert call_args["text"] is not None
        assert "Welcome to HireFlux" in call_args["text"]

    def test_verification_email_has_text_fallback(self, email_service):
        """Test that verification email includes plain text version"""
        result = email_service.send_email_verification(
            to_email="user@example.com",
            user_name="Jane",
            verification_token="token123"
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        assert call_args["text"] is not None
        assert "token123" in call_args["text"]

    def test_password_reset_has_text_fallback(self, email_service):
        """Test that password reset includes plain text version"""
        result = email_service.send_password_reset_email(
            to_email="user@example.com",
            user_name="User",
            reset_token="reset123"
        )

        call_args = email_service.client.emails.send.call_args[0][0]
        assert call_args["text"] is not None
        assert "reset123" in call_args["text"]


# Summary Statistics
"""
Test Coverage Summary:
- Welcome Email: 3 tests
- Email Verification: 3 tests
- Password Reset: 3 tests
- Team Invitation: 3 tests
- Company Registration: 3 tests
- Subscription Status: 3 tests
- Validation & Security: 3 tests
- Email Logging: 2 tests
- Plain Text Fallbacks: 3 tests

Total: 26 comprehensive tests for email templates
"""
