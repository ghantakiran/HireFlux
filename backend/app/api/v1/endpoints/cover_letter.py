"""Cover letter generation endpoints"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
import uuid

from app.core.database import get_db
from app.core.auth import get_current_user
from app.schemas.user import User
from app.schemas.cover_letter import (
    CoverLetterGenerationRequest,
    CoverLetterResponse,
    BulkCoverLetterGenerationRequest,
    BulkCoverLetterResponse
)
from app.services.cover_letter_service import CoverLetterService
from app.core.exceptions import NotFoundError, ServiceError

router = APIRouter()


@router.post("/generate", response_model=List[CoverLetterResponse], status_code=status.HTTP_201_CREATED)
def generate_cover_letter(
    request: CoverLetterGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate AI-powered cover letter

    Args:
        request: Cover letter generation parameters
        current_user: Authenticated user
        db: Database session

    Returns:
        List of CoverLetterResponse (multiple if variations requested)

    Raises:
        404: Resume not found
        500: Generation failed
    """
    try:
        service = CoverLetterService(db)
        return service.generate_cover_letter(
            user_id=uuid.UUID(current_user.id),
            request=request
        )
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ServiceError as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))


@router.post("/bulk-generate", response_model=BulkCoverLetterResponse)
def bulk_generate_cover_letters(
    request: BulkCoverLetterGenerationRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Generate multiple cover letters at once

    Args:
        request: Bulk generation request
        current_user: Authenticated user
        db: Database session

    Returns:
        BulkCoverLetterResponse with results and costs
    """
    try:
        service = CoverLetterService(db)
        return service.generate_bulk(
            user_id=uuid.UUID(current_user.id),
            request=request
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Bulk generation failed: {str(e)}"
        )


@router.get("/", response_model=List[CoverLetterResponse])
def list_cover_letters(
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get user's cover letters

    Args:
        limit: Maximum number of results
        current_user: Authenticated user
        db: Database session

    Returns:
        List of CoverLetterResponse objects
    """
    service = CoverLetterService(db)
    return service.get_cover_letters(
        user_id=uuid.UUID(current_user.id),
        limit=limit
    )


@router.get("/{cover_letter_id}", response_model=CoverLetterResponse)
def get_cover_letter(
    cover_letter_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get specific cover letter"""
    from app.db.models.cover_letter import CoverLetter

    letter = db.query(CoverLetter).filter(
        CoverLetter.id == uuid.UUID(cover_letter_id),
        CoverLetter.user_id == uuid.UUID(current_user.id)
    ).first()

    if not letter:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Cover letter not found")

    service = CoverLetterService(db)
    return service._to_response(letter)
