"""AI-powered job description generation service

Provides AI assistance for:
1. Generating full job descriptions from title + key points
2. Suggesting relevant skills for job postings
3. Suggesting salary ranges based on role, level, and location
"""

import time
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.services.openai_service import OpenAIService
from app.schemas.job_ai import (
    JobAIGenerationRequest,
    JobAIGenerationResponse,
    JobSkillsSuggestionRequest,
    JobSkillsSuggestionResponse,
    JobSalarySuggestionRequest,
    JobSalarySuggestionResponse,
)
from app.core.exceptions import ServiceError


class JobAIService:
    """Service for AI-powered job posting assistance"""

    def __init__(self, db: Session):
        """
        Initialize Job AI service

        Args:
            db: Database session (for future usage logging)
        """
        self.db = db
        self.openai_service = OpenAIService()

    def generate_job_description(
        self, request: JobAIGenerationRequest, user_id: Optional[str] = None
    ) -> JobAIGenerationResponse:
        """
        Generate full job description from minimal input (title + key points).

        Performance requirement: <6s (p95)

        Args:
            request: Generation request with title and key points
            user_id: User ID for usage logging (optional)

        Returns:
            JobAIGenerationResponse with generated content

        Raises:
            ServiceError: If generation fails
        """
        start_time = time.time()

        # Build comprehensive prompt
        prompt = self._build_job_description_prompt(request)

        # Generate completion
        try:
            result = self.openai_service.generate_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert recruiter and job description writer. Create comprehensive, ATS-optimized job descriptions that attract top talent.",
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=1500,  # Enough for detailed JD
                temperature=0.7,  # Slightly creative but focused
            )
        except Exception as e:
            raise ServiceError(f"Failed to generate job description: {str(e)}")

        # Parse JSON response
        try:
            generated_content = self.openai_service.parse_json_response(
                result["content"]
            )
        except ValueError as e:
            raise ValueError(f"Invalid response from AI: {str(e)}")

        # Validate generated content has required fields
        required_fields = ["description", "requirements", "responsibilities", "skills"]
        for field in required_fields:
            if field not in generated_content:
                raise ValueError(f"AI response missing required field: {field}")

        # Calculate metrics
        usage = result["usage"]
        cost = self.openai_service.calculate_cost(
            prompt_tokens=usage["prompt_tokens"],
            completion_tokens=usage["completion_tokens"],
        )
        generation_time_ms = int((time.time() - start_time) * 1000)

        # Log usage
        if user_id:
            self.openai_service.log_usage(
                user_id=user_id,
                operation="job_description_generation",
                model=result["model"],
                prompt_tokens=usage["prompt_tokens"],
                completion_tokens=usage["completion_tokens"],
                total_tokens=usage["total_tokens"],
                cost=cost,
            )

        # Return response
        return JobAIGenerationResponse(
            description=generated_content["description"],
            requirements=generated_content["requirements"],
            responsibilities=generated_content["responsibilities"],
            suggested_skills=generated_content["skills"],
            token_usage=usage["total_tokens"],
            cost=cost,
            generation_time_ms=generation_time_ms,
        )

    def suggest_skills(
        self, request: JobSkillsSuggestionRequest, user_id: Optional[str] = None
    ) -> JobSkillsSuggestionResponse:
        """
        Suggest relevant skills for job posting.

        Performance requirement: <3s

        Args:
            request: Skills suggestion request
            user_id: User ID for usage logging (optional)

        Returns:
            JobSkillsSuggestionResponse with suggested skills

        Raises:
            ServiceError: If suggestion fails
        """
        # Build skills suggestion prompt
        prompt = self._build_skills_suggestion_prompt(request)

        # Generate completion
        try:
            result = self.openai_service.generate_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert recruiter specializing in identifying relevant technical and soft skills for job roles.",
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=500,
                temperature=0.5,
            )
        except Exception as e:
            raise ServiceError(f"Failed to suggest skills: {str(e)}")

        # Parse JSON response
        try:
            skills_data = self.openai_service.parse_json_response(result["content"])
        except ValueError as e:
            raise ValueError(f"Invalid response from AI: {str(e)}")

        # Validate response structure
        if "technical_skills" not in skills_data or "soft_skills" not in skills_data:
            raise ValueError("AI response missing required skill categories")

        # Calculate cost
        usage = result["usage"]
        cost = self.openai_service.calculate_cost(
            prompt_tokens=usage["prompt_tokens"],
            completion_tokens=usage["completion_tokens"],
        )

        # Log usage
        if user_id:
            self.openai_service.log_usage(
                user_id=user_id,
                operation="skills_suggestion",
                model=result["model"],
                prompt_tokens=usage["prompt_tokens"],
                completion_tokens=usage["completion_tokens"],
                total_tokens=usage["total_tokens"],
                cost=cost,
            )

        # Combine all skills
        technical_skills = skills_data["technical_skills"]
        soft_skills = skills_data["soft_skills"]
        all_skills = technical_skills + soft_skills

        return JobSkillsSuggestionResponse(
            suggested_skills=all_skills,
            technical_skills=technical_skills,
            soft_skills=soft_skills,
        )

    def suggest_salary_range(
        self, request: JobSalarySuggestionRequest, user_id: Optional[str] = None
    ) -> JobSalarySuggestionResponse:
        """
        Suggest salary range based on role, level, and location.

        Performance requirement: <2s

        Args:
            request: Salary suggestion request
            user_id: User ID for usage logging (optional)

        Returns:
            JobSalarySuggestionResponse with salary range

        Raises:
            ServiceError: If suggestion fails
        """
        # Build salary suggestion prompt
        prompt = self._build_salary_suggestion_prompt(request)

        # Generate completion
        try:
            result = self.openai_service.generate_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert compensation analyst with knowledge of market salary data across industries and locations.",
                    },
                    {"role": "user", "content": prompt},
                ],
                max_tokens=300,
                temperature=0.3,  # Low temperature for more consistent data
            )
        except Exception as e:
            raise ServiceError(f"Failed to suggest salary range: {str(e)}")

        # Parse JSON response
        try:
            salary_data = self.openai_service.parse_json_response(result["content"])
        except ValueError as e:
            raise ValueError(f"Invalid response from AI: {str(e)}")

        # Validate response structure
        if "salary_min" not in salary_data or "salary_max" not in salary_data:
            raise ValueError("AI response missing required salary fields")

        # Ensure salary_max >= salary_min
        salary_min = int(salary_data["salary_min"])
        salary_max = int(salary_data["salary_max"])
        if salary_max < salary_min:
            salary_min, salary_max = salary_max, salary_min

        # Calculate cost
        usage = result["usage"]
        cost = self.openai_service.calculate_cost(
            prompt_tokens=usage["prompt_tokens"],
            completion_tokens=usage["completion_tokens"],
        )

        # Log usage
        if user_id:
            self.openai_service.log_usage(
                user_id=user_id,
                operation="salary_suggestion",
                model=result["model"],
                prompt_tokens=usage["prompt_tokens"],
                completion_tokens=usage["completion_tokens"],
                total_tokens=usage["total_tokens"],
                cost=cost,
            )

        return JobSalarySuggestionResponse(
            salary_min=salary_min,
            salary_max=salary_max,
            currency="USD",
            market_data=salary_data.get("market_data"),
        )

    def _build_job_description_prompt(
        self, request: JobAIGenerationRequest
    ) -> str:
        """
        Build prompt for job description generation.

        Args:
            request: Generation request

        Returns:
            Formatted prompt string
        """
        # Build context from request
        context_parts = [
            f"Job Title: {request.title}",
        ]

        if request.experience_level:
            context_parts.append(
                f"Experience Level: {request.experience_level.value.upper()}"
            )

        if request.location:
            context_parts.append(f"Location: {request.location}")

        if request.employment_type:
            context_parts.append(
                f"Employment Type: {request.employment_type.value.replace('_', ' ').title()}"
            )

        if request.department:
            context_parts.append(f"Department: {request.department}")

        # Add key points
        context_parts.append("\nKey Responsibilities/Requirements:")
        for i, point in enumerate(request.key_points, 1):
            context_parts.append(f"{i}. {point}")

        # Build full prompt
        prompt = f"""Generate a comprehensive, ATS-optimized job description for the following role:

{chr(10).join(context_parts)}

Create a professional job posting that includes:

1. **Description**: Write 2-3 paragraphs (200-300 words) that:
   - Start with an engaging company/role overview
   - Highlight the impact this role will have
   - Mention key technologies, projects, or initiatives
   - Use professional but approachable tone

2. **Requirements**: List 4-8 specific requirements including:
   - Years of experience needed
   - Required technical skills
   - Required soft skills
   - Educational requirements (if relevant)
   - Use clear, scannable bullet points

3. **Responsibilities**: List 5-10 key responsibilities that:
   - Start with action verbs (Build, Lead, Design, Collaborate, etc.)
   - Are specific and measurable when possible
   - Cover the full scope of the role
   - Progress from most to least important

4. **Skills**: List 8-15 relevant skills including:
   - Technical skills (programming languages, frameworks, tools)
   - Soft skills (communication, leadership, problem-solving)
   - Domain-specific skills
   - Mix required and nice-to-have skills

IMPORTANT:
- Keep it factual and realistic
- Avoid clichés like "rockstar", "ninja", "guru"
- Use inclusive language (avoid gendered pronouns)
- Make it ATS-friendly with clear keywords
- Base content on the key points provided

Provide your response in JSON format:
{{
    "description": "string",
    "requirements": ["string", ...],
    "responsibilities": ["string", ...],
    "skills": ["string", ...]
}}"""

        return prompt

    def _build_skills_suggestion_prompt(
        self, request: JobSkillsSuggestionRequest
    ) -> str:
        """
        Build prompt for skills suggestion.

        Args:
            request: Skills suggestion request

        Returns:
            Formatted prompt string
        """
        context_parts = [f"Job Title: {request.title}"]

        if request.description:
            # Truncate description if too long to save tokens
            desc = request.description[:500]
            if len(request.description) > 500:
                desc += "..."
            context_parts.append(f"Job Description: {desc}")

        # Build exclusion filter
        exclusion_note = ""
        if request.existing_skills:
            exclusion_note = f"\n\nEXCLUDE these skills (already selected): {', '.join(request.existing_skills)}"

        prompt = f"""Suggest relevant skills for the following job role:

{chr(10).join(context_parts)}{exclusion_note}

Provide 8-15 skills total, categorized as:

1. **Technical Skills** (6-10 skills):
   - Programming languages
   - Frameworks and libraries
   - Tools and platforms
   - Domain-specific technical skills

2. **Soft Skills** (2-5 skills):
   - Communication abilities
   - Leadership qualities
   - Problem-solving approaches
   - Collaboration skills

IMPORTANT:
- Only suggest skills directly relevant to this role
- Use standard industry terminology
- Prioritize commonly sought skills for this role
- Include both required and nice-to-have skills

Provide your response in JSON format:
{{
    "technical_skills": ["skill1", "skill2", ...],
    "soft_skills": ["skill1", "skill2", ...]
}}"""

        return prompt

    def _build_salary_suggestion_prompt(
        self, request: JobSalarySuggestionRequest
    ) -> str:
        """
        Build prompt for salary range suggestion.

        Args:
            request: Salary suggestion request

        Returns:
            Formatted prompt string
        """
        prompt = f"""Suggest a competitive salary range (in USD) for the following role:

Job Title: {request.title}
Experience Level: {request.experience_level.value.upper()}
Location: {request.location}

Provide a realistic salary range based on:
- Current market rates for this role and experience level
- Geographic location (cost of living adjustments)
- Industry standards
- Supply and demand for this skillset

Include:
1. salary_min: Conservative minimum (25th percentile)
2. salary_max: Competitive maximum (75th percentile)
3. market_data: Additional insights (optional)

IMPORTANT:
- Use 2024-2025 market data
- Account for location-based cost of living
- Consider the experience level carefully
- Provide annual salary (not hourly)
- Round to nearest $5,000

Provide your response in JSON format:
{{
    "salary_min": 120000,
    "salary_max": 160000,
    "market_data": {{
        "market_median": 140000,
        "percentile_25": 120000,
        "percentile_75": 160000,
        "location_adjustment": 1.2,
        "notes": "Optional market insights"
    }}
}}"""

        return prompt
