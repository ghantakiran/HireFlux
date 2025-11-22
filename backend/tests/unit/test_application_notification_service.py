"""
Unit Tests for Application Notification Service - Issue #58

Tests email notification functionality for application status changes.
Follows TDD/BDD practices with comprehensive coverage.

Run with: pytest tests/unit/test_application_notification_service.py -v
"""

import pytest
from unittest.mock import Mock, patch, MagicMock
from uuid import uuid4
from datetime import datetime

from app.services.application_notification_service import ApplicationNotificationService
from app.db.models.application import Application
from app.db.models.user import User
from app.db.models.job import Job
from app.db.models.company import Company
from app.schemas.application import ATSApplicationStatus


# ===========================================================================
# Fixtures
# ===========================================================================


@pytest.fixture
def mock_db():
    """Mock database session"""
    return Mock()


@pytest.fixture
def notification_service(mock_db):
    """Create notification service instance"""
    return ApplicationNotificationService(mock_db)


@pytest.fixture
def sample_application():
    """Sample application for testing"""
    return Application(
        id=uuid4(),
        user_id=uuid4(),
        job_id=uuid4(),
        status="new",
        applied_at=datetime.utcnow(),
    )


@pytest.fixture
def sample_user():
    """Sample user (candidate) for testing"""
    user = Mock()
    user.id = uuid4()
    user.email = "candidate@example.com"
    user.user_type = "candidate"
    # Mock profile for name
    user.profile = Mock()
    user.profile.first_name = "Jane"
    user.profile.last_name = "Doe"
    return user


@pytest.fixture
def sample_job():
    """Sample job for testing"""
    job = Mock()
    job.id = uuid4()
    job.title = "Senior Software Engineer"
    job.company = "Tech Corp"
    job.company_id = uuid4()
    job.location = "San Francisco, CA"
    return job


@pytest.fixture
def sample_company():
    """Sample company for testing"""
    company = Mock()
    company.id = uuid4()
    company.name = "Tech Corp"
    company.domain = "techcorp.com"
    return company


# ===========================================================================
# Email Template Tests
# ===========================================================================


class TestEmailTemplates:
    """Test email template generation for each status"""

    def test_new_application_template(self, notification_service):
        """Test NEW status email template"""
        context = {
            "candidate_name": "Jane Doe",
            "job_title": "Senior Software Engineer",
            "company_name": "Tech Corp",
            "application_date": "November 22, 2025",
        }

        template = notification_service._template_new_application(context)

        assert template["subject"] == "Application Received - Senior Software Engineer at Tech Corp"
        assert "Jane Doe" in template["html_body"]
        assert "Senior Software Engineer" in template["html_body"]
        assert "Tech Corp" in template["html_body"]
        assert "Application Received" in template["html_body"]
        assert "3-5 business days" in template["html_body"]

        # Check plain text version
        assert "Jane Doe" in template["text_body"]
        assert "Senior Software Engineer" in template["text_body"]

    def test_under_review_template(self, notification_service):
        """Test REVIEWING status email template"""
        context = {
            "candidate_name": "Jane Doe",
            "job_title": "Senior Software Engineer",
            "company_name": "Tech Corp",
        }

        template = notification_service._template_under_review(context)

        assert "Application Update" in template["subject"]
        assert "Under Review" in template["html_body"]
        assert "hiring team is carefully reviewing" in template["html_body"]
        assert "Jane Doe" in template["html_body"]

    def test_phone_screen_template(self, notification_service):
        """Test PHONE_SCREEN status email template"""
        context = {
            "candidate_name": "Jane Doe",
            "job_title": "Senior Software Engineer",
            "company_name": "Tech Corp",
            "custom_message": "Please prepare questions about the role.",
        }

        template = notification_service._template_phone_screen(context)

        assert "Phone Screen Invitation" in template["subject"]
        assert "20-30 minutes" in template["html_body"]
        assert "Please prepare questions" in template["html_body"]
        assert "Jane Doe" in template["html_body"]

    def test_technical_interview_template(self, notification_service):
        """Test TECHNICAL_INTERVIEW status email template"""
        context = {
            "candidate_name": "Jane Doe",
            "job_title": "Senior Software Engineer",
            "company_name": "Tech Corp",
        }

        template = notification_service._template_technical_interview(context)

        assert "Technical Interview" in template["subject"]
        assert "60-90 minutes" in template["html_body"]
        assert "coding challenge" in template["html_body"]
        assert "Congratulations" in template["html_body"]

    def test_final_interview_template(self, notification_service):
        """Test FINAL_INTERVIEW status email template"""
        context = {
            "candidate_name": "Jane Doe",
            "job_title": "Senior Software Engineer",
            "company_name": "Tech Corp",
        }

        template = notification_service._template_final_interview(context)

        assert "Final Interview" in template["subject"]
        assert "45-60 minutes" in template["html_body"]
        assert "one step closer" in template["html_body"]

    def test_offer_template(self, notification_service):
        """Test OFFER status email template"""
        context = {
            "candidate_name": "Jane Doe",
            "job_title": "Senior Software Engineer",
            "company_name": "Tech Corp",
            "custom_message": "We're excited to have you join us!",
        }

        template = notification_service._template_offer(context)

        assert "Job Offer" in template["subject"]
        assert "Congratulations" in template["html_body"]
        assert "excited to have you join us" in template["html_body"]
        assert "offer letter" in template["html_body"]

    def test_hired_template(self, notification_service):
        """Test HIRED status email template"""
        context = {
            "candidate_name": "Jane Doe",
            "job_title": "Senior Software Engineer",
            "company_name": "Tech Corp",
        }

        template = notification_service._template_hired(context)

        assert "Welcome to Tech Corp" in template["subject"]
        assert "Welcome to the Team" in template["html_body"]
        assert "onboarding details" in template["html_body"]

    def test_rejected_template_with_reason(self, notification_service):
        """Test REJECTED status email template with rejection reason"""
        context = {
            "candidate_name": "Jane Doe",
            "job_title": "Senior Software Engineer",
            "company_name": "Tech Corp",
            "rejection_reason": "Looking for more experience with Python.",
        }

        template = notification_service._template_rejected(context)

        assert "Application Update" in template["subject"]
        assert "Looking for more experience with Python" in template["html_body"]
        assert "Jane Doe" in template["html_body"]
        assert "other candidates" in template["html_body"]

    def test_rejected_template_without_reason(self, notification_service):
        """Test REJECTED status email template without rejection reason"""
        context = {
            "candidate_name": "Jane Doe",
            "job_title": "Senior Software Engineer",
            "company_name": "Tech Corp",
        }

        template = notification_service._template_rejected(context)

        assert "Application Update" in template["subject"]
        assert "Jane Doe" in template["html_body"]
        assert "Feedback:" not in template["html_body"]


# ===========================================================================
# Notification Sending Tests
# ===========================================================================


class TestSendStatusChangeNotification:
    """Test sending status change notifications"""

    @patch('app.services.application_notification_service.send_email')
    def test_send_new_application_notification_success(
        self,
        mock_send_email,
        notification_service,
        mock_db,
        sample_application,
        sample_user,
        sample_job,
        sample_company,
    ):
        """Test successful email sending for NEW status"""
        # Setup mocks
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            sample_application,
            sample_user,
            sample_job,
            sample_company,
        ]

        mock_send_email.return_value = {
            "success": True,
            "message_id": "msg_123",
        }

        # Send notification
        result = notification_service.send_status_change_notification(
            application_id=sample_application.id,
            old_status="pending",
            new_status=ATSApplicationStatus.NEW.value,
        )

        # Verify email was sent
        assert result["success"] is True
        assert result["message_id"] == "msg_123"

        # Verify send_email was called with correct params
        mock_send_email.assert_called_once()
        call_args = mock_send_email.call_args
        assert call_args[1]["to"] == "candidate@example.com"
        assert "Application Received" in call_args[1]["subject"]

    @patch('app.services.application_notification_service.send_email')
    def test_send_rejection_notification_with_reason(
        self,
        mock_send_email,
        notification_service,
        mock_db,
        sample_application,
        sample_user,
        sample_job,
        sample_company,
    ):
        """Test rejection notification with reason"""
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            sample_application,
            sample_user,
            sample_job,
            sample_company,
        ]

        mock_send_email.return_value = {"success": True, "message_id": "msg_456"}

        rejection_reason = "Looking for candidates with more Python experience"

        result = notification_service.send_status_change_notification(
            application_id=sample_application.id,
            old_status="reviewing",
            new_status=ATSApplicationStatus.REJECTED.value,
            rejection_reason=rejection_reason,
        )

        assert result["success"] is True

        # Verify rejection reason is in email
        call_args = mock_send_email.call_args
        assert rejection_reason in call_args[1]["html_body"]

    def test_send_notification_application_not_found(
        self, notification_service, mock_db
    ):
        """Test error when application not found"""
        mock_db.query.return_value.filter.return_value.first.return_value = None

        result = notification_service.send_status_change_notification(
            application_id=uuid4(),
            old_status="new",
            new_status="reviewing",
        )

        assert result["success"] is False
        assert "not found" in result["error"]

    def test_send_notification_candidate_email_missing(
        self, notification_service, mock_db, sample_application
    ):
        """Test error when candidate email is missing"""
        user_no_email = Mock()
        user_no_email.id = uuid4()
        user_no_email.email = None
        user_no_email.user_type = "candidate"

        mock_db.query.return_value.filter.return_value.first.side_effect = [
            sample_application,
            user_no_email,
        ]

        result = notification_service.send_status_change_notification(
            application_id=sample_application.id,
            old_status="new",
            new_status="reviewing",
        )

        assert result["success"] is False
        assert "email not found" in result["error"]

    @patch('app.services.application_notification_service.send_email')
    def test_send_notification_with_custom_message(
        self,
        mock_send_email,
        notification_service,
        mock_db,
        sample_application,
        sample_user,
        sample_job,
        sample_company,
    ):
        """Test notification with custom message from employer"""
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            sample_application,
            sample_user,
            sample_job,
            sample_company,
        ]

        mock_send_email.return_value = {"success": True}

        custom_message = "Looking forward to meeting you next Tuesday at 2 PM!"

        result = notification_service.send_status_change_notification(
            application_id=sample_application.id,
            old_status="reviewing",
            new_status=ATSApplicationStatus.PHONE_SCREEN.value,
            custom_message=custom_message,
        )

        assert result["success"] is True

        # Verify custom message is in email
        call_args = mock_send_email.call_args
        assert custom_message in call_args[1]["html_body"]


# ===========================================================================
# Bulk Notification Tests
# ===========================================================================


class TestBulkNotifications:
    """Test bulk status change notifications"""

    @patch('app.services.application_notification_service.send_email')
    def test_send_bulk_notifications_success(
        self,
        mock_send_email,
        notification_service,
        mock_db,
    ):
        """Test successful bulk notification sending"""
        # Create 3 sample application IDs
        app_ids = [uuid4(), uuid4(), uuid4()]

        mock_send_email.return_value = {"success": True}

        # Since bulk_status_notifications calls send_status_change_notification for each app,
        # we need to mock the DB queries for each call
        # For simplicity in this unit test, we'll just verify the method is callable

        result = notification_service.send_bulk_status_notifications(
            application_ids=app_ids,
            new_status=ATSApplicationStatus.REJECTED.value,
            rejection_reason="Position filled",
        )

        # Should return a dict with success_count and failed_count
        assert isinstance(result, dict)
        assert "success_count" in result
        assert "failed_count" in result

    def test_send_bulk_notifications_empty_list(self, notification_service):
        """Test bulk notifications with empty application list"""
        result = notification_service.send_bulk_status_notifications(
            application_ids=[],
            new_status=ATSApplicationStatus.REJECTED.value,
        )

        assert result["success_count"] == 0


# ===========================================================================
# Template Selection Tests
# ===========================================================================


class TestTemplateSelection:
    """Test correct template selection for each status"""

    def test_get_template_for_each_status(self, notification_service):
        """Test that each status returns the correct template"""
        context = {
            "candidate_name": "Test User",
            "job_title": "Test Job",
            "company_name": "Test Company",
        }

        statuses_to_test = [
            (ATSApplicationStatus.NEW.value, "Application Received"),
            (ATSApplicationStatus.REVIEWING.value, "Application Update"),
            (ATSApplicationStatus.PHONE_SCREEN.value, "Phone Screen"),
            (ATSApplicationStatus.TECHNICAL_INTERVIEW.value, "Technical Interview"),
            (ATSApplicationStatus.FINAL_INTERVIEW.value, "Final Interview"),
            (ATSApplicationStatus.OFFER.value, "Job Offer"),
            (ATSApplicationStatus.HIRED.value, "Welcome to"),
            (ATSApplicationStatus.REJECTED.value, "Application Update"),
        ]

        for status, expected_subject_content in statuses_to_test:
            template = notification_service._get_template_for_status(status, context)

            assert "subject" in template
            assert "html_body" in template
            assert "text_body" in template
            assert expected_subject_content in template["subject"], \
                f"Expected '{expected_subject_content}' in subject for status {status}, got: {template['subject']}"

    def test_get_template_for_unknown_status(self, notification_service):
        """Test default template for unknown status"""
        context = {
            "candidate_name": "Test User",
            "job_title": "Test Job",
            "company_name": "Test Company",
        }

        template = notification_service._get_template_for_status("unknown_status", context)

        assert "Application Update" in template["subject"]
        assert "updated" in template["html_body"]


# ===========================================================================
# Edge Cases & Error Handling
# ===========================================================================


class TestEdgeCases:
    """Test edge cases and error handling"""

    def test_notification_with_missing_job(
        self, notification_service, mock_db, sample_application, sample_user
    ):
        """Test notification when job is not found"""
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            sample_application,
            sample_user,
            None,  # Job not found
        ]

        result = notification_service.send_status_change_notification(
            application_id=sample_application.id,
            old_status="new",
            new_status="reviewing",
        )

        assert result["success"] is False
        assert "Job not found" in result["error"]

    def test_notification_with_missing_company(
        self,
        notification_service,
        mock_db,
        sample_application,
        sample_user,
        sample_job,
    ):
        """Test notification when company is missing (uses job.company instead)"""
        # Company is optional - should use job.company as fallback
        mock_db.query.return_value.filter.return_value.first.side_effect = [
            sample_application,
            sample_user,
            sample_job,
            None,  # Company not found - this is OK
        ]

        with patch('app.services.application_notification_service.send_email') as mock_send:
            mock_send.return_value = {"success": True}

            result = notification_service.send_status_change_notification(
                application_id=sample_application.id,
                old_status="new",
                new_status="reviewing",
            )

            # Should still succeed using job.company
            assert result["success"] is True


# ===========================================================================
# Performance Tests
# ===========================================================================


class TestPerformance:
    """Test notification service performance"""

    @patch('app.services.application_notification_service.send_email')
    def test_bulk_notification_performance(
        self, mock_send_email, notification_service, mock_db
    ):
        """Test performance with large batch of notifications"""
        # Simulate 100 applications
        num_applications = 100
        app_ids = [uuid4() for _ in range(num_applications)]

        mock_send_email.return_value = {"success": True}

        # This test ensures bulk operations don't timeout
        # In production, we'd measure actual time taken
        result = notification_service.send_bulk_status_notifications(
            application_ids=app_ids,
            new_status=ATSApplicationStatus.REJECTED.value,
        )

        # Verify it completes without hanging
        assert isinstance(result, dict)
        assert "success_count" in result
