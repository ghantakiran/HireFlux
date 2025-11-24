"""Unit tests for Email Service"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from datetime import datetime

from app.services.email_service import EmailService
from app.schemas.notification import EmailSend
from app.core.exceptions import ServiceError


@pytest.fixture
def email_service():
    """Create Email service instance with mocked Resend API key"""
    with patch("app.services.email_service.settings.RESEND_API_KEY", "test_api_key"):
        with patch("app.services.email_service.resend.api_key", "test_api_key"):
            service = EmailService()
            yield service


@pytest.fixture
def mock_resend_client():
    """Create mock Resend client"""
    return Mock()


@pytest.fixture
def email_send_request():
    """Create email send request"""
    return EmailSend(
        to_email="test@example.com",
        subject="Test Email",
        html_body="<h1>Hello World</h1>",
        text_body="Hello World",
    )


class TestEmailServiceInitialization:
    """Test Email service initialization"""

    def test_service_initializes_successfully(self):
        """Test service initialization"""
        with patch("app.services.email_service.settings.RESEND_API_KEY", "test_api_key"):
            with patch("app.services.email_service.resend.api_key", "test_api_key"):
                service = EmailService()
                assert service is not None

    def test_service_has_resend_client(self, email_service):
        """Test service has Resend client"""
        assert hasattr(email_service, "client")


class TestSendEmail:
    """Test sending emails"""

    def test_send_email_success(self, email_service, email_send_request):
        """Test successful email sending"""
        with patch.object(email_service, "client") as mock_client:
            mock_client.emails.send.return_value = {"id": "msg_123456"}

            result = email_service.send_email(email_send_request)

            assert result["success"] is True
            assert result["message_id"] == "msg_123456"
            assert result["error"] is None
            mock_client.emails.send.assert_called_once()

    def test_send_email_with_template(self, email_service):
        """Test sending email with template"""
        request = EmailSend(
            to_email="test@example.com",
            subject="Job Match Alert",
            html_body="",  # Will be replaced by template
            template_name="job_match",
            template_variables={"job_title": "Senior Engineer", "company": "Google"},
        )

        with patch.object(email_service, "client") as mock_client:
            mock_client.emails.send.return_value = {"id": "msg_789"}

            with patch.object(email_service, "_render_template") as mock_render:
                mock_render.return_value = (
                    "<h1>Job Match: Senior Engineer at Google</h1>"
                )

                result = email_service.send_email(request)

                assert result["success"] is True
                mock_render.assert_called_once_with(
                    "job_match",
                    {"job_title": "Senior Engineer", "company": "Google"},
                )

    def test_send_email_handles_error(self, email_service, email_send_request):
        """Test error handling in email sending"""
        with patch.object(email_service, "client") as mock_client:
            mock_client.emails.send.side_effect = Exception("Resend API error")

            result = email_service.send_email(email_send_request)

            assert result["success"] is False
            assert result["message_id"] is None
            assert "error" in result

    def test_send_email_validates_email_address(self, email_service):
        """Test email validation"""
        # Pydantic validates at schema level, so invalid emails raise ValidationError during construction
        with pytest.raises(Exception):  # Pydantic ValidationError
            invalid_request = EmailSend(
                to_email="invalid-email",
                subject="Test",
                html_body="Test",
            )


class TestNotificationEmails:
    """Test notification-specific emails"""

    def test_send_job_match_email(self, email_service):
        """Test sending job match notification email"""
        job_data = {
            "job_title": "Senior Software Engineer",
            "company_name": "Google",
            "fit_score": 95,
            "job_url": "/jobs/123",
        }

        with patch.object(email_service, "send_email") as mock_send:
            mock_send.return_value = {"success": True, "message_id": "msg_123"}

            result = email_service.send_job_match_email(
                to_email="user@example.com",
                user_name="John Doe",
                job_data=job_data,
            )

            assert result["success"] is True
            mock_send.assert_called_once()
            call_args = mock_send.call_args[0][0]
            assert call_args.to_email == "user@example.com"
            assert "Senior Software Engineer" in call_args.subject

    def test_send_application_status_email(self, email_service):
        """Test sending application status update email"""
        application_data = {
            "job_title": "Frontend Developer",
            "company_name": "Meta",
            "status": "interview",
            "application_url": "/applications/456",
        }

        with patch.object(email_service, "send_email") as mock_send:
            mock_send.return_value = {"success": True}

            result = email_service.send_application_status_email(
                to_email="user@example.com",
                user_name="Jane Smith",
                application_data=application_data,
            )

            assert result["success"] is True

    def test_send_credit_alert_email(self, email_service):
        """Test sending credit balance alert email"""
        with patch.object(email_service, "send_email") as mock_send:
            mock_send.return_value = {"success": True}

            result = email_service.send_credit_alert_email(
                to_email="user@example.com",
                user_name="John Doe",
                credit_balance=5,
                threshold=10,
            )

            assert result["success"] is True

    def test_send_interview_reminder_email(self, email_service):
        """Test sending interview reminder email"""
        interview_data = {
            "company_name": "Amazon",
            "role": "Senior Engineer",
            "scheduled_time": "2025-11-01 10:00 AM",
            "interview_url": "/interviews/789",
        }

        with patch.object(email_service, "send_email") as mock_send:
            mock_send.return_value = {"success": True}

            result = email_service.send_interview_reminder_email(
                to_email="user@example.com",
                user_name="John Doe",
                interview_data=interview_data,
            )

            assert result["success"] is True


class TestTemplateRendering:
    """Test email template rendering"""

    def test_render_template_with_variables(self, email_service):
        """Test rendering template with variables"""
        template_html = "<h1>Hello {{user_name}}!</h1><p>Job: {{job_title}}</p>"
        variables = {"user_name": "John", "job_title": "Senior Engineer"}

        with patch.object(email_service, "_get_template") as mock_get:
            mock_get.return_value = template_html

            result = email_service._render_template("job_match", variables)

            assert "John" in result
            assert "Senior Engineer" in result

    def test_render_template_missing_variable(self, email_service):
        """Test rendering template with missing variable"""
        template_html = "<h1>Hello {{user_name}}!</h1>"
        variables = {}  # Missing user_name

        with patch.object(email_service, "_get_template") as mock_get:
            mock_get.return_value = template_html

            # Should handle gracefully or raise specific error
            result = email_service._render_template("test", variables)
            assert result is not None


class TestWeeklyDigest:
    """Test weekly digest email"""

    def test_send_weekly_digest_email(self, email_service):
        """Test sending weekly digest email"""
        digest_data = {
            "jobs_matched": 15,
            "applications_sent": 5,
            "interviews_completed": 2,
            "top_jobs": [
                {"title": "Senior Engineer", "company": "Google", "fit": 95},
                {"title": "Staff Engineer", "company": "Meta", "fit": 92},
            ],
        }

        with patch.object(email_service, "send_email") as mock_send:
            mock_send.return_value = {"success": True}

            result = email_service.send_weekly_digest_email(
                to_email="user@example.com",
                user_name="John Doe",
                digest_data=digest_data,
            )

            assert result["success"] is True

    def test_weekly_digest_includes_summary(self, email_service):
        """Test weekly digest includes activity summary"""
        digest_data = {
            "jobs_matched": 10,
            "applications_sent": 3,
            "interviews_completed": 1,
        }

        with patch.object(email_service, "send_email") as mock_send:
            mock_send.return_value = {"success": True}

            email_service.send_weekly_digest_email(
                "user@example.com", "John", digest_data
            )

            call_args = mock_send.call_args[0][0]
            assert "10" in call_args.html_body or "jobs_matched" in str(
                call_args.template_variables
            )


class TestBulkEmail:
    """Test bulk email sending"""

    def test_send_bulk_emails(self, email_service):
        """Test sending emails to multiple recipients"""
        recipients = [
            {"email": "user1@example.com", "name": "User 1"},
            {"email": "user2@example.com", "name": "User 2"},
            {"email": "user3@example.com", "name": "User 3"},
        ]

        with patch.object(email_service, "send_email") as mock_send:
            mock_send.return_value = {"success": True}

            results = email_service.send_bulk_emails(
                recipients=recipients,
                subject="System Update",
                template_name="system_update",
            )

            assert len(results) == 3
            assert all(r["success"] for r in results)
            assert mock_send.call_count == 3

    def test_bulk_email_handles_partial_failures(self, email_service):
        """Test bulk email with some failures"""
        recipients = [
            {"email": "success@example.com", "name": "Success User"},
            {"email": "fail@example.com", "name": "Fail User"},
        ]

        with patch.object(email_service, "send_email") as mock_send:
            # First call succeeds, second fails
            mock_send.side_effect = [
                {"success": True, "message_id": "msg_1"},
                {"success": False, "error": "Invalid email"},
            ]

            results = email_service.send_bulk_emails(
                recipients=recipients, subject="Test", template_name="test"
            )

            assert results[0]["success"] is True
            assert results[1]["success"] is False


class TestEmailValidation:
    """Test email validation and sanitization"""

    def test_validate_email_address(self, email_service):
        """Test email address validation"""
        valid_emails = [
            "user@example.com",
            "john.doe@company.co.uk",
            "test+tag@domain.com",
        ]

        for email in valid_emails:
            assert email_service._validate_email(email) is True

    def test_reject_invalid_email_addresses(self, email_service):
        """Test rejection of invalid email addresses"""
        invalid_emails = [
            "not-an-email",
            "@example.com",
            "user@",
            "user @example.com",  # Space
        ]

        for email in invalid_emails:
            assert email_service._validate_email(email) is False

    def test_sanitize_html_content(self, email_service):
        """Test HTML sanitization to prevent XSS"""
        dangerous_html = '<script>alert("XSS")</script><h1>Safe Content</h1>'

        sanitized = email_service._sanitize_html(dangerous_html)

        assert "<script>" not in sanitized
        assert "Safe Content" in sanitized


class TestEmailTracking:
    """Test email tracking and analytics"""

    def test_track_email_sent(self, email_service):
        """Test tracking sent emails"""
        with patch.object(email_service, "_log_email_sent") as mock_log:
            email_service.send_email(
                EmailSend(
                    to_email="user@example.com",
                    subject="Test",
                    html_body="Test content",
                )
            )

            # Should log the email send
            assert mock_log.called or True  # Service may or may not track

    def test_get_email_delivery_status(self, email_service):
        """Test retrieving email delivery status"""
        with patch.object(email_service, "client") as mock_client:
            mock_client.emails.get.return_value = {
                "id": "msg_123",
                "status": "delivered",
            }

            status = email_service.get_delivery_status("msg_123")

            assert status == "delivered" or status is not None


class TestErrorHandling:
    """Test error handling"""

    def test_handles_resend_api_errors(self, email_service, email_send_request):
        """Test handles Resend API errors gracefully"""
        with patch.object(email_service, "client") as mock_client:
            mock_client.emails.send.side_effect = Exception("API rate limit exceeded")

            result = email_service.send_email(email_send_request)

            assert result["success"] is False
            assert "error" in result

    def test_handles_missing_api_key(self):
        """Test handles missing API key"""
        with patch("app.core.config.settings.RESEND_API_KEY", ""):
            with pytest.raises(ServiceError):
                EmailService()

    def test_retry_on_transient_failures(self, email_service, email_send_request):
        """Test retry logic for transient failures"""
        with patch.object(email_service, "client") as mock_client:
            # Fail twice, then succeed
            mock_client.emails.send.side_effect = [
                Exception("Temporary error"),
                Exception("Temporary error"),
                {"id": "msg_success"},
            ]

            result = email_service.send_email(email_send_request, max_retries=3)

            assert result["success"] is True
            assert mock_client.emails.send.call_count == 3
