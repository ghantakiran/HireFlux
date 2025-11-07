"""AI Job Normalization Service (Sprint 11-12 Phase 3)

Uses OpenAI to:
- Normalize non-standard job titles
- Extract skills from job descriptions
- Suggest salary ranges based on market data
"""

import json
import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime

from app.services.openai_service import OpenAIService
from app.schemas.bulk_job_posting import CSVJobRow
from app.core.exceptions import ServiceError


class AIJobNormalizationService:
    """Service for AI-powered job normalization"""

    # Common job title patterns for confidence scoring
    STANDARD_TITLES = [
        "Software Engineer",
        "Senior Software Engineer",
        "Staff Software Engineer",
        "Principal Software Engineer",
        "Engineering Manager",
        "Senior Engineering Manager",
        "Product Manager",
        "Senior Product Manager",
        "Director of Product",
        "Data Scientist",
        "Senior Data Scientist",
        "Machine Learning Engineer",
        "DevOps Engineer",
        "Senior DevOps Engineer",
        "Site Reliability Engineer",
        "Frontend Engineer",
        "Backend Engineer",
        "Full Stack Engineer",
        "QA Engineer",
        "Test Engineer",
        "Data Analyst",
        "Business Analyst",
    ]

    def __init__(self):
        """Initialize AI normalization service"""
        self.openai_service = OpenAIService()
        self._cache = {}  # Simple in-memory cache

    def _generate_cache_key(self, operation: str, *args) -> str:
        """Generate cache key for operation"""
        key_str = f"{operation}:{':'.join(str(arg) for arg in args)}"
        return hashlib.md5(key_str.encode()).hexdigest()

    def _get_from_cache(self, cache_key: str) -> Optional[Dict[str, Any]]:
        """Get item from cache if exists and not expired"""
        if cache_key in self._cache:
            cached = self._cache[cache_key]
            # Cache expires after 1 hour
            if (datetime.utcnow() - cached["timestamp"]).seconds < 3600:
                return cached["data"]
            else:
                del self._cache[cache_key]
        return None

    def _save_to_cache(self, cache_key: str, data: Dict[str, Any]) -> None:
        """Save item to cache"""
        self._cache[cache_key] = {"data": data, "timestamp": datetime.utcnow()}

    async def normalize_job_title(
        self,
        title: str,
        department: Optional[str] = None,
        experience_level: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Normalize a job title using AI.

        Args:
            title: Original job title
            department: Department/function
            experience_level: Experience level (entry, mid, senior, etc.)

        Returns:
            Dict with normalized_title, original_title, confidence, and cost

        Raises:
            ValueError: If title is empty
            ServiceError: If normalization fails
        """
        if not title or len(title.strip()) == 0:
            raise ValueError("Job title cannot be empty")

        # Check cache
        cache_key = self._generate_cache_key(
            "title", title, department, experience_level
        )
        cached = self._get_from_cache(cache_key)
        if cached:
            return cached

        # Build prompt
        prompt_parts = [
            "You are an expert at normalizing job titles. Given a job title (which may be abbreviated or non-standard),",
            "return the most standard, professional version of that title.",
            "\nRules:",
            "- Use full words, not abbreviations (e.g., 'Senior' not 'Sr.', 'Engineer' not 'Eng')",
            "- Be consistent with industry-standard titles",
            "- Maintain the seniority level if present",
            "- If the title is already standard, return it unchanged",
            f"\nJob Title: {title}",
        ]

        if department:
            prompt_parts.append(f"\nDepartment: {department}")
        if experience_level:
            prompt_parts.append(f"\nExperience Level: {experience_level}")

        prompt_parts.append("\nReturn ONLY the normalized title, nothing else.")

        prompt = " ".join(prompt_parts)

        try:
            # Call OpenAI
            messages = [
                {
                    "role": "system",
                    "content": "You are a job title normalization expert.",
                },
                {"role": "user", "content": prompt},
            ]

            response = await self.openai_service.generate_completion(
                messages=messages,
                max_tokens=50,
                temperature=0.3,  # Lower temperature for more consistent results
            )

            normalized_title = response["content"].strip()

            # Calculate cost
            cost = self.openai_service.calculate_cost(
                prompt_tokens=response["usage"]["prompt_tokens"],
                completion_tokens=response["usage"]["completion_tokens"],
            )

            # Calculate confidence score
            confidence = self._calculate_title_confidence(title, normalized_title)

            result = {
                "normalized_title": normalized_title,
                "original_title": title,
                "confidence": confidence,
                "cost": cost,
                "tokens_used": response["usage"]["total_tokens"],
            }

            # Cache result
            self._save_to_cache(cache_key, result)

            return result

        except Exception as e:
            raise ServiceError(f"Failed to normalize job title: {str(e)}")

    def _calculate_title_confidence(self, original: str, normalized: str) -> float:
        """
        Calculate confidence score for title normalization.

        High confidence (>0.9): Original was already standard or very similar
        Medium confidence (0.7-0.9): Moderate changes
        Low confidence (<0.7): Significant changes or ambiguous titles
        """
        # If normalized title is in standard list, high confidence
        if normalized in self.STANDARD_TITLES:
            # If original was already the same, very high confidence
            if original.lower() == normalized.lower():
                return 0.95
            return 0.85

        # Calculate similarity ratio
        from difflib import SequenceMatcher

        similarity = SequenceMatcher(None, original.lower(), normalized.lower()).ratio()

        # Adjust confidence based on similarity
        if similarity > 0.8:
            return 0.9
        elif similarity > 0.6:
            return 0.75
        elif similarity > 0.4:
            return 0.6
        else:
            return 0.5

    async def extract_skills(
        self,
        description: str,
        requirements: Optional[str] = None,
        title: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Extract technical skills from job description and requirements.

        Args:
            description: Job description text
            requirements: Requirements text
            title: Job title for context

        Returns:
            Dict with skills list, confidence, and cost
        """
        # Build prompt
        text_to_analyze = f"Description: {description}"
        if requirements:
            text_to_analyze += f"\nRequirements: {requirements}"
        if title:
            text_to_analyze += f"\nTitle: {title}"

        prompt = f"""Extract all technical skills, tools, and technologies mentioned in the following job posting.

{text_to_analyze}

Return a JSON object with:
- "skills": array of skill names (technologies, programming languages, tools, frameworks)
- "confidence": confidence score (0.0-1.0)

Rules:
- Include only concrete technical skills (e.g., "Python", "React", "AWS")
- Exclude soft skills (e.g., "communication", "teamwork")
- Use standard capitalization (e.g., "JavaScript" not "javascript")
- Remove duplicates
- Return empty array if no skills found

Example response:
{{"skills": ["Python", "Django", "PostgreSQL", "AWS"], "confidence": 0.9}}
"""

        try:
            messages = [
                {
                    "role": "system",
                    "content": "You are a technical skills extraction expert.",
                },
                {"role": "user", "content": prompt},
            ]

            response = await self.openai_service.generate_completion(
                messages=messages, max_tokens=200, temperature=0.3
            )

            # Parse JSON response
            result_data = self.openai_service.parse_json_response(response["content"])

            # Deduplicate skills (case-insensitive)
            skills = result_data.get("skills", [])
            skills_deduped = []
            skills_lower = set()

            for skill in skills:
                skill_lower = skill.lower()
                if skill_lower not in skills_lower:
                    skills_deduped.append(skill)
                    skills_lower.add(skill_lower)

            # Calculate cost
            cost = self.openai_service.calculate_cost(
                prompt_tokens=response["usage"]["prompt_tokens"],
                completion_tokens=response["usage"]["completion_tokens"],
            )

            return {
                "skills": skills_deduped,
                "confidence": result_data.get("confidence", 0.8),
                "cost": cost,
                "tokens_used": response["usage"]["total_tokens"],
            }

        except Exception as e:
            raise ServiceError(f"Failed to extract skills: {str(e)}")

    async def suggest_salary_range(
        self,
        title: str,
        location: str,
        experience_level: Optional[str] = None,
        skills: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """
        Suggest salary range based on job details and market data.

        Args:
            title: Job title
            location: Job location (city, state or "Remote")
            experience_level: Experience level
            skills: List of required skills

        Returns:
            Dict with salary_min, salary_max, confidence, market_data, and cost

        Raises:
            ValueError: If suggested range is invalid (min > max)
        """
        # Build prompt
        skills_str = ", ".join(skills) if skills else "Not specified"

        prompt = f"""Suggest a competitive salary range for this position based on 2025 market data:

Title: {title}
Location: {location}
Experience Level: {experience_level or "Not specified"}
Skills: {skills_str}

Return a JSON object with:
- "salary_min": minimum salary (annual USD)
- "salary_max": maximum salary (annual USD)
- "confidence": confidence score (0.0-1.0)
- "market_data": brief explanation of salary basis

Rules:
- Use 2025 market rates
- Consider cost of living for the location
- Remote positions should use national averages
- Entry level: typically $60K-$100K
- Mid level: typically $90K-$150K
- Senior level: typically $130K-$200K+
- Adjust based on skills and location

Example response:
{{"salary_min": 130000, "salary_max": 170000, "confidence": 0.85, "market_data": "Based on 2025 SF Bay Area rates for Senior SWE"}}
"""

        try:
            messages = [
                {
                    "role": "system",
                    "content": "You are a compensation data expert with knowledge of 2025 tech salary trends.",
                },
                {"role": "user", "content": prompt},
            ]

            response = await self.openai_service.generate_completion(
                messages=messages, max_tokens=150, temperature=0.5
            )

            # Parse JSON response
            result_data = self.openai_service.parse_json_response(response["content"])

            salary_min = result_data.get("salary_min")
            salary_max = result_data.get("salary_max")

            # Validate salary range
            if salary_min is None or salary_max is None:
                raise ValueError("AI did not return valid salary range")

            if salary_min >= salary_max:
                raise ValueError(
                    f"Invalid salary range: min ({salary_min}) >= max ({salary_max})"
                )

            # Calculate cost
            cost = self.openai_service.calculate_cost(
                prompt_tokens=response["usage"]["prompt_tokens"],
                completion_tokens=response["usage"]["completion_tokens"],
            )

            return {
                "salary_min": salary_min,
                "salary_max": salary_max,
                "confidence": result_data.get("confidence", 0.75),
                "market_data": result_data.get("market_data", ""),
                "cost": cost,
                "tokens_used": response["usage"]["total_tokens"],
            }

        except json.JSONDecodeError as e:
            raise ServiceError(f"Failed to parse salary suggestion: {str(e)}")
        except Exception as e:
            raise ServiceError(f"Failed to suggest salary range: {str(e)}")

    async def enrich_job(self, job: CSVJobRow) -> Dict[str, Any]:
        """
        Complete job enrichment workflow: normalize title, extract skills, suggest salary.

        Args:
            job: Job data to enrich

        Returns:
            Dict with original_job and all enrichment results
        """
        # Normalize title
        title_result = await self.normalize_job_title(
            title=job.title,
            department=job.department,
            experience_level=job.experience_level,
        )

        # Extract skills
        skills_result = await self.extract_skills(
            description=job.description or "",
            requirements=job.requirements or "",
            title=job.title,
        )

        # Suggest salary (only if not provided)
        salary_result = None
        if not job.salary_min or not job.salary_max:
            salary_result = await self.suggest_salary_range(
                title=title_result["normalized_title"],
                location=job.location or "Remote",
                experience_level=job.experience_level,
                skills=skills_result["skills"],
            )

        return {
            "original_job": job,
            "normalized_title": title_result,
            "extracted_skills": skills_result,
            "suggested_salary": salary_result,
            "total_cost": (
                title_result["cost"]
                + skills_result["cost"]
                + (salary_result["cost"] if salary_result else 0)
            ),
        }

    async def normalize_job_batch(
        self, jobs: List[CSVJobRow], skip_on_error: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Normalize multiple jobs in batch.

        Args:
            jobs: List of jobs to normalize
            skip_on_error: If True, continue on errors; if False, raise on first error

        Returns:
            List of enrichment results
        """
        results = []

        for job in jobs:
            try:
                enriched = await self.enrich_job(job)
                results.append({"success": True, **enriched})
            except Exception as e:
                if skip_on_error:
                    results.append(
                        {"success": False, "error": str(e), "original_job": job}
                    )
                else:
                    raise

        return results
