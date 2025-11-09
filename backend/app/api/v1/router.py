"""
API V1 Router - Combines all endpoint routers
"""

from fastapi import APIRouter

# Import routers
from app.api.v1.endpoints import (
    auth,
    onboarding,
    resume,
    ai_generation,
    cover_letter,
    billing,
    jobs,
    interview,
    notification,
    auto_apply,
    webhooks,
    analytics,
    employer,
    applications,
    candidate_profiles,
    bulk_job_posting,
    team,  # Sprint 13-14: Team collaboration
    interviews,  # Sprint 13-14: Interview scheduling
    employer_analytics,  # Sprint 15-16: Advanced analytics
    api_keys,  # Sprint 17-18: API key management
    webhook_delivery,  # Sprint 17-18: Webhook delivery system
)

api_router = APIRouter()

# Include endpoint routers
api_router.include_router(auth.router)
api_router.include_router(onboarding.router)
api_router.include_router(resume.router)
api_router.include_router(ai_generation.router, prefix="/ai", tags=["AI Generation"])
api_router.include_router(
    cover_letter.router, prefix="/cover-letters", tags=["Cover Letters"]
)
api_router.include_router(billing.router, prefix="/billing", tags=["Billing"])
api_router.include_router(jobs.router, prefix="/jobs", tags=["Jobs"])
api_router.include_router(interview.router)
api_router.include_router(notification.router)
api_router.include_router(auto_apply.router)
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["Webhooks"])
api_router.include_router(analytics.router, prefix="/analytics", tags=["Analytics"])
api_router.include_router(employer.router)  # Employer/company endpoints
api_router.include_router(
    applications.router, prefix="/ats", tags=["ATS/Applications"]
)  # Employer ATS
api_router.include_router(candidate_profiles.router)  # Candidate profiles & search
api_router.include_router(bulk_job_posting.router)  # Bulk job posting (Sprint 11-12)
api_router.include_router(
    team.router, prefix="/employer"
)  # Team collaboration (Sprint 13-14)
api_router.include_router(
    interviews.router, prefix="/employer"
)  # Interview scheduling (Sprint 13-14)
api_router.include_router(
    employer_analytics.router, prefix="/employer", tags=["Employer Analytics"]
)  # Advanced analytics (Sprint 15-16)
api_router.include_router(
    api_keys.router, prefix="/employer/api-keys", tags=["API Keys"]
)  # API key management (Sprint 17-18)
api_router.include_router(
    webhook_delivery.router, prefix="/employer/webhooks", tags=["Webhook Delivery"]
)  # Webhook delivery system (Sprint 17-18)

# Future routers (to be created)
# from app.api.v1.endpoints import users
# api_router.include_router(users.router, prefix="/users", tags=["Users"])


# Health check for API
@api_router.get("/", tags=["Root"])
async def api_root():
    """API root endpoint"""
    return {
        "message": "HireFlux API v1",
        "docs": "/api/v1/docs",
        "health": "/health",
    }
