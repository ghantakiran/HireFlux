"""
Sentry Error Tracking for Backend

Provides comprehensive error tracking and performance monitoring
for the HireFlux FastAPI backend.
"""

import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
from sentry_sdk.integrations.sqlalchemy import SqlalchemyIntegration
from sentry_sdk.integrations.redis import RedisIntegration
from sentry_sdk.integrations.logging import LoggingIntegration
import logging

from app.core.config import settings


def init_sentry():
    """Initialize Sentry error tracking"""

    if not settings.SENTRY_DSN:
        logging.warning("Sentry DSN not configured - error tracking disabled")
        return

    # Configure Sentry integrations
    integrations = [
        FastApiIntegration(
            transaction_style="endpoint",  # Group by endpoint
        ),
        SqlalchemyIntegration(),
        RedisIntegration(),
        LoggingIntegration(
            level=logging.INFO,  # Capture info and above as breadcrumbs
            event_level=logging.ERROR,  # Send errors as events
        ),
    ]

    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        environment=settings.ENVIRONMENT,
        integrations=integrations,
        # Performance monitoring
        traces_sample_rate=0.1 if settings.ENVIRONMENT == "production" else 1.0,
        # Additional configuration
        send_default_pii=False,  # Don't send PII
        debug=settings.DEBUG,
        # Release tracking
        release=f"hireflux-backend@{settings.APP_VERSION}",
        # Filter sensitive data
        before_send=filter_sensitive_data,
        # Ignore certain errors
        ignore_errors=[
            KeyboardInterrupt,
            "asyncio.CancelledError",
        ],
    )

    logging.info(f"Sentry initialized for environment: {settings.ENVIRONMENT}")


def filter_sensitive_data(event, hint):
    """
    Filter sensitive data before sending to Sentry

    Args:
        event: Sentry event data
        hint: Additional context

    Returns:
        Modified event or None to drop the event
    """

    # Remove sensitive user data
    if "user" in event:
        if "email" in event["user"]:
            event["user"]["email"] = "[REDACTED]"
        if "ip_address" in event["user"]:
            del event["user"]["ip_address"]

    # Remove sensitive request data
    if "request" in event:
        request = event["request"]

        # Redact sensitive headers
        if "headers" in request:
            sensitive_headers = [
                "authorization",
                "cookie",
                "x-api-key",
                "x-auth-token",
            ]
            for header in sensitive_headers:
                if header in request["headers"]:
                    request["headers"][header] = "[REDACTED]"

        # Redact sensitive query parameters
        if "query_string" in request:
            sensitive_params = ["token", "api_key", "password", "secret"]
            for param in sensitive_params:
                if param in str(request["query_string"]).lower():
                    request["query_string"] = "[REDACTED]"

        # Redact sensitive body data
        if "data" in request:
            sensitive_fields = [
                "password",
                "token",
                "api_key",
                "secret",
                "credit_card",
                "ssn",
            ]
            if isinstance(request["data"], dict):
                for field in sensitive_fields:
                    if field in request["data"]:
                        request["data"][field] = "[REDACTED]"

    # Filter out non-actionable errors
    if "exception" in event:
        exceptions = event["exception"].get("values", [])
        for exception in exceptions:
            exc_type = exception.get("type", "")
            exc_value = exception.get("value", "")

            # Ignore known non-actionable errors
            if "ConnectionError" in exc_type or "Timeout" in exc_type:
                return None  # Don't send to Sentry

            if "401" in exc_value or "403" in exc_value:
                # Authentication errors - these are expected
                return None

    return event


def capture_exception(
    error: Exception,
    user_id: str = None,
    extra_context: dict = None,
):
    """
    Manually capture an exception with context

    Args:
        error: The exception to capture
        user_id: Optional user ID for context
        extra_context: Additional context data
    """

    with sentry_sdk.push_scope() as scope:
        # Add user context
        if user_id:
            scope.set_user({"id": user_id})

        # Add extra context
        if extra_context:
            for key, value in extra_context.items():
                scope.set_extra(key, value)

        # Capture the exception
        sentry_sdk.capture_exception(error)


def capture_message(
    message: str,
    level: str = "info",
    extra_context: dict = None,
):
    """
    Manually capture a message

    Args:
        message: The message to capture
        level: Severity level (info, warning, error, etc.)
        extra_context: Additional context data
    """

    with sentry_sdk.push_scope() as scope:
        # Add extra context
        if extra_context:
            for key, value in extra_context.items():
                scope.set_extra(key, value)

        # Capture the message
        sentry_sdk.capture_message(message, level=level)


def add_breadcrumb(
    message: str,
    category: str = "default",
    level: str = "info",
    data: dict = None,
):
    """
    Add a breadcrumb for debugging

    Args:
        message: Breadcrumb message
        category: Category (e.g., "auth", "db", "api")
        level: Severity level
        data: Additional data
    """

    sentry_sdk.add_breadcrumb(
        category=category,
        message=message,
        level=level,
        data=data or {},
    )


def start_transaction(name: str, op: str):
    """
    Start a performance transaction

    Args:
        name: Transaction name
        op: Operation type (e.g., "http.request", "db.query")

    Returns:
        Transaction object
    """

    return sentry_sdk.start_transaction(name=name, op=op)


class SentryMiddleware:
    """
    Custom middleware for enhanced Sentry integration
    """

    def __init__(self, app):
        self.app = app

    async def __call__(self, scope, receive, send):
        # Add custom breadcrumbs
        if scope["type"] == "http":
            path = scope.get("path", "")
            method = scope.get("method", "")

            add_breadcrumb(
                message=f"{method} {path}",
                category="http",
                level="info",
                data={"path": path, "method": method},
            )

        return await self.app(scope, receive, send)
