"""
Interview Coaching API Endpoints
Endpoints for interview practice sessions
"""

from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.db.models.user import User
from app.schemas.interview import (
    InterviewSessionCreate,
    InterviewSessionResponse,
    AnswerSubmit,
    QuestionFeedback,
    InterviewQuestionResponse,
    SessionStats,
)
from app.services.interview_service import InterviewService
from app.core.exceptions import ServiceError, NotFoundError, ValidationError

router = APIRouter(prefix="/interview", tags=["Interview Coaching"])


@router.post(
    "/sessions",
    response_model=InterviewSessionResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_interview_session(
    request: InterviewSessionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new interview practice session

    - **interview_type**: Type of interview (technical, behavioral, system-design, product, leadership)
    - **role_level**: Target role level (junior, mid, senior, staff)
    - **company_type**: Type of company (faang, tech, enterprise, fintech, healthcare)
    - **total_questions**: Number of questions to generate (1-20)
    """
    try:
        service = InterviewService()
        session = service.create_session(db, current_user, request)
        return session
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/sessions", response_model=List[InterviewSessionResponse])
def list_interview_sessions(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    List all interview sessions for the current user

    - **skip**: Number of sessions to skip (pagination)
    - **limit**: Maximum number of sessions to return
    """
    try:
        service = InterviewService()
        sessions = service._get_user_sessions(db, current_user.id)
        return sessions[skip : skip + limit]
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/sessions/{session_id}", response_model=InterviewSessionResponse)
def get_interview_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get a specific interview session by ID
    """
    try:
        service = InterviewService()
        session = service._get_session(db, session_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found",
            )

        # Verify ownership
        if session.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this session",
            )

        return InterviewSessionResponse.model_validate(session)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get(
    "/sessions/{session_id}/next-question", response_model=InterviewQuestionResponse
)
def get_next_question(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get the next unanswered question in the session
    """
    try:
        service = InterviewService()
        session = service._get_session(db, session_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found",
            )

        # Verify ownership
        if session.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this session",
            )

        next_question = service.get_next_question(db, session_id)

        if not next_question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No more questions available in this session",
            )

        return next_question
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/questions/{question_id}/answer", response_model=QuestionFeedback)
def submit_answer(
    question_id: int,
    request: AnswerSubmit,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Submit an answer to a question and receive AI feedback

    - **user_answer**: The candidate's answer to the question
    - **time_taken_seconds**: Optional time taken to answer in seconds
    """
    try:
        service = InterviewService()

        # Get question and verify ownership
        question = service._get_question(db, question_id)
        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Question {question_id} not found",
            )

        if question.session.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to answer this question",
            )

        feedback = service.submit_answer(db, question_id, request)
        return feedback

    except HTTPException:
        raise
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ValidationError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/sessions/{session_id}/complete", response_model=InterviewSessionResponse)
def complete_session(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Mark a session as completed and calculate final scores
    """
    try:
        service = InterviewService()
        session = service._get_session(db, session_id)

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Session {session_id} not found",
            )

        # Verify ownership
        if session.user_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to complete this session",
            )

        completed_session = service.complete_session(db, session_id)
        return completed_session

    except HTTPException:
        raise
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/stats", response_model=SessionStats)
def get_user_stats(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Get interview practice statistics for the current user

    Returns:
    - Total sessions
    - Completed sessions
    - Total questions answered
    - Average score
    - Improvement rate
    - Sessions by type
    - Recent sessions
    """
    try:
        service = InterviewService()
        stats = service.get_user_stats(db, current_user.id)
        return stats
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
