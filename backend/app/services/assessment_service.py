"""
AssessmentService - Skills Assessment & Testing Platform

Sprint 17-18 Phase 4

Service layer for managing assessments, questions, attempts, and grading.
Implements TDD methodology - all 65+ unit tests must pass.
"""

import secrets
import random
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy import select, and_, or_, func
from sqlalchemy.orm import Session, joinedload

from app.db.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentAttempt,
    AssessmentResponse,
)
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentUpdate,
    AssessmentFilters,
    QuestionCreate,
    QuestionUpdate,
    ResponseCreate,
)
from app.core.exceptions import (
    AssessmentNotFoundError,
    QuestionNotFoundError,
    AttemptNotFoundError,
    ForbiddenError,
    InvalidQuestionTypeError,
    AssessmentAlreadySubmittedError,
    TimeLimitExceededError,
)


class AssessmentService:
    """
    Service for managing skills assessments.

    Handles:
    - Assessment CRUD operations
    - Question management
    - Assessment attempts and submissions
    - Auto-grading (MCQ and coding)
    - Manual grading
    - Anti-cheating measures
    """

    def __init__(self, db: Session):
        self.db = db

    # ========================================================================
    # ASSESSMENT CRUD OPERATIONS
    # ========================================================================

    def create_assessment(
        self,
        company_id: UUID,
        data: AssessmentCreate,
        created_by: Optional[UUID] = None
    ) -> Assessment:
        """
        Create a new assessment.

        Args:
            company_id: Company UUID
            data: Assessment creation data
            created_by: User ID who created the assessment

        Returns:
            Created Assessment object
        """
        assessment = Assessment(
            company_id=company_id,
            created_by=created_by,
            title=data.title,
            description=data.description,
            assessment_type=data.assessment_type,
            category=data.category,
            time_limit_minutes=data.time_limit_minutes,
            passing_score_percentage=data.passing_score_percentage,
            max_attempts=data.max_attempts,
            randomize_questions=data.randomize_questions,
            randomize_options=data.randomize_options,
            show_correct_answers=data.show_correct_answers,
            show_results_immediately=data.show_results_immediately,
            enable_proctoring=data.enable_proctoring,
            allow_tab_switching=data.allow_tab_switching,
            max_tab_switches=data.max_tab_switches,
            require_webcam=data.require_webcam,
            track_ip_address=data.track_ip_address,
            status="draft",
        )

        self.db.add(assessment)
        self.db.commit()
        self.db.refresh(assessment)

        return assessment

    def get_assessment(
        self,
        assessment_id: UUID,
        company_id: Optional[UUID] = None
    ) -> Assessment:
        """
        Get assessment by ID.

        Args:
            assessment_id: Assessment UUID
            company_id: Company UUID for authorization check

        Returns:
            Assessment object

        Raises:
            AssessmentNotFoundError: If assessment not found
            ForbiddenError: If company_id doesn't match
        """
        query = select(Assessment).where(Assessment.id == assessment_id)

        if company_id:
            query = query.where(Assessment.company_id == company_id)

        assessment = self.db.execute(query).scalar_one_or_none()

        if not assessment:
            if company_id:
                # Check if assessment exists but belongs to different company
                exists = self.db.execute(
                    select(Assessment).where(Assessment.id == assessment_id)
                ).scalar_one_or_none()

                if exists:
                    raise ForbiddenError(
                        f"Assessment {assessment_id} does not belong to company {company_id}"
                    )

            raise AssessmentNotFoundError(f"Assessment {assessment_id} not found")

        return assessment

    def update_assessment(
        self,
        assessment_id: UUID,
        data: AssessmentUpdate,
        company_id: UUID
    ) -> Assessment:
        """
        Update assessment.

        Args:
            assessment_id: Assessment UUID
            data: Update data
            company_id: Company UUID for authorization

        Returns:
            Updated Assessment object

        Raises:
            AssessmentNotFoundError: If assessment not found
            ValueError: If trying to modify published assessment with attempts
        """
        assessment = self.get_assessment(assessment_id, company_id)

        # Check if assessment can be modified
        if assessment.status == "published" and assessment.total_attempts > 0:
            raise ValueError(
                "Cannot modify published assessment with existing attempts"
            )

        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(assessment, field, value)

        assessment.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(assessment)

        return assessment

    def delete_assessment(
        self,
        assessment_id: UUID,
        company_id: UUID
    ) -> bool:
        """
        Soft delete assessment.

        Args:
            assessment_id: Assessment UUID
            company_id: Company UUID for authorization

        Returns:
            True if deleted

        Raises:
            ValueError: If assessment has attempts
        """
        assessment = self.get_assessment(assessment_id, company_id)

        if assessment.total_attempts > 0:
            raise ValueError(
                "Cannot delete assessment with existing attempts. Archive it instead."
            )

        assessment.status = "deleted"
        assessment.updated_at = datetime.utcnow()

        self.db.commit()

        return True

    def list_assessments(
        self,
        company_id: UUID,
        filters: AssessmentFilters
    ) -> List[Assessment]:
        """
        List assessments with filters.

        Args:
            company_id: Company UUID
            filters: Filter criteria

        Returns:
            List of Assessment objects
        """
        query = select(Assessment).where(Assessment.company_id == company_id)

        # Apply filters
        if filters.status:
            query = query.where(Assessment.status == filters.status)

        if filters.assessment_type:
            query = query.where(Assessment.assessment_type == filters.assessment_type)

        if filters.category:
            query = query.where(Assessment.category == filters.category)

        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.where(
                or_(
                    Assessment.title.ilike(search_term),
                    Assessment.description.ilike(search_term)
                )
            )

        # Order by created_at desc
        query = query.order_by(Assessment.created_at.desc())

        # Pagination
        offset = (filters.page - 1) * filters.limit
        query = query.offset(offset).limit(filters.limit)

        assessments = self.db.execute(query).scalars().all()

        return list(assessments)

    def publish_assessment(
        self,
        assessment_id: UUID,
        company_id: UUID
    ) -> Assessment:
        """
        Publish assessment (make it available for use).

        Args:
            assessment_id: Assessment UUID
            company_id: Company UUID

        Returns:
            Published Assessment object

        Raises:
            ValueError: If assessment has no questions
        """
        assessment = self.get_assessment(assessment_id, company_id)

        # Validate: must have at least one question
        if not assessment.questions or len(assessment.questions) == 0:
            raise ValueError("Cannot publish assessment with no questions. Add at least one question.")

        assessment.status = "published"
        assessment.published_at = datetime.utcnow()
        assessment.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(assessment)

        return assessment

    def clone_assessment(
        self,
        assessment_id: UUID,
        company_id: UUID
    ) -> Assessment:
        """
        Clone an existing assessment.

        Args:
            assessment_id: Assessment UUID to clone
            company_id: Company UUID

        Returns:
            New cloned Assessment object
        """
        original = self.get_assessment(assessment_id, company_id)

        # Create new assessment with same config
        cloned = Assessment(
            company_id=company_id,
            title=f"{original.title} (Copy)",
            description=original.description,
            assessment_type=original.assessment_type,
            category=original.category,
            time_limit_minutes=original.time_limit_minutes,
            passing_score_percentage=original.passing_score_percentage,
            max_attempts=original.max_attempts,
            randomize_questions=original.randomize_questions,
            randomize_options=original.randomize_options,
            show_correct_answers=original.show_correct_answers,
            show_results_immediately=original.show_results_immediately,
            enable_proctoring=original.enable_proctoring,
            allow_tab_switching=original.allow_tab_switching,
            max_tab_switches=original.max_tab_switches,
            require_webcam=original.require_webcam,
            track_ip_address=original.track_ip_address,
            status="draft",
        )

        self.db.add(cloned)
        self.db.flush()

        # Clone questions
        for original_question in original.questions:
            cloned_question = AssessmentQuestion(
                assessment_id=cloned.id,
                question_text=original_question.question_text,
                question_type=original_question.question_type,
                description=original_question.description,
                options=original_question.options,
                correct_answers=original_question.correct_answers,
                coding_language=original_question.coding_language,
                starter_code=original_question.starter_code,
                solution_code=original_question.solution_code,
                test_cases=original_question.test_cases,
                execution_timeout_seconds=original_question.execution_timeout_seconds,
                allowed_file_types=original_question.allowed_file_types,
                max_file_size_mb=original_question.max_file_size_mb,
                points=original_question.points,
                is_required=original_question.is_required,
                allow_partial_credit=original_question.allow_partial_credit,
                difficulty=original_question.difficulty,
                category=original_question.category,
                tags=original_question.tags,
                display_order=original_question.display_order,
            )
            self.db.add(cloned_question)

        self.db.commit()
        self.db.refresh(cloned)

        return cloned

    # ========================================================================
    # QUESTION MANAGEMENT
    # ========================================================================

    def add_question(
        self,
        assessment_id: UUID,
        data: QuestionCreate,
        company_id: UUID
    ) -> AssessmentQuestion:
        """
        Add question to assessment.

        Args:
            assessment_id: Assessment UUID
            data: Question data
            company_id: Company UUID for authorization

        Returns:
            Created AssessmentQuestion object

        Raises:
            ValueError: If question validation fails
        """
        assessment = self.get_assessment(assessment_id, company_id)

        # Validate question type specific fields
        if data.question_type in ["mcq_single", "mcq_multiple"]:
            if not data.options or len(data.options) < 2:
                raise ValueError("MCQ questions must have at least 2 options")
            if not data.correct_answers or len(data.correct_answers) == 0:
                raise ValueError("MCQ questions must have correct answers")

        if data.question_type == "coding":
            if not data.test_cases or len(data.test_cases) == 0:
                raise ValueError("Coding questions must have at least one test case")

        question = AssessmentQuestion(
            assessment_id=assessment_id,
            question_text=data.question_text,
            question_type=data.question_type,
            description=data.description,
            options=data.options,
            correct_answers=data.correct_answers,
            coding_language=data.coding_language,
            starter_code=data.starter_code,
            solution_code=data.solution_code,
            test_cases=[tc.model_dump() for tc in data.test_cases] if data.test_cases else None,
            execution_timeout_seconds=data.execution_timeout_seconds,
            allowed_file_types=data.allowed_file_types,
            max_file_size_mb=data.max_file_size_mb,
            points=data.points,
            is_required=data.is_required,
            allow_partial_credit=data.allow_partial_credit,
            difficulty=data.difficulty,
            category=data.category,
            tags=data.tags,
            display_order=data.display_order,
        )

        self.db.add(question)
        self.db.commit()
        self.db.refresh(question)

        return question

    def update_question(
        self,
        question_id: UUID,
        data: QuestionUpdate,
        company_id: UUID
    ) -> AssessmentQuestion:
        """
        Update question.

        Args:
            question_id: Question UUID
            data: Update data
            company_id: Company UUID for authorization

        Returns:
            Updated AssessmentQuestion object
        """
        question = self.db.execute(
            select(AssessmentQuestion)
            .options(joinedload(AssessmentQuestion.assessment))
            .where(AssessmentQuestion.id == question_id)
        ).scalar_one_or_none()

        if not question:
            raise QuestionNotFoundError(f"Question {question_id} not found")

        # Check authorization
        if question.assessment.company_id != company_id:
            raise ForbiddenError("Unauthorized to modify this question")

        # Update fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "test_cases" and value:
                value = [tc.model_dump() if hasattr(tc, 'model_dump') else tc for tc in value]
            setattr(question, field, value)

        question.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(question)

        return question

    def delete_question(
        self,
        question_id: UUID,
        company_id: UUID
    ) -> bool:
        """
        Delete question.

        Args:
            question_id: Question UUID
            company_id: Company UUID for authorization

        Returns:
            True if deleted

        Raises:
            ValueError: If question has responses
        """
        question = self.db.execute(
            select(AssessmentQuestion)
            .options(joinedload(AssessmentQuestion.assessment))
            .options(joinedload(AssessmentQuestion.responses))
            .where(AssessmentQuestion.id == question_id)
        ).scalar_one_or_none()

        if not question:
            raise QuestionNotFoundError(f"Question {question_id} not found")

        # Check authorization
        if question.assessment.company_id != company_id:
            raise ForbiddenError("Unauthorized to delete this question")

        # Check for responses
        if question.responses and len(question.responses) > 0:
            raise ValueError("Cannot delete question with existing responses")

        self.db.delete(question)
        self.db.commit()

        return True

    def reorder_questions(
        self,
        assessment_id: UUID,
        question_ids: List[UUID],
        company_id: UUID
    ) -> bool:
        """
        Reorder questions in assessment.

        Args:
            assessment_id: Assessment UUID
            question_ids: List of question UUIDs in new order
            company_id: Company UUID for authorization

        Returns:
            True if reordered
        """
        assessment = self.get_assessment(assessment_id, company_id)

        # Update display_order for each question
        for index, question_id in enumerate(question_ids, start=1):
            question = self.db.execute(
                select(AssessmentQuestion).where(
                    and_(
                        AssessmentQuestion.id == question_id,
                        AssessmentQuestion.assessment_id == assessment_id
                    )
                )
            ).scalar_one_or_none()

            if question:
                question.display_order = index

        self.db.commit()

        return True

    def bulk_import_questions(
        self,
        assessment_id: UUID,
        question_ids: List[UUID],
        company_id: UUID
    ) -> List[AssessmentQuestion]:
        """
        Bulk import questions from question bank.

        Args:
            assessment_id: Assessment UUID
            question_ids: List of question bank item UUIDs
            company_id: Company UUID for authorization

        Returns:
            List of created AssessmentQuestion objects
        """
        assessment = self.get_assessment(assessment_id, company_id)

        # Get max display_order
        max_order = self.db.execute(
            select(func.max(AssessmentQuestion.display_order))
            .where(AssessmentQuestion.assessment_id == assessment_id)
        ).scalar() or 0

        created_questions = []

        for idx, question_id in enumerate(question_ids, start=1):
            # Note: In real implementation, would fetch from QuestionBankItem
            # For now, creating placeholder
            question = AssessmentQuestion(
                assessment_id=assessment_id,
                question_text=f"Imported question {question_id}",
                question_type="text",
                points=10,
                display_order=max_order + idx,
            )
            self.db.add(question)
            created_questions.append(question)

        self.db.commit()

        return created_questions

    def get_randomized_questions(
        self,
        assessment_id: UUID,
        seed: Optional[int] = None
    ) -> List[AssessmentQuestion]:
        """
        Get randomized question order for assessment.

        Args:
            assessment_id: Assessment UUID
            seed: Random seed for reproducibility

        Returns:
            List of questions in randomized order
        """
        questions = self.db.execute(
            select(AssessmentQuestion)
            .where(AssessmentQuestion.assessment_id == assessment_id)
            .order_by(AssessmentQuestion.display_order)
        ).scalars().all()

        questions_list = list(questions)

        if seed is not None:
            random.seed(seed)

        random.shuffle(questions_list)

        return questions_list

    def randomize_options(
        self,
        question: AssessmentQuestion,
        seed: Optional[int] = None
    ) -> List[str]:
        """
        Randomize MCQ options.

        Args:
            question: AssessmentQuestion object
            seed: Random seed

        Returns:
            List of options in randomized order
        """
        if not question.options:
            return []

        options_list = list(question.options)

        if seed is not None:
            random.seed(seed)

        random.shuffle(options_list)

        return options_list

    # ========================================================================
    # ASSESSMENT ATTEMPT LIFECYCLE
    # ========================================================================

    def start_assessment(
        self,
        application_id: Optional[UUID],
        assessment_id: UUID,
        candidate_id: UUID,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ) -> AssessmentAttempt:
        """
        Start a new assessment attempt.

        Args:
            application_id: Job application UUID (optional)
            assessment_id: Assessment UUID
            candidate_id: Candidate user UUID
            ip_address: IP address
            user_agent: User agent string

        Returns:
            Created AssessmentAttempt object

        Raises:
            ValueError: If max attempts exceeded or assessment not published
        """
        assessment = self.db.execute(
            select(Assessment)
            .options(joinedload(Assessment.questions))
            .where(Assessment.id == assessment_id)
        ).scalar_one_or_none()

        if not assessment:
            raise AssessmentNotFoundError(f"Assessment {assessment_id} not found")

        if assessment.status != "published":
            raise ValueError("Cannot start assessment that is not published")

        # Check max attempts
        existing_attempts = self.db.execute(
            select(func.count(AssessmentAttempt.id))
            .where(
                and_(
                    AssessmentAttempt.assessment_id == assessment_id,
                    AssessmentAttempt.candidate_id == candidate_id
                )
            )
        ).scalar()

        if existing_attempts >= assessment.max_attempts:
            raise ValueError(f"Maximum attempts ({assessment.max_attempts}) exceeded")

        # Calculate total points
        total_points = sum(q.points for q in assessment.questions)

        # Generate unique access token
        access_token = f"at_{secrets.token_urlsafe(32)}"

        attempt = AssessmentAttempt(
            assessment_id=assessment_id,
            application_id=application_id,
            candidate_id=candidate_id,
            attempt_number=existing_attempts + 1,
            status="in_progress",
            started_at=datetime.utcnow(),
            total_points_possible=total_points,
            total_questions=len(assessment.questions),
            access_token=access_token,
            ip_address=ip_address,
            user_agent=user_agent,
        )

        self.db.add(attempt)

        # Update assessment analytics
        assessment.total_attempts += 1

        self.db.commit()
        self.db.refresh(attempt)

        return attempt

    def submit_response(
        self,
        attempt_id: UUID,
        question_id: UUID,
        response_data: ResponseCreate,
        candidate_id: UUID
    ) -> AssessmentResponse:
        """
        Submit response to a question.

        Args:
            attempt_id: AssessmentAttempt UUID
            question_id: AssessmentQuestion UUID
            response_data: Response data
            candidate_id: Candidate UUID for authorization

        Returns:
            Created AssessmentResponse object

        Raises:
            TimeLimitExceededError: If time limit exceeded
        """
        attempt = self.db.execute(
            select(AssessmentAttempt)
            .options(joinedload(AssessmentAttempt.assessment))
            .where(AssessmentAttempt.id == attempt_id)
        ).scalar_one_or_none()

        if not attempt:
            raise AttemptNotFoundError(f"Attempt {attempt_id} not found")

        # Check authorization
        if attempt.candidate_id != candidate_id:
            raise ForbiddenError("Unauthorized to submit response for this attempt")

        # Check time limit
        if attempt.assessment.time_limit_minutes and attempt.started_at:
            elapsed = (datetime.utcnow() - attempt.started_at).total_seconds() / 60
            if elapsed > attempt.assessment.time_limit_minutes:
                raise TimeLimitExceededError("Assessment time limit exceeded")

        # Get question
        question = self.db.execute(
            select(AssessmentQuestion).where(AssessmentQuestion.id == question_id)
        ).scalar_one_or_none()

        if not question:
            raise QuestionNotFoundError(f"Question {question_id} not found")

        # Create response
        response = AssessmentResponse(
            attempt_id=attempt_id,
            question_id=question_id,
            response_type=response_data.response_type,
            selected_options=response_data.selected_options,
            text_response=response_data.text_response,
            file_url=response_data.file_url,
            file_name=response_data.file_name,
            file_size_bytes=response_data.file_size_bytes,
            file_type=response_data.file_type,
            time_spent_seconds=response_data.time_spent_seconds,
            answered_at=datetime.utcnow(),
            flagged_for_review=response_data.flagged_for_review,
            copy_paste_detected=response_data.copy_paste_detected,
        )

        # Auto-grade if MCQ
        if question.question_type in ["mcq_single", "mcq_multiple"]:
            points = self.auto_grade_mcq(question, response)
            response.points_earned = points
            response.is_correct = points > 0
            response.auto_graded = True

        self.db.add(response)

        # Update attempt progress
        attempt.questions_answered += 1
        if response.is_correct:
            attempt.questions_correct += 1

        self.db.commit()
        self.db.refresh(response)

        return response

    def submit_assessment(
        self,
        attempt_id: UUID,
        candidate_id: UUID
    ) -> AssessmentAttempt:
        """
        Submit completed assessment.

        Args:
            attempt_id: AssessmentAttempt UUID
            candidate_id: Candidate UUID for authorization

        Returns:
            Completed AssessmentAttempt object

        Raises:
            AssessmentAlreadySubmittedError: If already submitted
        """
        attempt = self.db.execute(
            select(AssessmentAttempt)
            .options(joinedload(AssessmentAttempt.assessment))
            .options(joinedload(AssessmentAttempt.responses))
            .where(AssessmentAttempt.id == attempt_id)
        ).scalar_one_or_none()

        if not attempt:
            raise AttemptNotFoundError(f"Attempt {attempt_id} not found")

        # Check authorization
        if attempt.candidate_id != candidate_id:
            raise ForbiddenError("Unauthorized to submit this attempt")

        # Check if already submitted
        if attempt.status == "completed":
            raise AssessmentAlreadySubmittedError("Assessment already submitted")

        # Calculate final score
        points_earned = sum(
            r.points_earned for r in attempt.responses if r.points_earned is not None
        ) or 0

        score_percentage = (points_earned / attempt.total_points_possible * 100) if attempt.total_points_possible > 0 else 0

        passed = score_percentage >= attempt.assessment.passing_score_percentage

        # Calculate time elapsed
        time_elapsed = None
        if attempt.started_at:
            time_elapsed = int((datetime.utcnow() - attempt.started_at).total_seconds() / 60)

        # Update attempt
        attempt.status = "completed"
        attempt.submitted_at = datetime.utcnow()
        attempt.points_earned = points_earned
        attempt.score_percentage = score_percentage
        attempt.passed = passed
        attempt.time_elapsed_minutes = time_elapsed

        # Update assessment analytics
        assessment = attempt.assessment
        assessment.total_completions += 1

        # Recalculate averages
        completed_attempts = self.db.execute(
            select(AssessmentAttempt).where(
                and_(
                    AssessmentAttempt.assessment_id == assessment.id,
                    AssessmentAttempt.status == "completed"
                )
            )
        ).scalars().all()

        if completed_attempts:
            assessment.avg_score = sum(a.score_percentage for a in completed_attempts if a.score_percentage) / len(completed_attempts)
            assessment.pass_rate = sum(1 for a in completed_attempts if a.passed) / len(completed_attempts) * 100

            times = [a.time_elapsed_minutes for a in completed_attempts if a.time_elapsed_minutes]
            if times:
                assessment.avg_time_minutes = int(sum(times) / len(times))

        self.db.commit()
        self.db.refresh(attempt)

        return attempt

    def check_and_auto_submit(
        self,
        attempt_id: UUID
    ) -> Optional[AssessmentAttempt]:
        """
        Check if time limit exceeded and auto-submit.

        Args:
            attempt_id: AssessmentAttempt UUID

        Returns:
            Auto-submitted attempt or None
        """
        attempt = self.db.execute(
            select(AssessmentAttempt)
            .options(joinedload(AssessmentAttempt.assessment))
            .where(AssessmentAttempt.id == attempt_id)
        ).scalar_one_or_none()

        if not attempt or attempt.status == "completed":
            return None

        if not attempt.assessment.time_limit_minutes or not attempt.started_at:
            return None

        elapsed = (datetime.utcnow() - attempt.started_at).total_seconds() / 60

        if elapsed > attempt.assessment.time_limit_minutes:
            attempt.auto_submitted = True
            return self.submit_assessment(attempt_id, attempt.candidate_id)

        return None

    def resume_assessment(
        self,
        attempt_id: UUID,
        access_token: str,
        candidate_id: UUID
    ) -> AssessmentAttempt:
        """
        Resume in-progress assessment.

        Args:
            attempt_id: AssessmentAttempt UUID
            access_token: Access token for verification
            candidate_id: Candidate UUID

        Returns:
            AssessmentAttempt object

        Raises:
            UnauthorizedAccessError: If token doesn't match
        """
        attempt = self.db.execute(
            select(AssessmentAttempt).where(AssessmentAttempt.id == attempt_id)
        ).scalar_one_or_none()

        if not attempt:
            raise AttemptNotFoundError(f"Attempt {attempt_id} not found")

        if attempt.candidate_id != candidate_id:
            raise ForbiddenError("Unauthorized to access this attempt")

        if attempt.access_token != access_token:
            raise ForbiddenError("Invalid access token")

        return attempt

    # ========================================================================
    # AUTO-GRADING
    # ========================================================================

    def auto_grade_mcq(
        self,
        question: AssessmentQuestion,
        response: AssessmentResponse
    ) -> float:
        """
        Auto-grade MCQ question.

        Args:
            question: AssessmentQuestion object
            response: AssessmentResponse object

        Returns:
            Points earned
        """
        if not question.correct_answers or not response.selected_options:
            return 0.0

        correct_answers = set(question.correct_answers)
        selected_answers = set(response.selected_options)

        if question.question_type == "mcq_single":
            # All or nothing for single choice
            return float(question.points) if selected_answers == correct_answers else 0.0

        elif question.question_type == "mcq_multiple":
            # Partial credit for multiple choice
            if selected_answers == correct_answers:
                return float(question.points)

            correct_selections = len(selected_answers & correct_answers)
            incorrect_selections = len(selected_answers - correct_answers)
            total_correct = len(correct_answers)

            if total_correct == 0:
                return 0.0

            # Formula: (correct / total) - (incorrect / total * 0.5), min 0
            partial_score = (correct_selections / total_correct) - (incorrect_selections / total_correct * 0.5)
            partial_score = max(0, partial_score)

            return float(question.points) * partial_score

        return 0.0

    def auto_grade_coding(
        self,
        question: AssessmentQuestion,
        response: AssessmentResponse
    ) -> float:
        """
        Auto-grade coding question (placeholder - requires CodingExecutionService).

        Args:
            question: AssessmentQuestion object
            response: AssessmentResponse object

        Returns:
            Points earned
        """
        # This would integrate with CodingExecutionService
        # For now, return 0 as placeholder
        return 0.0

    def auto_grade_attempt(
        self,
        attempt_id: UUID
    ) -> AssessmentAttempt:
        """
        Auto-grade all auto-gradable responses in attempt.

        Args:
            attempt_id: AssessmentAttempt UUID

        Returns:
            Updated AssessmentAttempt object
        """
        attempt = self.db.execute(
            select(AssessmentAttempt)
            .options(joinedload(AssessmentAttempt.responses))
            .where(AssessmentAttempt.id == attempt_id)
        ).scalar_one_or_none()

        if not attempt:
            raise AttemptNotFoundError(f"Attempt {attempt_id} not found")

        # Auto-grade each response
        for response in attempt.responses:
            if response.auto_graded or response.is_correct is not None:
                continue  # Already graded

            question = self.db.execute(
                select(AssessmentQuestion).where(AssessmentQuestion.id == response.question_id)
            ).scalar_one_or_none()

            if not question:
                continue

            if question.question_type in ["mcq_single", "mcq_multiple"]:
                points = self.auto_grade_mcq(question, response)
                response.points_earned = points
                response.is_correct = points > 0
                response.auto_graded = True

        self.db.commit()
        self.db.refresh(attempt)

        return attempt

    # ========================================================================
    # MANUAL GRADING
    # ========================================================================

    def manual_grade_response(
        self,
        response_id: UUID,
        points_earned: float,
        grader_comments: Optional[str] = None,
        grader_id: Optional[UUID] = None
    ) -> AssessmentResponse:
        """
        Manually grade a response.

        Args:
            response_id: AssessmentResponse UUID
            points_earned: Points to award
            grader_comments: Optional feedback
            grader_id: Grader user UUID

        Returns:
            Updated AssessmentResponse object

        Raises:
            ValueError: If points exceed maximum
        """
        response = self.db.execute(
            select(AssessmentResponse)
            .options(joinedload(AssessmentResponse.question))
            .where(AssessmentResponse.id == response_id)
        ).scalar_one_or_none()

        if not response:
            raise ValueError(f"Response {response_id} not found")

        # Validate points
        if points_earned > response.question.points:
            raise ValueError(f"Points earned ({points_earned}) cannot exceed maximum ({response.question.points})")

        response.points_earned = points_earned
        response.is_correct = points_earned > 0
        response.grader_comments = grader_comments
        response.auto_graded = False

        self.db.commit()
        self.db.refresh(response)

        return response

    def bulk_grade_responses(
        self,
        grading_data: List[Dict[str, Any]],
        grader_id: UUID
    ) -> List[AssessmentResponse]:
        """
        Bulk grade multiple responses.

        Args:
            grading_data: List of {response_id, points, comments}
            grader_id: Grader user UUID

        Returns:
            List of updated AssessmentResponse objects
        """
        graded_responses = []

        for item in grading_data:
            response = self.manual_grade_response(
                response_id=item["response_id"],
                points_earned=item["points"],
                grader_comments=item.get("comments"),
                grader_id=grader_id
            )
            graded_responses.append(response)

        return graded_responses

    def get_ungraded_responses(
        self,
        assessment_id: UUID,
        company_id: UUID
    ) -> List[AssessmentResponse]:
        """
        Get all ungraded responses for an assessment.

        Args:
            assessment_id: Assessment UUID
            company_id: Company UUID for authorization

        Returns:
            List of ungraded AssessmentResponse objects
        """
        # Verify authorization
        self.get_assessment(assessment_id, company_id)

        responses = self.db.execute(
            select(AssessmentResponse)
            .join(AssessmentResponse.attempt)
            .join(AssessmentAttempt.assessment)
            .join(AssessmentResponse.question)
            .where(
                and_(
                    Assessment.id == assessment_id,
                    Assessment.company_id == company_id,
                    AssessmentResponse.is_correct.is_(None),
                    AssessmentQuestion.question_type.in_(["text", "file_upload"])
                )
            )
        ).scalars().all()

        return list(responses)

    # ========================================================================
    # ANTI-CHEATING
    # ========================================================================

    def record_tab_switch(
        self,
        attempt_id: UUID,
        candidate_id: UUID
    ) -> AssessmentAttempt:
        """
        Record tab switching activity.

        Args:
            attempt_id: AssessmentAttempt UUID
            candidate_id: Candidate UUID for authorization

        Returns:
            Updated AssessmentAttempt object
        """
        attempt = self.db.execute(
            select(AssessmentAttempt)
            .options(joinedload(AssessmentAttempt.assessment))
            .where(AssessmentAttempt.id == attempt_id)
        ).scalar_one_or_none()

        if not attempt:
            raise AttemptNotFoundError(f"Attempt {attempt_id} not found")

        if attempt.candidate_id != candidate_id:
            raise ForbiddenError("Unauthorized")

        attempt.tab_switch_count += 1

        # Disqualify if exceeded limit
        if not attempt.assessment.allow_tab_switching or \
           attempt.tab_switch_count > attempt.assessment.max_tab_switches:
            attempt.status = "disqualified"

        self.db.commit()
        self.db.refresh(attempt)

        return attempt

    def verify_ip_address(
        self,
        attempt_id: UUID,
        current_ip: str,
        candidate_id: UUID
    ) -> AssessmentAttempt:
        """
        Verify IP address hasn't changed.

        Args:
            attempt_id: AssessmentAttempt UUID
            current_ip: Current IP address
            candidate_id: Candidate UUID

        Returns:
            AssessmentAttempt object
        """
        attempt = self.db.execute(
            select(AssessmentAttempt).where(AssessmentAttempt.id == attempt_id)
        ).scalar_one_or_none()

        if not attempt:
            raise AttemptNotFoundError(f"Attempt {attempt_id} not found")

        if attempt.candidate_id != candidate_id:
            raise ForbiddenError("Unauthorized")

        if attempt.ip_address and attempt.ip_address != current_ip:
            # Log suspicious activity
            if not attempt.suspicious_activity:
                attempt.suspicious_activity = {}
            attempt.suspicious_activity["ip_address_changed"] = True
            self.db.commit()

        self.db.refresh(attempt)
        return attempt

    # ========================================================================
    # ANALYTICS
    # ========================================================================

    def calculate_statistics(
        self,
        assessment_id: UUID,
        company_id: UUID
    ) -> Dict[str, Any]:
        """
        Calculate assessment statistics.

        Args:
            assessment_id: Assessment UUID
            company_id: Company UUID for authorization

        Returns:
            Dictionary with statistics
        """
        assessment = self.get_assessment(assessment_id, company_id)

        attempts = self.db.execute(
            select(AssessmentAttempt).where(
                and_(
                    AssessmentAttempt.assessment_id == assessment_id,
                    AssessmentAttempt.status == "completed"
                )
            )
        ).scalars().all()

        if not attempts:
            return {
                "total_attempts": 0,
                "avg_score": 0,
                "pass_rate": 0,
            }

        total = len(attempts)
        passed = sum(1 for a in attempts if a.passed)
        scores = [a.score_percentage for a in attempts if a.score_percentage is not None]

        return {
            "total_attempts": total,
            "avg_score": sum(scores) / len(scores) if scores else 0,
            "pass_rate": (passed / total * 100) if total > 0 else 0,
        }

    def calculate_score_percentage(
        self,
        attempt: AssessmentAttempt
    ) -> float:
        """
        Calculate score percentage for an attempt.

        Args:
            attempt: AssessmentAttempt object

        Returns:
            Score percentage (0-100)
        """
        if attempt.total_points_possible == 0:
            return 0.0

        if attempt.points_earned is None:
            return 0.0

        return (float(attempt.points_earned) / float(attempt.total_points_possible)) * 100
