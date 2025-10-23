"""
Custom Exception Classes
"""
from typing import Any, Dict, Optional, List


class APIException(Exception):
    """Base API Exception"""

    def __init__(
        self,
        message: str,
        code: str = "API_ERROR",
        status_code: int = 400,
        details: Optional[List[Dict[str, Any]]] = None,
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or []
        super().__init__(self.message)


class ValidationError(APIException):
    """Validation Error"""

    def __init__(self, message: str, details: Optional[List[Dict[str, Any]]] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=400,
            details=details,
        )


class BadRequestError(APIException):
    """Bad Request Error"""

    def __init__(self, message: str = "Bad request", details: Optional[List[Dict[str, Any]]] = None):
        super().__init__(
            message=message,
            code="BAD_REQUEST",
            status_code=400,
            details=details,
        )


class UnauthorizedError(APIException):
    """Unauthorized Access Error"""

    def __init__(self, message: str = "Unauthorized"):
        super().__init__(
            message=message,
            code="UNAUTHORIZED",
            status_code=401,
        )


class ForbiddenError(APIException):
    """Forbidden Access Error"""

    def __init__(self, message: str = "Forbidden"):
        super().__init__(
            message=message,
            code="FORBIDDEN",
            status_code=403,
        )


class NotFoundError(APIException):
    """Resource Not Found Error"""

    def __init__(self, message: str = "Resource not found"):
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=404,
        )


class ConflictError(APIException):
    """Resource Conflict Error"""

    def __init__(self, message: str = "Resource conflict"):
        super().__init__(
            message=message,
            code="CONFLICT",
            status_code=409,
        )


class PaymentRequiredError(APIException):
    """Payment Required Error"""

    def __init__(self, message: str = "Payment required"):
        super().__init__(
            message=message,
            code="PAYMENT_REQUIRED",
            status_code=402,
        )


class RateLimitError(APIException):
    """Rate Limit Exceeded Error"""

    def __init__(self, message: str = "Rate limit exceeded", retry_after: int = 3600):
        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            status_code=429,
            details=[{"retry_after": retry_after}],
        )


class InternalServerError(APIException):
    """Internal Server Error"""

    def __init__(self, message: str = "Internal server error"):
        super().__init__(
            message=message,
            code="INTERNAL_ERROR",
            status_code=500,
        )


class ExternalServiceError(APIException):
    """External Service Error"""

    def __init__(self, service: str, message: str = "External service error"):
        super().__init__(
            message=f"{service}: {message}",
            code="EXTERNAL_SERVICE_ERROR",
            status_code=502,
            details=[{"service": service}],
        )
