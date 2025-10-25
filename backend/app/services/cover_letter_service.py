"""Cover letter generation service"""
import uuid
from typing import List, Dict, Any, Optional
from datetime import datetime
from sqlalchemy.orm import Session

from app.services.openai_service import OpenAIService
from app.schemas.cover_letter import (
    CoverLetterGenerationRequest,
    CoverLetterResponse,
    CoverLetterStatus,
    BulkCoverLetterGenerationRequest,
    BulkCoverLetterResponse,
)
from app.core.exceptions import NotFoundError, ServiceError
from app.db.models.cover_letter import CoverLetter
from app.db.models.resume import Resume, ResumeVersion


class CoverLetterService:
    """Service for AI-powered cover letter generation"""

    # Word count targets for different lengths
    LENGTH_TARGETS = {
        "brief": (200, 250),
        "standard": (300, 400),
        "detailed": (450, 600),
    }

    def __init__(self, db: Session):
        """Initialize cover letter service"""
        self.db = db
        self.openai_service = OpenAIService()

    def generate_cover_letter(
        self, user_id: uuid.UUID, request: CoverLetterGenerationRequest
    ) -> List[CoverLetterResponse]:
        """
        Generate AI-powered cover letter(s)

        Returns list of variations if variations_count > 1
        """
        # Get resume data
        resume_data = self._get_resume_data(
            user_id, request.resume_version_id, request.resume_id
        )

        # Generate variations
        results = []
        for i in range(request.variations_count):
            result = self._generate_single_cover_letter(
                user_id=user_id,
                request=request,
                resume_data=resume_data,
                variation_number=i + 1 if request.variations_count > 1 else None,
            )
            results.append(result)

        return results

    def _get_resume_data(
        self,
        user_id: uuid.UUID,
        resume_version_id: Optional[str],
        resume_id: Optional[str],
    ) -> Dict[str, Any]:
        """Get resume data from version or default resume"""
        if resume_version_id:
            version = (
                self.db.query(ResumeVersion)
                .filter(ResumeVersion.id == uuid.UUID(resume_version_id))
                .first()
            )
            if not version:
                raise NotFoundError("Resume version not found")
            return version.content

        elif resume_id:
            resume = (
                self.db.query(Resume)
                .filter(Resume.id == uuid.UUID(resume_id), Resume.user_id == user_id)
                .first()
            )
            if not resume:
                raise NotFoundError("Resume not found")
            return resume.parsed_data

        else:
            # Use default resume
            resume = (
                self.db.query(Resume)
                .filter(Resume.user_id == user_id, Resume.is_default == True)
                .first()
            )
            if not resume:
                raise NotFoundError("No default resume found")
            return resume.parsed_data

    def _generate_single_cover_letter(
        self,
        user_id: uuid.UUID,
        request: CoverLetterGenerationRequest,
        resume_data: Dict[str, Any],
        variation_number: Optional[int] = None,
    ) -> CoverLetterResponse:
        """Generate a single cover letter"""

        # Build prompt
        prompt = self._build_cover_letter_prompt(request, resume_data, variation_number)

        # Generate with OpenAI
        try:
            result = self.openai_service.generate_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert cover letter writer.",
                    },
                    {"role": "user", "content": prompt},
                ]
            )
        except Exception as e:
            raise ServiceError(f"Failed to generate cover letter: {str(e)}")

        # Calculate cost
        usage = result["usage"]
        cost = self.openai_service.calculate_cost(
            prompt_tokens=usage["prompt_tokens"],
            completion_tokens=usage["completion_tokens"],
        )

        # Create cover letter record
        cover_letter = CoverLetter(
            id=uuid.uuid4(),
            user_id=user_id,
            job_title=request.job_title,
            company_name=request.company_name,
            job_description=request.job_description,
            content=result["content"],
            tone=request.tone.value,
            length=request.length.value,
            emphasized_skills=request.emphasize_skills,
            custom_intro=request.custom_intro,
            company_research=request.company_research,
            referral_name=request.referral_name,
            address_gap=request.address_gap,
            career_change_context=request.career_change_context,
            strict_factual=request.strict_factual,
            token_usage=str(usage["total_tokens"]),
            cost=str(cost),
            status="completed",
            variation_number=variation_number,
            created_at=datetime.utcnow(),
        )

        self.db.add(cover_letter)
        self.db.commit()
        self.db.refresh(cover_letter)

        # Log usage
        self.openai_service.log_usage(
            user_id=str(user_id),
            operation="cover_letter_generation",
            model=result["model"],
            prompt_tokens=usage["prompt_tokens"],
            completion_tokens=usage["completion_tokens"],
            total_tokens=usage["total_tokens"],
            cost=cost,
        )

        return self._to_response(cover_letter)

    def _build_cover_letter_prompt(
        self,
        request: CoverLetterGenerationRequest,
        resume_data: Dict[str, Any],
        variation_number: Optional[int] = None,
    ) -> str:
        """Build prompt for cover letter generation"""

        min_words, max_words = self.LENGTH_TARGETS[request.length.value]

        prompt_parts = [
            f"Write a professional cover letter for the following position:",
            f"\nJob Title: {request.job_title}",
            f"Company: {request.company_name}",
            f"\nTone: {request.tone.value.upper()}",
            f"Length: {min_words}-{max_words} words",
        ]

        if request.job_description:
            prompt_parts.append(
                f"\n\nJob Description:\n{request.job_description[:1000]}"
            )

        # Add resume context
        name = resume_data.get("contact_info", {}).get("full_name", "")
        skills = resume_data.get("skills", [])
        experience = resume_data.get("work_experience", [])

        prompt_parts.append(f"\n\nCandidate: {name}")
        prompt_parts.append(f"Skills: {', '.join(skills[:10])}")

        if experience:
            prompt_parts.append("\nRecent Experience:")
            for exp in experience[:2]:
                prompt_parts.append(
                    f"- {exp.get('title', 'N/A')} at {exp.get('company', 'N/A')}"
                )

        # Add customizations
        if request.custom_intro:
            prompt_parts.append(
                f"\n\nUse this as the introduction:\n{request.custom_intro}"
            )

        if request.emphasize_skills:
            prompt_parts.append(
                f"\nEmphasize these skills: {', '.join(request.emphasize_skills)}"
            )

        if request.company_research:
            prompt_parts.append(f"\nCompany Insights:\n{request.company_research}")

        if request.referral_name:
            prompt_parts.append(f"\nMention referral: {request.referral_name}")

        if request.address_gap:
            prompt_parts.append(f"\nAddress employment gap: {request.address_gap}")

        if request.career_change_context:
            prompt_parts.append(
                f"\nCareer change context: {request.career_change_context}"
            )

        if request.strict_factual:
            prompt_parts.append(
                "\n\nIMPORTANT: Only use information provided. Do not fabricate experiences or skills."
            )

        if variation_number:
            prompt_parts.append(
                f"\n\nThis is variation #{variation_number}. Emphasize different strengths."
            )

        prompt_parts.append(
            "\n\nProvide the complete cover letter text only, no additional commentary."
        )

        return " ".join(prompt_parts)

    def _to_response(self, cover_letter: CoverLetter) -> CoverLetterResponse:
        """Convert model to response schema"""
        return CoverLetterResponse(
            id=str(cover_letter.id),
            user_id=str(cover_letter.user_id),
            resume_version_id=str(cover_letter.resume_version_id)
            if cover_letter.resume_version_id
            else None,
            job_title=cover_letter.job_title,
            company_name=cover_letter.company_name,
            tone=cover_letter.tone,
            length=cover_letter.length,
            content=cover_letter.content,
            status=CoverLetterStatus(cover_letter.status),
            token_usage=int(cover_letter.token_usage)
            if cover_letter.token_usage
            else 0,
            cost=float(cover_letter.cost) if cover_letter.cost else 0.0,
            quality_score=cover_letter.quality_score,
            created_at=cover_letter.created_at,
            updated_at=cover_letter.updated_at,
        )

    def get_cover_letters(
        self, user_id: uuid.UUID, limit: int = 50
    ) -> List[CoverLetterResponse]:
        """Get user's cover letters"""
        letters = (
            self.db.query(CoverLetter)
            .filter(CoverLetter.user_id == user_id)
            .order_by(CoverLetter.created_at.desc())
            .limit(limit)
            .all()
        )

        return [self._to_response(letter) for letter in letters]

    def generate_bulk(
        self, user_id: uuid.UUID, request: BulkCoverLetterGenerationRequest
    ) -> BulkCoverLetterResponse:
        """Generate multiple cover letters"""
        results = []
        total_cost = 0.0
        total_tokens = 0

        for job in request.jobs:
            try:
                individual_request = CoverLetterGenerationRequest(
                    resume_version_id=request.resume_version_id,
                    job_title=job["job_title"],
                    company_name=job["company_name"],
                    tone=request.tone,
                    length=request.length,
                )

                letter = self.generate_cover_letter(user_id, individual_request)[0]
                results.append(letter)
                total_cost += letter.cost or 0.0
                total_tokens += letter.token_usage or 0

            except Exception:
                continue

        return BulkCoverLetterResponse(
            total_letters=len(request.jobs),
            successful=len(results),
            failed=len(request.jobs) - len(results),
            letters=results,
            total_cost=total_cost,
            total_tokens=total_tokens,
        )
