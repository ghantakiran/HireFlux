"""
HireFlux API - Main Application Entry Point
"""
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration
import time

from app.core.config import settings
from app.api.v1.router import api_router
from app.core.exceptions import APIException

# Import all models to ensure SQLAlchemy relationship resolution
import app.db.models  # noqa: F401

# Initialize Sentry
if settings.SENTRY_DSN:
    sentry_sdk.init(
        dsn=settings.SENTRY_DSN,
        integrations=[FastApiIntegration()],
        environment=settings.ENVIRONMENT,
        traces_sample_rate=0.1,
    )

# Create FastAPI app
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="""
# HireFlux API

AI-Powered Job Application Copilot that streamlines job search with:
- **Tailored Resumes**: ATS-optimized resumes with multiple versions
- **AI Cover Letters**: Personalized cover letters in formal, concise, or conversational tones
- **Smart Job Matching**: Embeddings-based matching with 0-100 Fit Index
- **Application Tracking**: Comprehensive pipeline management
- **Auto-Apply**: Consent-based automated job applications
- **Interview Coach**: Mock interviews with AI feedback

## Authentication

All endpoints (except `/auth/*` and `/health`) require Bearer token authentication:

```
Authorization: Bearer <your_jwt_token>
```

Obtain tokens via:
- Email/Password: `POST /auth/login`
- Google OAuth: `GET /auth/google/authorize`
- LinkedIn OAuth: `GET /auth/linkedin/authorize`

## Rate Limiting

- **Per Minute**: 60 requests
- **Per Hour**: 1000 requests

## Pagination

List endpoints support pagination via query parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

## Response Format

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": { ... },
    "request_id": "uuid"
  }
}
```

## Webhooks

Stripe webhooks are handled at:
- `POST /billing/webhook` (signature verification required)
""",
    docs_url=f"{settings.API_V1_PREFIX}/docs",
    redoc_url=f"{settings.API_V1_PREFIX}/redoc",
    openapi_url=f"{settings.API_V1_PREFIX}/openapi.json",
    contact={
        "name": "HireFlux Support",
        "email": "support@hireflux.com",
        "url": "https://hireflux.com/support"
    },
    license_info={
        "name": "Proprietary",
        "url": "https://hireflux.com/terms"
    },
    openapi_tags=[
        {
            "name": "Health",
            "description": "Health check and system status endpoints"
        },
        {
            "name": "Authentication",
            "description": "User authentication, registration, and OAuth flows"
        },
        {
            "name": "Resumes",
            "description": "Resume creation, management, and versioning"
        },
        {
            "name": "Cover Letters",
            "description": "AI-powered cover letter generation and management"
        },
        {
            "name": "Jobs",
            "description": "Job search, matching, and recommendations"
        },
        {
            "name": "Applications",
            "description": "Job application tracking and management"
        },
        {
            "name": "Auto-Apply",
            "description": "Automated job application submission"
        },
        {
            "name": "Billing",
            "description": "Subscriptions, payments, and credit management"
        },
        {
            "name": "Analytics",
            "description": "User analytics and insights"
        },
        {
            "name": "Interview",
            "description": "Interview preparation and coaching"
        },
        {
            "name": "Notifications",
            "description": "User notifications and alerts"
        },
        {
            "name": "Employers",
            "description": "Employer/company registration, management, and team collaboration"
        },
    ]
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Trusted Host Middleware (production only)
if settings.ENVIRONMENT == "production":
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=settings.ALLOWED_HOSTS,
    )


# Request ID and Timing Middleware
@app.middleware("http")
async def add_request_id_and_timing(request: Request, call_next):
    """Add request ID and measure request duration"""
    import uuid

    request_id = str(uuid.uuid4())
    request.state.request_id = request_id

    start_time = time.time()
    response = await call_next(request)
    duration_ms = (time.time() - start_time) * 1000

    response.headers["X-Request-ID"] = request_id
    response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"

    return response


# Exception Handlers
@app.exception_handler(APIException)
async def api_exception_handler(request: Request, exc: APIException):
    """Handle custom API exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "error": {
                "code": exc.code,
                "message": exc.message,
                "details": exc.details,
                "request_id": getattr(request.state, "request_id", None),
            },
        },
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle unexpected exceptions"""
    import traceback

    # Log the error
    print(f"Unexpected error: {str(exc)}")
    print(traceback.format_exc())

    # Report to Sentry
    if settings.SENTRY_DSN:
        sentry_sdk.capture_exception(exc)

    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "error": {
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred. Please try again later.",
                "request_id": getattr(request.state, "request_id", None),
            },
        },
    )


# Health Check
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "environment": settings.ENVIRONMENT,
    }


# API Router
app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# Startup Event
@app.on_event("startup")
async def startup_event():
    """Initialize services on startup"""
    print(f"Starting {settings.APP_NAME} v{settings.APP_VERSION}")
    print(f"Environment: {settings.ENVIRONMENT}")
    print(f"API Docs: {settings.API_V1_PREFIX}/docs")

    # TODO: Initialize database connection pool
    # TODO: Initialize Redis connection pool
    # TODO: Warm up cache


# Shutdown Event
@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown"""
    print("Shutting down gracefully...")
    # TODO: Close database connections
    # TODO: Close Redis connections


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info" if settings.DEBUG else "warning",
    )
