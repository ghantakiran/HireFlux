"""Email Utility Functions

Simple wrapper around EmailService for common email operations.
"""

from typing import Optional
from app.services.email_service import EmailService
from app.schemas.notification import EmailSend


def send_email(
    to: str,
    subject: str,
    html_body: str,
    text_body: Optional[str] = None,
) -> dict:
    """
    Send an email using Resend

    Args:
        to: Recipient email address
        subject: Email subject
        html_body: HTML email body
        text_body: Plain text email body (optional)

    Returns:
        Dict with success, message_id, and error
    """
    email_service = EmailService()

    email_request = EmailSend(
        to_email=to,
        subject=subject,
        html_body=html_body,
        text_body=text_body or "",
    )

    return email_service.send_email(email_request)
