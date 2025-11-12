"""
Candidate Assessment API Endpoints - Sprint 19-20 Week 37

Handles candidate-side assessment taking flow:
- Access assessment via token
- Start assessment attempt
- Submit answers (MCQ, text, coding, file)
- Execute code challenges
- Track anti-cheating events
- Submit final assessment
- Retrieve results

Following REST API best practices with FastAPI.
"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status, Body
from sqlalchemy.orm import Session

from app.api import deps
from app.services.candidate_assessment_service import CandidateAssessmentService
from app.schemas.candidate_assessment import (
    AssessmentAccessResponse,
    AttemptStartRequest,
    AttemptStartResponse,
    AnswerSubmitRequest,
    AnswerSubmitResponse,
    CodeExecutionRequest,
    CodeExecutionResponse,
    AntiCheatEventRequest,
    AssessmentSubmitResponse,
    AssessmentResultsResponse,
    AttemptProgressResponse,
)
from app.core.exceptions import (
    InvalidAccessTokenError,
    AttemptNotFoundError,
    AssessmentNotFoundError,
    AssessmentAlreadySubmittedError,
    TimeLimitExceededError,
    TooManyAttemptsError,
    ForbiddenError,
)

router = APIRouter()


# ============================================================================
# Assessment Access
# ============================================================================

@router.get(
    "/access/{access_token}",
    response_model=AssessmentAccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Access assessment via token",
    description="Candidate accesses assessment using unique access token link",
)
async def access_assessment(
    access_token: str,
    db: Session = Depends(deps.get_db),
) -> AssessmentAccessResponse:
    """
    Access assessment using access token.

    **Flow:**
    1. Candidate receives email with unique assessment link
    2. Link contains access_token
    3. This endpoint validates token and returns assessment details

    **Returns:**
    - Assessment metadata (title, description, time limit)
    - Attempt details (if already started)
    - Time remaining
    - Instructions
    """
    try:
        service = CandidateAssessmentService(db)
        result = service.access_assessment(access_token)

        return AssessmentAccessResponse(
            assessment_id=str(result["assessment"].id),
            assessment_title=result["assessment"].title,
            assessment_description=result["assessment"].description,
            time_limit_minutes=result["assessment"].time_limit_minutes,
            total_questions=result["attempt"].total_questions,
            total_points=result["attempt"].total_points_possible,
            status=result["status"],
            time_remaining_minutes=result.get("time_remaining_minutes"),
            allow_tab_switching=result["assessment"].allow_tab_switching,
            max_tab_switches=result["assessment"].max_tab_switches,
            attempt_id=str(result["attempt"].id) if result.get("attempt") else None,
        )
    except InvalidAccessTokenError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to access assessment: {str(e)}",
        )


# ============================================================================
# Assessment Start
# ============================================================================

@router.post(
    "/{assessment_id}/start",
    response_model=AttemptStartResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start assessment attempt",
    description="Candidate starts a new assessment attempt",
)
async def start_assessment(
    assessment_id: UUID,
    request: AttemptStartRequest,
    current_user = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> AttemptStartResponse:
    """
    Start new assessment attempt.

    **Requirements:**
    - Candidate must be authenticated
    - Assessment must be published
    - Must not exceed max attempts

    **Creates:**
    - New AssessmentAttempt record
    - Unique access token
    - Start timestamp

    **Returns:**
    - Attempt ID
    - Access token (for future access)
    - Questions list
    - Time limit
    """
    try:
        service = CandidateAssessmentService(db)
        attempt = service.start_assessment(
            assessment_id=assessment_id,
            candidate_id=current_user.id,
            ip_address=request.ip_address,
        )

        # Get questions for the assessment
        from app.db.models.assessment import AssessmentQuestion
        questions = (
            db.query(AssessmentQuestion)
            .filter(AssessmentQuestion.assessment_id == assessment_id)
            .order_by(AssessmentQuestion.display_order)
            .all()
        )

        return AttemptStartResponse(
            attempt_id=str(attempt.id),
            access_token=attempt.access_token,
            started_at=attempt.started_at,
            time_limit_minutes=attempt.assessment.time_limit_minutes,
            total_questions=attempt.total_questions,
            questions=[
                {
                    "id": str(q.id),
                    "question_type": q.question_type,
                    "question_text": q.question_text,
                    "points": q.points,
                    "order": q.display_order,
                    "options": q.options if q.question_type in ["mcq_single", "mcq_multiple"] else None,
                    "starter_code": q.starter_code if q.question_type == "coding" else None,
                    "coding_language": q.coding_language if q.question_type == "coding" else None,
                }
                for q in questions
            ],
        )
    except TooManyAttemptsError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except AssessmentNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start assessment: {str(e)}",
        )


# ============================================================================
# Answer Submission
# ============================================================================

@router.post(
    "/attempts/{attempt_id}/responses",
    response_model=AnswerSubmitResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit answer to question",
    description="Candidate submits answer (MCQ, text, coding, or file)",
)
async def submit_answer(
    attempt_id: UUID,
    request: AnswerSubmitRequest,
    current_user = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> AnswerSubmitResponse:
    """
    Submit answer to a question.

    **Supports:**
    - MCQ single-choice: `{"selected_option": 2}`
    - MCQ multiple-choice: `{"selected_options": [0, 2]}`
    - Text response: `{"text_response": "My answer..."}`
    - Coding: `{"code": "def foo():", "language": "python"}`
    - File upload: `{"file_url": "s3://...", "file_name": "resume.pdf"}`

    **Auto-grading:**
    - MCQ: Graded immediately
    - Coding: Requires execution (use /execute-code endpoint)
    - Text/File: Requires manual grading

    **Features:**
    - Auto-save (updates existing response if re-submitting)
    - Progress tracking
    - Time tracking per question
    """
    try:
        service = CandidateAssessmentService(db)

        # Verify ownership
        service.verify_attempt_ownership(attempt_id, current_user.id)

        # Submit answer
        response = service.submit_answer(
            attempt_id=attempt_id,
            question_id=request.question_id,
            answer_data=request.answer_data,
            time_spent_seconds=request.time_spent_seconds,
        )

        return AnswerSubmitResponse(
            response_id=str(response.id),
            question_id=str(response.question_id),
            is_correct=response.is_correct,
            points_earned=response.points_earned,
            saved_at=response.updated_at or response.created_at,
        )
    except ForbiddenError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except (AssessmentAlreadySubmittedError, TimeLimitExceededError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except AttemptNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit answer: {str(e)}",
        )


# ============================================================================
# Code Execution
# ============================================================================

@router.post(
    "/attempts/{attempt_id}/execute-code",
    response_model=CodeExecutionResponse,
    status_code=status.HTTP_200_OK,
    summary="Execute coding challenge",
    description="Run candidate's code against test cases (Judge0/Piston)",
)
async def execute_code(
    attempt_id: UUID,
    request: CodeExecutionRequest,
    current_user = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> CodeExecutionResponse:
    """
    Execute code for coding challenge.

    **Execution:**
    - Code runs in sandboxed environment (Judge0 or Piston)
    - Test cases from question definition
    - 5-second timeout per execution
    - Memory limit: 256MB

    **Returns:**
    - Execution status (success, error, timeout)
    - Test cases passed/total
    - Execution time
    - Output/error messages

    **Auto-grading:**
    - Points awarded proportional to test cases passed
    - Saves results to response if `save_to_response=true`
    """
    try:
        service = CandidateAssessmentService(db)

        # Verify ownership
        service.verify_attempt_ownership(attempt_id, current_user.id)

        # Execute code
        result = await service.execute_code(
            attempt_id=attempt_id,
            question_id=request.question_id,
            code=request.code,
            language=request.language,
            save_to_response=request.save_to_response,
        )

        return CodeExecutionResponse(
            status=result["status"],
            test_cases_passed=result.get("test_cases_passed", 0),
            test_cases_total=result.get("test_cases_total", 0),
            execution_time_ms=result.get("execution_time_ms", 0),
            output=result.get("output", ""),
            error_message=result.get("error_message"),
        )
    except ForbiddenError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute code: {str(e)}",
        )


# ============================================================================
# Anti-Cheating
# ============================================================================

@router.post(
    "/attempts/{attempt_id}/track-event",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Track anti-cheating event",
    description="Track tab switches, copy-paste, IP changes, etc.",
)
async def track_event(
    attempt_id: UUID,
    request: AntiCheatEventRequest,
    current_user = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    """
    Track anti-cheating events.

    **Tracked Events:**
    - `tab_switch`: Browser tab/window switch
    - `copy_paste`: Copy or paste action
    - `ip_change`: IP address changed during assessment
    - `full_screen_exit`: Exited full-screen mode

    **Auto-flagging:**
    - Exceeding tab switch limit flags attempt
    - IP changes flag for manual review
    - Events stored in attempt metadata
    """
    try:
        service = CandidateAssessmentService(db)

        # Verify ownership
        service.verify_attempt_ownership(attempt_id, current_user.id)

        # Track event
        service.track_event(
            attempt_id=attempt_id,
            event_type=request.event_type,
            details=request.details,
        )

        return None
    except ForbiddenError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except AttemptNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )


# ============================================================================
# Assessment Submission
# ============================================================================

@router.post(
    "/attempts/{attempt_id}/submit",
    response_model=AssessmentSubmitResponse,
    status_code=status.HTTP_200_OK,
    summary="Submit final assessment",
    description="Candidate submits completed assessment for grading",
)
async def submit_assessment(
    attempt_id: UUID,
    current_user = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> AssessmentSubmitResponse:
    """
    Submit final assessment.

    **Actions:**
    - Marks attempt as completed
    - Auto-grades all MCQ and coding responses
    - Calculates final score
    - Determines pass/fail status
    - Sends notification to employer

    **Immutable:**
    - Once submitted, no further changes allowed
    - Submission timestamp recorded

    **Returns:**
    - Final score percentage
    - Pass/fail status
    - Points breakdown
    """
    try:
        service = CandidateAssessmentService(db)

        # Verify ownership
        service.verify_attempt_ownership(attempt_id, current_user.id)

        # Submit assessment
        result = service.submit_assessment(attempt_id)

        return AssessmentSubmitResponse(
            attempt_id=str(result["attempt_id"]),
            score_percentage=result["score_percentage"],
            points_earned=result["points_earned"],
            total_points=result["total_points"],
            questions_correct=result["questions_correct"],
            total_questions=result["total_questions"],
            passed=result["passed"],
            submitted_at=result.get("submitted_at"),
        )
    except ForbiddenError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except AssessmentAlreadySubmittedError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except AttemptNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to submit assessment: {str(e)}",
        )


# ============================================================================
# Results Retrieval
# ============================================================================

@router.get(
    "/attempts/{attempt_id}/results",
    response_model=AssessmentResultsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get assessment results",
    description="Retrieve assessment results after completion",
)
async def get_results(
    attempt_id: UUID,
    current_user = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> AssessmentResultsResponse:
    """
    Get assessment results.

    **Requirements:**
    - Assessment must be completed
    - Candidate must own the attempt

    **Returns:**
    - Final score and pass/fail status
    - Per-question results
    - Correct answers (if show_correct_answers enabled)
    - Feedback (if provided by grader)

    **Privacy:**
    - Correct answers shown based on assessment settings
    - Some employers hide answers to prevent sharing
    """
    try:
        service = CandidateAssessmentService(db)

        # Verify ownership
        service.verify_attempt_ownership(attempt_id, current_user.id)

        # Get results
        results = service.get_results(attempt_id)

        return AssessmentResultsResponse(**results)
    except ForbiddenError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except AttemptNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get results: {str(e)}",
        )


# ============================================================================
# Progress Tracking
# ============================================================================

@router.get(
    "/attempts/{attempt_id}/progress",
    response_model=AttemptProgressResponse,
    status_code=status.HTTP_200_OK,
    summary="Get attempt progress",
    description="Get real-time progress of ongoing assessment",
)
async def get_attempt_progress(
    attempt_id: UUID,
    current_user = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> AttemptProgressResponse:
    """
    Get attempt progress.

    **Returns:**
    - Questions answered / total
    - Time elapsed / remaining
    - Current status
    - Last saved timestamp

    **Use case:**
    - Progress bar in UI
    - Auto-save confirmation
    - Session recovery
    """
    try:
        service = CandidateAssessmentService(db)

        # Verify ownership
        service.verify_attempt_ownership(attempt_id, current_user.id)

        # Get progress
        progress = service.get_attempt_progress(attempt_id)

        return AttemptProgressResponse(**progress)
    except ForbiddenError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except AttemptNotFoundError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
