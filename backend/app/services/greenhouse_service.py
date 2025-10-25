"""Greenhouse API integration service"""
import requests
import time
from typing import List, Dict, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.exceptions import ServiceError
from app.schemas.job_feed import (
    JobSource,
    JobFetchResult,
    JobMetadata,
    GreenhouseJob,
    GreenhouseDepartment,
    GreenhouseOffice,
)


class GreenhouseService:
    """Greenhouse API client with rate limiting and pagination"""

    BASE_URL = "https://boards-api.greenhouse.io/v1/boards"
    RATE_LIMIT_REQUESTS = 10  # Max requests per minute
    RATE_LIMIT_WINDOW = 60  # Seconds

    def __init__(self, db: Session):
        self.db = db
        self._request_times: List[datetime] = []

    def _check_rate_limit(self) -> bool:
        """Check if we can make a request within rate limits"""
        now = datetime.utcnow()
        cutoff = now - timedelta(seconds=self.RATE_LIMIT_WINDOW)

        # Remove old requests
        self._request_times = [t for t in self._request_times if t > cutoff]

        return len(self._request_times) < self.RATE_LIMIT_REQUESTS

    def _wait_for_rate_limit(self):
        """Wait if rate limit is exceeded"""
        while not self._check_rate_limit():
            time.sleep(1)

    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Dict:
        """Make HTTP request with rate limiting and error handling"""
        self._wait_for_rate_limit()

        url = f"{self.BASE_URL}/{endpoint}"

        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()

            self._request_times.append(datetime.utcnow())
            return response.json()

        except requests.exceptions.RequestException as e:
            raise ServiceError(f"Greenhouse API error: {str(e)}")

    def fetch_jobs(
        self,
        board_token: str,
        department_id: Optional[str] = None,
        office_id: Optional[str] = None,
    ) -> JobFetchResult:
        """
        Fetch jobs from a Greenhouse job board

        Args:
            board_token: Company's Greenhouse board token
            department_id: Optional department filter
            office_id: Optional office/location filter

        Returns:
            JobFetchResult with fetched jobs and metadata
        """
        jobs = []
        errors = []

        try:
            # Fetch departments
            departments_data = self._make_request(f"{board_token}/departments")
            departments = [
                GreenhouseDepartment(id=str(dept["id"]), name=dept["name"])
                for dept in departments_data.get("departments", [])
            ]

            # Fetch offices
            offices_data = self._make_request(f"{board_token}/offices")
            offices = [
                GreenhouseOffice(
                    id=str(office["id"]),
                    name=office["name"],
                    location=office.get("location", {}).get("name"),
                )
                for office in offices_data.get("offices", [])
            ]

            # Fetch jobs
            params = {}
            if department_id:
                params["department_id"] = department_id
            if office_id:
                params["office_id"] = office_id

            jobs_data = self._make_request(f"{board_token}/jobs", params=params)

            for job_data in jobs_data.get("jobs", []):
                try:
                    job = self._parse_greenhouse_job(job_data, departments, offices)
                    jobs.append(job)
                except Exception as e:
                    errors.append(f"Error parsing job {job_data.get('id')}: {str(e)}")

            metadata = JobMetadata(
                total_fetched=len(jobs),
                new_jobs=0,  # Will be calculated during ingestion
                updated_jobs=0,
                failed_jobs=len(errors),
                fetch_duration_seconds=0.0,  # Calculated externally
                errors=errors,
            )

            return JobFetchResult(
                jobs=jobs, metadata=metadata, source=JobSource.GREENHOUSE
            )

        except Exception as e:
            raise ServiceError(f"Failed to fetch Greenhouse jobs: {str(e)}")

    def _parse_greenhouse_job(
        self,
        job_data: Dict,
        departments: List[GreenhouseDepartment],
        offices: List[GreenhouseOffice],
    ) -> GreenhouseJob:
        """Parse raw Greenhouse job data into structured format"""

        # Find department
        department = None
        for dept in departments:
            if str(dept.id) == str(job_data.get("departments", [{}])[0].get("id")):
                department = dept
                break

        # Find offices
        job_offices = []
        for office_data in job_data.get("offices", []):
            for office in offices:
                if str(office.id) == str(office_data.get("id")):
                    job_offices.append(office)
                    break

        # Parse location type
        location_type = "onsite"
        location_name = (
            job_offices[0].location
            if job_offices
            else job_data.get("location", {}).get("name", "")
        )

        if location_name:
            location_lower = location_name.lower()
            if "remote" in location_lower:
                location_type = "remote"
            elif "hybrid" in location_lower:
                location_type = "hybrid"

        # Build job object
        return GreenhouseJob(
            id=str(job_data["id"]),
            title=job_data["title"],
            location=location_name or "Not specified",
            location_type=location_type,
            absolute_url=job_data.get("absolute_url", ""),
            metadata=job_data.get("metadata", []),
            updated_at=job_data.get("updated_at"),
            requisition_id=job_data.get("requisition_id"),
            departments=[department] if department else [],
            offices=job_offices,
            content=job_data.get("content", ""),
        )

    def fetch_job_details(self, board_token: str, job_id: str) -> Dict:
        """
        Fetch detailed information for a specific job

        Args:
            board_token: Company's Greenhouse board token
            job_id: Greenhouse job ID

        Returns:
            Detailed job data including full description
        """
        try:
            return self._make_request(f"{board_token}/jobs/{job_id}")
        except Exception as e:
            raise ServiceError(f"Failed to fetch job details: {str(e)}")

    def get_boards_for_companies(self, company_domains: List[str]) -> Dict[str, str]:
        """
        Get Greenhouse board tokens for a list of companies

        Note: Board tokens are typically public and follow pattern:
        https://boards.greenhouse.io/companyname

        Args:
            company_domains: List of company domains or names

        Returns:
            Dict mapping company name to board token
        """
        boards = {}

        for domain in company_domains:
            # Extract company name from domain
            company_name = domain.split(".")[0].lower()

            # Test if board exists (Greenhouse boards are public)
            try:
                test_url = f"{self.BASE_URL}/{company_name}/jobs"
                response = requests.get(test_url, timeout=10)

                if response.status_code == 200:
                    boards[domain] = company_name

            except requests.exceptions.RequestException:
                continue

        return boards

    def validate_board_token(self, board_token: str) -> bool:
        """
        Validate that a board token is accessible

        Args:
            board_token: Board token to validate

        Returns:
            True if valid, False otherwise
        """
        try:
            self._make_request(f"{board_token}/jobs")
            return True
        except ServiceError:
            return False
