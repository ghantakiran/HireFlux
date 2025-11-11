"""
Assessment Platform API Endpoints - Sprint 17-18 Phase 4

Comprehensive REST API for the Skills Assessment & Testing Platform.
Supports 5 question types, auto-grading, manual grading, and anti-cheating measures.

Categories:
1. Assessment Management (8 endpoints)
2. Question Management (6 endpoints)
3. Question Bank (5 endpoints)
4. Candidate Assessment Taking (8 endpoints)
5. Grading & Review (4 endpoints)
"""

from datetime import datetime
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.user import User
from app.db.models.company import CompanyMember
from app.schemas.assessment import (
    # Assessment schemas
    AssessmentCreate,
    AssessmentUpdate,
    AssessmentResponse,
    AssessmentWithQuestions,
    AssessmentFilters,
    AssessmentStatistics,
    PublishAssessmentRequest,
    # Question schemas
    QuestionCreate,
    QuestionUpdate,
    QuestionResponse,
    # Question Bank schemas
    QuestionBankCreate,
    QuestionBankResponse,
    QuestionBankFilters,
    # Attempt schemas
    AssessmentAttemptCreate,
    AssessmentAttemptResponse,
    AssessmentAttemptWithResponses,
    RecordTabSwitchRequest,
    SubmitAssessmentRequest,
    # Response schemas
    ResponseCreate,
    ResponseResponse,
    # Grading schemas
    ManualGradeRequest,
    BulkGradeRequest,
    # Job linking
    JobAssessmentRequirementCreate,
    JobAssessmentRequirementResponse,
)
from app.services.assessment_service import AssessmentService
from app.services.question_bank_service import QuestionBankService
from app.services.coding_execution_service import CodingExecutionService
from app.core.exceptions import (
    AssessmentNotFoundError,
    QuestionNotFoundError,
    AttemptNotFoundError,
    ForbiddenError,
    NotFoundError,
)


router = APIRouter()


# ============================================================================
# DEPENDENCIES
# ============================================================================


def get_assessment_service(db: Session = Depends(deps.get_db)) -> AssessmentService:
    """Get AssessmentService instance"""
    return AssessmentService(db=db)


def get_question_bank_service(
    db: Session = Depends(deps.get_db)
) -> QuestionBankService:
    """Get QuestionBankService instance"""
    return QuestionBankService(db=db)


def get_coding_service() -> CodingExecutionService:
    """Get CodingExecutionService instance"""
    return CodingExecutionService()


def get_company_member(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> CompanyMember:
    """
    Get current user's company membership.

    Raises:
        HTTPException: If user is not a company member
    """
    membership = (
        db.query(CompanyMember)
        .filter(CompanyMember.user_id == current_user.id)
        .filter(CompanyMember.status == "active")
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a company member to access assessments",
        )

    return membership


def require_assessment_permissions(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> CompanyMember:
    """
    Require user to have assessment management permissions.

    Allowed roles: owner, admin, manager, recruiter
    """
    membership = (
        db.query(CompanyMember)
        .filter(CompanyMember.user_id == current_user.id)
        .filter(CompanyMember.status == "active")
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a company member to manage assessments",
        )

    allowed_roles = ["owner", "admin", "manager", "recruiter"]
    if membership.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Only {', '.join(allowed_roles)} can manage assessments",
        )

    return membership


# ============================================================================
# CATEGORY 1: ASSESSMENT MANAGEMENT (8 endpoints)
# ============================================================================


@router.post(
    "/",
    response_model=AssessmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Assessment",
    description="Create a new skills assessment. Assessment starts in 'draft' status.",
)
def create_assessment(
    assessment_data: AssessmentCreate,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Create a new assessment

    **Required Permissions:** owner, admin, manager, recruiter

    **Request Body:**
    - title: Assessment title
    - assessment_type: pre_screening, technical, personality, skills_test
    - configuration: time limits, passing score, anti-cheating settings
    - behavior: question/option randomization, result visibility

    **Response:**
    - Created assessment with status='draft'
    - id: Use this ID to add questions
    """
    try:
        assessment = service.create_assessment(
            company_id=membership.company_id,
            data=assessment_data,
            created_by=membership.user_id,
        )
        return assessment
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create assessment: {str(e)}",
        )


@router.get(
    "/",
    response_model=List[AssessmentResponse],
    summary="List Assessments",
    description="Get all assessments for your company with optional filters.",
)
def list_assessments(
    filters: AssessmentFilters = Depends(),
    membership: CompanyMember = Depends(get_company_member),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    List all assessments for company

    **Query Parameters:**
    - status: Filter by status (draft, published, archived, deleted)
    - assessment_type: Filter by type
    - category: Filter by category
    - search: Search in title/description
    - page: Page number (default 1)
    - limit: Results per page (default 20, max 100)

    **Response:**
    - List of assessments with analytics (total_attempts, avg_score, pass_rate)
    """
    assessments = service.list_assessments(
        company_id=membership.company_id, filters=filters
    )
    return assessments


@router.get(
    "/{assessment_id}",
    response_model=AssessmentWithQuestions,
    summary="Get Assessment",
    description="Get a single assessment with all questions.",
)
def get_assessment(
    assessment_id: UUID,
    membership: CompanyMember = Depends(get_company_member),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Get assessment by ID with all questions

    **Path Parameters:**
    - assessment_id: Assessment UUID

    **Response:**
    - Assessment details
    - Full question list with correct answers (for employers)
    - Analytics data

    **Errors:**
    - 404: Assessment not found or not owned by your company
    """
    try:
        assessment = service.get_assessment(assessment_id, membership.company_id)
        return assessment
    except AssessmentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )


@router.put(
    "/{assessment_id}",
    response_model=AssessmentResponse,
    summary="Update Assessment",
    description="Update assessment configuration. Cannot edit published assessments with active attempts.",
)
def update_assessment(
    assessment_id: UUID,
    update_data: AssessmentUpdate,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Update assessment configuration

    **Restrictions:**
    - Cannot modify published assessments with active attempts
    - Use clone feature to create new version instead

    **Request Body:**
    - All fields optional
    - Only provided fields will be updated

    **Errors:**
    - 400: Cannot edit published assessment with attempts
    - 404: Assessment not found
    """
    try:
        assessment = service.update_assessment(
            assessment_id, membership.company_id, update_data.model_dump(exclude_unset=True)
        )
        return assessment
    except AssessmentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.delete(
    "/{assessment_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Assessment",
    description="Soft delete an assessment. Marks as 'deleted' instead of removing from database.",
)
def delete_assessment(
    assessment_id: UUID,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Delete assessment (soft delete)

    **Behavior:**
    - Sets status='deleted' (does not remove from database)
    - Preserves attempt history for compliance
    - Cannot be undone (contact support to restore)

    **Errors:**
    - 404: Assessment not found
    """
    try:
        service.delete_assessment(assessment_id, membership.company_id)
        return None
    except AssessmentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )


@router.post(
    "/{assessment_id}/publish",
    response_model=AssessmentResponse,
    summary="Publish Assessment",
    description="Publish assessment to make it available for candidates. Validates minimum question count.",
)
def publish_assessment(
    assessment_id: UUID,
    request_data: PublishAssessmentRequest,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Publish assessment

    **Validation:**
    - Must have at least 1 question
    - All questions must be complete (have correct answers/test cases)

    **Effects:**
    - Sets status='published'
    - Records published_at timestamp
    - Assessment becomes available for job requirements

    **Errors:**
    - 400: Validation failed (no questions, incomplete questions)
    - 404: Assessment not found
    """
    try:
        assessment = service.publish_assessment(assessment_id, membership.company_id)
        return assessment
    except AssessmentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.post(
    "/{assessment_id}/clone",
    response_model=AssessmentResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Clone Assessment",
    description="Create a copy of an existing assessment with all questions.",
)
def clone_assessment(
    assessment_id: UUID,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Clone an existing assessment

    **Use Case:**
    - Create new version of published assessment
    - Modify questions without affecting active attempts

    **Behavior:**
    - Copies all assessment configuration
    - Copies all questions
    - New assessment has status='draft'
    - Title appended with '(Copy)'

    **Errors:**
    - 404: Assessment not found
    """
    try:
        cloned = service.clone_assessment(assessment_id, membership.company_id)
        return cloned
    except AssessmentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )


@router.get(
    "/{assessment_id}/statistics",
    response_model=AssessmentStatistics,
    summary="Get Assessment Statistics",
    description="Get detailed analytics for assessment performance.",
)
def get_assessment_statistics(
    assessment_id: UUID,
    membership: CompanyMember = Depends(get_company_member),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Get assessment analytics

    **Metrics:**
    - Total attempts / completions
    - Completion rate
    - Average score
    - Pass rate
    - Average time taken
    - Per-question statistics (difficulty, success rate)

    **Errors:**
    - 404: Assessment not found
    """
    try:
        stats = service.calculate_statistics(assessment_id, membership.company_id)
        return stats
    except AssessmentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )


# ============================================================================
# CATEGORY 2: QUESTION MANAGEMENT (6 endpoints)
# ============================================================================


@router.post(
    "/{assessment_id}/questions",
    response_model=QuestionResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add Question",
    description="Add a question to an assessment. Supports 5 question types.",
)
def add_question(
    assessment_id: UUID,
    question_data: QuestionCreate,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Add question to assessment

    **Question Types:**
    1. mcq_single: Multiple choice (single answer)
       - Requires: options, correct_answers (1 item)
    2. mcq_multiple: Multiple choice (multiple answers)
       - Requires: options, correct_answers (1+ items)
    3. coding: Programming challenge
       - Requires: coding_language, test_cases, starter_code (optional)
    4. text: Open-ended text response
       - Requires manual grading
    5. file_upload: File submission
       - Requires: allowed_file_types, max_file_size_mb

    **Validation:**
    - Type-specific fields are validated
    - Correct answers must be in options list (MCQ)
    - At least 1 test case required (coding)

    **Errors:**
    - 400: Validation failed
    - 404: Assessment not found
    """
    try:
        question = service.add_question(
            assessment_id, membership.company_id, question_data
        )
        return question
    except AssessmentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.get(
    "/{assessment_id}/questions",
    response_model=List[QuestionResponse],
    summary="Get Assessment Questions",
    description="Get all questions for an assessment in display order.",
)
def get_assessment_questions(
    assessment_id: UUID,
    membership: CompanyMember = Depends(get_company_member),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Get all questions for assessment

    **Response:**
    - Questions ordered by display_order
    - Includes correct answers and solution code (for employers)

    **Errors:**
    - 404: Assessment not found
    """
    try:
        assessment = service.get_assessment(assessment_id, membership.company_id)
        return assessment.questions
    except AssessmentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )


@router.put(
    "/questions/{question_id}",
    response_model=QuestionResponse,
    summary="Update Question",
    description="Update a question's configuration.",
)
def update_question(
    question_id: UUID,
    update_data: QuestionUpdate,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Update question

    **Restrictions:**
    - Cannot edit questions in published assessments with active attempts

    **Request Body:**
    - All fields optional
    - Type-specific validation applies

    **Errors:**
    - 400: Validation failed or has active attempts
    - 404: Question not found
    """
    try:
        question = service.update_question(
            question_id, membership.company_id, update_data.model_dump(exclude_unset=True)
        )
        return question
    except QuestionNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question {question_id} not found",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.delete(
    "/questions/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Question",
    description="Delete a question from an assessment.",
)
def delete_question(
    question_id: UUID,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Delete question

    **Restrictions:**
    - Cannot delete from published assessments with active attempts

    **Errors:**
    - 400: Has active attempts
    - 404: Question not found
    """
    try:
        service.delete_question(question_id, membership.company_id)
        return None
    except QuestionNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question {question_id} not found",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.post(
    "/questions/reorder",
    response_model=List[QuestionResponse],
    summary="Reorder Questions",
    description="Change the display order of questions in an assessment.",
)
def reorder_questions(
    question_ids: List[UUID],
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Reorder questions

    **Request Body:**
    - Array of question IDs in desired order
    - Must include all question IDs for the assessment

    **Behavior:**
    - Updates display_order for each question
    - Order matches array index (1-indexed)

    **Errors:**
    - 400: Invalid question count or question IDs
    """
    try:
        questions = service.reorder_questions(question_ids, membership.company_id)
        return questions
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.post(
    "/{assessment_id}/questions/bulk-import",
    response_model=List[QuestionResponse],
    summary="Bulk Import Questions",
    description="Import multiple questions from question bank into assessment.",
)
def bulk_import_questions(
    assessment_id: UUID,
    question_ids: List[UUID],
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: AssessmentService = Depends(get_assessment_service),
    bank_service: QuestionBankService = Depends(get_question_bank_service),
):
    """
    Bulk import questions from question bank

    **Request Body:**
    - Array of question bank item IDs

    **Behavior:**
    - Copies each question to assessment
    - Increments times_used counter
    - Maintains question types and configuration

    **Errors:**
    - 404: Assessment or questions not found
    - 403: No access to private questions
    """
    try:
        imported_questions = service.bulk_import_questions(
            assessment_id, membership.company_id, question_ids
        )
        return imported_questions
    except (AssessmentNotFoundError, QuestionNotFoundError) as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )


# ============================================================================
# CATEGORY 3: QUESTION BANK (5 endpoints)
# ============================================================================


@router.post(
    "/question-bank",
    response_model=QuestionBankResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Question Bank Item",
    description="Add a reusable question to your company's question bank.",
)
def create_question_bank_item(
    question_data: QuestionBankCreate,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: QuestionBankService = Depends(get_question_bank_service),
):
    """
    Create question bank item

    **Use Case:**
    - Create reusable questions
    - Share across multiple assessments
    - Build company question library

    **Fields:**
    - is_public: Make available to all companies (default false)
    - difficulty: easy, medium, hard
    - category: Group questions by topic
    - tags: Add searchable tags

    **Response:**
    - Created question bank item
    - times_used: Initially 0
    """
    try:
        question = service.create_question(
            company_id=membership.company_id,
            data=question_data,
            created_by=membership.user_id,
        )
        return question
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.get(
    "/question-bank",
    response_model=List[QuestionBankResponse],
    summary="Search Question Bank",
    description="Search your company's question bank plus public questions.",
)
def search_question_bank(
    filters: QuestionBankFilters = Depends(),
    membership: CompanyMember = Depends(get_company_member),
    service: QuestionBankService = Depends(get_question_bank_service),
):
    """
    Search question bank

    **Query Parameters:**
    - question_type: Filter by type
    - difficulty: Filter by difficulty
    - category: Filter by category
    - tags: Filter by tags (comma-separated)
    - is_public: Show only public questions
    - search: Search in question text/description
    - page: Page number
    - limit: Results per page

    **Results:**
    - Your company's questions
    - Public questions from other companies
    - Sorted by times_used (most popular first)
    """
    questions = service.search_questions(membership.company_id, filters)
    return questions


@router.get(
    "/question-bank/{question_id}",
    response_model=QuestionBankResponse,
    summary="Get Question Bank Item",
    description="Get a single question from the question bank.",
)
def get_question_bank_item(
    question_id: UUID,
    membership: CompanyMember = Depends(get_company_member),
    service: QuestionBankService = Depends(get_question_bank_service),
):
    """
    Get question bank item by ID

    **Access:**
    - Your company's questions
    - Public questions

    **Errors:**
    - 404: Question not found or not accessible
    """
    try:
        question = service.get_question(question_id, membership.company_id)
        return question
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Question {question_id} not found",
        )


@router.put(
    "/question-bank/{question_id}",
    response_model=QuestionBankResponse,
    summary="Update Question Bank Item",
    description="Update a question in your company's question bank.",
)
def update_question_bank_item(
    question_id: UUID,
    update_data: dict,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: QuestionBankService = Depends(get_question_bank_service),
):
    """
    Update question bank item

    **Restrictions:**
    - Can only update your company's questions (not public questions)

    **Request Body:**
    - Any QuestionBankCreate fields
    - All fields optional

    **Errors:**
    - 404: Question not found or not owned by your company
    """
    try:
        question = service.update_question(
            question_id, update_data, membership.company_id
        )
        return question
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )


@router.delete(
    "/question-bank/{question_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Question Bank Item",
    description="Delete a question from your company's question bank.",
)
def delete_question_bank_item(
    question_id: UUID,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: QuestionBankService = Depends(get_question_bank_service),
):
    """
    Delete question bank item

    **Restrictions:**
    - Can only delete your company's questions
    - Does not affect assessments already using this question

    **Errors:**
    - 404: Question not found
    """
    try:
        service.delete_question(question_id, membership.company_id)
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail=str(e)
        )


# ============================================================================
# CATEGORY 4: CANDIDATE ASSESSMENT TAKING (8 endpoints)
# ============================================================================


@router.post(
    "/{assessment_id}/start",
    response_model=AssessmentAttemptResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Start Assessment",
    description="Start a new assessment attempt as a candidate.",
)
def start_assessment(
    assessment_id: UUID,
    attempt_data: AssessmentAttemptCreate,
    current_user: User = Depends(deps.get_current_user),
    service: AssessmentService = Depends(get_assessment_service),
    request: Request = None,
):
    """
    Start assessment attempt

    **Validation:**
    - Assessment must be published
    - Check max_attempts limit
    - Candidate cannot have incomplete attempts

    **Behavior:**
    - Creates new attempt record
    - Generates access_token for this attempt
    - Records IP address and user agent (if track_ip_address enabled)
    - Starts timer (if time_limit_minutes set)

    **Response:**
    - Attempt ID and access token
    - Use attempt ID for all subsequent operations
    - Use access token in Authorization header

    **Errors:**
    - 403: Max attempts exceeded or has incomplete attempt
    - 404: Assessment not found or not published
    """
    try:
        # Extract IP from request
        ip_address = None
        if request:
            ip_address = request.client.host if request.client else None

        attempt = service.start_assessment(
            assessment_id=assessment_id,
            candidate_id=current_user.id,
            application_id=attempt_data.application_id,
            ip_address=ip_address or attempt_data.ip_address,
            user_agent=attempt_data.user_agent,
        )
        return attempt
    except AssessmentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found or not published",
        )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail=str(e)
        )


@router.get(
    "/attempts/{attempt_id}",
    response_model=AssessmentAttemptWithResponses,
    summary="Get Attempt Status",
    description="Get current status of an assessment attempt.",
)
def get_attempt_status(
    attempt_id: UUID,
    current_user: User = Depends(deps.get_current_user),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Get attempt status

    **Authorization:**
    - Candidate: Can view own attempts
    - Employer: Can view attempts for their assessments

    **Response:**
    - Attempt metadata (status, timing, score)
    - All responses submitted so far
    - Progress (questions answered / total)

    **Errors:**
    - 403: Not authorized to view this attempt
    - 404: Attempt not found
    """
    # TODO: Add authorization check (candidate owns attempt OR employer owns assessment)
    try:
        attempt = service.get_attempt(attempt_id)
        if attempt.candidate_id != current_user.id:
            # Check if user is employer who owns the assessment
            # For now, allow any authenticated user
            pass
        return attempt
    except AttemptNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt {attempt_id} not found",
        )


@router.get(
    "/attempts/{attempt_id}/questions",
    response_model=List[QuestionResponse],
    summary="Get Attempt Questions",
    description="Get questions for an assessment attempt (candidate view).",
)
def get_attempt_questions(
    attempt_id: UUID,
    current_user: User = Depends(deps.get_current_user),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Get questions for attempt

    **Candidate View:**
    - Questions WITHOUT correct answers
    - Questions WITHOUT solution code
    - Randomized if randomize_questions enabled
    - Options randomized if randomize_options enabled

    **Response:**
    - List of questions in attempt order
    - Includes starter_code for coding questions
    - Excludes correct_answers and solution_code

    **Errors:**
    - 403: Not your attempt
    - 404: Attempt not found
    """
    try:
        attempt = service.get_attempt(attempt_id)
        if attempt.candidate_id != current_user.id:
            raise ForbiddenError("Not your attempt")

        # Get assessment to check randomization settings
        assessment = service.get_assessment(
            attempt.assessment_id, attempt.assessment.company_id
        )

        if assessment.randomize_questions:
            questions = service.get_randomized_questions(assessment.id)
        else:
            questions = assessment.questions

        # Remove correct answers and solution code for candidate
        candidate_questions = []
        for q in questions:
            q_dict = q.__dict__.copy()
            q_dict.pop("correct_answers", None)
            q_dict.pop("solution_code", None)
            candidate_questions.append(q_dict)

        return candidate_questions
    except AttemptNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt {attempt_id} not found",
        )
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post(
    "/attempts/{attempt_id}/responses",
    response_model=ResponseResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit Response",
    description="Submit or update a response to a question.",
)
def submit_response(
    attempt_id: UUID,
    response_data: ResponseCreate,
    current_user: User = Depends(deps.get_current_user),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Submit response to question

    **Validation:**
    - Attempt must be in_progress
    - Question must belong to assessment
    - Response type must match question type

    **Behavior:**
    - Creates or updates response
    - Auto-grades if possible (MCQ, coding)
    - Saves draft responses (can update before submission)

    **Auto-Grading:**
    - MCQ (single/multiple): Instant grading
    - Coding: Executes test cases, grades automatically
    - Text/File: Requires manual grading

    **Errors:**
    - 400: Invalid response data or attempt completed
    - 403: Not your attempt
    - 404: Attempt or question not found
    """
    try:
        response = service.submit_response(
            attempt_id, current_user.id, response_data
        )
        return response
    except AttemptNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt {attempt_id} not found",
        )
    except (ValueError, ForbiddenError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.post(
    "/attempts/{attempt_id}/submit",
    response_model=AssessmentAttemptWithResponses,
    summary="Submit Assessment",
    description="Submit completed assessment for grading.",
)
def submit_assessment(
    attempt_id: UUID,
    submit_data: SubmitAssessmentRequest,
    current_user: User = Depends(deps.get_current_user),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Submit assessment

    **Finality:**
    - Cannot submit responses after submission
    - Cannot undo submission

    **Grading:**
    - Auto-gradable questions graded immediately
    - Manual grading questions marked as pending
    - Final score calculated from auto-graded questions
    - Status changes to 'completed'

    **Results:**
    - Shown immediately if show_results_immediately=true
    - Otherwise hidden until manual grading complete

    **Errors:**
    - 400: Already submitted or time expired
    - 403: Not your attempt
    - 404: Attempt not found
    """
    try:
        attempt = service.submit_assessment(attempt_id, current_user.id)
        return attempt
    except AttemptNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt {attempt_id} not found",
        )
    except (ValueError, ForbiddenError) as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.post(
    "/attempts/{attempt_id}/tab-switch",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Record Tab Switch",
    description="Record when candidate switches tabs (anti-cheating).",
)
def record_tab_switch(
    attempt_id: UUID,
    tab_switch_data: RecordTabSwitchRequest,
    current_user: User = Depends(deps.get_current_user),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Record tab switch event

    **Anti-Cheating:**
    - Tracks when candidate leaves assessment tab
    - Increments tab_switch_count
    - Auto-disqualifies after max_tab_switches

    **Behavior:**
    - If allow_tab_switching=false: Immediate disqualification
    - If tab_switch_count > max_tab_switches: Disqualification
    - Records in suspicious_activity JSONB for review

    **Response:**
    - 204 No Content on success
    - 400 if disqualified

    **Errors:**
    - 400: Max tab switches exceeded (disqualified)
    - 403: Not your attempt
    """
    try:
        service.record_tab_switch(
            attempt_id, current_user.id, tab_switch_data.timestamp
        )
        return None
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.get(
    "/assessments/{assessment_id}/resume",
    response_model=AssessmentAttemptResponse,
    summary="Resume Assessment",
    description="Resume an incomplete assessment attempt.",
)
def resume_assessment(
    assessment_id: UUID,
    current_user: User = Depends(deps.get_current_user),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Resume incomplete assessment

    **Behavior:**
    - Finds candidate's in_progress attempt
    - Returns attempt ID to continue
    - Checks if time limit expired (auto-submits if needed)

    **Use Case:**
    - Candidate closed browser mid-assessment
    - Session expired
    - Connection lost

    **Errors:**
    - 404: No in_progress attempt found
    """
    try:
        attempt = service.resume_assessment(assessment_id, current_user.id)
        return attempt
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No in-progress attempt found for this assessment",
        )


@router.get(
    "/my-attempts",
    response_model=List[AssessmentAttemptResponse],
    summary="List My Attempts",
    description="Get all assessment attempts for the current candidate.",
)
def list_my_attempts(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
):
    """
    List all my attempts

    **Response:**
    - All attempts by current candidate
    - Ordered by created_at desc (most recent first)
    - Includes assessment metadata

    **Use Case:**
    - Candidate dashboard
    - Assessment history
    - Resume incomplete attempts
    """
    from app.db.models.assessment import AssessmentAttempt

    attempts = (
        db.query(AssessmentAttempt)
        .filter(AssessmentAttempt.candidate_id == current_user.id)
        .order_by(AssessmentAttempt.created_at.desc())
        .all()
    )

    return attempts


# ============================================================================
# CATEGORY 5: GRADING & REVIEW (4 endpoints)
# ============================================================================


@router.post(
    "/responses/{response_id}/grade",
    response_model=ResponseResponse,
    summary="Manual Grade Response",
    description="Manually grade a text or file upload response.",
)
def manual_grade_response(
    response_id: UUID,
    grade_data: ManualGradeRequest,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Manual grade a response

    **Use Case:**
    - Grade text responses
    - Grade file upload responses
    - Override auto-graded scores

    **Request Body:**
    - points_earned: 0 to question.points
    - grader_comments: Feedback for candidate (optional)

    **Behavior:**
    - Updates response with points and comments
    - Sets auto_graded=false
    - Recalculates attempt total score
    - Updates attempt grading_status

    **Errors:**
    - 400: Invalid points (exceeds question points)
    - 404: Response not found
    """
    try:
        response = service.manual_grade_response(
            response_id,
            membership.company_id,
            membership.user_id,
            grade_data.points_earned,
            grade_data.grader_comments,
        )
        return response
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


@router.post(
    "/attempts/{attempt_id}/grade",
    response_model=AssessmentAttemptResponse,
    summary="Auto-Grade Attempt",
    description="Auto-grade all auto-gradable responses in an attempt.",
)
def auto_grade_attempt(
    attempt_id: UUID,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Auto-grade attempt

    **Behavior:**
    - Grades all MCQ responses
    - Executes and grades all coding responses
    - Skips text and file upload responses (require manual grading)
    - Calculates total score
    - Updates grading_status

    **Use Case:**
    - Re-run auto-grading after fixing test cases
    - Trigger grading if auto-grading failed during submission

    **Response:**
    - Updated attempt with scores

    **Errors:**
    - 404: Attempt not found
    """
    try:
        attempt = service.auto_grade_attempt(attempt_id, membership.company_id)
        return attempt
    except AttemptNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Attempt {attempt_id} not found",
        )


@router.get(
    "/assessments/{assessment_id}/ungraded",
    response_model=List[ResponseResponse],
    summary="Get Ungraded Responses",
    description="Get all responses requiring manual grading.",
)
def get_ungraded_responses(
    assessment_id: UUID,
    membership: CompanyMember = Depends(get_company_member),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Get ungraded responses

    **Filters:**
    - Text responses without grades
    - File upload responses without grades
    - Completed attempts only

    **Response:**
    - List of responses awaiting manual grading
    - Includes attempt and candidate metadata
    - Ordered by submitted_at (oldest first)

    **Use Case:**
    - Grading queue
    - Assign grading tasks to team members
    - Track grading progress

    **Errors:**
    - 404: Assessment not found
    """
    try:
        responses = service.get_ungraded_responses(
            assessment_id, membership.company_id
        )
        return responses
    except AssessmentNotFoundError:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Assessment {assessment_id} not found",
        )


@router.post(
    "/attempts/bulk-grade",
    response_model=List[ResponseResponse],
    summary="Bulk Manual Grade",
    description="Grade multiple responses at once.",
)
def bulk_grade_responses(
    bulk_data: BulkGradeRequest,
    membership: CompanyMember = Depends(require_assessment_permissions),
    service: AssessmentService = Depends(get_assessment_service),
):
    """
    Bulk grade responses

    **Request Body:**
    - Array of response_id, points_earned, grader_comments
    - Max 100 responses per request

    **Behavior:**
    - Grades all responses in single transaction
    - Recalculates attempt scores
    - Atomic: All or nothing

    **Use Case:**
    - Batch grading after reviewing multiple responses
    - Import grades from external grading tool

    **Response:**
    - Array of updated responses

    **Errors:**
    - 400: Invalid points or max count exceeded
    """
    try:
        responses = service.bulk_grade_responses(
            bulk_data.responses, membership.company_id, membership.user_id
        )
        return responses
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )


# ============================================================================
# JOB ASSESSMENT REQUIREMENTS (Bonus endpoints)
# ============================================================================


@router.post(
    "/jobs/{job_id}/assessments",
    response_model=JobAssessmentRequirementResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Link Assessment to Job",
    description="Require an assessment for job applications.",
)
def link_assessment_to_job(
    job_id: UUID,
    requirement_data: JobAssessmentRequirementCreate,
    membership: CompanyMember = Depends(require_assessment_permissions),
    db: Session = Depends(deps.get_db),
):
    """
    Link assessment to job

    **Configuration:**
    - is_required: Must complete to apply
    - must_pass_to_proceed: Must pass to move forward
    - order: Order in application flow
    - deadline_hours_after_application: Time limit
    - trigger_point: after_application or before_interview

    **Use Case:**
    - Pre-screening assessments before application
    - Technical assessments after application
    - Skills tests before interview

    **Response:**
    - Job assessment requirement record

    **Errors:**
    - 404: Job or assessment not found
    """
    from app.db.models.assessment import JobAssessmentRequirement

    requirement = JobAssessmentRequirement(
        job_id=job_id,
        assessment_id=requirement_data.assessment_id,
        is_required=requirement_data.is_required,
        must_pass_to_proceed=requirement_data.must_pass_to_proceed,
        order=requirement_data.order,
        deadline_hours_after_application=requirement_data.deadline_hours_after_application,
        send_reminder_hours_before_deadline=requirement_data.send_reminder_hours_before_deadline,
        show_before_application=requirement_data.show_before_application,
        trigger_point=requirement_data.trigger_point,
    )

    db.add(requirement)
    db.commit()
    db.refresh(requirement)

    return requirement


@router.get(
    "/jobs/{job_id}/assessments",
    response_model=List[JobAssessmentRequirementResponse],
    summary="Get Job Assessments",
    description="Get all assessments required for a job.",
)
def get_job_assessments(
    job_id: UUID,
    membership: CompanyMember = Depends(get_company_member),
    db: Session = Depends(deps.get_db),
):
    """
    Get job assessments

    **Response:**
    - All assessments linked to job
    - Ordered by order field
    - Includes requirement configuration

    **Use Case:**
    - Display assessments on job posting
    - Show application requirements
    - Candidate preparation

    **Errors:**
    - 404: Job not found
    """
    from app.db.models.assessment import JobAssessmentRequirement

    requirements = (
        db.query(JobAssessmentRequirement)
        .filter(JobAssessmentRequirement.job_id == job_id)
        .order_by(JobAssessmentRequirement.order)
        .all()
    )

    return requirements
