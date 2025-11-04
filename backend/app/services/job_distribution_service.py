"""Job Distribution Service (Sprint 11-12 Phase 3B)

Distributes jobs to multiple job boards:
- LinkedIn
- Indeed
- Glassdoor
- Internal job board
"""
import asyncio
from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.schemas.bulk_job_posting import (
    DistributionChannelEnum,
    DistributionStatusEnum,
    DistributionCreate,
    BulkDistributionCreate,
    DistributionResponse,
    DistributionMetrics,
    DistributionDashboard,
)
from app.core.exceptions import ServiceError
from app.services.linkedin_integration import LinkedInJobAPI
from app.services.indeed_integration import IndeedJobAPI
from app.services.glassdoor_integration import GlassdoorJobAPI


class JobDistributionService:
    """Service for distributing jobs to external job boards"""

    # Platform-specific configuration
    LINKEDIN_MAX_TITLE_LENGTH = 100
    INDEED_MAX_TITLE_LENGTH = 120
    GLASSDOOR_MAX_TITLE_LENGTH = 100

    # Rate limiting (requests per minute)
    LINKEDIN_RATE_LIMIT = 50
    INDEED_RATE_LIMIT = 60
    GLASSDOOR_RATE_LIMIT = 40

    # Retry configuration
    DEFAULT_MAX_RETRIES = 3
    RETRY_BACKOFF_BASE = 2  # Exponential backoff multiplier

    def __init__(self, db: AsyncSession):
        """Initialize job distribution service"""
        self.db = db

        # Initialize API clients
        self._linkedin_client = LinkedInJobAPI()
        self._indeed_client = IndeedJobAPI()
        self._glassdoor_client = GlassdoorJobAPI()

        # Rate limiters (simple in-memory, production should use Redis)
        self._rate_limiters = {
            DistributionChannelEnum.LINKEDIN: asyncio.Queue(maxsize=self.LINKEDIN_RATE_LIMIT),
            DistributionChannelEnum.INDEED: asyncio.Queue(maxsize=self.INDEED_RATE_LIMIT),
            DistributionChannelEnum.GLASSDOOR: asyncio.Queue(maxsize=self.GLASSDOOR_RATE_LIMIT),
        }

    async def publish_to_channel(
        self,
        job_data: Dict[str, Any],
        distribution: DistributionCreate
    ) -> Dict[str, Any]:
        """
        Publish a single job to a specific channel.

        Args:
            job_data: Job data to publish
            distribution: Distribution configuration

        Returns:
            Distribution result with status and external IDs

        Raises:
            ServiceError: If publication fails
        """
        try:
            # Validate job data for the specific channel
            validation_error = self._validate_for_channel(job_data, distribution.channel)
            if validation_error:
                return {
                    "job_id": job_data.get("id"),
                    "channel": distribution.channel,
                    "status": DistributionStatusEnum.FAILED,
                    "external_post_id": None,
                    "external_post_url": None,
                    "error_message": validation_error,
                    "retry_count": 0
                }

            # Route to appropriate channel
            if distribution.channel == DistributionChannelEnum.LINKEDIN:
                return await self._publish_to_linkedin(job_data, distribution)
            elif distribution.channel == DistributionChannelEnum.INDEED:
                return await self._publish_to_indeed(job_data, distribution)
            elif distribution.channel == DistributionChannelEnum.GLASSDOOR:
                return await self._publish_to_glassdoor(job_data, distribution)
            elif distribution.channel == DistributionChannelEnum.INTERNAL:
                return await self._publish_to_internal(job_data, distribution)
            else:
                raise ServiceError(f"Unsupported channel: {distribution.channel}")

        except Exception as e:
            return {
                "job_id": job_data.get("id"),
                "channel": distribution.channel,
                "status": DistributionStatusEnum.FAILED,
                "external_post_id": None,
                "external_post_url": None,
                "error_message": str(e),
                "retry_count": 0
            }

    def _validate_for_channel(self, job_data: Dict[str, Any], channel: DistributionChannelEnum) -> Optional[str]:
        """
        Validate job data for specific channel requirements.

        Returns:
            Error message if validation fails, None otherwise
        """
        # Common required fields
        if not job_data.get("title"):
            return "Job title is required"

        # Channel-specific validation
        if channel == DistributionChannelEnum.LINKEDIN:
            if not job_data.get("description"):
                return "LinkedIn requires job description"
            if len(job_data.get("title", "")) > self.LINKEDIN_MAX_TITLE_LENGTH:
                return f"LinkedIn title must be ≤ {self.LINKEDIN_MAX_TITLE_LENGTH} characters"

        elif channel == DistributionChannelEnum.INDEED:
            if len(job_data.get("title", "")) > self.INDEED_MAX_TITLE_LENGTH:
                return f"Indeed title must be ≤ {self.INDEED_MAX_TITLE_LENGTH} characters"

        elif channel == DistributionChannelEnum.GLASSDOOR:
            if not job_data.get("salary_min") or not job_data.get("salary_max"):
                return "Glassdoor requires salary range"
            if len(job_data.get("title", "")) > self.GLASSDOOR_MAX_TITLE_LENGTH:
                return f"Glassdoor title must be ≤ {self.GLASSDOOR_MAX_TITLE_LENGTH} characters"

        return None

    async def _publish_to_linkedin(
        self,
        job_data: Dict[str, Any],
        distribution: DistributionCreate
    ) -> Dict[str, Any]:
        """Publish job to LinkedIn"""
        try:
            response = await self._linkedin_client.post_job({
                "title": job_data["title"],
                "description": job_data["description"],
                "location": job_data.get("location", "Remote"),
                "employmentType": job_data.get("employment_type", "FULL_TIME").upper(),
                "experienceLevel": job_data.get("experience_level", "MID_SENIOR_LEVEL").upper(),
                "companyId": job_data.get("company_id"),
            })

            return {
                "job_id": job_data["id"],
                "channel": DistributionChannelEnum.LINKEDIN,
                "status": DistributionStatusEnum.PUBLISHED,
                "external_post_id": response.get("id"),
                "external_post_url": response.get("url"),
                "error_message": None,
                "retry_count": 0,
                "published_at": datetime.utcnow()
            }

        except Exception as e:
            raise ServiceError(f"LinkedIn API Error: {str(e)}")

    async def _publish_to_indeed(
        self,
        job_data: Dict[str, Any],
        distribution: DistributionCreate
    ) -> Dict[str, Any]:
        """Publish job to Indeed"""
        try:
            response = await self._indeed_client.post_job({
                "title": job_data["title"],
                "description": job_data.get("description", ""),
                "location": job_data.get("location", "Remote"),
                "employmentType": job_data.get("employment_type", "FULLTIME"),
                "experienceLevel": job_data.get("experience_level", "MID_LEVEL"),
                "salaryMin": job_data.get("salary_min"),
                "salaryMax": job_data.get("salary_max"),
                "company": job_data.get("company_id"),
            })

            return {
                "job_id": job_data["id"],
                "channel": DistributionChannelEnum.INDEED,
                "status": DistributionStatusEnum.PUBLISHED,
                "external_post_id": response.get("jobId"),
                "external_post_url": response.get("url"),
                "error_message": None,
                "retry_count": 0,
                "published_at": datetime.utcnow()
            }

        except TimeoutError as e:
            raise ServiceError(f"Indeed API timeout: {str(e)}")
        except Exception as e:
            raise ServiceError(f"Indeed API Error: {str(e)}")

    async def _publish_to_glassdoor(
        self,
        job_data: Dict[str, Any],
        distribution: DistributionCreate
    ) -> Dict[str, Any]:
        """Publish job to Glassdoor"""
        try:
            response = await self._glassdoor_client.post_job({
                "jobTitle": job_data["title"],
                "jobDescription": job_data.get("description", ""),
                "location": job_data.get("location", "Remote"),
                "employmentType": job_data.get("employment_type", "FULL_TIME"),
                "salaryMin": job_data["salary_min"],
                "salaryMax": job_data["salary_max"],
                "employerId": job_data.get("company_id"),
            })

            return {
                "job_id": job_data["id"],
                "channel": DistributionChannelEnum.GLASSDOOR,
                "status": DistributionStatusEnum.PUBLISHED,
                "external_post_id": response.get("jobListingId"),
                "external_post_url": response.get("jobUrl"),
                "error_message": None,
                "retry_count": 0,
                "published_at": datetime.utcnow()
            }

        except Exception as e:
            raise ServiceError(f"Glassdoor API Error: {str(e)}")

    async def _publish_to_internal(
        self,
        job_data: Dict[str, Any],
        distribution: DistributionCreate
    ) -> Dict[str, Any]:
        """Publish job to internal job board"""
        # Internal publishing doesn't require external API calls
        return {
            "job_id": job_data["id"],
            "channel": DistributionChannelEnum.INTERNAL,
            "status": DistributionStatusEnum.PUBLISHED,
            "external_post_id": job_data["id"],  # Use internal job ID
            "external_post_url": None,
            "error_message": None,
            "retry_count": 0,
            "published_at": datetime.utcnow()
        }

    async def bulk_distribute(
        self,
        jobs: List[Dict[str, Any]],
        distribution: BulkDistributionCreate,
        skip_on_error: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Distribute multiple jobs to multiple channels.

        Args:
            jobs: List of job data
            distribution: Bulk distribution configuration
            skip_on_error: If True, continue on errors; if False, raise on first error

        Returns:
            List of distribution results
        """
        results = []

        for job in jobs:
            for channel in distribution.channels:
                dist_create = DistributionCreate(
                    job_id=job["id"],
                    channel=channel,
                    scheduled_publish_at=distribution.scheduled_publish_at
                )

                try:
                    if distribution.scheduled_publish_at:
                        # Create scheduled distribution
                        result = await self.create_scheduled_distribution(job, dist_create)
                    else:
                        # Publish immediately
                        result = await self.publish_to_channel(job, dist_create)

                    # Check if result indicates failure due to validation
                    if result["status"] == DistributionStatusEnum.FAILED and not skip_on_error:
                        raise ServiceError(f"Failed to distribute job {job['id']} to {channel}: {result.get('error_message', 'Unknown error')}")

                    results.append(result)

                except Exception as e:
                    if skip_on_error:
                        results.append({
                            "job_id": job["id"],
                            "channel": channel,
                            "status": DistributionStatusEnum.FAILED,
                            "error_message": str(e),
                            "retry_count": 0
                        })
                    else:
                        raise ServiceError(f"Failed to distribute job {job['id']} to {channel}: {str(e)}")

        return results

    async def publish_with_retry(
        self,
        job_data: Dict[str, Any],
        distribution: DistributionCreate,
        max_retries: int = DEFAULT_MAX_RETRIES
    ) -> Dict[str, Any]:
        """
        Publish with automatic retry on failure.

        Args:
            job_data: Job data to publish
            distribution: Distribution configuration
            max_retries: Maximum number of retry attempts

        Returns:
            Distribution result
        """
        last_error = None
        retry_count = 0

        for attempt in range(max_retries + 1):
            try:
                result = await self.publish_to_channel(job_data, distribution)

                if result["status"] == DistributionStatusEnum.PUBLISHED:
                    result["retry_count"] = retry_count
                    return result

                # If validation failed, don't retry
                if "validation" in result.get("error_message", "").lower():
                    return result

                last_error = result.get("error_message", "Unknown error")

            except Exception as e:
                last_error = str(e)

            # If not last attempt, wait with exponential backoff
            if attempt < max_retries:
                retry_count += 1
                backoff_seconds = self.RETRY_BACKOFF_BASE ** attempt
                await asyncio.sleep(backoff_seconds)

        # All retries exhausted
        return {
            "job_id": job_data["id"],
            "channel": distribution.channel,
            "status": DistributionStatusEnum.FAILED,
            "external_post_id": None,
            "external_post_url": None,
            "error_message": f"Failed after {max_retries} retries: {last_error}",
            "retry_count": retry_count
        }

    async def retry_distribution(self, distribution_id: str) -> Dict[str, Any]:
        """
        Retry a failed distribution.

        Args:
            distribution_id: ID of failed distribution

        Returns:
            Updated distribution result

        Raises:
            ServiceError: If max retries exceeded or distribution not found
        """
        # Get existing distribution
        distribution = await self._get_distribution(distribution_id)

        if distribution["retry_count"] >= distribution["max_retries"]:
            raise ServiceError(f"Max retries ({distribution['max_retries']}) exceeded for distribution {distribution_id}")

        # Get job data (mock for now - would query from DB in real implementation)
        job_data = await self._get_job_data(distribution["job_id"])

        # Create distribution config
        dist_create = DistributionCreate(
            job_id=distribution["job_id"],
            channel=distribution["channel"]
        )

        # Retry publication
        result = await self.publish_to_channel(job_data, dist_create)
        result["id"] = distribution_id
        result["retry_count"] = distribution["retry_count"] + 1

        # Update distribution in DB (mock for now)
        await self._update_distribution(distribution_id, result)

        return result

    async def create_scheduled_distribution(
        self,
        job_data: Dict[str, Any],
        distribution: DistributionCreate
    ) -> Dict[str, Any]:
        """
        Create a scheduled distribution for future publishing.

        Args:
            job_data: Job data to publish
            distribution: Distribution configuration with scheduled_publish_at

        Returns:
            Distribution result with PENDING status
        """
        return {
            "job_id": job_data["id"],
            "channel": distribution.channel,
            "status": DistributionStatusEnum.PENDING,
            "external_post_id": None,
            "external_post_url": None,
            "error_message": None,
            "retry_count": 0,
            "scheduled_publish_at": distribution.scheduled_publish_at,
            "published_at": None
        }

    async def process_scheduled_distributions(self) -> List[Dict[str, Any]]:
        """
        Process distributions scheduled for current time.

        Returns:
            List of processed distributions
        """
        now = datetime.utcnow()

        # Get pending distributions scheduled for now or earlier
        pending_distributions = await self._get_pending_scheduled_distributions()

        results = []

        for dist in pending_distributions:
            # Skip if scheduled for future
            if dist["scheduled_publish_at"] > now:
                continue

            # Get job data
            job_data = await self._get_job_data(dist["job_id"])

            # Create distribution config
            dist_create = DistributionCreate(
                job_id=dist["job_id"],
                channel=dist["channel"]
            )

            # Publish
            result = await self.publish_to_channel(job_data, dist_create)
            result["id"] = dist["id"]  # Include distribution ID

            # Update distribution in DB
            await self._update_distribution(dist["id"], result)

            results.append(result)

        return results

    async def update_metrics(
        self,
        distribution_id: str,
        views_count: int = 0,
        applications_count: int = 0,
        clicks_count: int = 0
    ) -> Dict[str, Any]:
        """
        Update distribution metrics.

        Args:
            distribution_id: Distribution ID
            views_count: Number of views
            applications_count: Number of applications
            clicks_count: Number of clicks

        Returns:
            Updated distribution with metrics
        """
        # Mock implementation - would update DB in real implementation
        return {
            "id": distribution_id,
            "views_count": views_count,
            "applications_count": applications_count,
            "clicks_count": clicks_count,
            "updated_at": datetime.utcnow()
        }

    async def get_distribution_dashboard(self, upload_id: str) -> Dict[str, Any]:
        """
        Get distribution dashboard for an upload.

        Args:
            upload_id: Upload ID

        Returns:
            Dashboard with distributions and aggregated metrics
        """
        # Get all distributions for upload
        distributions = await self._get_distributions_by_upload(upload_id)

        # Calculate aggregated metrics
        total_views = sum(d.get("views_count", 0) for d in distributions)
        total_applications = sum(d.get("applications_count", 0) for d in distributions)
        total_clicks = sum(d.get("clicks_count", 0) for d in distributions)

        # Count by channel
        by_channel = {}
        for d in distributions:
            channel = d.get("channel", "unknown")
            by_channel[channel] = by_channel.get(channel, 0) + 1

        # Count by status
        by_status = {}
        for d in distributions:
            status = d.get("status", "unknown")
            by_status[status] = by_status.get(status, 0) + 1

        # Count unique jobs (safely handle missing job_id)
        job_ids = set()
        for d in distributions:
            if "job_id" in d:
                job_ids.add(d["job_id"])

        metrics = {
            "total_distributions": len(distributions),
            "by_channel": by_channel,
            "by_status": by_status,
            "total_views": total_views,
            "total_applications": total_applications,
            "total_clicks": total_clicks
        }

        return {
            "upload_id": upload_id,
            "total_jobs": len(job_ids) if job_ids else 0,
            "distributions": distributions,
            "metrics": metrics
        }

    async def list_distributions(
        self,
        company_id: str,
        status_filter: Optional[DistributionStatusEnum] = None,
        page: int = 1,
        limit: int = 20
    ) -> Dict[str, Any]:
        """
        List distributions for a company with optional filtering.

        Args:
            company_id: Company ID
            status_filter: Optional status filter
            page: Page number
            limit: Results per page

        Returns:
            Paginated list of distributions
        """
        # Mock implementation - would query DB in real implementation
        distributions = await self._get_distributions_by_company(company_id)

        # Filter by status if provided
        if status_filter:
            distributions = [d for d in distributions if d["status"] == status_filter]

        # Paginate
        start = (page - 1) * limit
        end = start + limit
        paginated = distributions[start:end]

        return {
            "distributions": paginated,
            "total": len(distributions),
            "page": page,
            "limit": limit
        }

    # Helper methods (mock implementations - would interact with DB in real implementation)

    async def _get_distribution(self, distribution_id: str) -> Dict[str, Any]:
        """Get distribution by ID"""
        # Mock - would query DB
        return {}

    async def _get_job_data(self, job_id: str) -> Dict[str, Any]:
        """Get job data by ID"""
        # Mock - would query DB
        return {}

    async def _update_distribution(self, distribution_id: str, data: Dict[str, Any]) -> None:
        """Update distribution in DB"""
        # Mock - would update DB
        pass

    async def _get_pending_scheduled_distributions(self) -> List[Dict[str, Any]]:
        """Get pending scheduled distributions"""
        # Mock - would query DB
        return []

    async def _get_distributions_by_upload(self, upload_id: str) -> List[Dict[str, Any]]:
        """Get all distributions for an upload"""
        # Mock - would query DB
        return []

    async def _get_distributions_by_company(self, company_id: str) -> List[Dict[str, Any]]:
        """Get all distributions for a company"""
        # Mock - would query DB
        return []
