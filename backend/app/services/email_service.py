"""
Email Service - Issue #52
Handles sending emails via Resend with template support and delivery tracking
"""

import re
from typing import Dict, Any, List, Optional
from datetime import datetime
import resend
from jinja2 import Template
from sqlalchemy.orm import Session

from app.schemas.notification import EmailSend
from app.core.config import settings
from app.core.exceptions import ServiceError
from app.db.models.email_delivery import EmailDeliveryLog
from app.core.logging import logger


class EmailService:
    """Service for sending emails via Resend with delivery tracking"""

    def __init__(self, db: Optional[Session] = None):
        if not settings.RESEND_API_KEY:
            raise ServiceError("RESEND_API_KEY is not configured")

        resend.api_key = settings.RESEND_API_KEY
        self.client = resend
        self.from_email = settings.FROM_EMAIL
        self.from_name = settings.FROM_NAME
        self.db = db  # Database session for delivery tracking

    def send_email(self, request: EmailSend, max_retries: int = 1) -> Dict[str, Any]:
        """Send an email"""
        try:
            # Validate email address
            if not self._validate_email(request.to_email):
                return {
                    "success": False,
                    "message_id": None,
                    "error": "Invalid email address",
                }

            # Render template if specified
            html_body = request.html_body
            if request.template_name and request.template_variables:
                html_body = self._render_template(
                    request.template_name, request.template_variables
                )

            # Sanitize HTML
            html_body = self._sanitize_html(html_body)

            # Send email with retry logic
            for attempt in range(max_retries):
                try:
                    response = self.client.emails.send(
                        {
                            "from": f"{self.from_name} <{self.from_email}>",
                            "to": [request.to_email],
                            "subject": request.subject,
                            "html": html_body,
                            "text": request.text_body,
                        }
                    )

                    # Log email sent with delivery tracking
                    self._log_email_sent(
                        to_email=request.to_email,
                        subject=request.subject,
                        message_id=response.get("id"),
                        email_type=request.email_type,
                        user_id=request.user_id,
                    )

                    return {
                        "success": True,
                        "message_id": response.get("id"),
                        "error": None,
                    }

                except Exception as e:
                    if attempt == max_retries - 1:  # Last attempt
                        raise
                    continue

        except Exception as e:
            return {
                "success": False,
                "message_id": None,
                "error": str(e),
            }

    def send_job_match_email(
        self, to_email: str, user_name: str, job_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send job match notification email"""
        subject = f"🎯 New High-Fit Job: {job_data['job_title']} at {job_data['company_name']}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }}
                .job-card {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }}
                .fit-score {{ font-size: 24px; font-weight: bold; color: #10b981; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
                .footer {{ text-align: center; color: #6b7280; font-size: 12px; margin-top: 30px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎯 New High-Fit Job Match!</h1>
                </div>
                <div class="content">
                    <p>Hi {user_name},</p>
                    <p>Great news! We found a job that's a perfect match for your profile:</p>

                    <div class="job-card">
                        <h2>{job_data['job_title']}</h2>
                        <h3>{job_data['company_name']}</h3>
                        <p class="fit-score">Fit Score: {job_data['fit_score']}% Match</p>
                        <p><strong>Why this matches:</strong> This role aligns with your skills, experience level, and career preferences.</p>
                    </div>

                    <a href="{settings.CORS_ORIGINS[0]}{job_data['job_url']}" class="button">View Job Details</a>

                    <p>Don't miss this opportunity! High-fit jobs like this don't stay open long.</p>
                </div>
                <div class="footer">
                    <p>You're receiving this because you have job match notifications enabled.</p>
                    <p><a href="{settings.CORS_ORIGINS[0]}/dashboard/settings">Update preferences</a> | <a href="{settings.CORS_ORIGINS[0]}/dashboard/notifications">View all notifications</a></p>
                </div>
            </div>
        </body>
        </html>
        """

        return self.send_email(
            EmailSend(
                to_email=to_email,
                subject=subject,
                html_body=html_body,
                text_body=f"New job match: {job_data['job_title']} at {job_data['company_name']} - {job_data['fit_score']}% fit",
                email_type="job_match",
                user_id=job_data.get("user_id"),
            )
        )

    def send_application_status_email(
        self, to_email: str, user_name: str, application_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send application status update email"""
        status_messages = {
            "applied": "✅ Application Submitted",
            "interview": "🎙️ Interview Scheduled",
            "offer": "🎉 Offer Received",
            "rejected": "❌ Application Update",
        }

        status = application_data["status"]
        subject = f"{status_messages.get(status, '📧 Application Update')} - {application_data['job_title']}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #1f2937; color: white; padding: 30px; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; }}
                .status-badge {{ display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #3b82f6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>{status_messages.get(status, 'Application Update')}</h1>
                </div>
                <div class="content">
                    <p>Hi {user_name},</p>
                    <p>Your application status has been updated:</p>

                    <h2>{application_data['job_title']}</h2>
                    <h3>{application_data['company_name']}</h3>
                    <span class="status-badge" style="background: #10b981; color: white;">Status: {status.upper()}</span>

                    <a href="{settings.CORS_ORIGINS[0]}{application_data['application_url']}" class="button">View Application</a>
                </div>
            </div>
        </body>
        </html>
        """

        return self.send_email(
            EmailSend(
                to_email=to_email,
                subject=subject,
                html_body=html_body,
                text_body=f"Application update: {application_data['job_title']} - Status: {status}",
                email_type="application_status",
                user_id=application_data.get("user_id"),
            )
        )

    def send_credit_alert_email(
        self, to_email: str, user_name: str, credit_balance: int, threshold: int, user_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send credit balance alert email"""
        subject = f"⚠️ Credit Balance Low - {credit_balance} credits remaining"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #f59e0b; color: white; padding: 30px; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; }}
                .credit-display {{ font-size: 48px; font-weight: bold; color: #dc2626; text-align: center; margin: 20px 0; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>⚠️ Credit Balance Low</h1>
                </div>
                <div class="content">
                    <p>Hi {user_name},</p>
                    <p>Your auto-apply credit balance is running low:</p>

                    <div class="credit-display">{credit_balance}</div>
                    <p style="text-align: center; color: #6b7280;">credits remaining</p>

                    <p>To continue using auto-apply, consider upgrading your plan or purchasing additional credits.</p>

                    <div style="text-align: center;">
                        <a href="{settings.CORS_ORIGINS[0]}/dashboard/settings" class="button">Manage Credits</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        return self.send_email(
            EmailSend(
                to_email=to_email,
                subject=subject,
                html_body=html_body,
                text_body=f"Credit alert: {credit_balance} credits remaining (threshold: {threshold})",
                email_type="credit_low",
                user_id=user_id,
            )
        )

    def send_interview_reminder_email(
        self, to_email: str, user_name: str, interview_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send interview reminder email"""
        subject = f"🎙️ Interview Reminder - {interview_data['role']} at {interview_data['company_name']}"

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: #8b5cf6; color: white; padding: 30px; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #8b5cf6; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>🎙️ Interview Practice Reminder</h1>
                </div>
                <div class="content">
                    <p>Hi {user_name},</p>
                    <p>Time to prepare for your interview!</p>

                    <h2>{interview_data['role']}</h2>
                    <h3>{interview_data['company_name']}</h3>
                    <p><strong>Scheduled:</strong> {interview_data['scheduled_time']}</p>

                    <p>Use our Interview Buddy to practice and get ready:</p>
                    <a href="{settings.CORS_ORIGINS[0]}/dashboard/interview-buddy" class="button">Start Practice Session</a>
                </div>
            </div>
        </body>
        </html>
        """

        return self.send_email(
            EmailSend(
                to_email=to_email,
                subject=subject,
                html_body=html_body,
                text_body=f"Interview reminder: {interview_data['role']} at {interview_data['company_name']} on {interview_data['scheduled_time']}",
                email_type="interview_reminder",
                user_id=interview_data.get("user_id"),
            )
        )

    def send_weekly_digest_email(
        self, to_email: str, user_name: str, digest_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send weekly digest email"""
        subject = f"📊 Your Weekly Job Search Summary - {digest_data.get('jobs_matched', 0)} New Matches"

        top_jobs_html = ""
        for job in digest_data.get("top_jobs", [])[:3]:
            top_jobs_html += f"""
            <div style="background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #10b981; border-radius: 4px;">
                <h3 style="margin: 0 0 5px 0;">{job['title']}</h3>
                <p style="margin: 5px 0; color: #6b7280;">{job['company']}</p>
                <p style="margin: 5px 0; color: #10b981; font-weight: bold;">{job['fit']}% Match</p>
            </div>
            """

        html_body = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; }}
                .content {{ background: #f9fafb; padding: 30px; }}
                .stat-box {{ display: inline-block; background: white; padding: 20px; margin: 10px; border-radius: 8px; text-align: center; min-width: 120px; }}
                .stat-number {{ font-size: 36px; font-weight: bold; color: #667eea; }}
                .button {{ display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>📊 Your Weekly Summary</h1>
                </div>
                <div class="content">
                    <p>Hi {user_name},</p>
                    <p>Here's what happened this week:</p>

                    <div style="text-align: center;">
                        <div class="stat-box">
                            <div class="stat-number">{digest_data.get('jobs_matched', 0)}</div>
                            <div>Jobs Matched</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-number">{digest_data.get('applications_sent', 0)}</div>
                            <div>Applications</div>
                        </div>
                        <div class="stat-box">
                            <div class="stat-number">{digest_data.get('interviews_completed', 0)}</div>
                            <div>Interviews</div>
                        </div>
                    </div>

                    <h2>Top Job Matches</h2>
                    {top_jobs_html}

                    <div style="text-align: center;">
                        <a href="{settings.CORS_ORIGINS[0]}/dashboard" class="button">View Dashboard</a>
                    </div>
                </div>
            </div>
        </body>
        </html>
        """

        return self.send_email(
            EmailSend(
                to_email=to_email,
                subject=subject,
                html_body=html_body,
                text_body=f"Weekly summary: {digest_data.get('jobs_matched', 0)} jobs matched, {digest_data.get('applications_sent', 0)} applications sent",
                email_type="weekly_digest",
                user_id=digest_data.get("user_id"),
            )
        )

    def send_bulk_emails(
        self,
        recipients: List[Dict[str, str]],
        subject: str,
        template_name: str,
        **kwargs,
    ) -> List[Dict[str, Any]]:
        """Send emails to multiple recipients"""
        results = []
        for recipient in recipients:
            result = self.send_email(
                EmailSend(
                    to_email=recipient["email"],
                    subject=subject,
                    html_body="",
                    template_name=template_name,
                    template_variables={"user_name": recipient["name"], **kwargs},
                )
            )
            results.append(result)
        return results

    def get_delivery_status(self, message_id: str) -> Optional[str]:
        """Get email delivery status from Resend"""
        try:
            response = self.client.emails.get(message_id)
            return response.get("status")
        except Exception:
            return None

    def _render_template(self, template_name: str, variables: Dict[str, Any]) -> str:
        """Render email template with variables"""
        template_html = self._get_template(template_name)
        template = Template(template_html)
        return template.render(**variables)

    def _get_template(self, template_name: str) -> str:
        """Get template HTML from database or file"""
        # In production, fetch from database
        # For now, return a simple template
        return "<h1>{{user_name}}</h1><p>{{message}}</p>"

    def _validate_email(self, email: str) -> bool:
        """Validate email address format"""
        pattern = r"^[\w\.\+-]+@[\w\.-]+\.\w+$"
        return bool(re.match(pattern, email))

    def _sanitize_html(self, html: str) -> str:
        """Sanitize HTML to prevent XSS"""
        # Remove script tags
        html = re.sub(
            r"<script[^>]*>.*?</script>", "", html, flags=re.DOTALL | re.IGNORECASE
        )
        # Remove on* event handlers
        html = re.sub(
            r'\s*on\w+\s*=\s*["\'][^"\']*["\']', "", html, flags=re.IGNORECASE
        )
        return html

    def _log_email_sent(
        self,
        to_email: str,
        subject: str,
        message_id: Optional[str],
        email_type: str = "transactional",
        user_id: Optional[str] = None,
    ):
        """
        Log email send event to database - Issue #52

        Args:
            to_email: Recipient email address
            subject: Email subject line
            message_id: Resend message ID
            email_type: Type of email (job_match, application_status, etc.)
            user_id: User ID if applicable
        """
        if not self.db:
            # If no database session, just log to console
            logger.info(
                f"Email sent: {email_type} to {to_email} (message_id: {message_id})"
            )
            return

        try:
            # Create email delivery log record
            email_log = EmailDeliveryLog(
                user_id=user_id,
                to_email=to_email,
                from_email=self.from_email,
                subject=subject,
                email_type=email_type,
                message_id=message_id,
                status="sent",
                queued_at=datetime.now(),
                sent_at=datetime.now(),
            )

            self.db.add(email_log)
            self.db.commit()

            logger.info(
                f"Email delivery logged: {email_type} to {to_email} (log_id: {email_log.id}, message_id: {message_id})"
            )

        except Exception as e:
            logger.error(f"Failed to log email delivery: {str(e)}")
            self.db.rollback()
            # Don't fail email send if logging fails
