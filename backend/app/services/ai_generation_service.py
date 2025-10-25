"""AI-powered resume generation and optimization service"""
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.services.openai_service import OpenAIService
from app.schemas.ai_generation import (
    AIResumeGenerationRequest,
    AIGenerationResponse,
    GenerationStatus,
    ComparisonResult,
)
from app.core.exceptions import NotFoundError, ServiceError, ValidationError
from app.db.models.resume import Resume, ResumeVersion


class AIGenerationService:
    """Service for AI-powered resume generation and optimization"""

    def __init__(self, db: Session):
        """
        Initialize AI generation service

        Args:
            db: Database session
        """
        self.db = db
        self.openai_service = OpenAIService()

    def generate_optimized_resume(
        self, user_id: uuid.UUID, request: AIResumeGenerationRequest
    ) -> AIGenerationResponse:
        """
        Generate AI-optimized resume

        Args:
            user_id: User ID
            request: Generation request parameters

        Returns:
            AIGenerationResponse with generated content

        Raises:
            NotFoundError: If resume not found
            ServiceError: If generation fails
        """
        # Fetch source resume
        resume = (
            self.db.query(Resume)
            .filter(
                Resume.id == uuid.UUID(request.resume_id), Resume.user_id == user_id
            )
            .first()
        )

        if not resume:
            raise NotFoundError(f"Resume {request.resume_id} not found")

        # Build prompt
        prompt = self.openai_service.build_resume_optimization_prompt(
            resume_data=resume.parsed_data,
            target_title=request.target_title,
            tone=request.tone.value,
            keywords=request.include_keywords,
            company=request.target_company,
            strict_factual=request.strict_factual,
        )

        # Generate completion
        try:
            result = self.openai_service.generate_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert resume writer and career coach.",
                    },
                    {"role": "user", "content": prompt},
                ]
            )
        except Exception as e:
            raise ServiceError(f"Failed to generate resume: {str(e)}")

        # Parse JSON response
        try:
            generated_content = self.openai_service.parse_json_response(
                result["content"]
            )
        except ValueError as e:
            raise ValueError(f"Invalid response from AI: {str(e)}")

        # Calculate cost
        usage = result["usage"]
        cost = self.openai_service.calculate_cost(
            prompt_tokens=usage["prompt_tokens"],
            completion_tokens=usage["completion_tokens"],
        )

        # Create version record
        version = ResumeVersion(
            id=uuid.uuid4(),
            resume_id=resume.id,
            version_name=request.version_name
            or f"Generated {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}",
            content=generated_content,
            target_title=request.target_title,
            target_company=request.target_company,
            tone=request.tone.value,
            length=request.length.value,
            style=request.style.value,
            keywords=request.include_keywords,
            strict_factual=request.strict_factual,
            token_usage=str(usage["total_tokens"]),
            cost=str(cost),
            status="completed",
            created_at=datetime.utcnow(),
        )

        self.db.add(version)
        self.db.commit()
        self.db.refresh(version)

        # Log usage
        self.openai_service.log_usage(
            user_id=str(user_id),
            operation="resume_generation",
            model=result["model"],
            prompt_tokens=usage["prompt_tokens"],
            completion_tokens=usage["completion_tokens"],
            total_tokens=usage["total_tokens"],
            cost=cost,
        )

        # Return response
        return AIGenerationResponse(
            id=str(version.id),
            user_id=str(user_id),
            source_resume_id=str(resume.id),
            version_name=version.version_name,
            status=GenerationStatus.COMPLETED,
            generated_content=generated_content,
            token_usage=usage["total_tokens"],  # Return as int for response
            cost=cost,  # Return as float for response
            created_at=version.created_at,
            completed_at=datetime.utcnow(),
        )

    def regenerate_section(
        self,
        user_id: uuid.UUID,
        version_id: uuid.UUID,
        section: str,
        tone: Optional[str] = None,
        instructions: Optional[str] = None,
    ) -> AIGenerationResponse:
        """
        Regenerate specific resume section

        Args:
            user_id: User ID
            version_id: Resume version ID
            section: Section to regenerate (e.g., 'work_experience', 'summary')
            tone: Optional tone override
            instructions: Optional specific instructions

        Returns:
            Updated AIGenerationResponse

        Raises:
            NotFoundError: If version not found
            ServiceError: If regeneration fails
        """
        # Fetch version
        version = (
            self.db.query(ResumeVersion).filter(ResumeVersion.id == version_id).first()
        )

        if not version:
            raise NotFoundError(f"Resume version {version_id} not found")

        # Build section-specific prompt
        current_content = version.content.get(section, {})
        prompt = f"""Regenerate the {section} section of this resume.

Current content: {current_content}

Tone: {tone or version.tone}
{f'Additional instructions: {instructions}' if instructions else ''}

Provide ONLY the updated {section} section in JSON format.
"""

        # Generate completion
        try:
            result = self.openai_service.generate_completion(
                messages=[
                    {"role": "system", "content": "You are an expert resume writer."},
                    {"role": "user", "content": prompt},
                ]
            )
        except Exception as e:
            raise ServiceError(f"Failed to regenerate section: {str(e)}")

        # Parse response
        try:
            regenerated_section = self.openai_service.parse_json_response(
                result["content"]
            )
        except ValueError as e:
            raise ValueError(f"Invalid response from AI: {str(e)}")

        # Update version content
        version.content[section] = regenerated_section.get(section, regenerated_section)
        version.updated_at = datetime.utcnow()

        # Update token usage and cost
        usage = result["usage"]
        additional_cost = self.openai_service.calculate_cost(
            prompt_tokens=usage["prompt_tokens"],
            completion_tokens=usage["completion_tokens"],
        )
        current_tokens = int(version.token_usage) if version.token_usage else 0
        current_cost = float(version.cost) if version.cost else 0.0
        version.token_usage = str(current_tokens + usage["total_tokens"])
        version.cost = str(current_cost + additional_cost)

        self.db.commit()
        self.db.refresh(version)

        # Log usage
        self.openai_service.log_usage(
            user_id=str(user_id),
            operation=f"section_regeneration_{section}",
            model=result["model"],
            prompt_tokens=usage["prompt_tokens"],
            completion_tokens=usage["completion_tokens"],
            total_tokens=usage["total_tokens"],
            cost=additional_cost,
        )

        return AIGenerationResponse(
            id=str(version.id),
            user_id=str(user_id),
            source_resume_id=str(version.resume_id),
            version_name=version.version_name,
            status=GenerationStatus.COMPLETED,
            generated_content=version.content,
            token_usage=int(version.token_usage) if version.token_usage else 0,
            cost=float(version.cost) if version.cost else 0.0,
            created_at=version.created_at,
            completed_at=version.updated_at,
        )

    def get_version_history(
        self, user_id: uuid.UUID, resume_id: uuid.UUID
    ) -> List[AIGenerationResponse]:
        """
        Get all versions for a resume

        Args:
            user_id: User ID
            resume_id: Resume ID

        Returns:
            List of AIGenerationResponse objects
        """
        versions = (
            self.db.query(ResumeVersion)
            .join(Resume)
            .filter(Resume.id == resume_id, Resume.user_id == user_id)
            .order_by(ResumeVersion.created_at.desc())
            .all()
        )

        return [
            AIGenerationResponse(
                id=str(v.id),
                user_id=str(user_id),
                source_resume_id=str(v.resume_id),
                version_name=v.version_name,
                status=GenerationStatus(v.status),
                generated_content=v.content,
                token_usage=int(v.token_usage) if v.token_usage else 0,
                cost=float(v.cost) if v.cost else 0.0,
                created_at=v.created_at,
                completed_at=v.updated_at,
            )
            for v in versions
        ]

    def compare_versions(
        self, user_id: uuid.UUID, version1_id: uuid.UUID, version2_id: uuid.UUID
    ) -> ComparisonResult:
        """
        Compare two resume versions

        Args:
            user_id: User ID
            version1_id: First version ID
            version2_id: Second version ID

        Returns:
            ComparisonResult with differences and improvements

        Raises:
            NotFoundError: If versions not found
        """
        # Fetch both versions
        version1 = (
            self.db.query(ResumeVersion).filter(ResumeVersion.id == version1_id).first()
        )

        version2 = (
            self.db.query(ResumeVersion).filter(ResumeVersion.id == version2_id).first()
        )

        if not version1 or not version2:
            raise NotFoundError("One or both versions not found")

        # Analyze differences
        differences = []
        improvements = []

        # Compare each section
        all_sections = set(version1.content.keys()) | set(version2.content.keys())

        for section in all_sections:
            v1_content = version1.content.get(section)
            v2_content = version2.content.get(section)

            if v1_content != v2_content:
                differences.append(
                    {"section": section, "version1": v1_content, "version2": v2_content}
                )

                # Simple improvement heuristic: longer content with more keywords
                if isinstance(v2_content, str) and isinstance(v1_content, str):
                    if len(v2_content) > len(v1_content):
                        improvements.append(
                            f"Enhanced {section} section with more detail"
                        )
                elif isinstance(v2_content, list) and isinstance(v1_content, list):
                    if len(v2_content) > len(v1_content):
                        improvements.append(
                            f"Added {len(v2_content) - len(v1_content)} items to {section}"
                        )

        # Calculate similarity (simple Jaccard similarity on section keys)
        v1_sections = set(version1.content.keys())
        v2_sections = set(version2.content.keys())
        similarity = (
            len(v1_sections & v2_sections) / len(v1_sections | v2_sections) * 100
        )

        # Recommendation based on recency and quality
        recommendation = (
            "version2" if version2.created_at > version1.created_at else "version1"
        )

        return ComparisonResult(
            original_version_id=str(version1_id),
            generated_version_id=str(version2_id),
            differences=differences,
            improvements=improvements,
            similarity_score=round(similarity, 2),
            recommendation=recommendation,
        )

    def get_improvement_suggestions(
        self, user_id: uuid.UUID, resume_id: uuid.UUID
    ) -> Dict[str, Any]:
        """
        Generate AI suggestions for resume improvement

        Args:
            user_id: User ID
            resume_id: Resume ID

        Returns:
            Dict with suggestions, strengths, weaknesses

        Raises:
            NotFoundError: If resume not found
            ServiceError: If analysis fails
        """
        # Fetch resume
        resume = (
            self.db.query(Resume)
            .filter(Resume.id == resume_id, Resume.user_id == user_id)
            .first()
        )

        if not resume:
            raise NotFoundError(f"Resume {resume_id} not found")

        # Build analysis prompt
        prompt = f"""Analyze this resume and provide improvement suggestions.

Resume data: {resume.parsed_data}

Provide your analysis in JSON format with:
- suggestions: List of specific improvements (section, current_text, suggested_text, reason, priority)
- overall_score: Score from 0-100
- strengths: List of strong points
- weaknesses: List of areas needing improvement
- missing_keywords: List of important keywords that should be added
"""

        # Generate analysis
        try:
            result = self.openai_service.generate_completion(
                messages=[
                    {"role": "system", "content": "You are an expert resume reviewer."},
                    {"role": "user", "content": prompt},
                ]
            )
        except Exception as e:
            raise ServiceError(f"Failed to analyze resume: {str(e)}")

        # Parse response
        try:
            suggestions = self.openai_service.parse_json_response(result["content"])
        except ValueError as e:
            raise ValueError(f"Invalid response from AI: {str(e)}")

        return suggestions
