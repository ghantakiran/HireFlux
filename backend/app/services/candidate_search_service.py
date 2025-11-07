"""
Candidate Search Service

Advanced search functionality for candidate profiles with filtering, pagination, and faceting.
Implements business logic for employer candidate discovery.
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, String, Text
from typing import List, Optional
from uuid import UUID
from decimal import Decimal
import math
import json

from app.db.models.candidate_profile import CandidateProfile
from app.schemas.candidate_profile import (
    CandidateSearchFilters,
    CandidateSearchResult,
    CandidateProfilePublic,
)


class CandidateSearchService:
    """
    Service for searching and filtering candidate profiles.
    Enables employers to discover qualified candidates.
    """

    def __init__(self, db: Session):
        self.db = db

    def search_candidates(
        self, filters: CandidateSearchFilters
    ) -> CandidateSearchResult:
        """
        Search candidates with advanced filtering.

        Args:
            filters: Search filters including skills, experience, location, salary, etc.

        Returns:
            CandidateSearchResult with profiles, total count, and pagination metadata
        """
        # Start with base query - only public profiles
        query = self.db.query(CandidateProfile).filter(
            CandidateProfile.visibility == "public"
        )

        # Apply filters
        query = self._apply_skills_filter(query, filters.skills)
        query = self._apply_experience_filter(
            query,
            filters.experience_level,
            filters.min_years_experience,
            filters.max_years_experience,
        )
        query = self._apply_location_filter(
            query, filters.location, filters.remote_only, filters.location_type
        )
        query = self._apply_salary_filter(query, filters.min_salary, filters.max_salary)
        query = self._apply_availability_filter(query, filters.availability_status)
        query = self._apply_preferred_roles_filter(query, filters.preferred_roles)

        # Get total count before pagination
        total = query.count()

        # Calculate pagination
        total_pages = math.ceil(total / filters.limit) if total > 0 else 0

        # Apply ordering (most recently updated first)
        query = query.order_by(CandidateProfile.updated_at.desc())

        # Apply pagination
        offset = (filters.page - 1) * filters.limit
        query = query.offset(offset).limit(filters.limit)

        # Execute query
        profiles = query.all()

        # Convert to Pydantic schemas
        profile_schemas = [
            CandidateProfilePublic.from_orm(profile) for profile in profiles
        ]

        # Build result
        result = CandidateSearchResult(
            profiles=profile_schemas,
            total=total,
            page=filters.page,
            limit=filters.limit,
            total_pages=total_pages,
        )

        return result

    # ===========================================================================
    # Private Filter Methods
    # ===========================================================================

    def _apply_skills_filter(self, query, skills: Optional[List[str]]):
        """
        Filter by skills (AND logic - candidate must have ALL specified skills).
        Case-insensitive matching.
        Works with both SQLite and PostgreSQL by converting JSON to text.
        """
        if not skills:
            return query

        for skill in skills:
            # Cast JSON array to text and search for skill (case-insensitive)
            # This works for both SQLite and PostgreSQL
            # Format: Search for "skill" within JSON text representation
            skill_pattern = f'%"{skill.lower()}"%'
            query = query.filter(
                func.lower(func.cast(CandidateProfile.skills, Text)).like(skill_pattern)
            )

        return query

    def _apply_experience_filter(
        self,
        query,
        experience_levels: Optional[List[str]],
        min_years: Optional[int],
        max_years: Optional[int],
    ):
        """
        Filter by experience level and/or years of experience.
        Multiple experience levels use OR logic.
        """
        conditions = []

        # Experience level filter (OR logic)
        if experience_levels:
            conditions.append(CandidateProfile.experience_level.in_(experience_levels))

        # Years experience filters
        if min_years is not None:
            conditions.append(CandidateProfile.years_experience >= min_years)

        if max_years is not None:
            conditions.append(CandidateProfile.years_experience <= max_years)

        if conditions:
            query = query.filter(and_(*conditions))

        return query

    def _apply_location_filter(
        self,
        query,
        location: Optional[str],
        remote_only: Optional[bool],
        location_type: Optional[str],
    ):
        """
        Filter by location, remote preference, and location type.
        """
        conditions = []

        # Location string filter (case-insensitive partial match)
        if location:
            conditions.append(
                func.lower(CandidateProfile.location).contains(func.lower(location))
            )

        # Remote only filter
        if remote_only is True:
            conditions.append(CandidateProfile.open_to_remote == True)

        # Location type filter
        if location_type:
            conditions.append(CandidateProfile.preferred_location_type == location_type)

        if conditions:
            query = query.filter(and_(*conditions))

        return query

    def _apply_salary_filter(
        self, query, min_salary: Optional[Decimal], max_salary: Optional[Decimal]
    ):
        """
        Filter by salary expectations (overlap logic).

        Logic:
        - min_salary: Candidate's max salary must be >= employer's min salary
        - max_salary: Candidate's min salary must be <= employer's max salary

        This ensures salary ranges overlap.
        """
        conditions = []

        if min_salary is not None:
            # Candidate's expected max must be at least the employer's min
            conditions.append(CandidateProfile.expected_salary_max >= min_salary)

        if max_salary is not None:
            # Candidate's expected min must be at most the employer's max
            conditions.append(CandidateProfile.expected_salary_min <= max_salary)

        if conditions:
            query = query.filter(and_(*conditions))

        return query

    def _apply_availability_filter(
        self, query, availability_statuses: Optional[List[str]]
    ):
        """
        Filter by availability status (OR logic).
        """
        if not availability_statuses:
            return query

        query = query.filter(
            CandidateProfile.availability_status.in_(availability_statuses)
        )

        return query

    def _apply_preferred_roles_filter(
        self, query, preferred_roles: Optional[List[str]]
    ):
        """
        Filter by preferred roles (OR logic - candidate prefers ANY of the specified roles).
        Works with both SQLite and PostgreSQL by converting JSON to text.
        """
        if not preferred_roles:
            return query

        # Check if any of the preferred roles match
        # Cast JSON to text and search (case-insensitive)
        role_conditions = []
        for role in preferred_roles:
            role_pattern = f'%"{role.lower()}"%'
            role_conditions.append(
                func.lower(func.cast(CandidateProfile.preferred_roles, Text)).like(
                    role_pattern
                )
            )

        query = query.filter(or_(*role_conditions))

        return query
