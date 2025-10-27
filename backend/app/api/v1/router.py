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

# Future routers (to be created)
# from app.api.v1.endpoints import users, applications
# api_router.include_router(users.router, prefix="/users", tags=["Users"])
# api_router.include_router(applications.router, prefix="/applications", tags=["Applications"])


# Health check for API
@api_router.get("/", tags=["Root"])
async def api_root():
    """API root endpoint"""
    return {
        "message": "HireFlux API v1",
        "docs": "/api/v1/docs",
        "health": "/health",
    }
