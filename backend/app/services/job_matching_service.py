"""Job matching service with Fit Index calculation"""

import uuid
from typing import List, Dict, Optional, Tuple
from datetime import datetime
from sqlalchemy.orm import Session
import numpy as np

from app.db.models.resume import Resume
from app.db.models.job import Job
from app.services.pinecone_service import PineconeService
from app.core.exceptions import ValidationError
from app.schemas.job_matching import (
    JobMatchRequest,
    JobMatchResponse,
    JobMatchRationale,
    FitIndexBreakdown,
    MatchQuality,
    SkillMatch,
    SkillVector,
    ExperienceLevel,
    LocationType,
)


class JobMatchingService:
    """Job matching with Fit Index scoring algorithm"""

    # Fit Index weights (total 100 points)
    WEIGHTS = {
        "skill_match": 60,  # Max 60 points for skills
        "experience": 20,  # Max 20 points for experience
        "seniority": 10,  # Max 10 points for seniority level
        "semantic": 10,  # Max 10 points for semantic similarity
    }

    def __init__(self, db: Session):
        self.db = db
        self.pinecone = PineconeService()

    def find_matches(
        self, user_id: uuid.UUID, request: JobMatchRequest
    ) -> List[JobMatchResponse]:
        """Find job matches for user with Fit Index scoring"""

        # Get user's resume and extract skills
        resume = self._get_user_resume(user_id, request.resume_id)
        if not resume:
            raise ValidationError("Resume not found")

        user_skills = self._extract_skills_from_resume(resume)
        user_experience_years = self._calculate_experience_years(resume)

        # Build Pinecone filters from request filters
        filters = (
            self._build_pinecone_filters(request.filters) if request.filters else None
        )

        # Search for similar jobs using vector similarity
        vector_results = self.pinecone.search_similar_jobs(
            user_skills=user_skills,
            top_k=request.limit + request.offset + 20,  # Extra buffer for filtering
            filters=filters,
        )

        # Calculate Fit Index for each job
        matches = []
        for result in vector_results.matches:
            try:
                job = (
                    self.db.query(Job)
                    .filter(
                        Job.id == uuid.UUID(result.metadata["job_id"]),
                        Job.is_active == True,
                    )
                    .first()
                )

                if not job:
                    continue

                # Calculate comprehensive Fit Index
                (
                    fit_index,
                    breakdown,
                    rationale,
                    skill_matches,
                ) = self._calculate_fit_index(
                    user_skills=user_skills,
                    user_experience_years=user_experience_years,
                    job=job,
                    semantic_score=result.score,
                )

                # Apply fit index filter if specified
                if request.filters and request.filters.min_fit_index:
                    if fit_index < request.filters.min_fit_index:
                        continue

                # Build response
                match = JobMatchResponse(
                    job_id=str(job.id),
                    job_title=job.title,
                    company=job.company,
                    location=job.location,
                    location_type=LocationType(job.location_type or "onsite"),
                    salary_range=(
                        f"${job.salary_min:,}-${job.salary_max:,}"
                        if job.salary_min and job.salary_max
                        else None
                    ),
                    fit_index=fit_index,
                    match_quality=self._get_match_quality(fit_index),
                    rationale=rationale,
                    breakdown=breakdown,
                    skill_matches=skill_matches,
                    posted_date=job.posted_date or job.created_at,
                    source=job.source or "manual",
                    job_url=job.external_url,
                    requires_visa_sponsorship=job.requires_visa_sponsorship or False,
                    is_active=job.is_active,
                )
                matches.append(match)

            except Exception as e:
                # Log error but continue processing other jobs
                print(f"Error processing job {result.id}: {e}")
                continue

        # Sort by Fit Index and apply pagination
        matches.sort(key=lambda x: x.fit_index, reverse=True)
        return matches[request.offset : request.offset + request.limit]

    def _calculate_fit_index(
        self,
        user_skills: List[SkillVector],
        user_experience_years: int,
        job: Job,
        semantic_score: float,
    ) -> Tuple[int, FitIndexBreakdown, JobMatchRationale, List[SkillMatch]]:
        """
        Calculate comprehensive Fit Index (0-100)

        Breakdown:
        - Skill Match: 60 points (50 required + 10 preferred)
        - Experience: 20 points
        - Seniority: 10 points
        - Semantic Similarity: 10 points
        """

        # 1. SKILL MATCH (60 points)
        skill_score, skill_matches = self._calculate_skill_match(
            user_skills=user_skills,
            required_skills=job.required_skills or [],
            preferred_skills=job.preferred_skills or [],
        )

        # 2. EXPERIENCE MATCH (20 points)
        experience_score, experience_label = self._calculate_experience_score(
            user_years=user_experience_years,
            job_min=job.experience_min_years,
            job_max=job.experience_max_years,
            job_requirement=job.experience_requirement,
        )

        # 3. SENIORITY MATCH (10 points)
        seniority_score = self._calculate_seniority_score(
            user_years=user_experience_years, job_level=job.experience_level
        )

        # 4. SEMANTIC SIMILARITY (10 points)
        semantic_points = int(semantic_score * self.WEIGHTS["semantic"])

        # TOTAL FIT INDEX
        total = min(
            100,
            max(0, skill_score + experience_score + seniority_score + semantic_points),
        )

        # Build detailed breakdown
        breakdown = FitIndexBreakdown(
            skill_match_score=skill_score,
            experience_score=experience_score,
            seniority_score=seniority_score,
            semantic_similarity=semantic_points,
            total=total,
        )

        # Generate rationale
        matching_skills = [sm.skill for sm in skill_matches if sm.user_has]
        skill_gaps = [
            sm.skill
            for sm in skill_matches
            if not sm.user_has and not sm.is_transferable
        ]
        transferable = [sm.skill for sm in skill_matches if sm.is_transferable]

        rationale = self._generate_rationale(
            total=total,
            matching_skills=matching_skills,
            skill_gaps=skill_gaps,
            transferable_skills=transferable,
            experience_label=experience_label,
            user_years=user_experience_years,
            job_requirement=job.experience_requirement,
        )

        return total, breakdown, rationale, skill_matches

    def _calculate_skill_match(
        self,
        user_skills: List[SkillVector],
        required_skills: List[str],
        preferred_skills: List[str],
    ) -> Tuple[int, List[SkillMatch]]:
        """Calculate skill match score (max 60 points)"""

        user_skill_names = {s.skill.lower(): s for s in user_skills}
        skill_matches = []

        # REQUIRED SKILLS (50 points)
        required_matches = 0
        for req_skill in required_skills:
            req_lower = req_skill.lower()
            has_skill = req_lower in user_skill_names

            # Check semantic similarity for transferable skills
            similarity = 0.0
            if not has_skill:
                for user_skill in user_skills:
                    sim = self.pinecone.calculate_semantic_similarity(
                        req_skill, user_skill.skill
                    )
                    if sim > similarity:
                        similarity = sim

            is_transferable = similarity > 0.7 and not has_skill

            skill_matches.append(
                SkillMatch(
                    skill=req_skill,
                    user_has=has_skill,
                    user_years=(
                        user_skill_names[req_lower].years_experience
                        if has_skill and req_lower in user_skill_names
                        else None
                    ),
                    similarity_score=1.0 if has_skill else similarity,
                    is_transferable=is_transferable,
                )
            )

            if has_skill:
                required_matches += 1
            elif is_transferable:
                required_matches += 0.5  # Partial credit for transferable skills

        required_score = (
            int((required_matches / len(required_skills)) * 50)
            if required_skills
            else 50
        )

        # PREFERRED SKILLS (10 points)
        preferred_matches = sum(
            1 for pref in preferred_skills if pref.lower() in user_skill_names
        )
        preferred_score = (
            int((preferred_matches / len(preferred_skills)) * 10)
            if preferred_skills
            else 10
        )

        total_skill_score = min(60, required_score + preferred_score)
        return total_skill_score, skill_matches

    def _calculate_experience_score(
        self,
        user_years: int,
        job_min: Optional[int],
        job_max: Optional[int],
        job_requirement: Optional[str],
    ) -> Tuple[int, str]:
        """Calculate experience match score (max 20 points)"""

        if not job_min and not job_max and not job_requirement:
            return 20, "appropriate"  # No requirement specified

        min_years = job_min or 0
        max_years = job_max or 100

        # Perfect match - within range
        if min_years <= user_years <= max_years:
            return 20, "perfect"

        # Within 1 year of minimum (appropriate)
        if user_years >= min_years - 1:
            return 15, "appropriate"

        # Within 2 years (stretch opportunity)
        if user_years >= min_years - 2:
            return 10, "stretch"

        # Under-qualified
        return 5, "under-qualified"

    def _calculate_seniority_score(
        self, user_years: int, job_level: Optional[str]
    ) -> int:
        """Calculate seniority match score (max 10 points)"""

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
        """Convert years of experience to seniority level"""
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
        """Determine match quality label from Fit Index"""
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
        experience_label: str,
        user_years: int,
        job_requirement: Optional[str],
    ) -> JobMatchRationale:
        """Generate human-readable match rationale"""

        # Summary based on total score
        if total >= 90:
            summary = "Excellent match! You meet all key requirements and would be a strong candidate."
        elif total >= 70:
            summary = (
                "Good match. You have most required skills and appropriate experience."
            )
        elif total >= 40:
            summary = "Partial match. Consider applying if you're willing to learn missing skills."
        else:
            summary = "Low match. This role may require significant skill development."

        # Experience details
        if experience_label == "perfect":
            exp_details = f"Your {user_years} years of experience perfectly matches the requirements."
        elif experience_label == "appropriate":
            exp_details = (
                f"Your {user_years} years of experience is appropriate for this role."
            )
        elif experience_label == "stretch":
            exp_details = f"This is a stretch opportunity requiring {job_requirement or 'more experience'}."
        else:
            exp_details = f"You may be under-qualified. The role prefers {job_requirement or 'more experience'}."

        # Recommendations
        recommendations = []
        if skill_gaps:
            top_gaps = skill_gaps[:3]
            recommendations.append(f"Consider learning: {', '.join(top_gaps)}")
        if transferable_skills:
            recommendations.append(
                f"Highlight your {', '.join(transferable_skills[:2])} experience"
            )
        if experience_label == "stretch":
            recommendations.append(
                "Emphasize achievements and rapid learning ability in your application"
            )
        if total >= 70:
            recommendations.append("This is a strong match - we recommend applying!")

        return JobMatchRationale(
            summary=summary,
            matching_skills=matching_skills,
            skill_gaps=skill_gaps,
            transferable_skills=transferable_skills,
            experience_match=experience_label,
            experience_details=exp_details,
            recommendations=recommendations,
        )

    def _get_user_resume(
        self, user_id: uuid.UUID, resume_id: Optional[str]
    ) -> Optional[Resume]:
        """Get user's resume"""
        if resume_id:
            return (
                self.db.query(Resume)
                .filter(Resume.id == uuid.UUID(resume_id), Resume.user_id == user_id)
                .first()
            )

        # Get default resume
        return (
            self.db.query(Resume)
            .filter(
                Resume.user_id == user_id,
                Resume.is_default == True,
                Resume.is_deleted == False,
            )
            .first()
        )

    def _extract_skills_from_resume(self, resume: Resume) -> List[SkillVector]:
        """Extract skills from parsed resume data"""
        skills = []
        parsed_data = resume.parsed_data or {}

        skill_list = parsed_data.get("skills", [])
        for skill in skill_list:
            if isinstance(skill, str):
                skills.append(SkillVector(skill=skill, years_experience=None))
            elif isinstance(skill, dict):
                skills.append(
                    SkillVector(
                        skill=skill.get("name", ""),
                        years_experience=skill.get("years"),
                        proficiency=skill.get("level"),
                    )
                )

        return skills

    def _calculate_experience_years(self, resume: Resume) -> int:
        """Calculate total years of experience from resume"""
        parsed_data = resume.parsed_data or {}
        work_experience = parsed_data.get("work_experience", [])

        if not work_experience:
            return 0

        # Simple calculation: count distinct years
        years = set()
        for exp in work_experience:
            start_year = exp.get("start_year")
            end_year = exp.get("end_year") or datetime.now().year
            if start_year:
                years.update(range(start_year, end_year + 1))

        return len(years)

    def _build_pinecone_filters(self, filters) -> Dict:
        """Build Pinecone metadata filters from request filters"""
        pinecone_filter = {}

        if filters.visa_sponsorship is not None:
            pinecone_filter["visa_sponsorship"] = {"$eq": filters.visa_sponsorship}

        if filters.min_salary:
            pinecone_filter["salary_min"] = {"$gte": filters.min_salary}

        if filters.location_types:
            pinecone_filter["location_type"] = {
                "$in": [lt.value for lt in filters.location_types]
            }

        return pinecone_filter if pinecone_filter else None
