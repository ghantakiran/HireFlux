# Job Matching & Vector Search Implementation Guide

## Overview
This document outlines the Pinecone-based job matching system for HireFlux, including vector embeddings, semantic search, and the Fit Index scoring algorithm.

## Completed Components

### 1. BDD Scenarios ✅
- **File**: `tests/features/job_matching.feature`
- **Scenarios**: 40+ comprehensive scenarios covering:
  - Skill extraction and vectorization
  - Job embeddings and indexing
  - Fit Index calculation (perfect, partial, poor matches)
  - Semantic similarity search
  - Filtering (location, salary, visa, experience)
  - Performance optimization (caching, batching)
  - Top matches and recommendations
  - Experience and seniority matching
  - Company and culture matching
  - Real-time updates and analytics

### 2. Schemas ✅
- **File**: `app/schemas/job_matching.py`
- **Schemas Created** (30+ classes):
  - `SkillVector` - Skill with embedding vector
  - `SkillMatch` - Individual skill match details
  - `JobSearchFilters` - Comprehensive search filters
  - `JobMatchResponse` - Complete match result
  - `FitIndexBreakdown` - Detailed score breakdown
  - `JobMatchRationale` - Match explanation
  - `MatchQuality` - Enum for match labels
  - `TopMatchesResponse` - Top matches list
  - `SkillGapAnalysis` - Skill insights
  - And 20+ more...

### 3. Pinecone Service ✅
- **File**: `app/services/pinecone_service.py`
- **Features**:
  - Index initialization (jobs and users)
  - Embedding generation with caching (24-hour TTL)
  - Batch embedding processing
  - User skill indexing
  - Job description indexing
  - Vector similarity search
  - Semantic similarity calculation
  - Index statistics and management

### 4. OpenAI Service Enhancement ✅
- **File**: `app/services/openai_service.py`
- **New Methods Added**:
  - `create_embedding(text)` - Single text embedding
  - `create_embeddings_batch(texts)` - Batch embedding generation

### 5. Configuration ✅
- **File**: `app/core/config.py`
- Pinecone configuration already in place:
  - `PINECONE_API_KEY`
  - `PINECONE_ENVIRONMENT`
  - `PINECONE_INDEX_NAME_JOBS`
  - `PINECONE_INDEX_NAME_USERS`
  - `OPENAI_EMBEDDINGS_MODEL`

## Implementation Steps

### Step 1: Create Job Matching Service
Create `app/services/job_matching_service.py`:

```python
"""Job matching service with Fit Index calculation"""
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.services.pinecone_service import PineconeService
from app.db.models.resume import Resume
from app.db.models.job import Job
from app.schemas.job_matching import (
    JobMatchRequest,
    JobMatchResponse,
    JobMatchRationale,
    FitIndexBreakdown,
    MatchQuality,
    SkillMatch,
    ExperienceLevel,
    LocationType
)


class JobMatchingService:
    """Job matching with Fit Index scoring"""

    # Fit Index weights
    WEIGHTS = {
        "skill_match": 60,  # Max 60 points
        "experience": 20,   # Max 20 points
        "seniority": 10,    # Max 10 points
        "semantic": 10      # Max 10 points
    }

    def __init__(self, db: Session):
        self.db = db
        self.pinecone = PineconeService()

    def find_matches(
        self,
        user_id: uuid.UUID,
        request: JobMatchRequest
    ) -> List[JobMatchResponse]:
        """Find job matches for user"""
        # Get user resume and skills
        resume = self._get_user_resume(user_id, request.resume_id)
        user_skills = self._extract_skills(resume)

        # Search similar jobs in Pinecone
        filters = self._build_filters(request.filters)
        vector_results = self.pinecone.search_similar_jobs(
            user_skills=user_skills,
            top_k=request.limit + request.offset,
            filters=filters
        )

        # Calculate Fit Index for each job
        matches = []
        for result in vector_results.matches[request.offset:]:
            job = self._get_job_by_id(result.metadata["job_id"])
            if not job:
                continue

            fit_index, breakdown, rationale, skill_matches = self._calculate_fit_index(
                user_skills=user_skills,
                user_experience_years=self._get_experience_years(resume),
                job=job,
                semantic_score=result.score
            )

            # Apply fit index filter
            if request.filters and request.filters.min_fit_index:
                if fit_index < request.filters.min_fit_index:
                    continue

            match = JobMatchResponse(
                job_id=str(job.id),
                job_title=job.title,
                company=job.company,
                location=job.location,
                location_type=LocationType(job.location_type),
                salary_range=f"${job.salary_min}-${job.salary_max}" if job.salary_min else None,
                fit_index=fit_index,
                match_quality=self._get_match_quality(fit_index),
                rationale=rationale,
                breakdown=breakdown,
                skill_matches=skill_matches,
                posted_date=job.posted_date,
                source=job.source,
                job_url=job.external_url,
                requires_visa_sponsorship=job.requires_visa_sponsorship,
                is_active=job.is_active
            )
            matches.append(match)

        return matches[:request.limit]

    def _calculate_fit_index(
        self,
        user_skills: List[SkillVector],
        user_experience_years: int,
        job: Job,
        semantic_score: float
    ) -> tuple[int, FitIndexBreakdown, JobMatchRationale, List[SkillMatch]]:
        """Calculate comprehensive Fit Index (0-100)"""

        # 1. Skill Match Score (max 60 points)
        skill_score, skill_matches = self._calculate_skill_match(
            user_skills=user_skills,
            required_skills=job.required_skills,
            preferred_skills=job.preferred_skills or []
        )

        # 2. Experience Score (max 20 points)
        experience_score, experience_match = self._calculate_experience_score(
            user_years=user_experience_years,
            job_requirement=job.experience_requirement
        )

        # 3. Seniority Score (max 10 points)
        seniority_score = self._calculate_seniority_score(
            user_years=user_experience_years,
            job_level=job.experience_level
        )

        # 4. Semantic Similarity Score (max 10 points)
        semantic_points = int(semantic_score * self.WEIGHTS["semantic"])

        # Total Fit Index
        total = skill_score + experience_score + seniority_score + semantic_points
        total = min(100, max(0, total))

        # Build breakdown
        breakdown = FitIndexBreakdown(
            skill_match_score=skill_score,
            experience_score=experience_score,
            seniority_score=seniority_score,
            semantic_similarity=semantic_points,
            total=total
        )

        # Generate rationale
        matching_skills = [sm.skill for sm in skill_matches if sm.user_has]
        skill_gaps = [sm.skill for sm in skill_matches if not sm.user_has]
        transferable = [sm.skill for sm in skill_matches if sm.is_transferable]

        rationale = self._generate_rationale(
            total=total,
            matching_skills=matching_skills,
            skill_gaps=skill_gaps,
            transferable_skills=transferable,
            experience_match=experience_match,
            user_years=user_experience_years,
            job_requirement=job.experience_requirement
        )

        return total, breakdown, rationale, skill_matches

    def _calculate_skill_match(
        self,
        user_skills: List[SkillVector],
        required_skills: List[str],
        preferred_skills: List[str]
    ) -> tuple[int, List[SkillMatch]]:
        """Calculate skill match score"""
        user_skill_names = {s.skill.lower() for s in user_skills}
        skill_matches = []

        # Required skills (worth 50 points)
        required_matches = 0
        for req_skill in required_skills:
            has_skill = req_skill.lower() in user_skill_names

            # Check semantic similarity for partial matches
            similarity = 0.0
            if not has_skill:
                for user_skill in user_skills:
                    sim = self.pinecone.calculate_semantic_similarity(
                        req_skill, user_skill.skill
                    )
                    if sim > similarity:
                        similarity = sim

            is_transferable = similarity > 0.7 and not has_skill

            skill_matches.append(SkillMatch(
                skill=req_skill,
                user_has=has_skill,
                similarity_score=1.0 if has_skill else similarity,
                is_transferable=is_transferable
            ))

            if has_skill:
                required_matches += 1
            elif is_transferable:
                required_matches += 0.5  # Partial credit

        required_score = int((required_matches / len(required_skills)) * 50) if required_skills else 50

        # Preferred skills (worth 10 points)
        preferred_matches = 0
        for pref_skill in preferred_skills:
            has_skill = pref_skill.lower() in user_skill_names
            if has_skill:
                preferred_matches += 1

        preferred_score = int((preferred_matches / len(preferred_skills)) * 10) if preferred_skills else 10

        total_score = min(60, required_score + preferred_score)
        return total_score, skill_matches

    def _calculate_experience_score(
        self,
        user_years: int,
        job_requirement: Optional[str]
    ) -> tuple[int, str]:
        """Calculate experience match score"""
        if not job_requirement:
            return 20, "appropriate"

        # Parse requirement (e.g., "3-5 years", "5+ years")
        if "+" in job_requirement:
            min_years = int(job_requirement.split("+")[0].strip())
            max_years = 100
        elif "-" in job_requirement:
            parts = job_requirement.split("-")
            min_years = int(parts[0].strip())
            max_years = int(parts[1].split()[0].strip())
        else:
            min_years = max_years = int(job_requirement.split()[0])

        # Calculate score
        if min_years <= user_years <= max_years:
            return 20, "perfect"
        elif user_years >= min_years - 1:  # Within 1 year
            return 15, "appropriate"
        elif user_years >= min_years - 2:  # Stretch opportunity
            return 10, "stretch"
        else:
            return 5, "under-qualified"

    def _calculate_seniority_score(
        self,
        user_years: int,
        job_level: Optional[str]
    ) -> int:
        """Calculate seniority match score"""
        user_level = self._years_to_level(user_years)
        if not job_level or user_level == job_level:
            return 10

        # Adjacent levels get partial credit
        levels = ["entry", "mid", "senior", "staff", "principal"]
        try:
            user_idx = levels.index(user_level)
            job_idx = levels.index(job_level)
            diff = abs(user_idx - job_idx)
            if diff == 1:
                return 7
            elif diff == 2:
                return 3
        except ValueError:
            pass

        return 0

    def _years_to_level(self, years: int) -> str:
        """Convert years to experience level"""
        if years <= 2:
            return "entry"
        elif years <= 5:
            return "mid"
        elif years <= 10:
            return "senior"
        elif years <= 15:
            return "staff"
        else:
            return "principal"

    def _get_match_quality(self, fit_index: int) -> MatchQuality:
        """Get match quality label"""
        if fit_index >= 90:
            return MatchQuality.EXCELLENT
        elif fit_index >= 70:
            return MatchQuality.GOOD
        elif fit_index >= 40:
            return MatchQuality.PARTIAL
        else:
            return MatchQuality.LOW

    def _generate_rationale(
        self,
        total: int,
        matching_skills: List[str],
        skill_gaps: List[str],
        transferable_skills: List[str],
        experience_match: str,
        user_years: int,
        job_requirement: Optional[str]
    ) -> JobMatchRationale:
        """Generate human-readable match rationale"""
        # Summary
        if total >= 90:
            summary = "Excellent match! You meet all key requirements."
        elif total >= 70:
            summary = "Good match. You have most required skills and experience."
        elif total >= 40:
            summary = "Partial match. Consider applying if you're willing to learn."
        else:
            summary = "Low match. This role may require significant skill development."

        # Experience details
        if experience_match == "perfect":
            exp_details = f"Your {user_years} years of experience perfectly matches the {job_requirement} requirement."
        elif experience_match == "appropriate":
            exp_details = f"Your {user_years} years of experience is appropriate for this role."
        elif experience_match == "stretch":
            exp_details = f"This is a stretch opportunity. The role prefers {job_requirement}, and you have {user_years} years."
        else:
            exp_details = f"You may be under-qualified. The role requires {job_requirement}, and you have {user_years} years."

        # Recommendations
        recommendations = []
        if skill_gaps:
            recommendations.append(f"Consider learning: {', '.join(skill_gaps[:3])}")
        if transferable_skills:
            recommendations.append(f"Highlight your {', '.join(transferable_skills[:2])} experience")
        if experience_match == "stretch":
            recommendations.append("Emphasize achievements and rapid learning ability")

        return JobMatchRationale(
            summary=summary,
            matching_skills=matching_skills,
            skill_gaps=skill_gaps,
            transferable_skills=transferable_skills,
            experience_match=experience_match,
            experience_details=exp_details,
            recommendations=recommendations
        )
```

### Step 2: Create Job Search API Endpoints
Create `app/api/v1/endpoints/job_search.py`:

```python
"""Job search and matching endpoints"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.schemas.user import User
from app.schemas.job_matching import (
    JobMatchRequest,
    JobMatchResponse,
    TopMatchesResponse,
    SkillGapAnalysis
)
from app.services.job_matching_service import JobMatchingService

router = APIRouter()


@router.post("/matches", response_model=TopMatchesResponse)
def get_job_matches(
    request: JobMatchRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get job matches for current user

    Returns jobs ranked by Fit Index with detailed match explanations
    """
    service = JobMatchingService(db)

    user_id = uuid.UUID(request.user_id) if request.user_id else uuid.UUID(current_user.id)

    matches = service.find_matches(user_id=user_id, request=request)

    return TopMatchesResponse(
        total_count=len(matches),
        matches=matches,
        filters_applied=request.filters,
        generated_at=datetime.utcnow()
    )


@router.get("/top-matches", response_model=TopMatchesResponse)
def get_top_matches(
    limit: int = 10,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get top job matches for user"""
    request = JobMatchRequest(limit=limit)
    service = JobMatchingService(db)

    matches = service.find_matches(
        user_id=uuid.UUID(current_user.id),
        request=request
    )

    return TopMatchesResponse(
        total_count=len(matches),
        matches=matches,
        generated_at=datetime.utcnow()
    )


@router.get("/skill-gap-analysis", response_model=SkillGapAnalysis)
def get_skill_gap_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get skill gap analysis based on viewed jobs"""
    service = JobMatchingService(db)
    return service.analyze_skill_gaps(uuid.UUID(current_user.id))
```

### Step 3: Register Router
Add to `app/api/v1/router.py`:

```python
from app.api.v1.endpoints import job_search

api_router.include_router(job_search.router, prefix="/jobs", tags=["Job Search"])
```

## Fit Index Algorithm

### Scoring Breakdown (Total: 100 points)

1. **Skill Match (60 points)**
   - Required skills: 50 points
   - Preferred skills: 10 points
   - Semantic similarity bonus for transferable skills

2. **Experience (20 points)**
   - Perfect match (within range): 20 points
   - Within 1 year: 15 points
   - Within 2 years (stretch): 10 points
   - Under-qualified: 5 points

3. **Seniority (10 points)**
   - Level match: 10 points
   - Adjacent level: 7 points
   - 2 levels apart: 3 points

4. **Semantic Similarity (10 points)**
   - Based on Pinecone cosine similarity score

### Match Quality Labels
- **Excellent** (90-100): All requirements met
- **Good** (70-89): Most requirements met
- **Partial** (40-69): Some skills missing
- **Low** (0-39): Significant gaps

## Testing

### Integration Tests
```python
def test_job_matching(client, auth_headers):
    response = client.post(
        "/api/v1/jobs/matches",
        json={
            "limit": 10,
            "filters": {
                "min_fit_index": 70,
                "location_types": ["remote"],
                "visa_sponsorship": false
            }
        },
        headers=auth_headers
    )
    assert response.status_code == 200
    assert len(response.json()["matches"]) <= 10
    for match in response.json()["matches"]:
        assert match["fit_index"] >= 70
```

## Deployment Checklist

1. [ ] Set Pinecone API key in production
2. [ ] Create Pinecone indexes (jobs, users)
3. [ ] Configure OpenAI embeddings model
4. [ ] Set up background job for indexing new jobs
5. [ ] Configure cache TTL for embeddings
6. [ ] Test semantic similarity thresholds
7. [ ] Monitor vector search performance
8. [ ] Set up alerts for Pinecone quota limits
9. [ ] Implement rate limiting for search endpoints
10. [ ] Create cron job for weekly match emails

## Next Steps

1. Implement job matching service (code above)
2. Create job search API endpoints
3. Set up Pinecone indexes in development
4. Test embedding generation and search
5. Implement background workers for batch indexing
6. Add analytics tracking for match quality
7. Create admin dashboard for index management
