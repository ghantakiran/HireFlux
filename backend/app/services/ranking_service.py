"""Candidate Ranking Service for AI-Powered Fit Scoring

Calculates 0-100 fit index based on weighted factors:
- Skills match: 30%
- Experience level: 20%
- Location match: 15%
- Culture fit: 15%
- Salary expectation: 10%
- Availability: 10%
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
from uuid import UUID

from sqlalchemy.orm import Session, joinedload

from app.db.models.application import Application
from app.db.models.user import User, Profile
from app.db.models.job import Job
from app.schemas.application import FitIndexResponse


class CandidateRankingService:
    """Service for AI-powered candidate ranking"""

    # Weight distribution for fit scoring
    WEIGHTS = {
        "skills_match": 0.30,
        "experience_level": 0.20,
        "location_match": 0.15,
        "culture_fit": 0.15,
        "salary_expectation": 0.10,
        "availability": 0.10,
    }

    def __init__(self, db: Session):
        self.db = db

    def calculate_fit_index(
        self, candidate_user_id: UUID, job_id: UUID
    ) -> FitIndexResponse:
        """
        Calculate comprehensive fit score for a candidate-job pair.

        Args:
            candidate_user_id: User ID of candidate
            job_id: Job ID

        Returns:
            FitIndexResponse with score, explanations, strengths, and concerns
        """
        # Fetch candidate with profile
        candidate = (
            self.db.query(User)
            .options(joinedload(User.profile))
            .filter(User.id == candidate_user_id)
            .first()
        )

        # Fetch job details
        job = self.db.query(Job).filter(Job.id == job_id).first()

        if not candidate or not job:
            raise Exception("Candidate or job not found")

        profile = candidate.profile

        # Calculate individual factor scores
        skills_score = self._calculate_skills_match(profile, job)
        experience_score = self._calculate_experience_match(profile, job)
        location_score = self._calculate_location_match(profile, job)
        culture_score = self._calculate_culture_fit(profile, job)
        salary_score = self._calculate_salary_match(profile, job)
        availability_score = self._calculate_availability_match(profile, job)

        # Calculate weighted total
        total_score = (
            skills_score * self.WEIGHTS["skills_match"]
            + experience_score * self.WEIGHTS["experience_level"]
            + location_score * self.WEIGHTS["location_match"]
            + culture_score * self.WEIGHTS["culture_fit"]
            + salary_score * self.WEIGHTS["salary_expectation"]
            + availability_score * self.WEIGHTS["availability"]
        )

        fit_index = int(total_score)

        # Generate explanations
        explanations = []
        strengths = []
        concerns = []

        # Skills
        if skills_score >= 80:
            explanations.append(f"Skills match: {int(skills_score)}%")
            matched_skills = self._get_matched_skills(profile, job)
            strengths.append(
                f"{len(matched_skills)}/{len(job.required_skills or [])} required skills match: {', '.join(matched_skills[:3])}"
            )
        elif skills_score >= 60:
            explanations.append(f"Skills match: {int(skills_score)}% (partial)")
            matched_skills = self._get_matched_skills(profile, job)
            missing_skills = set(job.required_skills or []) - set(matched_skills)
            if missing_skills:
                concerns.append(
                    f"Missing skills: {', '.join(list(missing_skills)[:2])}"
                )
        else:
            explanations.append(f"Skills match: {int(skills_score)}% (low)")
            concerns.append("Significant skill gaps")

        # Experience
        if experience_score >= 80:
            explanations.append("Experience level: Excellent match")
            if profile and profile.years_experience:
                strengths.append(
                    f"{profile.years_experience} years experience (Matches {job.experience_level or 'required'} level)"
                )
        elif experience_score >= 60:
            explanations.append("Experience level: Good match")
        else:
            explanations.append("Experience level: Below requirements")
            if profile and profile.years_experience and job.experience_min_years:
                if profile.years_experience < job.experience_min_years:
                    concerns.append(
                        f"Only {profile.years_experience} years experience (requires {job.experience_min_years}+)"
                    )

        # Location
        if location_score >= 80:
            if profile and profile.location:
                if job.location_type == "remote":
                    strengths.append("Remote role, location flexible")
                else:
                    strengths.append(
                        f"Based in {profile.location} (local for {job.location_type} role)"
                    )
        elif location_score < 60:
            if profile and profile.location and job.location:
                if job.location_type != "remote":
                    concerns.append(
                        f"Located in {profile.location}, job is in {job.location} ({job.location_type})"
                    )

        # Salary
        if salary_score >= 80:
            if profile and profile.expected_salary_min and job.salary_max:
                strengths.append(
                    f"Salary expectation ${profile.expected_salary_min:,}-${profile.expected_salary_max:,} within range (${job.salary_min:,}-${job.salary_max:,})"
                )
        elif salary_score < 60:
            if profile and profile.expected_salary_min and job.salary_max:
                if profile.expected_salary_min > job.salary_max:
                    concerns.append(
                        f"Salary expectation ${profile.expected_salary_min:,}+ exceeds budget (max ${job.salary_max:,})"
                    )

        # Availability
        if availability_score >= 80:
            if profile and profile.availability_status == "actively_looking":
                strengths.append("Actively looking for opportunities")
        elif availability_score < 60:
            if profile and profile.availability_status == "not_looking":
                concerns.append("Not currently looking for opportunities")

        return FitIndexResponse(
            fit_index=fit_index,
            explanations=explanations,
            strengths=strengths,
            concerns=concerns,
        )

    def _calculate_skills_match(self, profile: Optional[Profile], job: Job) -> float:
        """Calculate skills match score (0-100)"""
        if not profile or not profile.skills or not job.required_skills:
            return 50.0  # Neutral score if no data

        candidate_skills = set([s.lower() for s in profile.skills])
        required_skills = set([s.lower() for s in job.required_skills])

        if not required_skills:
            return 100.0

        # Calculate overlap
        matched_skills = candidate_skills.intersection(required_skills)
        match_ratio = len(matched_skills) / len(required_skills)

        # Also consider preferred skills
        if job.preferred_skills:
            preferred_skills = set([s.lower() for s in job.preferred_skills])
            preferred_matched = candidate_skills.intersection(preferred_skills)
            # Bonus for preferred skills (up to 20%)
            bonus = min(
                20.0, (len(preferred_matched) / max(1, len(preferred_skills))) * 20
            )
        else:
            bonus = 0

        base_score = match_ratio * 100
        return min(100.0, base_score + bonus)

    def _get_matched_skills(self, profile: Optional[Profile], job: Job) -> List[str]:
        """Get list of matched skills"""
        if not profile or not profile.skills or not job.required_skills:
            return []

        candidate_skills_lower = {s.lower(): s for s in profile.skills}
        required_skills_lower = [s.lower() for s in job.required_skills]

        matched = []
        for req_skill in required_skills_lower:
            if req_skill in candidate_skills_lower:
                matched.append(candidate_skills_lower[req_skill])

        return matched

    def _calculate_experience_match(
        self, profile: Optional[Profile], job: Job
    ) -> float:
        """Calculate experience level match score (0-100)"""
        if not profile or profile.years_experience is None:
            return 50.0  # Neutral if no data

        years_exp = profile.years_experience

        # Check if within range
        if job.experience_min_years and job.experience_max_years:
            if job.experience_min_years <= years_exp <= job.experience_max_years:
                return 100.0
            elif years_exp < job.experience_min_years:
                # Under-experienced
                gap = job.experience_min_years - years_exp
                return max(0.0, 100 - (gap * 15))  # -15 points per year short
            else:
                # Over-experienced (less penalized)
                excess = years_exp - job.experience_max_years
                return max(70.0, 100 - (excess * 5))  # -5 points per year over
        elif job.experience_min_years:
            if years_exp >= job.experience_min_years:
                return 100.0
            else:
                gap = job.experience_min_years - years_exp
                return max(0.0, 100 - (gap * 15))

        # Map experience level to years if available
        if job.experience_level:
            level_ranges = {
                "entry": (0, 2),
                "mid": (3, 5),
                "senior": (5, 10),
                "lead": (8, 15),
                "executive": (10, 99),
            }
            min_years, max_years = level_ranges.get(job.experience_level, (0, 99))
            if min_years <= years_exp <= max_years:
                return 100.0
            elif years_exp < min_years:
                return max(0.0, 100 - ((min_years - years_exp) * 15))
            else:
                return max(70.0, 100 - ((years_exp - max_years) * 5))

        return 50.0

    def _calculate_location_match(self, profile: Optional[Profile], job: Job) -> float:
        """Calculate location match score (0-100)"""
        if job.location_type == "remote":
            return 100.0  # Perfect match for remote jobs

        if not profile or not profile.location or not job.location:
            return 50.0

        candidate_location = profile.location.lower()
        job_location = job.location.lower()

        # Simple city/state matching
        if candidate_location == job_location:
            return 100.0
        elif any(part in job_location for part in candidate_location.split(",")):
            # Same metro area
            return 85.0
        elif any(part in candidate_location for part in job_location.split(",")):
            # Related location
            return 70.0
        else:
            # Different location
            if job.location_type == "onsite":
                return 20.0  # Low score for onsite mismatch
            else:  # hybrid
                return 50.0  # Medium score for hybrid mismatch

    def _calculate_culture_fit(self, profile: Optional[Profile], job: Job) -> float:
        """Calculate culture fit score (0-100)"""
        # Placeholder: Could analyze resume tone, values, etc.
        # For now, use location type preference as proxy
        if profile and profile.preferred_location_type:
            if profile.preferred_location_type == job.location_type:
                return 90.0
            elif profile.preferred_location_type == "any":
                return 80.0
            else:
                return 60.0

        return 75.0  # Default neutral-positive

    def _calculate_salary_match(self, profile: Optional[Profile], job: Job) -> float:
        """Calculate salary expectation match score (0-100)"""
        if not profile or not profile.expected_salary_min or not job.salary_max:
            return 75.0  # Neutral if no data

        candidate_min = profile.expected_salary_min
        candidate_max = profile.expected_salary_max or candidate_min * 1.2

        job_min = job.salary_min or 0
        job_max = job.salary_max or 999999

        # Check if ranges overlap
        if candidate_min <= job_max and candidate_max >= job_min:
            # Calculate overlap quality
            overlap_start = max(candidate_min, job_min)
            overlap_end = min(candidate_max, job_max)
            overlap_size = overlap_end - overlap_start
            candidate_range_size = candidate_max - candidate_min
            if candidate_range_size > 0:
                overlap_ratio = overlap_size / candidate_range_size
                return 70 + (overlap_ratio * 30)  # 70-100 range
            return 90.0
        elif candidate_min > job_max:
            # Candidate expects too much
            gap = candidate_min - job_max
            gap_pct = (gap / job_max) * 100 if job_max > 0 else 100
            return max(0.0, 100 - gap_pct)
        else:
            # Candidate expects less (good for employer)
            return 100.0

    def _calculate_availability_match(
        self, profile: Optional[Profile], job: Job
    ) -> float:
        """Calculate availability match score (0-100)"""
        if not profile or not profile.availability_status:
            return 75.0

        status_scores = {
            "actively_looking": 100.0,
            "open_to_offers": 80.0,
            "not_looking": 30.0,
        }

        return status_scores.get(profile.availability_status, 75.0)

    def rank_candidates_for_job(
        self, job_id: UUID, update_applications: bool = True
    ) -> List[Dict[str, Any]]:
        """
        Rank all candidates for a job by fit index.

        Args:
            job_id: Job ID
            update_applications: If True, update application.fit_index

        Returns:
            List of ranked candidates with fit details
        """
        # Get all applications for job
        applications = (
            self.db.query(Application)
            .options(joinedload(Application.user).joinedload(User.profile))
            .filter(Application.job_id == job_id)
            .all()
        )

        results = []

        for app in applications:
            # Calculate fit index
            fit_result = self.calculate_fit_index(
                candidate_user_id=app.user_id, job_id=job_id
            )

            # Update application if requested
            if update_applications:
                app.fit_index = fit_result.fit_index
                app.updated_at = datetime.utcnow()

            results.append(
                {
                    "application_id": app.id,
                    "candidate_id": app.user_id,
                    "fit_index": fit_result.fit_index,
                    "explanations": fit_result.explanations,
                    "strengths": fit_result.strengths,
                    "concerns": fit_result.concerns,
                }
            )

        if update_applications:
            self.db.commit()

        # Sort by fit_index descending
        results.sort(key=lambda x: x["fit_index"], reverse=True)

        return results

    def update_application_fit_index(self, application_id: UUID) -> Application:
        """
        Calculate and update fit index for a single application.

        Args:
            application_id: Application ID

        Returns:
            Updated Application
        """
        application = (
            self.db.query(Application)
            .options(joinedload(Application.user).joinedload(User.profile))
            .filter(Application.id == application_id)
            .first()
        )

        if not application:
            raise Exception(f"Application {application_id} not found")

        # Calculate fit index
        fit_result = self.calculate_fit_index(
            candidate_user_id=application.user_id, job_id=application.job_id
        )

        # Update application
        application.fit_index = fit_result.fit_index
        application.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(application)

        return application
