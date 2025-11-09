"""API Key Service for Sprint 17-18

Service layer for API key management including creation, validation,
rate limiting, and usage tracking.
"""

import hashlib
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from uuid import UUID

from sqlalchemy import and_, func
from sqlalchemy.orm import Session

from app.db.models.api_key import APIKey, APIKeyUsage
from app.db.models.company import Company
from app.schemas.api_key import APIKeyCreate, APIKeyUpdate, APIKeyPermissions


class APIKeyService:
    """Service for managing API keys"""

    def __init__(self, db: Session):
        """Initialize service with database session"""
        self.db = db

    # ========================================================================
    # API KEY CREATION
    # ========================================================================

    def create_api_key(
        self,
        company_id: UUID,
        user_id: UUID,
        key_data: APIKeyCreate,
    ) -> Dict:
        """
        Create a new API key for a company

        Args:
            company_id: Company UUID
            user_id: User creating the key
            key_data: API key creation data

        Returns:
            Dict with api_key and plaintext_key (only shown once)

        Raises:
            PermissionError: If company plan doesn't support API access
        """
        # Check company subscription tier (API access: Professional+)
        company = self.db.query(Company).filter(Company.id == company_id).first()
        if company.subscription_tier not in ["professional", "enterprise"]:
            raise PermissionError(
                "API access not available on your plan. Upgrade to Professional or Enterprise."
            )

        # Generate plaintext API key
        plaintext_key = self._generate_api_key()

        # Hash the key for storage
        key_hash = self._hash_api_key(plaintext_key)

        # Extract key prefix (first 16 chars for display)
        key_prefix = plaintext_key[:16]

        # Determine rate limits based on tier
        rate_limits = self._get_rate_limits(key_data.rate_limit_tier)

        # Create API key record
        api_key = APIKey(
            company_id=company_id,
            name=key_data.name,
            key_prefix=key_prefix,
            key_hash=key_hash,
            permissions=key_data.permissions.model_dump() if key_data.permissions else self._default_permissions(),
            rate_limit_tier=key_data.rate_limit_tier,
            rate_limit_requests_per_minute=rate_limits["per_minute"],
            rate_limit_requests_per_hour=rate_limits["per_hour"],
            expires_at=key_data.expires_at,
            created_by=user_id,
            status="active",
        )

        self.db.add(api_key)
        self.db.commit()
        self.db.refresh(api_key)

        return {
            "api_key": api_key,
            "plaintext_key": plaintext_key,  # Only returned once!
        }

    def _generate_api_key(self) -> str:
        """
        Generate a cryptographically secure API key

        Format: hf_live_<48_random_chars>
        Total length: 56 characters
        """
        random_part = secrets.token_urlsafe(36)  # 48 chars when base64 encoded
        return f"hf_live_{random_part}"

    def _hash_api_key(self, plaintext_key: str) -> str:
        """Hash API key using SHA-256"""
        return hashlib.sha256(plaintext_key.encode()).hexdigest()

    def _default_permissions(self) -> Dict:
        """Default read-only permissions"""
        return {
            "jobs": ["read"],
            "candidates": ["read"],
            "applications": ["read"],
            "webhooks": [],
            "analytics": [],
        }

    def _get_rate_limits(self, tier: str) -> Dict[str, int]:
        """Get rate limits for a given tier"""
        limits = {
            "standard": {"per_minute": 60, "per_hour": 3000},
            "elevated": {"per_minute": 120, "per_hour": 6000},
            "enterprise": {"per_minute": 300, "per_hour": 15000},
        }
        return limits.get(tier, limits["standard"])

    # ========================================================================
    # API KEY VALIDATION
    # ========================================================================

    def validate_api_key(
        self,
        plaintext_key: str,
        ip_address: Optional[str] = None,
    ) -> Optional[APIKey]:
        """
        Validate an API key and update last used timestamp

        Args:
            plaintext_key: Plaintext API key from request
            ip_address: Optional IP address of request

        Returns:
            APIKey object if valid, None if invalid/revoked/expired
        """
        # Extract prefix for DB lookup (optimization)
        key_prefix = plaintext_key[:16]

        # Find key by prefix
        api_key = (
            self.db.query(APIKey)
            .filter(APIKey.key_prefix == key_prefix)
            .first()
        )

        if not api_key:
            return None

        # Verify hash
        key_hash = self._hash_api_key(plaintext_key)
        if api_key.key_hash != key_hash:
            return None

        # Check if revoked
        if api_key.status == "revoked":
            return None

        # Check if expired
        if api_key.expires_at and api_key.expires_at < datetime.utcnow():
            # Auto-expire the key
            api_key.status = "expired"
            self.db.commit()
            return None

        # Update last used timestamp and IP
        api_key.last_used_at = datetime.utcnow()
        if ip_address:
            api_key.last_used_ip = ip_address
        self.db.commit()

        return api_key

    # ========================================================================
    # API KEY MANAGEMENT
    # ========================================================================

    def list_api_keys(
        self,
        company_id: UUID,
        page: int = 1,
        page_size: int = 20,
    ) -> Dict:
        """
        List all API keys for a company with pagination

        Args:
            company_id: Company UUID
            page: Page number (1-indexed)
            page_size: Items per page

        Returns:
            Dict with keys, total, page
        """
        query = self.db.query(APIKey).filter(APIKey.company_id == company_id)

        total = query.count()
        keys = (
            query.order_by(APIKey.created_at.desc())
            .offset((page - 1) * page_size)
            .limit(page_size)
            .all()
        )

        return {
            "keys": keys,
            "total": total,
            "page": page,
            "page_size": page_size,
        }

    def get_api_key(
        self,
        key_id: UUID,
        company_id: UUID,
    ) -> Optional[APIKey]:
        """Get a specific API key by ID"""
        return (
            self.db.query(APIKey)
            .filter(
                and_(
                    APIKey.id == key_id,
                    APIKey.company_id == company_id,
                )
            )
            .first()
        )

    def update_api_key(
        self,
        key_id: UUID,
        company_id: UUID,
        update_data: APIKeyUpdate,
    ) -> Optional[APIKey]:
        """
        Update API key properties (name, permissions, rate limit tier)

        Args:
            key_id: API key UUID
            company_id: Company UUID (for authorization)
            update_data: Update data

        Returns:
            Updated APIKey or None if not found
        """
        api_key = self.get_api_key(key_id, company_id)
        if not api_key:
            return None

        # Update fields
        if update_data.name is not None:
            api_key.name = update_data.name

        if update_data.permissions is not None:
            api_key.permissions = update_data.permissions.model_dump()

        if update_data.rate_limit_tier is not None:
            limits = self._get_rate_limits(update_data.rate_limit_tier)
            api_key.rate_limit_tier = update_data.rate_limit_tier
            api_key.rate_limit_requests_per_minute = limits["per_minute"]
            api_key.rate_limit_requests_per_hour = limits["per_hour"]

        api_key.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(api_key)

        return api_key

    def revoke_api_key(
        self,
        key_id: UUID,
        company_id: UUID,
        revoked_by: UUID,
    ) -> Optional[APIKey]:
        """
        Revoke an API key (soft delete)

        Args:
            key_id: API key UUID
            company_id: Company UUID (for authorization)
            revoked_by: User ID who revoked the key

        Returns:
            Revoked APIKey or None if not found
        """
        api_key = self.get_api_key(key_id, company_id)
        if not api_key:
            return None

        api_key.status = "revoked"
        api_key.revoked_at = datetime.utcnow()
        api_key.revoked_by = revoked_by
        self.db.commit()
        self.db.refresh(api_key)

        return api_key

    # ========================================================================
    # RATE LIMITING
    # ========================================================================

    def check_rate_limit(
        self,
        api_key: APIKey,
        window: str = "minute",
    ) -> bool:
        """
        Check if API key has exceeded rate limits

        Args:
            api_key: APIKey object
            window: 'minute' or 'hour'

        Returns:
            True if within limits, False if exceeded
        """
        if window == "minute":
            time_threshold = datetime.utcnow() - timedelta(minutes=1)
            limit = api_key.rate_limit_requests_per_minute
        elif window == "hour":
            time_threshold = datetime.utcnow() - timedelta(hours=1)
            limit = api_key.rate_limit_requests_per_hour
        else:
            raise ValueError(f"Invalid window: {window}")

        # Count requests in time window
        request_count = (
            self.db.query(APIKeyUsage)
            .filter(
                and_(
                    APIKeyUsage.api_key_id == api_key.id,
                    APIKeyUsage.created_at >= time_threshold,
                )
            )
            .count()
        )

        return request_count < limit

    # ========================================================================
    # USAGE TRACKING
    # ========================================================================

    def log_api_usage(
        self,
        api_key: APIKey,
        endpoint: str,
        method: str,
        status_code: int,
        response_time_ms: Optional[int] = None,
        request_size_bytes: Optional[int] = None,
        response_size_bytes: Optional[int] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> APIKeyUsage:
        """
        Log API usage for analytics and rate limiting

        Args:
            api_key: APIKey object
            endpoint: API endpoint path
            method: HTTP method
            status_code: HTTP status code
            response_time_ms: Response time in milliseconds
            request_size_bytes: Request size
            response_size_bytes: Response size
            ip_address: Client IP
            user_agent: Client user agent
            error_message: Error message if failed

        Returns:
            Created APIKeyUsage record
        """
        usage = APIKeyUsage(
            api_key_id=api_key.id,
            company_id=api_key.company_id,
            endpoint=endpoint,
            method=method,
            status_code=status_code,
            response_time_ms=response_time_ms,
            request_size_bytes=request_size_bytes,
            response_size_bytes=response_size_bytes,
            ip_address=ip_address,
            user_agent=user_agent,
            error_message=error_message,
        )

        self.db.add(usage)
        self.db.commit()
        self.db.refresh(usage)

        return usage

    def get_usage_stats(
        self,
        api_key_id: UUID,
        start_date: datetime,
        end_date: datetime,
    ) -> Dict:
        """
        Get usage statistics for an API key

        Args:
            api_key_id: API key UUID
            start_date: Start of date range
            end_date: End of date range

        Returns:
            Dict with usage statistics
        """
        usage_logs = (
            self.db.query(APIKeyUsage)
            .filter(
                and_(
                    APIKeyUsage.api_key_id == api_key_id,
                    APIKeyUsage.created_at >= start_date,
                    APIKeyUsage.created_at <= end_date,
                )
            )
            .all()
        )

        if not usage_logs:
            return {
                "total_requests": 0,
                "requests_by_endpoint": {},
                "requests_by_status": {},
                "avg_response_time_ms": 0,
                "error_rate": 0,
                "period_start": start_date,
                "period_end": end_date,
            }

        # Aggregate statistics
        total_requests = len(usage_logs)
        requests_by_endpoint = {}
        requests_by_status = {}
        total_response_time = 0
        error_count = 0

        for log in usage_logs:
            # Count by endpoint
            requests_by_endpoint[log.endpoint] = (
                requests_by_endpoint.get(log.endpoint, 0) + 1
            )

            # Count by status
            status_key = str(log.status_code)
            requests_by_status[status_key] = (
                requests_by_status.get(status_key, 0) + 1
            )

            # Sum response times
            if log.response_time_ms:
                total_response_time += log.response_time_ms

            # Count errors (4xx and 5xx)
            if log.status_code >= 400:
                error_count += 1

        avg_response_time = total_response_time / total_requests if total_requests > 0 else 0
        error_rate = (error_count / total_requests * 100) if total_requests > 0 else 0

        return {
            "total_requests": total_requests,
            "requests_by_endpoint": requests_by_endpoint,
            "requests_by_status": requests_by_status,
            "avg_response_time_ms": round(avg_response_time, 2),
            "error_rate": round(error_rate, 2),
            "period_start": start_date,
            "period_end": end_date,
        }

    # ========================================================================
    # PERMISSIONS
    # ========================================================================

    def has_permission(
        self,
        api_key: APIKey,
        resource: str,
        action: str,
    ) -> bool:
        """
        Check if API key has specific permission

        Args:
            api_key: APIKey object
            resource: Resource name (jobs, candidates, etc.)
            action: Action (read, write, delete)

        Returns:
            True if permitted, False otherwise
        """
        if resource not in api_key.permissions:
            return False

        return action in api_key.permissions[resource]
