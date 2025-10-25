"""AI resume generation and optimization endpoints"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.schemas.user import User
from app.schemas.ai_generation import (
    AIResumeGenerationRequest,
    SectionRegenerationRequest,
    AIEnhancementRequest,
    AIGenerationResponse,
    AIImprovementSuggestionsResponse,
    ComparisonResult,
)
from app.services.ai_generation_service import AIGenerationService
from app.core.exceptions import NotFoundError, ServiceError

router = APIRouter()


@router.post(
    "/resume/generate",
    response_model=AIGenerationResponse,
    status_code=status.HTTP_201_CREATED,
)
def generate_optimized_resume(
    request: AIResumeGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate AI-optimized resume from source resume

    Args:
        request: Generation request with parameters
        current_user: Authenticated user
        db: Database session

    Returns:
        AIGenerationResponse with generated content

    Raises:
        404: Resume not found
        500: Generation failed
    """
    try:
        service = AIGenerationService(db)
        result = service.generate_optimized_resume(
            user_id=uuid.UUID(current_user.id), request=request
        )
        return result
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/resume/regenerate-section", response_model=AIGenerationResponse)
def regenerate_resume_section(
    request: SectionRegenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Regenerate specific resume sections

    Args:
        request: Section regeneration request
        current_user: Authenticated user
        db: Database session

    Returns:
        Updated AIGenerationResponse

    Raises:
        404: Resume version not found
        500: Regeneration failed
    """
    try:
        service = AIGenerationService(db)

        # Regenerate each section
        for section in request.sections:
            result = service.regenerate_section(
                user_id=uuid.UUID(current_user.id),
                version_id=uuid.UUID(request.resume_version_id),
                section=section,
                tone=request.tone.value if request.tone else None,
                instructions=request.instructions,
            )

        return result
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/resume/{resume_id}/versions", response_model=List[AIGenerationResponse])
def get_resume_versions(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get all versions for a resume

    Args:
        resume_id: Resume ID
        current_user: Authenticated user
        db: Database session

    Returns:
        List of AIGenerationResponse objects
    """
    service = AIGenerationService(db)
    return service.get_version_history(
        user_id=uuid.UUID(current_user.id), resume_id=uuid.UUID(resume_id)
    )


@router.post("/resume/compare", response_model=ComparisonResult)
def compare_resume_versions(
    version1_id: str,
    version2_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Compare two resume versions

    Args:
        version1_id: First version ID
        version2_id: Second version ID
        current_user: Authenticated user
        db: Database session

    Returns:
        ComparisonResult with differences

    Raises:
        404: One or both versions not found
    """
    try:
        service = AIGenerationService(db)
        return service.compare_versions(
            user_id=uuid.UUID(current_user.id),
            version1_id=uuid.UUID(version1_id),
            version2_id=uuid.UUID(version2_id),
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


@router.get(
    "/resume/{resume_id}/suggestions", response_model=AIImprovementSuggestionsResponse
)
def get_improvement_suggestions(
    resume_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get AI-powered improvement suggestions for resume

    Args:
        resume_id: Resume ID
        current_user: Authenticated user
        db: Database session

    Returns:
        AIImprovementSuggestionsResponse with suggestions

    Raises:
        404: Resume not found
        500: Analysis failed
    """
    try:
        service = AIGenerationService(db)
        suggestions = service.get_improvement_suggestions(
            user_id=uuid.UUID(current_user.id), resume_id=uuid.UUID(resume_id)
        )

        # Transform to expected schema
        return AIImprovementSuggestionsResponse(resume_id=resume_id, **suggestions)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/enhance-text")
def enhance_text(
    request: AIEnhancementRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Enhance specific text using AI

    Args:
        request: Text enhancement request
        current_user: Authenticated user
        db: Database session

    Returns:
        Enhanced text

    Raises:
        500: Enhancement failed
    """
    try:
        service = AIGenerationService(db)

        # Build enhancement prompt
        prompt = f"""Enhance the following text to be more professional and impactful.

Text: {request.text}
Context: {request.context or 'N/A'}
Tone: {request.tone.value}
{f'Maximum length: {request.max_length} characters' if request.max_length else ''}

Provide ONLY the enhanced text without any additional explanation."""

        result = service.openai_service.generate_completion(
            messages=[
                {"role": "system", "content": "You are an expert resume writer."},
                {"role": "user", "content": prompt},
            ],
            max_tokens=request.max_length if request.max_length else 200,
        )

        return {"enhanced_text": result["content"].strip()}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Text enhancement failed: {str(e)}",
        )
