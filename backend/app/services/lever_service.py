"""Lever API integration service"""

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
    LeverJob,
    LeverCategory,
    LeverLocation,
)


class LeverService:
    """Lever API client with rate limiting and pagination"""

    BASE_URL = "https://api.lever.co/v0/postings"
    RATE_LIMIT_REQUESTS = 100  # Max requests per minute (Lever is more generous)
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

    def _make_request(
        self, company_site: str, params: Optional[Dict] = None
    ) -> List[Dict]:
        """Make HTTP request with rate limiting and error handling"""
        self._wait_for_rate_limit()

        url = f"{self.BASE_URL}/{company_site}"

        try:
            response = requests.get(url, params=params, timeout=30)
            response.raise_for_status()

            self._request_times.append(datetime.utcnow())
            return response.json()

        except requests.exceptions.RequestException as e:
            raise ServiceError(f"Lever API error: {str(e)}")

    def fetch_jobs(
        self,
        company_site: str,
        team: Optional[str] = None,
        location: Optional[str] = None,
        commitment: Optional[str] = None,
    ) -> JobFetchResult:
        """
        Fetch jobs from a Lever company site

        Args:
            company_site: Company's Lever site identifier (e.g., "netflix")
            team: Optional team/department filter
            location: Optional location filter
            commitment: Optional commitment type filter (full-time, part-time, etc.)

        Returns:
            JobFetchResult with fetched jobs and metadata
        """
        jobs = []
        errors = []

        try:
            # Build query parameters
            params = {"mode": "json"}
            if team:
                params["team"] = team
            if location:
                params["location"] = location
            if commitment:
                params["commitment"] = commitment

            # Fetch jobs
            jobs_data = self._make_request(company_site, params=params)

            for job_data in jobs_data:
                try:
                    job = self._parse_lever_job(job_data)
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

            return JobFetchResult(jobs=jobs, metadata=metadata, source=JobSource.LEVER)

        except Exception as e:
            raise ServiceError(f"Failed to fetch Lever jobs: {str(e)}")

    def _parse_lever_job(self, job_data: Dict) -> LeverJob:
        """Parse raw Lever job data into structured format"""

        # Parse categories (teams/departments)
        categories = []
        if "categories" in job_data:
            categories = [
                LeverCategory(
                    commitment=job_data["categories"].get("commitment"),
                    department=job_data["categories"].get("department"),
                    level=job_data["categories"].get("level"),
                    location=job_data["categories"].get("location"),
                    team=job_data["categories"].get("team"),
                )
            ]

        # Parse location
        lever_location = None
        if "categories" in job_data and job_data["categories"].get("location"):
            lever_location = LeverLocation(name=job_data["categories"]["location"])

        # Determine location type
        location_type = "onsite"
        location_name = (
            job_data["categories"].get("location", "")
            if "categories" in job_data
            else ""
        )

        if location_name:
            location_lower = location_name.lower()
            if "remote" in location_lower:
                location_type = "remote"
            elif "hybrid" in location_lower:
                location_type = "hybrid"

        # Determine commitment (employment type)
        employment_type = None
        if "categories" in job_data and job_data["categories"].get("commitment"):
            commitment = job_data["categories"]["commitment"].lower()
            if "full" in commitment:
                employment_type = "full-time"
            elif "part" in commitment:
                employment_type = "part-time"
            elif "contract" in commitment:
                employment_type = "contract"
            elif "intern" in commitment:
                employment_type = "internship"

        # Build job object
        return LeverJob(
            id=job_data["id"],
            text=job_data["text"],
            hostedUrl=job_data.get("hostedUrl", ""),
            applyUrl=job_data.get("applyUrl", ""),
            location_type=location_type,
            employment_type=employment_type,
            createdAt=int(job_data.get("createdAt", 0)),
            categories=categories,
            description=job_data.get("description", ""),
            descriptionPlain=job_data.get("descriptionPlain", ""),
            lists=job_data.get("lists", []),
            additional=job_data.get("additional", ""),
            additionalPlain=job_data.get("additionalPlain", ""),
            workplaceType=job_data.get("workplaceType"),
        )

    def fetch_job_details(self, company_site: str, job_id: str) -> Dict:
        """
        Fetch detailed information for a specific job

        Args:
            company_site: Company's Lever site identifier
            job_id: Lever job ID

        Returns:
            Detailed job data
        """
        try:
            url = f"{self.BASE_URL}/{company_site}/{job_id}"
            self._wait_for_rate_limit()

            response = requests.get(url, params={"mode": "json"}, timeout=30)
            response.raise_for_status()

            self._request_times.append(datetime.utcnow())
            return response.json()

        except requests.exceptions.RequestException as e:
            raise ServiceError(f"Failed to fetch Lever job details: {str(e)}")

    def get_companies_with_lever(
        self, company_identifiers: List[str]
    ) -> Dict[str, str]:
        """
        Check which companies have active Lever job boards

        Args:
            company_identifiers: List of company identifiers to check

        Returns:
            Dict mapping company identifier to validated site name
        """
        active_companies = {}

        for identifier in company_identifiers:
            try:
                # Test if company site exists
                test_url = f"{self.BASE_URL}/{identifier}"
                response = requests.get(test_url, params={"mode": "json"}, timeout=10)

                if response.status_code == 200:
                    data = response.json()
                    if len(data) > 0:  # Has active jobs
                        active_companies[identifier] = identifier

            except requests.exceptions.RequestException:
                continue

        return active_companies

    def validate_company_site(self, company_site: str) -> bool:
        """
        Validate that a company site is accessible

        Args:
            company_site: Company site identifier to validate

        Returns:
            True if valid, False otherwise
        """
        try:
            self._make_request(company_site, params={"mode": "json"})
            return True
        except ServiceError:
            return False

    def get_all_locations(self, company_site: str) -> List[str]:
        """
        Get all unique locations from a company's job postings

        Args:
            company_site: Company's Lever site identifier

        Returns:
            List of unique location names
        """
        try:
            jobs_data = self._make_request(company_site, params={"mode": "json"})

            locations = set()
            for job_data in jobs_data:
                if "categories" in job_data and job_data["categories"].get("location"):
                    locations.add(job_data["categories"]["location"])

            return sorted(list(locations))

        except Exception as e:
            raise ServiceError(f"Failed to fetch locations: {str(e)}")

    def get_all_teams(self, company_site: str) -> List[str]:
        """
        Get all unique teams/departments from a company's job postings

        Args:
            company_site: Company's Lever site identifier

        Returns:
            List of unique team names
        """
        try:
            jobs_data = self._make_request(company_site, params={"mode": "json"})

            teams = set()
            for job_data in jobs_data:
                if "categories" in job_data:
                    if job_data["categories"].get("team"):
                        teams.add(job_data["categories"]["team"])
                    if job_data["categories"].get("department"):
                        teams.add(job_data["categories"]["department"])

            return sorted(list(teams))

        except Exception as e:
            raise ServiceError(f"Failed to fetch teams: {str(e)}")
