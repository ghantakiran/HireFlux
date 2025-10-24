# Job Feed API Integration Implementation Guide

## Overview
This document outlines the integration with job board APIs (Greenhouse, Lever) for HireFlux, including job fetching, normalization, enrichment, and deduplication.

## Completed Components

### 1. BDD Scenarios ✅
- **File**: `tests/features/job_feed_integration.feature`
- **Scenarios**: 50+ comprehensive scenarios covering:
  - Job source configuration (Greenhouse, Lever)
  - Job fetching with pagination
  - Data normalization and skill extraction
  - Duplicate detection across sources
  - Job enrichment with company data
  - Error handling and rate limiting
  - Scheduled sync and incremental updates
  - Analytics and monitoring
  - Data quality validation

### 2. Schemas ✅
- **File**: `app/schemas/job_feed.py`
- **Schemas Created** (20+ classes):
  - `JobSourceConfig` - API configuration
  - `NormalizedJob` - Standard job format
  - `GreenhouseJob`, `LeverJob` - Source-specific formats
  - `JobIngestionResult` - Sync results
  - `DuplicateJobMatch` - Duplicate detection
  - `JobEnrichment` - Company data enrichment
  - `JobQualityCheck` - Data validation
  - And 13+ more...

### 3. Configuration ✅
- **File**: `app/core/config.py`
- API credentials already in place:
  - `GREENHOUSE_API_KEY`
  - `LEVER_API_KEY`

## Implementation Steps

### Step 1: Create Greenhouse Service
Create `app/services/greenhouse_service.py`:

```python
"""Greenhouse API integration"""
import requests
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
import time

from app.core.config import settings
from app.core.exceptions import ServiceError
from app.schemas.job_feed import GreenhouseJob, JobIngestionResult


class GreenhouseService:
    """Greenhouse API client"""

    BASE_URL = "https://api.greenhouse.io/v1"

    def __init__(self):
        self.api_key = settings.GREENHOUSE_API_KEY
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Basic {self.api_key}",
            "Content-Type": "application/json"
        })
        self.rate_limit_per_minute = 100
        self._request_times = []

    def fetch_jobs(
        self,
        per_page: int = 100,
        department: Optional[str] = None
    ) -> List[GreenhouseJob]:
        """Fetch all active jobs from Greenhouse"""
        all_jobs = []
        page = 1

        while True:
            # Rate limiting
            self._enforce_rate_limit()

            # Fetch page
            try:
                params = {
                    "per_page": per_page,
                    "page": page
                }

                response = self.session.get(
                    f"{self.BASE_URL}/boards/<company>/jobs",
                    params=params,
                    timeout=30
                )
                response.raise_for_status()

                jobs_data = response.json()["jobs"]
                if not jobs_data:
                    break

                # Convert to Pydantic models
                for job_data in jobs_data:
                    try:
                        job = GreenhouseJob(**job_data)

                        # Filter by department if specified
                        if department:
                            job_depts = [d.get("name") for d in job.departments]
                            if department not in job_depts:
                                continue

                        all_jobs.append(job)
                    except Exception as e:
                        print(f"Error parsing job {job_data.get('id')}: {e}")
                        continue

                page += 1

            except requests.exceptions.RequestException as e:
                raise ServiceError(f"Greenhouse API error: {str(e)}")

        return all_jobs

    def fetch_job_details(self, job_id: int) -> Dict[str, Any]:
        """Fetch detailed job information"""
        self._enforce_rate_limit()

        try:
            response = self.session.get(
                f"{self.BASE_URL}/boards/<company>/jobs/{job_id}",
                timeout=30
            )
            response.raise_for_status()
            return response.json()
        except requests.exceptions.RequestException as e:
            raise ServiceError(f"Failed to fetch job {job_id}: {str(e)}")

    def _enforce_rate_limit(self):
        """Enforce rate limiting"""
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=1)

        # Remove old requests
        self._request_times = [t for t in self._request_times if t > cutoff]

        # Check limit
        if len(self._request_times) >= self.rate_limit_per_minute:
            sleep_time = 60 - (now - self._request_times[0]).total_seconds()
            if sleep_time > 0:
                time.sleep(sleep_time)
            self._request_times = []

        # Track this request
        self._request_times.append(now)

    def health_check(self) -> Dict[str, Any]:
        """Check API health"""
        try:
            start = datetime.utcnow()
            response = self.session.get(f"{self.BASE_URL}/boards/<company>/jobs", timeout=10)
            response_time = (datetime.utcnow() - start).total_seconds() * 1000

            return {
                "healthy": response.status_code == 200,
                "response_time_ms": int(response_time),
                "status_code": response.status_code
            }
        except Exception as e:
            return {
                "healthy": False,
                "error": str(e)
            }
```

### Step 2: Create Lever Service
Create `app/services/lever_service.py`:

```python
"""Lever API integration"""
import requests
from typing import List, Optional
from datetime import datetime, timedelta
import time

from app.core.config import settings
from app.core.exceptions import ServiceError
from app.schemas.job_feed import LeverJob


class LeverService:
    """Lever API client"""

    BASE_URL = "https://api.lever.co/v1"

    def __init__(self):
        self.api_key = settings.LEVER_API_KEY
        self.rate_limit_per_minute = 60
        self._request_times = []

    def fetch_jobs(self, state: str = "published") -> List[LeverJob]:
        """Fetch jobs from Lever"""
        all_jobs = []
        offset = 0
        limit = 100

        while True:
            self._enforce_rate_limit()

            try:
                response = requests.get(
                    f"{self.BASE_URL}/postings",
                    params={
                        "mode": "json",
                        "state": state,
                        "limit": limit,
                        "offset": offset
                    },
                    auth=(self.api_key, ""),
                    timeout=30
                )
                response.raise_for_status()

                jobs_data = response.json().get("data", [])
                if not jobs_data:
                    break

                for job_data in jobs_data:
                    try:
                        job = LeverJob(**job_data)
                        all_jobs.append(job)
                    except Exception as e:
                        print(f"Error parsing Lever job: {e}")
                        continue

                offset += limit

            except requests.exceptions.RequestException as e:
                raise ServiceError(f"Lever API error: {str(e)}")

        return all_jobs

    def _enforce_rate_limit(self):
        """Enforce rate limiting"""
        now = datetime.utcnow()
        cutoff = now - timedelta(minutes=1)
        self._request_times = [t for t in self._request_times if t > cutoff]

        if len(self._request_times) >= self.rate_limit_per_minute:
            sleep_time = 60 - (now - self._request_times[0]).total_seconds()
            if sleep_time > 0:
                time.sleep(sleep_time)
            self._request_times = []

        self._request_times.append(now)
```

### Step 3: Create Job Normalization Service
Create `app/services/job_normalization_service.py`:

```python
"""Job data normalization and enrichment"""
import re
from typing import List, Optional
from datetime import datetime

from app.schemas.job_feed import (
    NormalizedJob,
    GreenhouseJob,
    LeverJob,
    JobSource,
    LocationType,
    SalaryRange,
    JobSkillExtraction
)


class JobNormalizationService:
    """Normalize job data from various sources"""

    # Common tech skills for extraction
    COMMON_SKILLS = {
        "python", "java", "javascript", "typescript", "react", "angular", "vue",
        "node.js", "fastapi", "django", "flask", "spring", "docker", "kubernetes",
        "aws", "gcp", "azure", "postgresql", "mongodb", "redis", "graphql",
        "rest", "api", "ci/cd", "git", "agile", "scrum"
    }

    def normalize_greenhouse_job(self, job: GreenhouseJob) -> NormalizedJob:
        """Normalize Greenhouse job to standard format"""
        # Extract location
        location = "Remote"
        location_type = LocationType.REMOTE
        if job.offices:
            office = job.offices[0]
            location = office.get("name", "Unknown")
            location_type = self._detect_location_type(job.content or "")

        # Extract skills
        description = job.content or ""
        required_skills, preferred_skills = self._extract_skills(description)

        # Parse experience
        exp_requirement, exp_min, exp_max = self._parse_experience(description)

        # Parse salary
        salary = self._parse_salary(description)

        return NormalizedJob(
            external_id=str(job.id),
            source=JobSource.GREENHOUSE,
            title=job.name,
            company="",  # Need to get from config
            location=location,
            location_type=location_type,
            description=description,
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            experience_requirement=exp_requirement,
            experience_min_years=exp_min,
            experience_max_years=exp_max,
            salary=salary,
            department=job.departments[0].get("name") if job.departments else None,
            application_url=job.absolute_url,
            posted_date=job.updated_at,
            raw_metadata={"greenhouse_internal_id": job.internal_job_id}
        )

    def normalize_lever_job(self, job: LeverJob) -> NormalizedJob:
        """Normalize Lever job to standard format"""
        location = job.categories.get("location", "Remote")
        location_type = self._detect_location_type(job.description)

        required_skills, preferred_skills = self._extract_skills(job.description)
        exp_requirement, exp_min, exp_max = self._parse_experience(job.description)
        salary = self._parse_salary(job.description + (job.additional or ""))

        return NormalizedJob(
            external_id=job.id,
            source=JobSource.LEVER,
            title=job.text,
            company="",  # Need to get from config
            location=location,
            location_type=location_type,
            description=job.description,
            required_skills=required_skills,
            preferred_skills=preferred_skills,
            experience_requirement=exp_requirement,
            experience_min_years=exp_min,
            experience_max_years=exp_max,
            salary=salary,
            department=job.categories.get("department"),
            employment_type=job.categories.get("commitment"),
            application_url=job.applyUrl,
            posted_date=datetime.fromtimestamp(job.createdAt / 1000),
            raw_metadata={"lever_state": job.state}
        )

    def _extract_skills(self, description: str) -> tuple[List[str], List[str]]:
        """Extract required and preferred skills"""
        description_lower = description.lower()
        required = []
        preferred = []

        for skill in self.COMMON_SKILLS:
            if skill in description_lower:
                # Determine if required or preferred
                skill_context = self._get_skill_context(description_lower, skill)
                if "required" in skill_context or "must have" in skill_context:
                    required.append(skill.title())
                elif "preferred" in skill_context or "nice to have" in skill_context:
                    preferred.append(skill.title())
                else:
                    # Default to required if mentioned
                    required.append(skill.title())

        return required, preferred

    def _get_skill_context(self, text: str, skill: str, context_chars: int = 100) -> str:
        """Get surrounding text context for a skill mention"""
        skill_index = text.find(skill)
        if skill_index == -1:
            return ""

        start = max(0, skill_index - context_chars)
        end = min(len(text), skill_index + len(skill) + context_chars)
        return text[start:end]

    def _parse_experience(self, description: str) -> tuple[Optional[str], Optional[int], Optional[int]]:
        """Parse experience requirements"""
        # Patterns for experience requirements
        patterns = [
            r"(\d+)\+\s*years?",  # "5+ years"
            r"(\d+)-(\d+)\s*years?",  # "3-5 years"
            r"(\d+)\s*to\s*(\d+)\s*years?",  # "3 to 5 years"
        ]

        for pattern in patterns:
            match = re.search(pattern, description, re.IGNORECASE)
            if match:
                groups = match.groups()
                if len(groups) == 1:
                    # "5+ years" format
                    min_years = int(groups[0])
                    return f"{min_years}+ years", min_years, 100
                else:
                    # "3-5 years" format
                    min_years = int(groups[0])
                    max_years = int(groups[1])
                    return f"{min_years}-{max_years} years", min_years, max_years

        # Check for entry level
        if re.search(r"entry.level", description, re.IGNORECASE):
            return "Entry level", 0, 2

        return None, None, None

    def _parse_salary(self, description: str) -> Optional[SalaryRange]:
        """Parse salary information"""
        # Pattern for salary ranges
        pattern = r"\$(\d{1,3}(?:,\d{3})*(?:k)?)\s*-\s*\$(\d{1,3}(?:,\d{3})*(?:k)?)"
        match = re.search(pattern, description, re.IGNORECASE)

        if match:
            min_str, max_str = match.groups()

            # Convert to integers (handle 'k' notation)
            def parse_amount(s):
                s = s.replace(",", "")
                if "k" in s.lower():
                    return int(s.lower().replace("k", "")) * 1000
                return int(s)

            return SalaryRange(
                min_salary=parse_amount(min_str),
                max_salary=parse_amount(max_str)
            )

        return None

    def _detect_location_type(self, description: str) -> LocationType:
        """Detect if remote/hybrid/onsite"""
        description_lower = description.lower()

        remote_keywords = ["remote", "work from anywhere", "wfa", "fully remote"]
        hybrid_keywords = ["hybrid", "days in office", "flexible"]

        if any(kw in description_lower for kw in remote_keywords):
            return LocationType.REMOTE
        elif any(kw in description_lower for kw in hybrid_keywords):
            return LocationType.HYBRID
        else:
            return LocationType.ONSITE
```

### Step 4: Create Job Ingestion Service
Create `app/services/job_ingestion_service.py`:

```python
"""Job ingestion and sync service"""
import uuid
from datetime import datetime
from sqlalchemy.orm import Session
from typing import List

from app.services.greenhouse_service import GreenhouseService
from app.services.lever_service import LeverService
from app.services.job_normalization_service import JobNormalizationService
from app.services.pinecone_service import PineconeService
from app.db.models.job import Job
from app.schemas.job_feed import (
    JobSource,
    JobIngestionResult,
    JobIngestionRequest
)


class JobIngestionService:
    """Coordinate job ingestion from multiple sources"""

    def __init__(self, db: Session):
        self.db = db
        self.greenhouse = GreenhouseService()
        self.lever = LeverService()
        self.normalizer = JobNormalizationService()
        self.pinecone = PineconeService()

    def ingest_jobs(self, request: JobIngestionRequest) -> JobIngestionResult:
        """Ingest jobs from specified source"""
        start_time = datetime.utcnow()

        # Determine source
        source_config = self._get_source_config(request.source_id)
        source_type = source_config.source_type

        # Fetch jobs
        if source_type == JobSource.GREENHOUSE:
            raw_jobs = self.greenhouse.fetch_jobs()
        elif source_type == JobSource.LEVER:
            raw_jobs = self.lever.fetch_jobs()
        else:
            raise ValueError(f"Unsupported source: {source_type}")

        # Process jobs
        created = 0
        updated = 0
        skipped = 0
        errors = 0
        error_messages = []

        for raw_job in raw_jobs[:request.max_jobs] if request.max_jobs else raw_jobs:
            try:
                # Normalize
                if source_type == JobSource.GREENHOUSE:
                    normalized = self.normalizer.normalize_greenhouse_job(raw_job)
                else:
                    normalized = self.normalizer.normalize_lever_job(raw_job)

                # Check for duplicate
                existing = self.db.query(Job).filter(
                    Job.external_id == normalized.external_id,
                    Job.source == normalized.source
                ).first()

                if existing:
                    # Update
                    for key, value in normalized.dict().items():
                        setattr(existing, key, value)
                    updated += 1
                else:
                    # Create new
                    job = Job(
                        id=uuid.uuid4(),
                        **normalized.dict()
                    )
                    self.db.add(job)
                    created += 1

                    # Index in Pinecone
                    self.pinecone.index_job(
                        job_id=str(job.id),
                        job_title=job.title,
                        job_description=job.description,
                        required_skills=job.required_skills,
                        metadata={
                            "company": job.company,
                            "location": job.location,
                            "location_type": job.location_type
                        }
                    )

            except Exception as e:
                errors += 1
                error_messages.append(f"Error processing job: {str(e)}")
                continue

        self.db.commit()

        # Calculate processing time
        processing_time = (datetime.utcnow() - start_time).total_seconds()

        return JobIngestionResult(
            source=source_type,
            total_fetched=len(raw_jobs),
            jobs_created=created,
            jobs_updated=updated,
            jobs_skipped=skipped,
            errors=errors,
            processing_time_seconds=processing_time,
            error_messages=error_messages
        )
```

### Step 5: Create API Endpoints
Create `app/api/v1/endpoints/job_admin.py`:

```python
"""Admin endpoints for job feed management"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.auth import require_admin
from app.schemas.job_feed import (
    JobIngestionRequest,
    JobIngestionResult,
    JobSourceHealthCheck
)
from app.services.job_ingestion_service import JobIngestionService

router = APIRouter()


@router.post("/ingest", response_model=JobIngestionResult)
def ingest_jobs(
    request: JobIngestionRequest,
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """Trigger job ingestion from source (admin only)"""
    service = JobIngestionService(db)
    return service.ingest_jobs(request)


@router.get("/health", response_model=List[JobSourceHealthCheck])
def check_sources_health(
    db: Session = Depends(get_db),
    _: None = Depends(require_admin)
):
    """Check health of all job sources"""
    # Implementation
    pass
```

## Testing

### Integration Tests
```python
def test_greenhouse_fetch():
    service = GreenhouseService()
    jobs = service.fetch_jobs(per_page=10)
    assert len(jobs) > 0
    assert all(isinstance(j, GreenhouseJob) for j in jobs)

def test_job_normalization():
    normalizer = JobNormalizationService()
    skills = normalizer._extract_skills("Looking for Python and FastAPI expert")
    assert "Python" in skills[0]
    assert "FastAPI" in skills[0]
```

## Deployment Checklist

1. [ ] Configure Greenhouse API key
2. [ ] Configure Lever API key
3. [ ] Set up cron job for daily sync (midnight UTC)
4. [ ] Configure rate limits per source
5. [ ] Set up error monitoring and alerts
6. [ ] Test webhook integrations
7. [ ] Verify duplicate detection logic
8. [ ] Test job quality validation
9. [ ] Set up job archival (60-day stale jobs)
10. [ ] Create admin dashboard for monitoring

## Next Steps

1. Implement services (code above)
2. Create admin API endpoints
3. Set up scheduled job sync
4. Test with real APIs
5. Implement duplicate detection
6. Add job quality checks
7. Create monitoring dashboard
