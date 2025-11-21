"""Applicant Filtering Service

Issue #59: Applicant Filtering & Sorting - ATS Core Features
Handles dynamic filtering, sorting, and searching of job applicants
"""

from dataclasses import dataclass
from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy.orm import Session, joinedload
from sqlalchemy import or_, and_, func

from app.db.models.application import Application
from app.db.models.user import User, Profile


@dataclass
class FilterParams:
    """Filter parameters for applicant filtering"""
    # Filtering options
    status: Optional[List[str]] = None
    min_fit_index: Optional[int] = None
    max_fit_index: Optional[int] = None
    applied_after: Optional[datetime] = None
    applied_before: Optional[datetime] = None
    assigned_to: Optional[str] = None  # User ID
    tags: Optional[List[str]] = None
    search: Optional[str] = None  # Search by candidate name/email
    unassigned: Optional[bool] = None  # Filter unassigned applicants

    # Sorting options
    sort_by: str = "applied_at"  # "fit_index" | "applied_at" | "experience"
    order: str = "desc"  # "desc" | "asc"

    # Pagination
    page: int = 1
    limit: int = 50


class ApplicantFilteringService:
    """Service for filtering and sorting job applicants"""

    def __init__(self, db: Session):
        self.db = db

    def filter_applicants(
        self,
        job_id: UUID,
        filters: FilterParams
    ) -> List[Application]:
        """
        Filter and sort applicants for a job

        Args:
            job_id: Job ID to filter applicants for
            filters: FilterParams object with all filter criteria

        Returns:
            List of filtered and sorted Application objects
        """
        query = self._build_base_query(job_id)
        query = self._apply_filters(query, filters)
        query = self._apply_sorting(query, filters)

        return query.all()

    def filter_applicants_with_pagination(
        self,
        job_id: UUID,
        filters: FilterParams
    ) -> Tuple[List[Application], int]:
        """
        Filter and sort applicants with pagination

        Args:
            job_id: Job ID to filter applicants for
            filters: FilterParams object with all filter criteria

        Returns:
            Tuple of (filtered applications, total count)
        """
        query = self._build_base_query(job_id)
        query = self._apply_filters(query, filters)

        # Get total count before pagination
        total_count = query.count()

        # Apply sorting
        query = self._apply_sorting(query, filters)

        # Apply pagination
        offset = (filters.page - 1) * filters.limit
        query = query.offset(offset).limit(filters.limit)

        return query.all(), total_count

    def _build_base_query(self, job_id: UUID):
        """Build base query with joins"""
        return (
            self.db.query(Application)
            .join(User, Application.user_id == User.id)
            .outerjoin(Profile, User.id == Profile.user_id)
            .filter(Application.job_id == job_id)
            .options(joinedload(Application.user).joinedload(User.profile))
        )

    def _apply_filters(self, query, filters: FilterParams):
        """Apply all filter conditions to the query"""

        # Filter by status (multiple values)
        if filters.status:
            query = query.filter(Application.status.in_(filters.status))

        # Filter by minimum fit index
        if filters.min_fit_index is not None:
            query = query.filter(Application.fit_index >= filters.min_fit_index)

        # Filter by maximum fit index
        if filters.max_fit_index is not None:
            query = query.filter(Application.fit_index <= filters.max_fit_index)

        # Filter by date range - applied after
        if filters.applied_after:
            query = query.filter(Application.applied_at >= filters.applied_after)

        # Filter by date range - applied before
        if filters.applied_before:
            query = query.filter(Application.applied_at <= filters.applied_before)

        # Filter by assigned team member
        if filters.assigned_to:
            # Use LIKE for SQLite compatibility, json_contains for PostgreSQL
            # In production (PostgreSQL), this will be optimized
            query = query.filter(
                Application.assigned_to.contains(filters.assigned_to)
            )

        # Filter unassigned applicants
        if filters.unassigned:
            query = query.filter(
                or_(
                    Application.assigned_to == None,
                    Application.assigned_to == [],
                    Application.assigned_to == "[]"
                )
            )

        # Filter by tags
        if filters.tags:
            # Check if any of the requested tags are present
            tag_conditions = []
            for tag in filters.tags:
                # Use contains for SQLite compatibility
                tag_conditions.append(
                    Application.tags.contains(tag)
                )
            query = query.filter(or_(*tag_conditions))

        # Search by candidate name or email
        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.filter(
                or_(
                    Profile.first_name.ilike(search_term),
                    Profile.last_name.ilike(search_term),
                    User.email.ilike(search_term),
                    # Use || for SQLite compatibility instead of concat
                    (Profile.first_name + ' ' + Profile.last_name).ilike(search_term)
                )
            )

        return query

    def _apply_sorting(self, query, filters: FilterParams):
        """Apply sorting to the query"""

        # Determine sort column
        if filters.sort_by == "fit_index":
            sort_column = Application.fit_index
        elif filters.sort_by == "applied_at":
            sort_column = Application.applied_at
        elif filters.sort_by == "experience":
            # Assuming experience would be on User model or calculated
            # For now, default to applied_at
            sort_column = Application.applied_at
        else:
            sort_column = Application.applied_at

        # Apply order (desc or asc)
        if filters.order == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())

        return query

    def get_filter_statistics(self, job_id: UUID) -> dict:
        """
        Get statistics for filter options

        Returns counts for each status, fit index ranges, etc.
        Useful for showing filter counts in UI
        """
        # Count by status
        status_counts = (
            self.db.query(
                Application.status,
                func.count(Application.id).label('count')
            )
            .filter(Application.job_id == job_id)
            .group_by(Application.status)
            .all()
        )

        # Count by fit index ranges
        fit_ranges = [
            ("high", 80, 100),
            ("medium", 60, 79),
            ("low", 0, 59),
        ]

        fit_index_counts = {}
        for range_name, min_fit, max_fit in fit_ranges:
            count = (
                self.db.query(func.count(Application.id))
                .filter(
                    Application.job_id == job_id,
                    Application.fit_index >= min_fit,
                    Application.fit_index <= max_fit
                )
                .scalar()
            )
            fit_index_counts[range_name] = count

        # Count unassigned
        unassigned_count = (
            self.db.query(func.count(Application.id))
            .filter(
                Application.job_id == job_id,
                or_(
                    Application.assigned_to == None,
                    func.json_length(Application.assigned_to) == 0
                )
            )
            .scalar()
        )

        return {
            "status_counts": {status: count for status, count in status_counts},
            "fit_index_counts": fit_index_counts,
            "unassigned_count": unassigned_count,
            "total_count": self.db.query(func.count(Application.id)).filter(
                Application.job_id == job_id
            ).scalar()
        }

    def save_filter_preset(
        self,
        user_id: UUID,
        name: str,
        filters: FilterParams
    ) -> dict:
        """
        Save a filter preset for quick access

        This would store in a FilterPreset model (to be created)
        Returns the saved preset
        """
        # TODO: Implement FilterPreset model and persistence
        # For now, return the filter params as dict
        return {
            "name": name,
            "filters": filters.__dict__
        }
