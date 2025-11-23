"""
Application Status Notification Service - Issue #58

Handles automated email notifications when application status changes.
Supports 8-stage pipeline with customizable templates per company.
"""

from typing import Optional, Dict, List
from uuid import UUID
from datetime import datetime
from sqlalchemy.orm import Session

from app.db.models.application import Application
from app.db.models.user import User
from app.db.models.job import Job
from app.db.models.company import Company
from app.core.email import send_email
from app.schemas.application import ATSApplicationStatus


class ApplicationNotificationService:
    """
    Service for sending automated email notifications on application status changes.

    Features:
    - 8-stage pipeline email templates
    - Customizable per-company templates (future enhancement)
    - Email delivery tracking
    - Rejection reason support
    - Next steps messaging
    """

    def __init__(self, db: Session):
        self.db = db

    # =========================================================================
    # Public Methods
    # =========================================================================

    def send_status_change_notification(
        self,
        application_id: UUID,
        old_status: str,
        new_status: str,
        rejection_reason: Optional[str] = None,
        custom_message: Optional[str] = None,
    ) -> Dict:
        """
        Send email notification to candidate when application status changes.

        Args:
            application_id: Application UUID
            old_status: Previous status
            new_status: New status
            rejection_reason: Reason for rejection (if status = rejected)
            custom_message: Optional custom message from employer

        Returns:
            Dict with success, message_id, error
        """
        # Get application with related data
        application = (
            self.db.query(Application)
            .filter(Application.id == application_id)
            .first()
        )

        if not application:
            return {
                "success": False,
                "error": f"Application {application_id} not found",
            }

        # Get candidate (user)
        candidate = self.db.query(User).filter(User.id == application.user_id).first()

        if not candidate or not candidate.email:
            return {
                "success": False,
                "error": "Candidate email not found",
            }

        # Get job details
        job = self.db.query(Job).filter(Job.id == application.job_id).first()

        if not job:
            return {
                "success": False,
                "error": "Job not found",
            }

        # Get company details
        company = None
        if job.company_id:
            company = (
                self.db.query(Company).filter(Company.id == job.company_id).first()
            )

        # Get candidate name (from profile if available)
        candidate_name = candidate.email  # Fallback to email
        if hasattr(candidate, 'profile') and candidate.profile:
            if hasattr(candidate.profile, 'first_name') and candidate.profile.first_name:
                candidate_name = f"{candidate.profile.first_name} {candidate.profile.last_name or ''}".strip()

        # Build email context
        context = {
            "candidate_name": candidate_name,
            "job_title": job.title,
            "company_name": company.name if company else job.company,
            "old_status": old_status,
            "new_status": new_status,
            "rejection_reason": rejection_reason,
            "custom_message": custom_message,
            "application_date": application.applied_at.strftime("%B %d, %Y")
            if application.applied_at
            else "Recently",
        }

        # Get email template for status
        template = self._get_template_for_status(new_status, context)

        # Send email
        result = send_email(
            to=candidate.email,
            subject=template["subject"],
            html_body=template["html_body"],
            text_body=template["text_body"],
        )

        # TODO: Track email delivery in database (Issue #58 - Email Delivery Tracking)
        # self._track_email_delivery(application_id, new_status, result)

        return result

    def send_bulk_status_notifications(
        self,
        application_ids: List[UUID],
        new_status: str,
        rejection_reason: Optional[str] = None,
        custom_message: Optional[str] = None,
    ) -> Dict:
        """
        Send status change notifications to multiple candidates.

        Args:
            application_ids: List of application UUIDs
            new_status: New status for all applications
            rejection_reason: Reason for rejection (if status = rejected)
            custom_message: Optional custom message from employer

        Returns:
            Dict with success count, failed count, and errors
        """
        success_count = 0
        failed_count = 0
        errors = []

        for app_id in application_ids:
            # Get current status before change
            app = self.db.query(Application).filter(Application.id == app_id).first()
            if not app:
                failed_count += 1
                errors.append(f"Application {app_id} not found")
                continue

            old_status = app.status

            # Send notification
            result = self.send_status_change_notification(
                application_id=app_id,
                old_status=old_status,
                new_status=new_status,
                rejection_reason=rejection_reason,
                custom_message=custom_message,
            )

            if result.get("success"):
                success_count += 1
            else:
                failed_count += 1
                errors.append(
                    f"Application {app_id}: {result.get('error', 'Unknown error')}"
                )

        return {
            "success": failed_count == 0,
            "success_count": success_count,
            "failed_count": failed_count,
            "errors": errors if errors else None,
        }

    def preview_status_change_email(
        self,
        application_id: UUID,
        new_status: str,
        rejection_reason: Optional[str] = None,
        custom_message: Optional[str] = None,
    ) -> Dict:
        """
        Preview email that will be sent on status change (Issue #58).

        Args:
            application_id: Application UUID
            new_status: New status to preview
            rejection_reason: Reason for rejection (if status = rejected)
            custom_message: Optional custom message from employer

        Returns:
            Dict with subject, html_body, text_body
        """
        # Get application with related data
        application = (
            self.db.query(Application)
            .filter(Application.id == application_id)
            .first()
        )

        if not application:
            raise Exception(f"Application {application_id} not found")

        # Get candidate (user)
        candidate = self.db.query(User).filter(User.id == application.user_id).first()

        if not candidate:
            raise Exception("Candidate not found")

        # Get job details
        job = self.db.query(Job).filter(Job.id == application.job_id).first()

        if not job:
            raise Exception("Job not found")

        # Get company details
        company = None
        if job.company_id:
            company = (
                self.db.query(Company).filter(Company.id == job.company_id).first()
            )

        # Get candidate name (from profile if available)
        candidate_name = candidate.email  # Fallback to email
        if hasattr(candidate, 'profile') and candidate.profile:
            if hasattr(candidate.profile, 'first_name') and candidate.profile.first_name:
                candidate_name = f"{candidate.profile.first_name} {candidate.profile.last_name or ''}".strip()

        # Build email context
        context = {
            "candidate_name": candidate_name,
            "job_title": job.title,
            "company_name": company.name if company else job.company,
            "old_status": application.status,
            "new_status": new_status,
            "rejection_reason": rejection_reason,
            "custom_message": custom_message,
            "application_date": application.applied_at.strftime("%B %d, %Y")
            if application.applied_at
            else "Recently",
        }

        # Get email template for status
        template = self._get_template_for_status(new_status, context)

        return {
            "subject": template["subject"],
            "html_body": template["html_body"],
            "text_body": template["text_body"],
            "preview": True,
        }

    # =========================================================================
    # Email Templates
    # =========================================================================

    def _get_template_for_status(
        self, status: str, context: Dict
    ) -> Dict[str, str]:
        """
        Get email template for given status.

        Args:
            status: Application status (new, reviewing, phone_screen, etc.)
            context: Template context (candidate_name, job_title, etc.)

        Returns:
            Dict with subject, html_body, text_body
        """
        templates = {
            ATSApplicationStatus.NEW.value: self._template_new_application,
            ATSApplicationStatus.REVIEWING.value: self._template_under_review,
            ATSApplicationStatus.PHONE_SCREEN.value: self._template_phone_screen,
            ATSApplicationStatus.TECHNICAL_INTERVIEW.value: self._template_technical_interview,
            ATSApplicationStatus.FINAL_INTERVIEW.value: self._template_final_interview,
            ATSApplicationStatus.OFFER.value: self._template_offer,
            ATSApplicationStatus.HIRED.value: self._template_hired,
            ATSApplicationStatus.REJECTED.value: self._template_rejected,
        }

        template_func = templates.get(status, self._template_default)
        return template_func(context)

    def _template_new_application(self, ctx: Dict) -> Dict:
        """Template for NEW status"""
        subject = f"Application Received - {ctx['job_title']} at {ctx['company_name']}"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Application Received ✓</h2>

            <p>Hi {ctx['candidate_name']},</p>

            <p>Thank you for applying to the <strong>{ctx['job_title']}</strong> position at <strong>{ctx['company_name']}</strong>.</p>

            <p>We have received your application and our team will review it shortly.</p>

            <h3>Next Steps:</h3>
            <ul>
                <li>Our hiring team will review your application within 3-5 business days</li>
                <li>If your experience matches our requirements, we'll reach out to schedule a call</li>
                <li>You can check your application status anytime in your dashboard</li>
            </ul>

            <p>Best regards,<br>{ctx['company_name']} Hiring Team</p>

            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                This is an automated message from HireFlux. Please do not reply to this email.
            </p>
        </body>
        </html>
        """

        text_body = f"""
        Application Received

        Hi {ctx['candidate_name']},

        Thank you for applying to the {ctx['job_title']} position at {ctx['company_name']}.

        We have received your application and our team will review it shortly.

        Next Steps:
        - Our hiring team will review your application within 3-5 business days
        - If your experience matches our requirements, we'll reach out to schedule a call
        - You can check your application status anytime in your dashboard

        Best regards,
        {ctx['company_name']} Hiring Team
        """

        return {"subject": subject, "html_body": html_body, "text_body": text_body}

    def _template_under_review(self, ctx: Dict) -> Dict:
        """Template for REVIEWING status"""
        subject = f"Application Update - {ctx['job_title']} at {ctx['company_name']}"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2563eb;">Application Under Review 📋</h2>

            <p>Hi {ctx['candidate_name']},</p>

            <p>Good news! Your application for <strong>{ctx['job_title']}</strong> at <strong>{ctx['company_name']}</strong> is now under review by our hiring team.</p>

            <h3>What This Means:</h3>
            <ul>
                <li>Your application stood out from our initial screening</li>
                <li>Our hiring team is carefully reviewing your experience and qualifications</li>
                <li>We'll be in touch soon with next steps</li>
            </ul>

            <p>Thank you for your patience!</p>

            <p>Best regards,<br>{ctx['company_name']} Hiring Team</p>

            <hr style="margin-top: 30px; border: none; border-top: 1px solid #ddd;">
            <p style="font-size: 12px; color: #666;">
                This is an automated message from HireFlux.
            </p>
        </body>
        </html>
        """

        text_body = f"""
        Application Under Review

        Hi {ctx['candidate_name']},

        Good news! Your application for {ctx['job_title']} at {ctx['company_name']} is now under review by our hiring team.

        What This Means:
        - Your application stood out from our initial screening
        - Our hiring team is carefully reviewing your experience and qualifications
        - We'll be in touch soon with next steps

        Thank you for your patience!

        Best regards,
        {ctx['company_name']} Hiring Team
        """

        return {"subject": subject, "html_body": html_body, "text_body": text_body}

    def _template_phone_screen(self, ctx: Dict) -> Dict:
        """Template for PHONE_SCREEN status"""
        subject = f"Phone Screen Invitation - {ctx['job_title']} at {ctx['company_name']}"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Phone Screen Invitation 📞</h2>

            <p>Hi {ctx['candidate_name']},</p>

            <p>Great news! We'd like to schedule a phone screen to discuss the <strong>{ctx['job_title']}</strong> opportunity at <strong>{ctx['company_name']}</strong>.</p>

            <h3>What to Expect:</h3>
            <ul>
                <li><strong>Duration:</strong> 20-30 minutes</li>
                <li><strong>Format:</strong> Phone or video call</li>
                <li><strong>Topics:</strong> Your background, the role, and team fit</li>
            </ul>

            {f'<p><strong>Message from the team:</strong><br>{ctx["custom_message"]}</p>' if ctx.get("custom_message") else ''}

            <p>A member of our team will reach out shortly to schedule a time that works for you.</p>

            <p>Looking forward to speaking with you!</p>

            <p>Best regards,<br>{ctx['company_name']} Hiring Team</p>
        </body>
        </html>
        """

        text_body = f"""
        Phone Screen Invitation

        Hi {ctx['candidate_name']},

        Great news! We'd like to schedule a phone screen to discuss the {ctx['job_title']} opportunity at {ctx['company_name']}.

        What to Expect:
        - Duration: 20-30 minutes
        - Format: Phone or video call
        - Topics: Your background, the role, and team fit

        {f'Message from the team: {ctx["custom_message"]}' if ctx.get("custom_message") else ''}

        A member of our team will reach out shortly to schedule a time that works for you.

        Looking forward to speaking with you!

        Best regards,
        {ctx['company_name']} Hiring Team
        """

        return {"subject": subject, "html_body": html_body, "text_body": text_body}

    def _template_technical_interview(self, ctx: Dict) -> Dict:
        """Template for TECHNICAL_INTERVIEW status"""
        subject = f"Technical Interview - {ctx['job_title']} at {ctx['company_name']}"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Technical Interview Invitation 💻</h2>

            <p>Hi {ctx['candidate_name']},</p>

            <p>Congratulations! You've been selected to move forward to the technical interview stage for <strong>{ctx['job_title']}</strong> at <strong>{ctx['company_name']}</strong>.</p>

            <h3>Interview Details:</h3>
            <ul>
                <li><strong>Duration:</strong> 60-90 minutes</li>
                <li><strong>Format:</strong> Technical discussion, coding challenge, or system design</li>
                <li><strong>Preparation:</strong> Review core concepts related to the role</li>
            </ul>

            {f'<p><strong>Additional details:</strong><br>{ctx["custom_message"]}</p>' if ctx.get("custom_message") else ''}

            <p>Our team will send you a calendar invite with the interview details and preparation materials.</p>

            <p>Best of luck!</p>

            <p>Best regards,<br>{ctx['company_name']} Hiring Team</p>
        </body>
        </html>
        """

        text_body = f"""
        Technical Interview Invitation

        Hi {ctx['candidate_name']},

        Congratulations! You've been selected to move forward to the technical interview stage for {ctx['job_title']} at {ctx['company_name']}.

        Interview Details:
        - Duration: 60-90 minutes
        - Format: Technical discussion, coding challenge, or system design
        - Preparation: Review core concepts related to the role

        {f'Additional details: {ctx["custom_message"]}' if ctx.get("custom_message") else ''}

        Our team will send you a calendar invite with the interview details and preparation materials.

        Best of luck!

        Best regards,
        {ctx['company_name']} Hiring Team
        """

        return {"subject": subject, "html_body": html_body, "text_body": text_body}

    def _template_final_interview(self, ctx: Dict) -> Dict:
        """Template for FINAL_INTERVIEW status"""
        subject = f"Final Interview - {ctx['job_title']} at {ctx['company_name']}"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Final Interview Invitation 🎯</h2>

            <p>Hi {ctx['candidate_name']},</p>

            <p>Excellent news! You've advanced to the final interview stage for <strong>{ctx['job_title']}</strong> at <strong>{ctx['company_name']}</strong>.</p>

            <p>You're one step closer to joining our team!</p>

            <h3>What to Expect:</h3>
            <ul>
                <li><strong>Duration:</strong> 45-60 minutes</li>
                <li><strong>Format:</strong> Meet the team, cultural fit, and final questions</li>
                <li><strong>Attendees:</strong> Hiring manager and team members</li>
            </ul>

            {f'<p><strong>Important notes:</strong><br>{ctx["custom_message"]}</p>' if ctx.get("custom_message") else ''}

            <p>We'll send you the interview schedule shortly. This is a great opportunity to ask any final questions about the role and team.</p>

            <p>Best regards,<br>{ctx['company_name']} Hiring Team</p>
        </body>
        </html>
        """

        text_body = f"""
        Final Interview Invitation

        Hi {ctx['candidate_name']},

        Excellent news! You've advanced to the final interview stage for {ctx['job_title']} at {ctx['company_name']}.

        You're one step closer to joining our team!

        What to Expect:
        - Duration: 45-60 minutes
        - Format: Meet the team, cultural fit, and final questions
        - Attendees: Hiring manager and team members

        {f'Important notes: {ctx["custom_message"]}' if ctx.get("custom_message") else ''}

        We'll send you the interview schedule shortly.

        Best regards,
        {ctx['company_name']} Hiring Team
        """

        return {"subject": subject, "html_body": html_body, "text_body": text_body}

    def _template_offer(self, ctx: Dict) -> Dict:
        """Template for OFFER status"""
        subject = f"Job Offer - {ctx['job_title']} at {ctx['company_name']}"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Congratulations! Job Offer 🎉</h2>

            <p>Hi {ctx['candidate_name']},</p>

            <p><strong>Congratulations!</strong> We're thrilled to extend you an offer for the <strong>{ctx['job_title']}</strong> position at <strong>{ctx['company_name']}</strong>.</p>

            <h3>Next Steps:</h3>
            <ul>
                <li>Review the formal offer letter attached to this email</li>
                <li>A member of our team will reach out to discuss details</li>
                <li>Feel free to ask any questions about the offer</li>
            </ul>

            {f'<p><strong>Message from the team:</strong><br>{ctx["custom_message"]}</p>' if ctx.get("custom_message") else ''}

            <p>We're excited about the possibility of you joining our team!</p>

            <p>Best regards,<br>{ctx['company_name']} Hiring Team</p>
        </body>
        </html>
        """

        text_body = f"""
        Congratulations! Job Offer

        Hi {ctx['candidate_name']},

        Congratulations! We're thrilled to extend you an offer for the {ctx['job_title']} position at {ctx['company_name']}.

        Next Steps:
        - Review the formal offer letter attached to this email
        - A member of our team will reach out to discuss details
        - Feel free to ask any questions about the offer

        {f'Message from the team: {ctx["custom_message"]}' if ctx.get("custom_message") else ''}

        We're excited about the possibility of you joining our team!

        Best regards,
        {ctx['company_name']} Hiring Team
        """

        return {"subject": subject, "html_body": html_body, "text_body": text_body}

    def _template_hired(self, ctx: Dict) -> Dict:
        """Template for HIRED status"""
        subject = f"Welcome to {ctx['company_name']}!"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #16a34a;">Welcome to the Team! 🎊</h2>

            <p>Hi {ctx['candidate_name']},</p>

            <p>Welcome to <strong>{ctx['company_name']}</strong>! We're excited to have you join us as a <strong>{ctx['job_title']}</strong>.</p>

            <h3>What's Next:</h3>
            <ul>
                <li>Our HR team will reach out with onboarding details</li>
                <li>You'll receive information about your start date and first week</li>
                <li>We'll send you access to company systems and resources</li>
            </ul>

            {f'<p><strong>Welcome message:</strong><br>{ctx["custom_message"]}</p>' if ctx.get("custom_message") else ''}

            <p>We're looking forward to working with you!</p>

            <p>Best regards,<br>{ctx['company_name']} Team</p>
        </body>
        </html>
        """

        text_body = f"""
        Welcome to the Team!

        Hi {ctx['candidate_name']},

        Welcome to {ctx['company_name']}! We're excited to have you join us as a {ctx['job_title']}.

        What's Next:
        - Our HR team will reach out with onboarding details
        - You'll receive information about your start date and first week
        - We'll send you access to company systems and resources

        {f'Welcome message: {ctx["custom_message"]}' if ctx.get("custom_message") else ''}

        We're looking forward to working with you!

        Best regards,
        {ctx['company_name']} Team
        """

        return {"subject": subject, "html_body": html_body, "text_body": text_body}

    def _template_rejected(self, ctx: Dict) -> Dict:
        """Template for REJECTED status"""
        subject = f"Application Update - {ctx['job_title']} at {ctx['company_name']}"

        rejection_reason_text = ""
        if ctx.get("rejection_reason"):
            rejection_reason_text = f"<p><strong>Feedback:</strong> {ctx['rejection_reason']}</p>"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6b7280;">Application Status Update</h2>

            <p>Hi {ctx['candidate_name']},</p>

            <p>Thank you for your interest in the <strong>{ctx['job_title']}</strong> position at <strong>{ctx['company_name']}</strong>.</p>

            <p>After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.</p>

            {rejection_reason_text}

            {f'<p>{ctx["custom_message"]}</p>' if ctx.get("custom_message") else ''}

            <p>We appreciate the time you invested in the application process. Your resume will remain in our system, and we encourage you to apply for other positions that match your skills and experience.</p>

            <p>We wish you all the best in your job search.</p>

            <p>Best regards,<br>{ctx['company_name']} Hiring Team</p>
        </body>
        </html>
        """

        rejection_reason_plain = f"\nFeedback: {ctx['rejection_reason']}\n" if ctx.get("rejection_reason") else ""

        text_body = f"""
        Application Status Update

        Hi {ctx['candidate_name']},

        Thank you for your interest in the {ctx['job_title']} position at {ctx['company_name']}.

        After careful consideration, we have decided to move forward with other candidates whose experience more closely matches our current needs.
        {rejection_reason_plain}
        {f'{ctx["custom_message"]}' if ctx.get("custom_message") else ''}

        We appreciate the time you invested in the application process. Your resume will remain in our system, and we encourage you to apply for other positions that match your skills and experience.

        We wish you all the best in your job search.

        Best regards,
        {ctx['company_name']} Hiring Team
        """

        return {"subject": subject, "html_body": html_body, "text_body": text_body}

    def _template_default(self, ctx: Dict) -> Dict:
        """Default template for unknown status"""
        subject = f"Application Update - {ctx['job_title']} at {ctx['company_name']}"

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Application Status Update</h2>

            <p>Hi {ctx['candidate_name']},</p>

            <p>Your application for <strong>{ctx['job_title']}</strong> at <strong>{ctx['company_name']}</strong> has been updated.</p>

            <p>Please check your dashboard for the latest status.</p>

            <p>Best regards,<br>{ctx['company_name']} Hiring Team</p>
        </body>
        </html>
        """

        text_body = f"""
        Application Status Update

        Hi {ctx['candidate_name']},

        Your application for {ctx['job_title']} at {ctx['company_name']} has been updated.

        Please check your dashboard for the latest status.

        Best regards,
        {ctx['company_name']} Hiring Team
        """

        return {"subject": subject, "html_body": html_body, "text_body": text_body}
