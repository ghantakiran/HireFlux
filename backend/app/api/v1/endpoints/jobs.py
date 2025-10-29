"""Job matching and search endpoints"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.db.session import get_db
from app.api.dependencies import get_current_user
from app.db.models.user import User
from app.services.job_matching_service import JobMatchingService
from app.services.job_ingestion_service import JobIngestionService
from app.core.exceptions import ValidationError, ServiceError
from app.schemas.job_matching import (
    JobMatchRequest,
    JobMatchResponse,
    JobSearchFilters,
)
from app.schemas.job_feed import JobIngestionRequest, JobIngestionResult, JobSource


router = APIRouter()


@router.post("/matches", response_model=List[JobMatchResponse])
def find_job_matches(
    request: JobMatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Find job matches for user based on their resume and preferences.
    Returns jobs ranked by Fit Index (0-100).
    """
    try:
        service = JobMatchingService(db)
        matches = service.find_matches(user_id=current_user.id, request=request)
        return matches

    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/top-matches", response_model=List[JobMatchResponse])
def get_top_matches(
    resume_id: str = None,
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get top N job matches for user.
    Convenience endpoint for dashboard display.
    """
    try:
        request = JobMatchRequest(
            resume_id=resume_id,
            limit=limit,
            offset=0,
            filters=JobSearchFilters(min_fit_index=40),  # Only show decent matches
        )

        service = JobMatchingService(db)
        matches = service.find_matches(user_id=current_user.id, request=request)
        return matches

    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/skill-gap-analysis")
def analyze_skill_gaps(
    job_id: str,
    resume_id: str = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Analyze skill gaps between user's resume and a specific job.
    Returns detailed skill match breakdown and learning recommendations.
    """
    try:
        from app.db.models.job import Job
        from app.db.models.resume import Resume

        # Get job
        job = (
            db.query(Job)
            .filter(Job.id == uuid.UUID(job_id), Job.is_active == True)
            .first()
        )

        if not job:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Job not found"
            )

        # Get resume
        if resume_id:
            resume = (
                db.query(Resume)
                .filter(
                    Resume.id == uuid.UUID(resume_id), Resume.user_id == current_user.id
                )
                .first()
            )
        else:
            resume = (
                db.query(Resume)
                .filter(
                    Resume.user_id == current_user.id,
                    Resume.is_default == True,
                    Resume.is_deleted == False,
                )
                .first()
            )

        if not resume:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found"
            )

        # Analyze gaps
        service = JobMatchingService(db)
        user_skills = service._extract_skills_from_resume(resume)
        user_experience_years = service._calculate_experience_years(resume)

        # Calculate fit index with detailed breakdown
        fit_index, breakdown, rationale, skill_matches = service._calculate_fit_index(
            user_skills=user_skills,
            user_experience_years=user_experience_years,
            job=job,
            semantic_score=0.8,  # Default semantic score
        )

        return {
            "job_id": job_id,
            "job_title": job.title,
            "company": job.company,
            "fit_index": fit_index,
            "breakdown": breakdown,
            "rationale": rationale,
            "skill_matches": skill_matches,
            "learning_path": [
                {
                    "skill": sm.skill,
                    "priority": "high"
                    if not sm.user_has and not sm.is_transferable
                    else "medium",
                    "current_level": "none" if not sm.user_has else "proficient",
                    "target_level": "proficient",
                    "estimated_learning_time": "2-4 weeks"
                    if not sm.is_transferable
                    else "1-2 weeks",
                }
                for sm in skill_matches
                if not sm.user_has
            ][:5],
        }

    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error analyzing skill gaps: {str(e)}",
        )


# Admin endpoints for job ingestion
@router.post("/admin/ingest", response_model=JobIngestionResult)
def ingest_jobs(
    request: JobIngestionRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint to ingest jobs from external sources.
    Requires admin privileges.
    """
    # TODO: Add admin role check
    # if not current_user.is_admin:
    #     raise HTTPException(status_code=403, detail="Admin access required")

    try:
        service = JobIngestionService(db)
        result = service.ingest_jobs(request)

        # Update sync timestamps
        if request.sources:
            for source_config in request.sources:
                service.update_source_sync_time(source_config.source)

        return result

    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/admin/source-health")
def get_source_health(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    """
    Admin endpoint to check health of job sources.
    Returns metrics for each configured source.
    """
    # TODO: Add admin role check

    try:
        service = JobIngestionService(db)

        health_status = {
            "greenhouse": service.get_source_health(JobSource.GREENHOUSE),
            "lever": service.get_source_health(JobSource.LEVER),
        }

        return {
            "sources": health_status,
            "overall_healthy": all(
                source["is_healthy"] for source in health_status.values()
            ),
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching source health: {str(e)}",
        )


@router.post("/admin/deactivate-stale")
def deactivate_stale_jobs(
    source: JobSource,
    days_old: int = 30,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Admin endpoint to deactivate jobs that haven't been updated recently.
    """
    # TODO: Add admin role check

    try:
        service = JobIngestionService(db)
        count = service.deactivate_stale_jobs(source, days_old)

        return {
            "message": f"Deactivated {count} stale jobs from {source.value}",
            "count": count,
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deactivating jobs: {str(e)}",
        )
