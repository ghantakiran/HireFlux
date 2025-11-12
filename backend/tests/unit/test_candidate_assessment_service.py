"""
Unit Tests for CandidateAssessmentService (TDD)

Sprint 19-20 Week 37: Candidate Assessment Journey
Following Test-Driven Development - tests written BEFORE implementation.

Test Coverage:
- Assessment access via token (5 tests)
- Assessment start workflow (6 tests)
- Answer submission (MCQ, text, coding, file) (12 tests)
- Code execution integration (6 tests)
- Auto-grading (MCQ + coding) (8 tests)
- Anti-cheating tracking (6 tests)
- Assessment submission (5 tests)
- Results retrieval (4 tests)
- Edge cases & error handling (8 tests)

Total: 60+ unit tests
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4, UUID
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from typing import List, Dict, Any

# Service under test (NOT IMPLEMENTED YET - TDD)
# This will fail initially, which is expected in TDD
try:
    from app.services.candidate_assessment_service import CandidateAssessmentService
except ImportError:
    # Expected to fail initially - we'll implement after tests
    CandidateAssessmentService = None

# Models (already exist from Sprint 17-18)
from app.db.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentAttempt,
    AssessmentResponse,
)

# Schemas (to be created for candidate journey)
try:
    from app.schemas.candidate_assessment import (
        AttemptCreate,
        ResponseSubmit,
        CodeExecutionRequest,
        CodeExecutionResult,
        AttemptResult,
    )
except ImportError:
    # Will be created during implementation
    pass

# Exceptions (to be extended)
from app.core.exceptions import (
    AssessmentNotFoundError,
    AttemptNotFoundError,
    ForbiddenError,
    AssessmentAlreadySubmittedError,
    TimeLimitExceededError,
    InvalidAccessTokenError,
    TooManyAttemptsError,
)


# ============================================================================
# FIXTURES
# ============================================================================

@pytest.fixture
def db_session():
    """Mock database session"""
    session = MagicMock()
    session.add = Mock()
    session.commit = Mock()
    session.refresh = Mock()
    session.query = Mock()
    session.delete = Mock()
    session.execute = Mock()
    session.scalar = Mock()
    return session


@pytest.fixture
def mock_coding_execution_service():
    """Mock coding execution service"""
    service = MagicMock()
    service.execute_code = AsyncMock()
    return service


@pytest.fixture
def sample_assessment():
    """Sample published assessment"""
    return Assessment(
        id=uuid4(),
        company_id=uuid4(),
        title="Python Developer Assessment",
        description="Test your Python skills",
        assessment_type="technical",
        time_limit_minutes=60,
        passing_score_percentage=70.0,
        max_attempts=2,
        status="published",
        published_at=datetime.utcnow(),
        show_correct_answers=False,
        show_results_immediately=True,
        allow_tab_switching=True,
        max_tab_switches=5,
        track_ip_address=True,
    )


@pytest.fixture
def sample_mcq_question():
    """Sample MCQ question"""
    return AssessmentQuestion(
        id=uuid4(),
        assessment_id=uuid4(),
        question_type="mcq_single",
        question_text="What is 2 + 2?",
        points=10,
        display_order=1,
        options=["2", "3", "4", "5"],
        correct_answers=[2],  # Index 2 = "4"
    )


@pytest.fixture
def sample_coding_question():
    """Sample coding question"""
    return AssessmentQuestion(
        id=uuid4(),
        assessment_id=uuid4(),
        question_type="coding",
        question_text="Write a function to reverse a string",
        points=30,
        display_order=2,
        coding_language="python",
        starter_code="def reverse_string(s):\n    pass",
        test_cases=[
            {"input": "hello", "expected_output": "olleh"},
            {"input": "world", "expected_output": "dlrow"},
        ],
    )


@pytest.fixture
def sample_attempt():
    """Sample assessment attempt"""
    return AssessmentAttempt(
        id=uuid4(),
        assessment_id=uuid4(),
        candidate_id=uuid4(),
        attempt_number=1,
        status="in_progress",
        access_token="test_token_123",
        started_at=datetime.utcnow(),
        total_questions=5,
        total_points_possible=100,
        questions_answered=2,
        tab_switch_count=0,
        ip_address="192.168.1.1",
    )


@pytest.fixture
def candidate_assessment_service(db_session, mock_coding_execution_service):
    """Create CandidateAssessmentService instance (will be implemented)"""
    if CandidateAssessmentService is None:
        pytest.skip("CandidateAssessmentService not implemented yet")
    return CandidateAssessmentService(db_session, mock_coding_execution_service)


# ============================================================================
# TEST SUITE 1: Assessment Access via Token (5 tests)
# ============================================================================

class TestAssessmentAccess:
    """Test accessing assessment with access token"""

    def test_access_assessment_with_valid_token_succeeds(
        self, candidate_assessment_service, db_session, sample_assessment, sample_attempt
    ):
        """
        Given a valid access token
        When accessing the assessment
        Then return assessment and attempt details
        """
        # Arrange
        db_session.query().filter().first.return_value = sample_attempt
        db_session.query().filter().first.return_value = sample_assessment

        # Act
        result = candidate_assessment_service.access_assessment("test_token_123")

        # Assert
        assert result["assessment"] == sample_assessment
        assert result["attempt"] == sample_attempt
        assert result["time_remaining_minutes"] is not None

    def test_access_assessment_with_expired_token_raises_error(
        self, candidate_assessment_service, db_session
    ):
        """
        Given an expired access token
        When accessing the assessment
        Then raise InvalidAccessTokenError
        """
        # Arrange
        expired_attempt = Mock()
        expired_attempt.access_token_expires_at = datetime.utcnow() - timedelta(hours=1)
        db_session.query().filter().first.return_value = expired_attempt

        # Act & Assert
        with pytest.raises(InvalidAccessTokenError):
            candidate_assessment_service.access_assessment("expired_token")

    def test_access_assessment_with_invalid_token_raises_error(
        self, candidate_assessment_service, db_session
    ):
        """
        Given an invalid access token
        When accessing the assessment
        Then raise InvalidAccessTokenError
        """
        # Arrange
        db_session.query().filter().first.return_value = None

        # Act & Assert
        with pytest.raises(InvalidAccessTokenError):
            candidate_assessment_service.access_assessment("invalid_token")

    def test_access_assessment_calculates_time_remaining_correctly(
        self, candidate_assessment_service, db_session, sample_assessment, sample_attempt
    ):
        """
        Given an in-progress attempt
        When accessing the assessment
        Then calculate correct time remaining
        """
        # Arrange
        sample_attempt.started_at = datetime.utcnow() - timedelta(minutes=15)
        sample_assessment.time_limit_minutes = 60
        db_session.query().filter().first.side_effect = [sample_attempt, sample_assessment]

        # Act
        result = candidate_assessment_service.access_assessment("test_token_123")

        # Assert
        assert result["time_remaining_minutes"] == 45  # 60 - 15

    def test_access_already_submitted_assessment_returns_results(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given an already submitted attempt
        When accessing the assessment
        Then return results instead of allowing retake
        """
        # Arrange
        sample_attempt.status = "completed"
        sample_attempt.submitted_at = datetime.utcnow() - timedelta(hours=1)
        db_session.query().filter().first.return_value = sample_attempt

        # Act
        result = candidate_assessment_service.access_assessment("test_token_123")

        # Assert
        assert result["status"] == "completed"
        assert result["allow_retake"] == False


# ============================================================================
# TEST SUITE 2: Assessment Start Workflow (6 tests)
# ============================================================================

class TestAssessmentStart:
    """Test starting an assessment attempt"""

    def test_start_assessment_creates_new_attempt(
        self, candidate_assessment_service, db_session, sample_assessment
    ):
        """
        Given a valid assessment and candidate
        When starting the assessment
        Then create a new attempt with status 'in_progress'
        """
        # Arrange
        assessment_id = sample_assessment.id
        candidate_id = uuid4()
        db_session.query().filter().first.return_value = sample_assessment
        db_session.query().filter().count.return_value = 0  # No previous attempts

        # Act
        attempt = candidate_assessment_service.start_assessment(assessment_id, candidate_id)

        # Assert
        assert attempt.status == "in_progress"
        assert attempt.started_at is not None
        assert attempt.attempt_number == 1
        db_session.add.assert_called_once()
        db_session.commit.assert_called_once()

    def test_start_assessment_generates_unique_access_token(
        self, candidate_assessment_service, db_session, sample_assessment
    ):
        """
        Given a new assessment attempt
        When starting the assessment
        Then generate a unique access token
        """
        # Arrange
        assessment_id = sample_assessment.id
        candidate_id = uuid4()
        db_session.query().filter().first.return_value = sample_assessment
        db_session.query().filter().count.return_value = 0

        # Act
        attempt = candidate_assessment_service.start_assessment(assessment_id, candidate_id)

        # Assert
        assert attempt.access_token is not None
        assert len(attempt.access_token) > 20  # Sufficient length

    def test_start_assessment_exceeding_max_attempts_raises_error(
        self, candidate_assessment_service, db_session, sample_assessment
    ):
        """
        Given a candidate has exceeded max attempts
        When starting the assessment
        Then raise TooManyAttemptsError
        """
        # Arrange
        assessment_id = sample_assessment.id
        candidate_id = uuid4()
        sample_assessment.max_attempts = 2
        db_session.query().filter().first.return_value = sample_assessment
        db_session.query().filter().count.return_value = 2  # Already 2 attempts

        # Act & Assert
        with pytest.raises(TooManyAttemptsError):
            candidate_assessment_service.start_assessment(assessment_id, candidate_id)

    def test_start_unpublished_assessment_raises_error(
        self, candidate_assessment_service, db_session, sample_assessment
    ):
        """
        Given an unpublished assessment
        When starting the assessment
        Then raise AssessmentNotFoundError
        """
        # Arrange
        assessment_id = sample_assessment.id
        candidate_id = uuid4()
        sample_assessment.status = "draft"
        db_session.query().filter().first.return_value = sample_assessment

        # Act & Assert
        with pytest.raises(AssessmentNotFoundError):
            candidate_assessment_service.start_assessment(assessment_id, candidate_id)

    def test_start_assessment_tracks_ip_address(
        self, candidate_assessment_service, db_session, sample_assessment
    ):
        """
        Given IP tracking is enabled
        When starting the assessment
        Then store the candidate's IP address
        """
        # Arrange
        assessment_id = sample_assessment.id
        candidate_id = uuid4()
        ip_address = "203.0.113.42"
        sample_assessment.track_ip_address = True
        db_session.query().filter().first.return_value = sample_assessment
        db_session.query().filter().count.return_value = 0

        # Act
        attempt = candidate_assessment_service.start_assessment(
            assessment_id, candidate_id, ip_address=ip_address
        )

        # Assert
        assert attempt.ip_address == ip_address

    def test_start_assessment_increments_attempt_number(
        self, candidate_assessment_service, db_session, sample_assessment
    ):
        """
        Given a candidate has 1 previous attempt
        When starting the assessment again
        Then create attempt with attempt_number = 2
        """
        # Arrange
        assessment_id = sample_assessment.id
        candidate_id = uuid4()
        sample_assessment.max_attempts = 3
        db_session.query().filter().first.return_value = sample_assessment
        db_session.query().filter().count.return_value = 1  # 1 previous attempt

        # Act
        attempt = candidate_assessment_service.start_assessment(assessment_id, candidate_id)

        # Assert
        assert attempt.attempt_number == 2


# ============================================================================
# TEST SUITE 3: Answer Submission (12 tests)
# ============================================================================

class TestAnswerSubmission:
    """Test submitting answers to questions"""

    def test_submit_mcq_single_answer_saves_correctly(
        self, candidate_assessment_service, db_session, sample_attempt, sample_mcq_question
    ):
        """
        Given an MCQ single-choice question
        When submitting an answer
        Then save the selected option correctly
        """
        # Arrange
        attempt_id = sample_attempt.id
        question_id = sample_mcq_question.id
        answer_data = {"selected_option": 2}  # Correct answer
        db_session.query().filter().first.side_effect = [sample_attempt, sample_mcq_question]

        # Act
        response = candidate_assessment_service.submit_answer(
            attempt_id, question_id, answer_data
        )

        # Assert
        assert response.selected_options == {"selected": [2]}
        assert response.is_correct == True  # Auto-graded
        db_session.add.assert_called_once()
        db_session.commit.assert_called()

    def test_submit_mcq_multiple_answer_saves_correctly(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given an MCQ multiple-choice question
        When submitting multiple selections
        Then save all selected options
        """
        # Arrange
        mcq_multiple = Mock()
        mcq_multiple.question_type = "mcq_multiple"
        mcq_multiple.options = ["A", "B", "C", "D"]
        mcq_multiple.correct_answers = [0, 2]  # A and C are correct
        mcq_multiple.points = 20
        attempt_id = sample_attempt.id
        question_id = uuid4()
        answer_data = {"selected_options": [0, 2]}  # Correct
        db_session.query().filter().first.side_effect = [sample_attempt, mcq_multiple]

        # Act
        response = candidate_assessment_service.submit_answer(
            attempt_id, question_id, answer_data
        )

        # Assert
        assert response.selected_options == {"selected": [0, 2]}
        assert response.is_correct == True

    def test_submit_text_answer_saves_correctly(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given a text response question
        When submitting text answer
        Then save text and mark for manual grading
        """
        # Arrange
        text_question = Mock()
        text_question.question_type = "text"
        text_question.points = 20
        attempt_id = sample_attempt.id
        question_id = uuid4()
        answer_data = {"text_response": "This is my answer to the question."}
        db_session.query().filter().first.side_effect = [sample_attempt, text_question]

        # Act
        response = candidate_assessment_service.submit_answer(
            attempt_id, question_id, answer_data
        )

        # Assert
        assert response.text_response == "This is my answer to the question."
        assert response.is_correct == None  # Requires manual grading
        assert response.points_earned == None  # Not auto-graded

    def test_submit_coding_answer_saves_code(
        self, candidate_assessment_service, db_session, sample_attempt, sample_coding_question
    ):
        """
        Given a coding challenge question
        When submitting code
        Then save the code without auto-execution
        """
        # Arrange
        attempt_id = sample_attempt.id
        question_id = sample_coding_question.id
        answer_data = {
            "code": "def reverse_string(s):\n    return s[::-1]",
            "language": "python"
        }
        db_session.query().filter().first.side_effect = [sample_attempt, sample_coding_question]

        # Act
        response = candidate_assessment_service.submit_answer(
            attempt_id, question_id, answer_data
        )

        # Assert
        assert response.code_language == "python"
        assert "return s[::-1]" in response.text_response  # Code stored in text_response
        assert response.is_correct == None  # Not graded until executed

    def test_submit_file_upload_answer_saves_url(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given a file upload question
        When submitting a file URL
        Then save file metadata
        """
        # Arrange
        file_question = Mock()
        file_question.question_type = "file_upload"
        file_question.points = 25
        attempt_id = sample_attempt.id
        question_id = uuid4()
        answer_data = {
            "file_url": "https://s3.amazonaws.com/bucket/resume.pdf",
            "file_name": "resume.pdf",
            "file_size": 204800,  # 200KB
            "file_type": "application/pdf"
        
        db_session.query().filter().first.side_effect = [sample_attempt, file_question]

        # Act
        response = candidate_assessment_service.submit_answer(
            attempt_id, question_id, answer_data
        )

        # Assert
        assert response.file_url == "https://s3.amazonaws.com/bucket/resume.pdf"
        assert response.file_name == "resume.pdf"
        assert response.file_size_bytes == 204800

    def test_submit_answer_updates_attempt_progress(
        self, candidate_assessment_service, db_session, sample_attempt, sample_mcq_question
    ):
        """
        Given an answer submission
        When saving the answer
        Then update attempt's questions_answered count
        """
        # Arrange
        sample_attempt.questions_answered = 3
        attempt_id = sample_attempt.id
        question_id = sample_mcq_question.id
        answer_data = {"selected_option": 2}
        db_session.query().filter().first.side_effect = [sample_attempt, sample_mcq_question]

        # Act
        candidate_assessment_service.submit_answer(attempt_id, question_id, answer_data)

        # Assert
        assert sample_attempt.questions_answered == 4

    def test_submit_answer_to_completed_attempt_raises_error(
        self, candidate_assessment_service, db_session, sample_attempt, sample_mcq_question
    ):
        """
        Given an already submitted attempt
        When trying to submit an answer
        Then raise AssessmentAlreadySubmittedError
        """
        # Arrange
        sample_attempt.status = "completed"
        attempt_id = sample_attempt.id
        question_id = sample_mcq_question.id
        answer_data = {"selected_option": 2}
        db_session.query().filter().first.return_value = sample_attempt

        # Act & Assert
        with pytest.raises(AssessmentAlreadySubmittedError):
            candidate_assessment_service.submit_answer(attempt_id, question_id, answer_data)

    def test_submit_answer_after_time_limit_raises_error(
        self, candidate_assessment_service, db_session, sample_attempt, sample_mcq_question, sample_assessment
    ):
        """
        Given time limit has expired
        When trying to submit an answer
        Then raise TimeLimitExceededError
        """
        # Arrange
        sample_assessment.time_limit_minutes = 60
        sample_attempt.started_at = datetime.utcnow() - timedelta(minutes=65)
        attempt_id = sample_attempt.id
        question_id = sample_mcq_question.id
        answer_data = {"selected_option": 2}
        db_session.query().filter().first.side_effect = [sample_attempt, sample_mcq_question, sample_assessment]

        # Act & Assert
        with pytest.raises(TimeLimitExceededError):
            candidate_assessment_service.submit_answer(attempt_id, question_id, answer_data)

    def test_submit_duplicate_answer_updates_existing_response(
        self, candidate_assessment_service, db_session, sample_attempt, sample_mcq_question
    ):
        """
        Given a question already answered
        When submitting a new answer to same question
        Then update the existing response instead of creating new
        """
        # Arrange
        existing_response = Mock()
        existing_response.selected_options = {"selected": [1]}  # Previous answer
        attempt_id = sample_attempt.id
        question_id = sample_mcq_question.id
        answer_data = {"selected_option": 2}  # New answer
        db_session.query().filter().first.side_effect = [sample_attempt, sample_mcq_question]
        db_session.query().filter().filter().first.return_value = existing_response

        # Act
        response = candidate_assessment_service.submit_answer(attempt_id, question_id, answer_data)

        # Assert
        assert existing_response.selected_options == {"selected": [2]}
        db_session.add.assert_not_called()  # Should update, not add new

    def test_submit_empty_answer_is_allowed(
        self, candidate_assessment_service, db_session, sample_attempt, sample_mcq_question
    ):
        """
        Given a candidate skips a question
        When submitting empty answer
        Then save empty response (marked as unanswered)
        """
        # Arrange
        attempt_id = sample_attempt.id
        question_id = sample_mcq_question.id
        answer_data = {}  # Empty
        db_session.query().filter().first.side_effect = [sample_attempt, sample_mcq_question]

        # Act
        response = candidate_assessment_service.submit_answer(attempt_id, question_id, answer_data)

        # Assert
        assert response.selected_options is None or response.selected_options == {}
        assert response.is_correct == False  # Unanswered = incorrect

    def test_submit_answer_tracks_time_spent(
        self, candidate_assessment_service, db_session, sample_attempt, sample_mcq_question
    ):
        """
        Given an answer submission
        When saving the answer
        Then track time spent on this question
        """
        # Arrange
        attempt_id = sample_attempt.id
        question_id = sample_mcq_question.id
        answer_data = {"selected_option": 2}
        time_spent_seconds = 120  # 2 minutes
        db_session.query().filter().first.side_effect = [sample_attempt, sample_mcq_question]

        # Act
        response = candidate_assessment_service.submit_answer(
            attempt_id, question_id, answer_data, time_spent_seconds=time_spent_seconds
        )

        # Assert
        assert response.time_spent_seconds == 120

    def test_submit_answer_with_invalid_question_id_raises_error(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given an invalid question ID
        When submitting an answer
        Then raise QuestionNotFoundError
        """
        # Arrange
        attempt_id = sample_attempt.id
        question_id = uuid4()
        answer_data = {"selected_option": 2}
        db_session.query().filter().first.side_effect = [sample_attempt, None]  # Question not found

        # Act & Assert
        with pytest.raises(QuestionNotFoundError):
            candidate_assessment_service.submit_answer(attempt_id, question_id, answer_data)


# ============================================================================
# TEST SUITE 4: Code Execution (6 tests)
# ============================================================================

class TestCodeExecution:
    """Test code execution for coding challenges"""

    @pytest.mark.asyncio
    async def test_execute_python_code_with_test_cases(
        self, candidate_assessment_service, db_session, mock_coding_execution_service,
        sample_attempt, sample_coding_question
    ):
        """
        Given a Python coding challenge
        When executing code with test cases
        Then return execution results with pass/fail status
        """
        # Arrange
        attempt_id = sample_attempt.id
        question_id = sample_coding_question.id
        code = "def reverse_string(s):\n    return s[::-1]"

        mock_coding_execution_service.execute_code.return_value = {
            "status": "success",
            "test_cases_passed": 2,
            "test_cases_total": 2,
            "execution_time_ms": 45,
            "output": "All test cases passed"
        

        db_session.query().filter().first.side_effect = [sample_attempt, sample_coding_question]

        # Act
        result = await candidate_assessment_service.execute_code(
            attempt_id, question_id, code, "python"
        )

        # Assert
        assert result["status"] == "success"
        assert result["test_cases_passed"] == 2
        assert result["test_cases_total"] == 2
        mock_coding_execution_service.execute_code.assert_called_once()

    @pytest.mark.asyncio
    async def test_execute_code_with_runtime_error(
        self, candidate_assessment_service, db_session, mock_coding_execution_service,
        sample_attempt, sample_coding_question
    ):
        """
        Given code with runtime error
        When executing code
        Then return error details
        """
        # Arrange
        attempt_id = sample_attempt.id
        question_id = sample_coding_question.id
        code = "def reverse_string(s):\n    return s.nonexistent()"

        mock_coding_execution_service.execute_code.return_value = {
            "status": "error",
            "error_message": "AttributeError: 'str' object has no attribute 'nonexistent'",
            "test_cases_passed": 0,
            "test_cases_total": 2
        

        db_session.query().filter().first.side_effect = [sample_attempt, sample_coding_question]

        # Act
        result = await candidate_assessment_service.execute_code(
            attempt_id, question_id, code, "python"
        )

        # Assert
        assert result["status"] == "error"
        assert "AttributeError" in result["error_message"]

    @pytest.mark.asyncio
    async def test_execute_code_with_timeout(
        self, candidate_assessment_service, db_session, mock_coding_execution_service,
        sample_attempt, sample_coding_question
    ):
        """
        Given code that runs too long
        When execution timeout occurs
        Then return timeout status
        """
        # Arrange
        attempt_id = sample_attempt.id
        question_id = sample_coding_question.id
        code = "while True:\n    pass"  # Infinite loop

        mock_coding_execution_service.execute_code.return_value = {
            "status": "timeout",
            "error_message": "Execution exceeded time limit of 5 seconds"
        

        db_session.query().filter().first.side_effect = [sample_attempt, sample_coding_question]

        # Act
        result = await candidate_assessment_service.execute_code(
            attempt_id, question_id, code, "python"
        )

        # Assert
        assert result["status"] == "timeout"

    @pytest.mark.asyncio
    async def test_execute_code_saves_results_to_response(
        self, candidate_assessment_service, db_session, mock_coding_execution_service,
        sample_attempt, sample_coding_question
    ):
        """
        Given successful code execution
        When test cases pass
        Then save execution results to response
        """
        # Arrange
        attempt_id = sample_attempt.id
        question_id = sample_coding_question.id
        code = "def reverse_string(s):\n    return s[::-1]"

        mock_coding_execution_service.execute_code.return_value = {
            "status": "success",
            "test_cases_passed": 2,
            "test_cases_total": 2,
            "execution_time_ms": 45,
            "output": "All test cases passed"
        

        existing_response = Mock()
        db_session.query().filter().first.side_effect = [sample_attempt, sample_coding_question]
        db_session.query().filter().filter().first.return_value = existing_response

        # Act
        result = await candidate_assessment_service.execute_code(
            attempt_id, question_id, code, "python", save_to_response=True
        )

        # Assert
        assert existing_response.execution_output == "All test cases passed"
        assert existing_response.execution_time_ms == 45
        assert existing_response.test_cases_passed == 2
        db_session.commit.assert_called()

    @pytest.mark.asyncio
    async def test_execute_code_with_unsupported_language_raises_error(
        self, candidate_assessment_service, db_session, sample_attempt, sample_coding_question
    ):
        """
        Given an unsupported programming language
        When executing code
        Then raise InvalidLanguageError
        """
        # Arrange
        attempt_id = sample_attempt.id
        question_id = sample_coding_question.id
        code = "print('hello')"
        language = "cobol"  # Unsupported
        db_session.query().filter().first.side_effect = [sample_attempt, sample_coding_question]

        # Act & Assert
        with pytest.raises(InvalidLanguageError):
            await candidate_assessment_service.execute_code(
                attempt_id, question_id, code, language
            )

    @pytest.mark.asyncio
    async def test_execute_code_on_non_coding_question_raises_error(
        self, candidate_assessment_service, db_session, sample_attempt, sample_mcq_question
    ):
        """
        Given a non-coding question (e.g., MCQ)
        When trying to execute code
        Then raise InvalidQuestionTypeError
        """
        # Arrange
        attempt_id = sample_attempt.id
        question_id = sample_mcq_question.id
        code = "print('test')"
        db_session.query().filter().first.side_effect = [sample_attempt, sample_mcq_question]

        # Act & Assert
        with pytest.raises(InvalidQuestionTypeError):
            await candidate_assessment_service.execute_code(
                attempt_id, question_id, code, "python"
            )


# ============================================================================
# TEST SUITE 5: Auto-Grading (8 tests)
# ============================================================================

class TestAutoGrading:
    """Test automatic grading for MCQ and coding questions"""

    def test_auto_grade_mcq_single_correct_answer(
        self, candidate_assessment_service, sample_mcq_question
    ):
        """
        Given correct MCQ single-choice answer
        When auto-grading
        Then award full points
        """
        # Arrange
        response = Mock()
        response.selected_options = {"selected": [2]}  # Correct
        # sample_mcq_question fixture already has:
        # options = ["2", "3", "4", "5"]
        # correct_answers = [2]  # Index 2 = "4"
        # points = 10

        # Act
        points = candidate_assessment_service._auto_grade_mcq(response, sample_mcq_question)

        # Assert
        assert points == 10
        assert response.is_correct == True

    def test_auto_grade_mcq_single_incorrect_answer(
        self, candidate_assessment_service, sample_mcq_question
    ):
        """
        Given incorrect MCQ single-choice answer
        When auto-grading
        Then award zero points
        """
        # Arrange
        response = Mock()
        response.selected_options = {"selected": [1]}  # Incorrect
        # sample_mcq_question fixture already has correct_answers = [2]
        # So selecting [1] is incorrect

        # Act
        points = candidate_assessment_service._auto_grade_mcq(response, sample_mcq_question)

        # Assert
        assert points == 0
        assert response.is_correct == False

    def test_auto_grade_mcq_multiple_all_correct(
        self, candidate_assessment_service
    ):
        """
        Given all correct options selected in MCQ multiple
        When auto-grading
        Then award full points
        """
        # Arrange
        question = Mock()
        question.question_type = "mcq_multiple"
        question.options = ["A", "B", "C", "D"]
        question.correct_answers = [0, 2]  # A and C
        question.points = 20

        response = Mock()
        response.selected_options = {"selected": [0, 2]}  # Both correct

        # Act
        points = candidate_assessment_service._auto_grade_mcq(response, question)

        # Assert
        assert points == 20
        assert response.is_correct == True

    def test_auto_grade_mcq_multiple_partial_credit(
        self, candidate_assessment_service
    ):
        """
        Given partially correct MCQ multiple answer
        When auto-grading
        Then award partial points
        """
        # Arrange
        question = Mock()
        question.question_type = "mcq_multiple"
        question.options = ["A", "B", "C", "D"]
        question.correct_answers = [0, 2]  # A and C
        question.points = 20

        response = Mock()
        response.selected_options = {"selected": [0]}  # Only A (50% correct)

        # Act
        points = candidate_assessment_service._auto_grade_mcq(response, question)

        # Assert
        assert points == 10  # 50% partial credit
        assert response.is_correct == False  # Not fully correct

    def test_auto_grade_coding_all_test_cases_pass(
        self, candidate_assessment_service, sample_coding_question
    ):
        """
        Given code that passes all test cases
        When auto-grading
        Then award full points
        """
        # Arrange
        response = Mock()
        response.test_cases_passed = 2
        response.test_cases_total = 2
        sample_coding_question.points = 30

        # Act
        points = candidate_assessment_service._auto_grade_coding(response, sample_coding_question)

        # Assert
        assert points == 30
        assert response.is_correct == True

    def test_auto_grade_coding_partial_test_cases_pass(
        self, candidate_assessment_service, sample_coding_question
    ):
        """
        Given code that passes some test cases
        When auto-grading
        Then award partial points proportionally
        """
        # Arrange
        response = Mock()
        response.test_cases_passed = 3
        response.test_cases_total = 5  # 60% pass rate
        sample_coding_question.points = 50

        # Act
        points = candidate_assessment_service._auto_grade_coding(response, sample_coding_question)

        # Assert
        assert points == 30  # 60% of 50 points
        assert response.is_correct == False  # Not 100% pass

    def test_auto_grade_coding_zero_test_cases_pass(
        self, candidate_assessment_service, sample_coding_question
    ):
        """
        Given code that fails all test cases
        When auto-grading
        Then award zero points
        """
        # Arrange
        response = Mock()
        response.test_cases_passed = 0
        response.test_cases_total = 4
        sample_coding_question.points = 40

        # Act
        points = candidate_assessment_service._auto_grade_coding(response, sample_coding_question)

        # Assert
        assert points == 0
        assert response.is_correct == False

    def test_auto_grade_updates_attempt_score(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given auto-graded responses
        When calculating total score
        Then update attempt's points_earned
        """
        # Arrange
        responses = [
            Mock(points_earned=10, is_correct=True),
            Mock(points_earned=15, is_correct=True),
            Mock(points_earned=0, is_correct=False),
        ]
        sample_attempt.total_points_possible = 100
        db_session.query().filter().all.return_value = responses

        # Act
        candidate_assessment_service._calculate_attempt_score(sample_attempt)

        # Assert
        assert sample_attempt.points_earned == 25  # 10 + 15 + 0
        assert sample_attempt.score_percentage == 25.0  # 25/100
        assert sample_attempt.questions_correct == 2


# ============================================================================
# TEST SUITE 6: Anti-Cheating Tracking (6 tests)
# ============================================================================

class TestAntiCheating:
    """Test anti-cheating detection and tracking"""

    def test_track_tab_switch_increments_counter(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given candidate switches browser tab
        When tracking the event
        Then increment tab_switch_count
        """
        # Arrange
        sample_attempt.tab_switch_count = 2
        sample_attempt.max_tab_switches = 5
        attempt_id = sample_attempt.id
        db_session.query().filter().first.return_value = sample_attempt

        # Act
        candidate_assessment_service.track_event(
            attempt_id, event_type="tab_switch"
        )

        # Assert
        assert sample_attempt.tab_switch_count == 3
        db_session.commit.assert_called()

    def test_track_tab_switch_exceeding_limit_flags_attempt(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given candidate exceeds max tab switches
        When tracking tab switch
        Then flag attempt for review
        """
        # Arrange
        sample_attempt.tab_switch_count = 4
        sample_attempt.max_tab_switches = 5
        sample_attempt.flagged_for_review = False
        attempt_id = sample_attempt.id
        db_session.query().filter().first.return_value = sample_attempt

        # Act
        candidate_assessment_service.track_event(
            attempt_id, event_type="tab_switch"
        )

        # Assert
        assert sample_attempt.tab_switch_count == 5
        assert sample_attempt.flagged_for_review == True
        assert "Exceeded tab switch limit" in sample_attempt.flag_reason

    def test_track_copy_paste_event_records_in_metadata(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given candidate copies/pastes text
        When tracking the event
        Then record in attempt metadata
        """
        # Arrange
        attempt_id = sample_attempt.id
        sample_attempt.metadata = {}
        db_session.query().filter().first.return_value = sample_attempt

        # Act
        candidate_assessment_service.track_event(
            attempt_id, event_type="copy_paste",
            details={"question_id": str(uuid4()), "action": "paste"}
        )

        # Assert
        assert "copy_paste_events" in sample_attempt.metadata
        assert len(sample_attempt.metadata["copy_paste_events"]) == 1

    def test_track_ip_address_change_flags_attempt(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given candidate IP address changes during assessment
        When tracking the event
        Then flag attempt for review
        """
        # Arrange
        sample_attempt.ip_address = "192.168.1.1"
        sample_attempt.flagged_for_review = False
        attempt_id = sample_attempt.id
        new_ip = "203.0.113.42"
        db_session.query().filter().first.return_value = sample_attempt

        # Act
        candidate_assessment_service.track_event(
            attempt_id, event_type="ip_change", details={"new_ip": new_ip}
        )

        # Assert
        assert sample_attempt.flagged_for_review == True
        assert "IP address changed" in sample_attempt.flag_reason

    def test_track_full_screen_exit_increments_counter(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given candidate exits full screen mode
        When tracking the event
        Then increment full_screen_exit_count
        """
        # Arrange
        sample_attempt.metadata = {"full_screen_exit_count": 1}
        attempt_id = sample_attempt.id
        db_session.query().filter().first.return_value = sample_attempt

        # Act
        candidate_assessment_service.track_event(
            attempt_id, event_type="full_screen_exit"
        )

        # Assert
        assert sample_attempt.metadata["full_screen_exit_count"] == 2

    def test_track_event_on_completed_attempt_is_ignored(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given attempt is already completed
        When tracking an event
        Then ignore the event (no updates)
        """
        # Arrange
        sample_attempt.status = "completed"
        attempt_id = sample_attempt.id
        db_session.query().filter().first.return_value = sample_attempt

        # Act
        candidate_assessment_service.track_event(
            attempt_id, event_type="tab_switch"
        )

        # Assert
        db_session.commit.assert_not_called()


# ============================================================================
# TEST SUITE 7: Assessment Submission (5 tests)
# ============================================================================

class TestAssessmentSubmission:
    """Test final assessment submission"""

    def test_submit_assessment_marks_as_completed(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given in-progress attempt
        When submitting assessment
        Then mark status as 'completed' and set submitted_at
        """
        # Arrange
        sample_attempt.status = "in_progress"
        sample_attempt.submitted_at = None
        attempt_id = sample_attempt.id
        db_session.query().filter().first.return_value = sample_attempt
        db_session.query().filter().all.return_value = []  # No responses

        # Act
        result = candidate_assessment_service.submit_assessment(attempt_id)

        # Assert
        assert sample_attempt.status == "completed"
        assert sample_attempt.submitted_at is not None
        db_session.commit.assert_called()

    def test_submit_assessment_calculates_final_score(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given completed responses
        When submitting assessment
        Then calculate and save final score
        """
        # Arrange
        responses = [
            Mock(points_earned=10, is_correct=True),
            Mock(points_earned=20, is_correct=True),
            Mock(points_earned=0, is_correct=False),
        ]
        sample_attempt.total_points_possible = 50
        attempt_id = sample_attempt.id
        db_session.query().filter().first.return_value = sample_attempt
        db_session.query().filter().all.return_value = responses

        # Act
        result = candidate_assessment_service.submit_assessment(attempt_id)

        # Assert
        assert sample_attempt.points_earned == 30
        assert sample_attempt.score_percentage == 60.0  # 30/50
        assert result["score_percentage"] == 60.0

    def test_submit_assessment_auto_grades_all_responses(
        self, candidate_assessment_service, db_session, sample_attempt, sample_mcq_question
    ):
        """
        Given unanswered auto-gradable questions
        When submitting assessment
        Then auto-grade all MCQ and coding responses
        """
        # Arrange
        ungraded_response = Mock()
        ungraded_response.is_correct = None  # Not graded yet
        ungraded_response.question_id = sample_mcq_question.id
        ungraded_response.selected_options = {"selected": [2]}

        attempt_id = sample_attempt.id
        db_session.query().filter().first.return_value = sample_attempt
        db_session.query().filter().all.return_value = [ungraded_response]
        db_session.query().filter().filter().first.return_value = sample_mcq_question

        # Act
        candidate_assessment_service.submit_assessment(attempt_id)

        # Assert
        assert ungraded_response.is_correct is not None  # Now graded
        db_session.commit.assert_called()

    def test_submit_already_completed_assessment_raises_error(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given already submitted attempt
        When trying to submit again
        Then raise AssessmentAlreadySubmittedError
        """
        # Arrange
        sample_attempt.status = "completed"
        attempt_id = sample_attempt.id
        db_session.query().filter().first.return_value = sample_attempt

        # Act & Assert
        with pytest.raises(AssessmentAlreadySubmittedError):
            candidate_assessment_service.submit_assessment(attempt_id)

    def test_submit_assessment_determines_pass_fail_status(
        self, candidate_assessment_service, db_session, sample_attempt, sample_assessment
    ):
        """
        Given final score and passing threshold
        When submitting assessment
        Then determine if candidate passed or failed
        """
        # Arrange
        sample_attempt.points_earned = 75
        sample_attempt.total_points_possible = 100
        sample_assessment.passing_score_percentage = 70.0
        attempt_id = sample_attempt.id
        db_session.query().filter().first.side_effect = [sample_attempt, sample_assessment]
        db_session.query().filter().all.return_value = []

        # Act
        result = candidate_assessment_service.submit_assessment(attempt_id)

        # Assert
        assert result["passed"] == True
        assert result["score_percentage"] == 75.0
        assert sample_attempt.passed == True


# ============================================================================
# TEST SUITE 8: Results Retrieval (4 tests)
# ============================================================================

class TestResultsRetrieval:
    """Test retrieving assessment results"""

    def test_get_results_returns_complete_details(
        self, candidate_assessment_service, db_session, sample_attempt, sample_assessment
    ):
        """
        Given completed assessment
        When retrieving results
        Then return complete results with score, questions, feedback
        """
        # Arrange
        sample_attempt.status = "completed"
        sample_attempt.points_earned = 80
        sample_attempt.total_points_possible = 100
        sample_attempt.score_percentage = 80.0
        sample_attempt.passed = True
        attempt_id = sample_attempt.id

        responses = [
            Mock(question_id=uuid4(), is_correct=True, points_earned=10),
            Mock(question_id=uuid4(), is_correct=False, points_earned=0),
        ]

        db_session.query().filter().first.side_effect = [sample_attempt, sample_assessment]
        db_session.query().filter().all.return_value = responses

        # Act
        result = candidate_assessment_service.get_results(attempt_id)

        # Assert
        assert result["score_percentage"] == 80.0
        assert result["passed"] == True
        assert result["total_questions"] == 2
        assert len(result["responses"]) == 2

    def test_get_results_on_incomplete_attempt_raises_error(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given in-progress attempt
        When retrieving results
        Then raise AssessmentNotCompletedError
        """
        # Arrange
        sample_attempt.status = "in_progress"
        attempt_id = sample_attempt.id
        db_session.query().filter().first.return_value = sample_attempt

        # Act & Assert
        with pytest.raises(AssessmentNotCompletedError):
            candidate_assessment_service.get_results(attempt_id)

    def test_get_results_shows_correct_answers_when_enabled(
        self, candidate_assessment_service, db_session, sample_attempt, sample_assessment, sample_mcq_question
    ):
        """
        Given show_correct_answers is True
        When retrieving results
        Then include correct answers in response
        """
        # Arrange
        sample_attempt.status = "completed"
        sample_assessment.show_correct_answers = True
        attempt_id = sample_attempt.id

        response = Mock()
        response.question_id = sample_mcq_question.id
        response.is_correct = False
        response.selected_options = {"selected": [1]}

        db_session.query().filter().first.side_effect = [sample_attempt, sample_assessment]
        db_session.query().filter().all.return_value = [response]
        db_session.query().filter().filter().first.return_value = sample_mcq_question

        # Act
        result = candidate_assessment_service.get_results(attempt_id)

        # Assert
        assert result["responses"][0]["correct_answer"] is not None
        assert result["responses"][0]["correct_answer"] == 2

    def test_get_results_hides_correct_answers_when_disabled(
        self, candidate_assessment_service, db_session, sample_attempt, sample_assessment
    ):
        """
        Given show_correct_answers is False
        When retrieving results
        Then hide correct answers
        """
        # Arrange
        sample_attempt.status = "completed"
        sample_assessment.show_correct_answers = False
        attempt_id = sample_attempt.id

        response = Mock()
        response.question_id = uuid4()
        response.is_correct = False

        db_session.query().filter().first.side_effect = [sample_attempt, sample_assessment]
        db_session.query().filter().all.return_value = [response]

        # Act
        result = candidate_assessment_service.get_results(attempt_id)

        # Assert
        assert "correct_answer" not in result["responses"][0]


# ============================================================================
# TEST SUITE 9: Edge Cases & Error Handling (8 tests)
# ============================================================================

class TestEdgeCasesErrorHandling:
    """Test edge cases and error handling"""

    def test_access_nonexistent_attempt_raises_error(
        self, candidate_assessment_service, db_session
    ):
        """
        Given invalid attempt ID
        When accessing attempt
        Then raise AttemptNotFoundError
        """
        # Arrange
        attempt_id = uuid4()
        db_session.query().filter().first.return_value = None

        # Act & Assert
        with pytest.raises(AttemptNotFoundError):
            candidate_assessment_service.get_attempt_progress(attempt_id)

    def test_submit_answer_to_nonexistent_attempt_raises_error(
        self, candidate_assessment_service, db_session
    ):
        """
        Given invalid attempt ID
        When submitting answer
        Then raise AttemptNotFoundError
        """
        # Arrange
        attempt_id = uuid4()
        question_id = uuid4()
        answer_data = {"selected_option": 1}
        db_session.query().filter().first.return_value = None

        # Act & Assert
        with pytest.raises(AttemptNotFoundError):
            candidate_assessment_service.submit_answer(attempt_id, question_id, answer_data)

    def test_unauthorized_candidate_access_raises_error(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given candidate tries to access another candidate's attempt
        When checking authorization
        Then raise ForbiddenError
        """
        # Arrange
        sample_attempt.candidate_id = uuid4()
        different_candidate_id = uuid4()
        attempt_id = sample_attempt.id
        db_session.query().filter().first.return_value = sample_attempt

        # Act & Assert
        with pytest.raises(ForbiddenError):
            candidate_assessment_service.verify_attempt_ownership(
                attempt_id, different_candidate_id
            )

    def test_handle_database_error_gracefully(
        self, candidate_assessment_service, db_session, sample_attempt, sample_mcq_question
    ):
        """
        Given database error during save
        When submitting answer
        Then rollback and raise ServiceError
        """
        # Arrange
        db_session.commit.side_effect = Exception("Database connection lost")
        attempt_id = sample_attempt.id
        question_id = sample_mcq_question.id
        answer_data = {"selected_option": 2}
        db_session.query().filter().first.side_effect = [sample_attempt, sample_mcq_question]

        # Act & Assert
        with pytest.raises(ServiceError):
            candidate_assessment_service.submit_answer(attempt_id, question_id, answer_data)
        db_session.rollback.assert_called()

    def test_auto_submit_on_time_expiration(
        self, candidate_assessment_service, db_session, sample_attempt, sample_assessment
    ):
        """
        Given time limit expired
        When checking attempt status
        Then auto-submit the assessment
        """
        # Arrange
        sample_assessment.time_limit_minutes = 60
        sample_attempt.started_at = datetime.utcnow() - timedelta(minutes=65)
        sample_attempt.status = "in_progress"
        attempt_id = sample_attempt.id
        db_session.query().filter().first.side_effect = [sample_attempt, sample_assessment]
        db_session.query().filter().all.return_value = []

        # Act
        candidate_assessment_service.check_and_auto_submit(attempt_id)

        # Assert
        assert sample_attempt.status == "completed"
        assert sample_attempt.auto_submitted == True
        db_session.commit.assert_called()

    def test_handle_malformed_answer_data(
        self, candidate_assessment_service, db_session, sample_attempt, sample_mcq_question
    ):
        """
        Given malformed answer data
        When submitting answer
        Then raise ValidationError with clear message
        """
        # Arrange
        attempt_id = sample_attempt.id
        question_id = sample_mcq_question.id
        answer_data = {"invalid_field": "invalid_value"}  # Missing selected_option
        db_session.query().filter().first.side_effect = [sample_attempt, sample_mcq_question]

        # Act & Assert
        with pytest.raises(ValidationError):
            candidate_assessment_service.submit_answer(attempt_id, question_id, answer_data)

    def test_handle_concurrent_submission_attempts(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given concurrent submission attempts
        When both try to submit
        Then only first succeeds, second raises AlreadySubmittedError
        """
        # Arrange
        sample_attempt.status = "in_progress"
        attempt_id = sample_attempt.id

        # First call succeeds
        db_session.query().filter().first.return_value = sample_attempt
        db_session.query().filter().all.return_value = []

        # Act - First submission
        result1 = candidate_assessment_service.submit_assessment(attempt_id)

        # Arrange - Second attempt sees status as completed
        sample_attempt.status = "completed"

        # Act & Assert - Second submission fails
        with pytest.raises(AssessmentAlreadySubmittedError):
            candidate_assessment_service.submit_assessment(attempt_id)

    def test_empty_assessment_submission_is_allowed(
        self, candidate_assessment_service, db_session, sample_attempt
    ):
        """
        Given candidate submits without answering any questions
        When submitting assessment
        Then allow submission with zero score
        """
        # Arrange
        sample_attempt.status = "in_progress"
        sample_attempt.total_points_possible = 100
        attempt_id = sample_attempt.id
        db_session.query().filter().first.return_value = sample_attempt
        db_session.query().filter().all.return_value = []  # No responses

        # Act
        result = candidate_assessment_service.submit_assessment(attempt_id)

        # Assert
        assert sample_attempt.status == "completed"
        assert sample_attempt.points_earned == 0
        assert sample_attempt.score_percentage == 0.0
        assert result["passed"] == False


# ============================================================================
# ADDITIONAL EXCEPTION CLASSES NEEDED
# ============================================================================

# These should be added to app/core/exceptions.py:
# - QuestionNotFoundError
# - InvalidLanguageError
# - InvalidQuestionTypeError
# - AssessmentNotCompletedError
# - ServiceError
# - ValidationError

"""
TDD TEST SUITE COMPLETE: 60+ Unit Tests
========================================

Test Suites:
1. ✅ Assessment Access via Token (5 tests)
2. ✅ Assessment Start Workflow (6 tests)
3. ✅ Answer Submission (12 tests)
4. ✅ Code Execution (6 tests)
5. ✅ Auto-Grading (8 tests)
6. ✅ Anti-Cheating Tracking (6 tests)
7. ✅ Assessment Submission (5 tests)
8. ✅ Results Retrieval (4 tests)
9. ✅ Edge Cases & Error Handling (8 tests)

Total: 60 comprehensive unit tests following TDD principles

Next Steps:
1. Add missing exception classes to app/core/exceptions.py
2. Implement CandidateAssessmentService to make tests pass
3. Run pytest and fix failures one by one
4. Commit to GitHub when all tests pass
"""
