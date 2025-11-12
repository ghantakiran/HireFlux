"""
CandidateAssessmentService - Sprint 19-20 Week 37

Handles candidate assessment taking flow:
- Access assessment via token
- Start assessment attempts
- Submit answers (MCQ, text, coding, file)
- Execute code for coding challenges
- Auto-grade MCQ and coding responses
- Track anti-cheating events
- Submit final assessment
- Retrieve results

Following TDD - implementation guided by 60+ unit tests.
"""

import secrets
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from uuid import UUID
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.db.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentAttempt,
    AssessmentResponse,
)
from app.core.exceptions import (
    AssessmentNotFoundError,
    QuestionNotFoundError,
    AttemptNotFoundError,
    ForbiddenError,
    AssessmentAlreadySubmittedError,
    TimeLimitExceededError,
    InvalidAccessTokenError,
    TooManyAttemptsError,
    InvalidLanguageError,
    InvalidQuestionTypeError,
    AssessmentNotCompletedError,
    ValidationError,
    ServiceError,
)


class CandidateAssessmentService:
    """Service for candidate assessment taking functionality"""

    def __init__(self, db: Session, coding_execution_service=None):
        """
        Initialize CandidateAssessmentService

        Args:
            db: Database session
            coding_execution_service: Service for code execution (Judge0/Piston)
        """
        self.db = db
        self.coding_execution_service = coding_execution_service

    # ========================================================================
    # Assessment Access & Start
    # ========================================================================

    def access_assessment(self, access_token: str) -> Dict[str, Any]:
        """
        Access assessment using access token

        Args:
            access_token: Unique access token

        Returns:
            Assessment and attempt details with time remaining

        Raises:
            InvalidAccessTokenError: Token invalid or expired
        """
        # Find attempt by access token
        attempt = (
            self.db.query(AssessmentAttempt)
            .filter(AssessmentAttempt.access_token == access_token)
            .first()
        )

        if not attempt:
            raise InvalidAccessTokenError("Invalid access token")

        # Check if token expired
        if attempt.access_token_expires_at and attempt.access_token_expires_at < datetime.utcnow():
            raise InvalidAccessTokenError("Access token has expired")

        # Get assessment details
        assessment = (
            self.db.query(Assessment)
            .filter(Assessment.id == attempt.assessment_id)
            .first()
        )

        # Calculate time remaining
        time_remaining_minutes = None
        if assessment.time_limit_minutes and attempt.started_at:
            elapsed_minutes = (datetime.utcnow() - attempt.started_at).total_seconds() / 60
            time_remaining_minutes = max(0, assessment.time_limit_minutes - int(elapsed_minutes))

        # Check if already completed
        if attempt.status == "completed":
            return {
                "assessment": assessment,
                "attempt": attempt,
                "status": "completed",
                "allow_retake": False,
                "time_remaining_minutes": 0,
            }

        return {
            "assessment": assessment,
            "attempt": attempt,
            "status": attempt.status,
            "time_remaining_minutes": time_remaining_minutes,
        }

    def start_assessment(
        self,
        assessment_id: UUID,
        candidate_id: UUID,
        ip_address: Optional[str] = None,
    ) -> AssessmentAttempt:
        """
        Start a new assessment attempt

        Args:
            assessment_id: Assessment ID
            candidate_id: Candidate user ID
            ip_address: Candidate's IP address

        Returns:
            New AssessmentAttempt

        Raises:
            AssessmentNotFoundError: Assessment not found or not published
            TooManyAttemptsError: Max attempts exceeded
        """
        # Get assessment
        assessment = (
            self.db.query(Assessment)
            .filter(Assessment.id == assessment_id)
            .first()
        )

        if not assessment:
            raise AssessmentNotFoundError()

        # Check if published
        if assessment.status != "published":
            raise AssessmentNotFoundError("Assessment is not available")

        # Check attempt count
        attempt_count = (
            self.db.query(AssessmentAttempt)
            .filter(
                and_(
                    AssessmentAttempt.assessment_id == assessment_id,
                    AssessmentAttempt.candidate_id == candidate_id,
                )
            )
            .count()
        )

        if attempt_count >= assessment.max_attempts:
            raise TooManyAttemptsError(
                f"Maximum {assessment.max_attempts} attempts exceeded"
            )

        # Count total questions and points
        questions = (
            self.db.query(AssessmentQuestion)
            .filter(AssessmentQuestion.assessment_id == assessment_id)
            .all()
        )
        total_questions = len(questions)
        total_points = sum(q.points for q in questions)

        # Generate unique access token
        access_token = secrets.token_urlsafe(32)

        # Create new attempt
        new_attempt = AssessmentAttempt(
            assessment_id=assessment_id,
            candidate_id=candidate_id,
            attempt_number=attempt_count + 1,
            status="in_progress",
            access_token=access_token,
            access_token_expires_at=datetime.utcnow() + timedelta(days=7),
            started_at=datetime.utcnow(),
            total_questions=total_questions,
            total_points_possible=total_points,
            questions_answered=0,
            tab_switch_count=0,
            ip_address=ip_address if assessment.track_ip_address else None,
            flagged_for_review=False,
            metadata={},
        )

        self.db.add(new_attempt)
        self.db.commit()
        self.db.refresh(new_attempt)

        return new_attempt

    # ========================================================================
    # Answer Submission
    # ========================================================================

    def submit_answer(
        self,
        attempt_id: UUID,
        question_id: UUID,
        answer_data: Dict[str, Any],
        time_spent_seconds: Optional[int] = None,
    ) -> AssessmentResponse:
        """
        Submit answer to a question

        Args:
            attempt_id: Assessment attempt ID
            question_id: Question ID
            answer_data: Answer data (varies by question type)
            time_spent_seconds: Time spent on question

        Returns:
            AssessmentResponse

        Raises:
            AttemptNotFoundError: Attempt not found
            QuestionNotFoundError: Question not found
            AssessmentAlreadySubmittedError: Attempt already completed
            TimeLimitExceededError: Time limit exceeded
        """
        try:
            # Get attempt
            attempt = (
                self.db.query(AssessmentAttempt)
                .filter(AssessmentAttempt.id == attempt_id)
                .first()
            )

            if not attempt:
                raise AttemptNotFoundError()

            # Check if already submitted
            if attempt.status == "completed":
                raise AssessmentAlreadySubmittedError()

            # Get question
            question = (
                self.db.query(AssessmentQuestion)
                .filter(AssessmentQuestion.id == question_id)
                .first()
            )

            if not question:
                raise QuestionNotFoundError()

            # Check time limit
            assessment = (
                self.db.query(Assessment)
                .filter(Assessment.id == attempt.assessment_id)
                .first()
            )

            if assessment.time_limit_minutes and attempt.started_at:
                elapsed_minutes = (datetime.utcnow() - attempt.started_at).total_seconds() / 60
                if elapsed_minutes > assessment.time_limit_minutes:
                    raise TimeLimitExceededError()

            # Check for existing response
            existing_response = (
                self.db.query(AssessmentResponse)
                .filter(
                    and_(
                        AssessmentResponse.attempt_id == attempt_id,
                        AssessmentResponse.question_id == question_id,
                    )
                )
                .first()
            )

            # Create or update response based on question type
            if existing_response:
                response = existing_response
            else:
                response = AssessmentResponse(
                    attempt_id=attempt_id,
                    question_id=question_id,
                    time_spent_seconds=time_spent_seconds,
                )

            # Handle different question types
            if question.question_type == "mcq_single":
                if "selected_option" not in answer_data:
                    raise ValidationError("Missing selected_option for MCQ question")
                response.selected_options = {"selected": [answer_data["selected_option"]]}
                # Auto-grade
                points = self._auto_grade_mcq(response, question)
                response.points_earned = points
                response.is_correct = points == question.points

            elif question.question_type == "mcq_multiple":
                if "selected_options" not in answer_data:
                    raise ValidationError("Missing selected_options for MCQ multiple question")
                response.selected_options = {"selected": answer_data["selected_options"]}
                # Auto-grade
                points = self._auto_grade_mcq(response, question)
                response.points_earned = points
                response.is_correct = points == question.points

            elif question.question_type == "text":
                if "text_response" not in answer_data:
                    raise ValidationError("Missing text_response")
                response.text_response = answer_data["text_response"]
                response.is_correct = None  # Requires manual grading
                response.points_earned = None

            elif question.question_type == "coding":
                if "code" not in answer_data or "language" not in answer_data:
                    raise ValidationError("Missing code or language")
                response.text_response = answer_data["code"]
                response.code_language = answer_data["language"]
                response.is_correct = None  # Requires execution
                response.points_earned = None

            elif question.question_type == "file_upload":
                if "file_url" not in answer_data:
                    raise ValidationError("Missing file_url")
                response.file_url = answer_data["file_url"]
                response.file_name = answer_data.get("file_name")
                response.file_size_bytes = answer_data.get("file_size")
                response.is_correct = None  # Requires manual grading
                response.points_earned = None

            else:
                # Empty answer
                response.selected_options = None
                response.is_correct = False
                response.points_earned = 0

            # Update time spent if provided
            if time_spent_seconds is not None:
                response.time_spent_seconds = time_spent_seconds

            # Save response
            if not existing_response:
                self.db.add(response)
                attempt.questions_answered += 1
            else:
                # Just update the existing response
                pass

            self.db.commit()
            self.db.refresh(response)

            return response

        except (ValidationError, AssessmentAlreadySubmittedError, TimeLimitExceededError, AttemptNotFoundError, QuestionNotFoundError):
            raise
        except Exception as e:
            self.db.rollback()
            raise ServiceError(f"Failed to submit answer: {str(e)}")

    # ========================================================================
    # Code Execution
    # ========================================================================

    async def execute_code(
        self,
        attempt_id: UUID,
        question_id: UUID,
        code: str,
        language: str,
        save_to_response: bool = False,
    ) -> Dict[str, Any]:
        """
        Execute code for coding challenge

        Args:
            attempt_id: Assessment attempt ID
            question_id: Question ID
            code: Code to execute
            language: Programming language
            save_to_response: Whether to save results to response

        Returns:
            Execution results

        Raises:
            AttemptNotFoundError: Attempt not found
            QuestionNotFoundError: Question not found
            InvalidLanguageError: Unsupported language
            InvalidQuestionTypeError: Not a coding question
        """
        # Get attempt
        attempt = (
            self.db.query(AssessmentAttempt)
            .filter(AssessmentAttempt.id == attempt_id)
            .first()
        )

        if not attempt:
            raise AttemptNotFoundError()

        # Get question
        question = (
            self.db.query(AssessmentQuestion)
            .filter(AssessmentQuestion.id == question_id)
            .first()
        )

        if not question:
            raise QuestionNotFoundError()

        # Validate question type
        if question.question_type != "coding":
            raise InvalidQuestionTypeError("Question is not a coding challenge")

        # Validate language
        supported_languages = ["python", "javascript", "java", "cpp", "c", "go", "rust"]
        if language.lower() not in supported_languages:
            raise InvalidLanguageError(f"Language {language} is not supported")

        # Execute code via external service
        if self.coding_execution_service:
            result = await self.coding_execution_service.execute_code(
                code=code,
                language=language,
                test_cases=question.test_cases or [],
            )
        else:
            # Fallback for testing
            result = {
                "status": "success",
                "test_cases_passed": 0,
                "test_cases_total": len(question.test_cases or []),
                "execution_time_ms": 0,
                "output": "Code execution service not configured",
            }

        # Save to response if requested
        if save_to_response:
            response = (
                self.db.query(AssessmentResponse)
                .filter(
                    and_(
                        AssessmentResponse.attempt_id == attempt_id,
                        AssessmentResponse.question_id == question_id,
                    )
                )
                .first()
            )

            if response:
                response.execution_output = result.get("output", "")
                response.execution_time_ms = result.get("execution_time_ms", 0)
                response.test_cases_passed = result.get("test_cases_passed", 0)
                response.test_cases_total = result.get("test_cases_total", 0)

                # Auto-grade if execution successful
                if result["status"] == "success":
                    points = self._auto_grade_coding(response, question)
                    response.points_earned = points
                    response.is_correct = points == question.points

                self.db.commit()

        return result

    # ========================================================================
    # Auto-Grading
    # ========================================================================

    def _auto_grade_mcq(
        self,
        response: AssessmentResponse,
        question: AssessmentQuestion,
    ) -> float:
        """
        Auto-grade MCQ question

        Args:
            response: Assessment response
            question: Question details

        Returns:
            Points earned
        """
        if question.question_type == "mcq_single":
            # Single choice
            selected = response.selected_options.get("selected", [])
            correct_answers = question.correct_answers or []

            if selected and correct_answers and selected[0] == correct_answers[0]:
                response.is_correct = True
                return question.points
            else:
                response.is_correct = False
                return 0

        elif question.question_type == "mcq_multiple":
            # Multiple choice - partial credit
            selected = set(response.selected_options.get("selected", []))
            correct_answers = set(question.correct_answers or [])

            if selected == correct_answers:
                response.is_correct = True
                return question.points
            else:
                # Partial credit based on overlap
                correct_selected = selected & correct_answers
                if correct_selected:
                    partial_points = (len(correct_selected) / len(correct_answers)) * question.points
                    response.is_correct = False
                    return partial_points
                else:
                    response.is_correct = False
                    return 0

        return 0

    def _auto_grade_coding(
        self,
        response: AssessmentResponse,
        question: AssessmentQuestion,
    ) -> float:
        """
        Auto-grade coding challenge

        Args:
            response: Assessment response with test results
            question: Question details

        Returns:
            Points earned
        """
        if response.test_cases_total == 0:
            return 0

        pass_rate = response.test_cases_passed / response.test_cases_total

        if pass_rate == 1.0:
            response.is_correct = True
            return question.points
        else:
            response.is_correct = False
            # Partial credit proportional to test cases passed
            return pass_rate * question.points

    def _calculate_attempt_score(self, attempt: AssessmentAttempt):
        """
        Calculate total score for attempt

        Args:
            attempt: Assessment attempt
        """
        responses = (
            self.db.query(AssessmentResponse)
            .filter(AssessmentResponse.attempt_id == attempt.id)
            .all()
        )

        total_points = sum(r.points_earned or 0 for r in responses)
        questions_correct = sum(1 for r in responses if r.is_correct)

        attempt.points_earned = total_points
        attempt.score_percentage = (
            (total_points / attempt.total_points_possible * 100)
            if attempt.total_points_possible > 0
            else 0
        )
        attempt.questions_correct = questions_correct

    # ========================================================================
    # Anti-Cheating
    # ========================================================================

    def track_event(
        self,
        attempt_id: UUID,
        event_type: str,
        details: Optional[Dict[str, Any]] = None,
    ):
        """
        Track anti-cheating events

        Args:
            attempt_id: Assessment attempt ID
            event_type: Event type (tab_switch, copy_paste, ip_change, etc.)
            details: Additional event details
        """
        attempt = (
            self.db.query(AssessmentAttempt)
            .filter(AssessmentAttempt.id == attempt_id)
            .first()
        )

        if not attempt or attempt.status == "completed":
            return  # Ignore events on completed attempts

        if event_type == "tab_switch":
            attempt.tab_switch_count += 1
            if attempt.tab_switch_count >= attempt.max_tab_switches:
                attempt.flagged_for_review = True
                attempt.flag_reason = "Exceeded tab switch limit"

        elif event_type == "copy_paste":
            if "copy_paste_events" not in attempt.metadata:
                attempt.metadata["copy_paste_events"] = []
            attempt.metadata["copy_paste_events"].append({
                "timestamp": datetime.utcnow().isoformat(),
                "details": details,
            })

        elif event_type == "ip_change":
            new_ip = details.get("new_ip") if details else None
            if new_ip and new_ip != attempt.ip_address:
                attempt.flagged_for_review = True
                attempt.flag_reason = f"IP address changed from {attempt.ip_address} to {new_ip}"

        elif event_type == "full_screen_exit":
            if "full_screen_exit_count" not in attempt.metadata:
                attempt.metadata["full_screen_exit_count"] = 0
            attempt.metadata["full_screen_exit_count"] += 1

        self.db.commit()

    # ========================================================================
    # Assessment Submission
    # ========================================================================

    def submit_assessment(self, attempt_id: UUID) -> Dict[str, Any]:
        """
        Submit final assessment

        Args:
            attempt_id: Assessment attempt ID

        Returns:
            Submission results with score and pass/fail status

        Raises:
            AttemptNotFoundError: Attempt not found
            AssessmentAlreadySubmittedError: Already submitted
        """
        attempt = (
            self.db.query(AssessmentAttempt)
            .filter(AssessmentAttempt.id == attempt_id)
            .first()
        )

        if not attempt:
            raise AttemptNotFoundError()

        if attempt.status == "completed":
            raise AssessmentAlreadySubmittedError()

        # Get all responses
        responses = (
            self.db.query(AssessmentResponse)
            .filter(AssessmentResponse.attempt_id == attempt_id)
            .all()
        )

        # Auto-grade any ungraded responses
        for response in responses:
            if response.is_correct is None:
                question = (
                    self.db.query(AssessmentQuestion)
                    .filter(AssessmentQuestion.id == response.question_id)
                    .first()
                )

                if question.question_type in ["mcq_single", "mcq_multiple"]:
                    points = self._auto_grade_mcq(response, question)
                    response.points_earned = points

        # Calculate final score
        self._calculate_attempt_score(attempt)

        # Get assessment to check passing score
        assessment = (
            self.db.query(Assessment)
            .filter(Assessment.id == attempt.assessment_id)
            .first()
        )

        # Determine pass/fail
        passed = attempt.score_percentage >= assessment.passing_score_percentage
        attempt.passed = passed

        # Mark as completed
        attempt.status = "completed"
        attempt.submitted_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(attempt)

        return {
            "attempt_id": str(attempt.id),
            "score_percentage": float(attempt.score_percentage),
            "points_earned": float(attempt.points_earned),
            "total_points": float(attempt.total_points_possible),
            "questions_correct": attempt.questions_correct,
            "total_questions": attempt.total_questions,
            "passed": passed,
        }

    def check_and_auto_submit(self, attempt_id: UUID):
        """
        Check if time expired and auto-submit if needed

        Args:
            attempt_id: Assessment attempt ID
        """
        attempt = (
            self.db.query(AssessmentAttempt)
            .filter(AssessmentAttempt.id == attempt_id)
            .first()
        )

        if not attempt or attempt.status == "completed":
            return

        assessment = (
            self.db.query(Assessment)
            .filter(Assessment.id == attempt.assessment_id)
            .first()
        )

        if assessment.time_limit_minutes and attempt.started_at:
            elapsed_minutes = (datetime.utcnow() - attempt.started_at).total_seconds() / 60
            if elapsed_minutes > assessment.time_limit_minutes:
                # Auto-submit
                attempt.auto_submitted = True
                self.submit_assessment(attempt_id)

    # ========================================================================
    # Results Retrieval
    # ========================================================================

    def get_results(self, attempt_id: UUID) -> Dict[str, Any]:
        """
        Get assessment results

        Args:
            attempt_id: Assessment attempt ID

        Returns:
            Complete results with scores and answers

        Raises:
            AttemptNotFoundError: Attempt not found
            AssessmentNotCompletedError: Attempt not completed
        """
        attempt = (
            self.db.query(AssessmentAttempt)
            .filter(AssessmentAttempt.id == attempt_id)
            .first()
        )

        if not attempt:
            raise AttemptNotFoundError()

        if attempt.status != "completed":
            raise AssessmentNotCompletedError()

        # Get assessment
        assessment = (
            self.db.query(Assessment)
            .filter(Assessment.id == attempt.assessment_id)
            .first()
        )

        # Get all responses
        responses = (
            self.db.query(AssessmentResponse)
            .filter(AssessmentResponse.attempt_id == attempt_id)
            .all()
        )

        # Build response data
        response_data = []
        for response in responses:
            question = (
                self.db.query(AssessmentQuestion)
                .filter(AssessmentQuestion.id == response.question_id)
                .first()
            )

            response_dict = {
                "question_id": str(response.question_id),
                "is_correct": response.is_correct,
                "points_earned": float(response.points_earned or 0),
                "points_possible": float(question.points),
            }

            # Include correct answer if enabled
            if assessment.show_correct_answers:
                if question.question_type == "mcq_single":
                    response_dict["correct_answer"] = question.mcq_options.get("correct_answer")
                elif question.question_type == "mcq_multiple":
                    response_dict["correct_answer"] = question.mcq_options.get("correct_answers")

            response_data.append(response_dict)

        return {
            "attempt_id": str(attempt.id),
            "score_percentage": float(attempt.score_percentage),
            "points_earned": float(attempt.points_earned),
            "total_points": float(attempt.total_points_possible),
            "questions_correct": attempt.questions_correct,
            "total_questions": attempt.total_questions,
            "passed": attempt.passed,
            "submitted_at": attempt.submitted_at.isoformat(),
            "responses": response_data,
        }

    # ========================================================================
    # Authorization Helpers
    # ========================================================================

    def verify_attempt_ownership(self, attempt_id: UUID, candidate_id: UUID):
        """
        Verify candidate owns the attempt

        Args:
            attempt_id: Assessment attempt ID
            candidate_id: Candidate user ID

        Raises:
            ForbiddenError: Candidate does not own attempt
        """
        attempt = (
            self.db.query(AssessmentAttempt)
            .filter(AssessmentAttempt.id == attempt_id)
            .first()
        )

        if not attempt or attempt.candidate_id != candidate_id:
            raise ForbiddenError("You do not have access to this assessment attempt")

    def get_attempt_progress(self, attempt_id: UUID) -> Dict[str, Any]:
        """
        Get current attempt progress

        Args:
            attempt_id: Assessment attempt ID

        Returns:
            Progress details

        Raises:
            AttemptNotFoundError: Attempt not found
        """
        attempt = (
            self.db.query(AssessmentAttempt)
            .filter(AssessmentAttempt.id == attempt_id)
            .first()
        )

        if not attempt:
            raise AttemptNotFoundError()

        return {
            "attempt_id": str(attempt.id),
            "status": attempt.status,
            "questions_answered": attempt.questions_answered,
            "total_questions": attempt.total_questions,
            "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
        }
