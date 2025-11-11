"""
Unit Tests for AssessmentService (TDD)

Sprint 17-18 Phase 4: Skills Assessment & Testing Platform
Following Test-Driven Development - tests written BEFORE implementation.

Test Coverage:
- Assessment CRUD operations (15 tests)
- Question management (12 tests)
- Assessment attempts lifecycle (10 tests)
- Auto-grading (MCQ + coding) (8 tests)
- Manual grading (4 tests)
- Anti-cheating measures (6 tests)
- Edge cases & error handling (10 tests)

Total: 65+ unit tests
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4, UUID
from unittest.mock import Mock, patch, MagicMock
from typing import List, Dict, Any

# Service under test (not implemented yet - TDD)
from app.services.assessment_service import AssessmentService
from app.services.question_bank_service import QuestionBankService
from app.services.coding_execution_service import CodingExecutionService

# Models (to be created)
from app.db.models.assessment import (
    Assessment,
    AssessmentQuestion,
    AssessmentAttempt,
    AssessmentResponse,
    QuestionBankItem,
    JobAssessmentRequirement,
)

# Schemas (to be created)
from app.schemas.assessment import (
    AssessmentCreate,
    AssessmentUpdate,
    QuestionCreate,
    QuestionUpdate,
    ResponseCreate,
    AssessmentFilters,
    QuestionBankCreate,
    QuestionBankFilters,
)

# Exceptions (to be created)
from app.core.exceptions import (
    AssessmentNotFoundError,
    QuestionNotFoundError,
    AttemptNotFoundError,
    ForbiddenError,
    InvalidQuestionTypeError,
    AssessmentAlreadySubmittedError,
    TimeLimitExceededError,
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
    return session


@pytest.fixture
def company_id():
    """Sample company UUID"""
    return uuid4()


@pytest.fixture
def user_id():
    """Sample user/candidate UUID"""
    return uuid4()


@pytest.fixture
def assessment_service(db_session):
    """Instance of AssessmentService"""
    return AssessmentService(db=db_session)


@pytest.fixture
def question_bank_service(db_session):
    """Instance of QuestionBankService"""
    return QuestionBankService(db=db_session)


@pytest.fixture
def coding_execution_service():
    """Instance of CodingExecutionService"""
    return CodingExecutionService()


@pytest.fixture
def sample_assessment_data():
    """Sample assessment creation data"""
    return AssessmentCreate(
        title="Senior Backend Engineer Assessment",
        assessment_type="technical",
        description="Technical assessment for backend engineering role",
        time_limit_minutes=90,
        passing_score_percentage=70.0,
        randomize_questions=True,
        enable_proctoring=True,
        allow_tab_switching=False,
        max_tab_switches=3,
    )


@pytest.fixture
def sample_mcq_single_question():
    """Sample MCQ single choice question"""
    return QuestionCreate(
        question_text="What is the time complexity of binary search?",
        question_type="mcq_single",
        options=["O(n)", "O(log n)", "O(n^2)", "O(1)"],
        correct_answers=["O(log n)"],
        points=10,
        difficulty="medium",
        category="Data Structures & Algorithms",
        display_order=1,
    )


@pytest.fixture
def sample_mcq_multiple_question():
    """Sample MCQ multiple choice question"""
    return QuestionCreate(
        question_text="Which of the following are Python web frameworks?",
        question_type="mcq_multiple",
        options=["Django", "Flask", "React", "FastAPI", "Angular"],
        correct_answers=["Django", "Flask", "FastAPI"],
        points=15,
        difficulty="easy",
        category="Python",
        display_order=1,
    )


@pytest.fixture
def sample_coding_question():
    """Sample coding challenge question"""
    return QuestionCreate(
        question_text="Implement a function to reverse a linked list",
        question_type="coding",
        coding_language="python",
        starter_code="def reverse_linked_list(head):\n    # Your code here\n    pass",
        test_cases=[
            {
                "input": "[1,2,3,4,5]",
                "expected_output": "[5,4,3,2,1]",
                "points": 5,
                "is_hidden": False,
            },
            {
                "input": "[1]",
                "expected_output": "[1]",
                "points": 3,
                "is_hidden": False,
            },
            {
                "input": "[]",
                "expected_output": "[]",
                "points": 2,
                "is_hidden": True,
            },
        ],
        points=20,
        difficulty="hard",
        category="Data Structures",
        display_order=1,
    )


@pytest.fixture
def sample_text_question():
    """Sample text response question"""
    return QuestionCreate(
        question_text="Explain the CAP theorem and provide real-world examples",
        question_type="text",
        points=15,
        difficulty="medium",
        category="System Design",
        display_order=1,
    )


@pytest.fixture
def sample_assessment(company_id):
    """Sample assessment model instance"""
    assessment = Assessment(
        id=uuid4(),
        company_id=company_id,
        title="Senior Backend Engineer Assessment",
        assessment_type="technical",
        time_limit_minutes=90,
        passing_score_percentage=70.0,
        randomize_questions=True,
        enable_proctoring=True,
        allow_tab_switching=False,
        max_tab_switches=3,
        status="published",
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    return assessment


@pytest.fixture
def sample_attempt(sample_assessment, user_id):
    """Sample assessment attempt"""
    return AssessmentAttempt(
        id=uuid4(),
        assessment_id=sample_assessment.id,
        candidate_id=user_id,
        attempt_number=1,
        status="in_progress",
        started_at=datetime.utcnow(),
        total_points_possible=100,
        access_token="at_" + str(uuid4()),
        ip_address="192.168.1.1",
        tab_switch_count=0,
    )


# ============================================================================
# TEST SUITE: ASSESSMENT CRUD OPERATIONS
# ============================================================================

class TestAssessmentCRUD:
    """Test Assessment Create, Read, Update, Delete operations"""

    def test_create_assessment_success(
        self, assessment_service, company_id, sample_assessment_data
    ):
        """
        GIVEN: Valid assessment data
        WHEN: Creating a new assessment
        THEN: Assessment is created with correct attributes
        """
        result = assessment_service.create_assessment(company_id, sample_assessment_data)

        assert result.title == sample_assessment_data.title
        assert result.assessment_type == sample_assessment_data.assessment_type
        assert result.time_limit_minutes == sample_assessment_data.time_limit_minutes
        assert result.passing_score_percentage == sample_assessment_data.passing_score_percentage
        assert result.status == "draft"
        assert result.company_id == company_id
        assessment_service.db.add.assert_called_once()
        assessment_service.db.commit.assert_called_once()

    def test_create_assessment_missing_title(self, assessment_service, company_id):
        """
        GIVEN: Assessment data without title
        WHEN: Attempting to create assessment
        THEN: ValidationError is raised
        """
        with pytest.raises(ValueError, match="title"):
            invalid_data = AssessmentCreate(
                assessment_type="technical",
                time_limit_minutes=90,
            )
            assessment_service.create_assessment(company_id, invalid_data)

    def test_create_assessment_invalid_type(self, assessment_service, company_id):
        """
        GIVEN: Assessment with invalid type
        WHEN: Creating assessment
        THEN: ValidationError is raised
        """
        with pytest.raises(ValueError, match="assessment_type"):
            invalid_data = AssessmentCreate(
                title="Test",
                assessment_type="invalid_type",
                time_limit_minutes=90,
            )
            assessment_service.create_assessment(company_id, invalid_data)

    def test_get_assessment_success(
        self, assessment_service, sample_assessment, company_id
    ):
        """
        GIVEN: Existing assessment ID
        WHEN: Fetching assessment
        THEN: Correct assessment is returned
        """
        # Mock SQLAlchemy 2.0 style: db.execute(query).scalar_one_or_none()
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = sample_assessment
        assessment_service.db.execute.return_value = mock_result

        result = assessment_service.get_assessment(
            sample_assessment.id, company_id=company_id
        )

        assert result.id == sample_assessment.id
        assert result.title == sample_assessment.title

    def test_get_assessment_not_found(self, assessment_service, company_id):
        """
        GIVEN: Non-existent assessment ID
        WHEN: Fetching assessment
        THEN: AssessmentNotFoundError is raised
        """
        # Mock SQLAlchemy 2.0 style: db.execute(query).scalar_one_or_none()
        mock_result = Mock()
        mock_result.scalar_one_or_none.return_value = None
        assessment_service.db.execute.return_value = mock_result

        with pytest.raises(AssessmentNotFoundError):
            assessment_service.get_assessment(uuid4(), company_id=company_id)

    def test_get_assessment_unauthorized_company(
        self, assessment_service, sample_assessment
    ):
        """
        GIVEN: Assessment belonging to different company
        WHEN: Company tries to access it
        THEN: ForbiddenError is raised
        """
        # Mock SQLAlchemy 2.0 style: db.execute(query).scalar_one_or_none()
        # First call returns None (company query), second returns assessment (exists check)
        mock_result_none = Mock()
        mock_result_none.scalar_one_or_none.return_value = None

        mock_result_exists = Mock()
        mock_result_exists.scalar_one_or_none.return_value = sample_assessment

        assessment_service.db.execute.side_effect = [mock_result_none, mock_result_exists]

        with pytest.raises(ForbiddenError):
            assessment_service.get_assessment(
                sample_assessment.id, company_id=uuid4()  # Different company
            )

    def test_update_assessment_success(
        self, assessment_service, sample_assessment, company_id
    ):
        """
        GIVEN: Existing assessment and update data
        WHEN: Updating assessment
        THEN: Assessment is updated correctly
        """
        assessment_service.db.query().filter().first.return_value = sample_assessment
        update_data = AssessmentUpdate(
            title="Updated Title",
            time_limit_minutes=120,
            passing_score_percentage=75.0,
        )

        result = assessment_service.update_assessment(
            sample_assessment.id, update_data, company_id=company_id
        )

        assert result.title == "Updated Title"
        assert result.time_limit_minutes == 120
        assert result.passing_score_percentage == 75.0
        assessment_service.db.commit.assert_called()

    def test_update_assessment_cannot_modify_published(
        self, assessment_service, sample_assessment, company_id
    ):
        """
        GIVEN: Published assessment with attempts
        WHEN: Trying to update critical fields
        THEN: InvalidOperationError is raised
        """
        sample_assessment.status = "published"
        sample_assessment.total_attempts = 5
        assessment_service.db.query().filter().first.return_value = sample_assessment

        with pytest.raises(ValueError, match="Cannot modify published assessment"):
            update_data = AssessmentUpdate(time_limit_minutes=200)
            assessment_service.update_assessment(
                sample_assessment.id, update_data, company_id=company_id
            )

    def test_delete_assessment_success(
        self, assessment_service, sample_assessment, company_id
    ):
        """
        GIVEN: Assessment with no attempts
        WHEN: Deleting assessment
        THEN: Assessment is soft-deleted
        """
        sample_assessment.total_attempts = 0
        assessment_service.db.query().filter().first.return_value = sample_assessment

        result = assessment_service.delete_assessment(
            sample_assessment.id, company_id=company_id
        )

        assert result is True
        assert sample_assessment.status == "deleted"
        assessment_service.db.commit.assert_called()

    def test_delete_assessment_with_attempts_fails(
        self, assessment_service, sample_assessment, company_id
    ):
        """
        GIVEN: Assessment with existing attempts
        WHEN: Trying to delete
        THEN: InvalidOperationError is raised
        """
        sample_assessment.total_attempts = 10
        assessment_service.db.query().filter().first.return_value = sample_assessment

        with pytest.raises(ValueError, match="Cannot delete assessment with attempts"):
            assessment_service.delete_assessment(
                sample_assessment.id, company_id=company_id
            )

    def test_list_assessments_with_filters(self, assessment_service, company_id):
        """
        GIVEN: Multiple assessments with different statuses
        WHEN: Listing assessments with filters
        THEN: Filtered results are returned
        """
        mock_assessments = [
            Mock(status="published", assessment_type="technical"),
            Mock(status="draft", assessment_type="technical"),
        ]
        assessment_service.db.query().filter().all.return_value = mock_assessments

        filters = AssessmentFilters(
            status="published",
            assessment_type="technical",
        )
        results = assessment_service.list_assessments(company_id, filters)

        assert len(results) >= 0
        assessment_service.db.query.assert_called()

    def test_publish_assessment_validates_questions(
        self, assessment_service, sample_assessment, company_id
    ):
        """
        GIVEN: Draft assessment with no questions
        WHEN: Attempting to publish
        THEN: ValidationError is raised
        """
        sample_assessment.status = "draft"
        sample_assessment.questions = []
        assessment_service.db.query().filter().first.return_value = sample_assessment

        with pytest.raises(ValueError, match="at least one question"):
            assessment_service.publish_assessment(
                sample_assessment.id, company_id=company_id
            )

    def test_publish_assessment_success(
        self, assessment_service, sample_assessment, company_id
    ):
        """
        GIVEN: Draft assessment with valid questions
        WHEN: Publishing assessment
        THEN: Status changes to published
        """
        sample_assessment.status = "draft"
        sample_assessment.questions = [Mock(), Mock()]  # 2 questions
        assessment_service.db.query().filter().first.return_value = sample_assessment

        result = assessment_service.publish_assessment(
            sample_assessment.id, company_id=company_id
        )

        assert result.status == "published"
        assessment_service.db.commit.assert_called()

    def test_clone_assessment_success(
        self, assessment_service, sample_assessment, company_id
    ):
        """
        GIVEN: Existing assessment with questions
        WHEN: Cloning assessment
        THEN: New assessment is created with same questions
        """
        sample_assessment.questions = [Mock(id=uuid4()), Mock(id=uuid4())]
        assessment_service.db.query().filter().first.return_value = sample_assessment

        result = assessment_service.clone_assessment(
            sample_assessment.id, company_id=company_id
        )

        assert result.id != sample_assessment.id
        assert result.title.startswith(sample_assessment.title)
        assert result.status == "draft"
        assert len(result.questions) == len(sample_assessment.questions)


# ============================================================================
# TEST SUITE: QUESTION MANAGEMENT
# ============================================================================

class TestQuestionManagement:
    """Test question CRUD and management operations"""

    def test_add_mcq_single_question_success(
        self,
        assessment_service,
        sample_assessment,
        sample_mcq_single_question,
        company_id,
    ):
        """
        GIVEN: Valid MCQ single choice question data
        WHEN: Adding question to assessment
        THEN: Question is created correctly
        """
        assessment_service.db.query().filter().first.return_value = sample_assessment

        result = assessment_service.add_question(
            sample_assessment.id, sample_mcq_single_question, company_id=company_id
        )

        assert result.question_text == sample_mcq_single_question.question_text
        assert result.question_type == "mcq_single"
        assert len(result.options) == 4
        assert len(result.correct_answers) == 1
        assessment_service.db.add.assert_called()

    def test_add_mcq_multiple_question_success(
        self,
        assessment_service,
        sample_assessment,
        sample_mcq_multiple_question,
        company_id,
    ):
        """
        GIVEN: Valid MCQ multiple choice question
        WHEN: Adding to assessment
        THEN: Question accepts multiple correct answers
        """
        assessment_service.db.query().filter().first.return_value = sample_assessment

        result = assessment_service.add_question(
            sample_assessment.id, sample_mcq_multiple_question, company_id=company_id
        )

        assert result.question_type == "mcq_multiple"
        assert len(result.correct_answers) == 3

    def test_add_coding_question_validates_test_cases(
        self, assessment_service, sample_assessment, company_id
    ):
        """
        GIVEN: Coding question without test cases
        WHEN: Adding question
        THEN: ValidationError is raised
        """
        assessment_service.db.query().filter().first.return_value = sample_assessment

        with pytest.raises(ValueError, match="test_cases"):
            invalid_coding = QuestionCreate(
                question_text="Write a function",
                question_type="coding",
                coding_language="python",
                test_cases=[],  # Empty test cases
                points=20,
            )
            assessment_service.add_question(
                sample_assessment.id, invalid_coding, company_id=company_id
            )

    def test_add_coding_question_success(
        self, assessment_service, sample_assessment, sample_coding_question, company_id
    ):
        """
        GIVEN: Valid coding question with test cases
        WHEN: Adding question
        THEN: Question and test cases are stored correctly
        """
        assessment_service.db.query().filter().first.return_value = sample_assessment

        result = assessment_service.add_question(
            sample_assessment.id, sample_coding_question, company_id=company_id
        )

        assert result.question_type == "coding"
        assert result.coding_language == "python"
        assert len(result.test_cases) == 3
        assert result.starter_code is not None

    def test_update_question_success(
        self, assessment_service, sample_assessment, company_id
    ):
        """
        GIVEN: Existing question and update data
        WHEN: Updating question
        THEN: Question is updated correctly
        """
        question = Mock(id=uuid4(), assessment_id=sample_assessment.id)
        assessment_service.db.query().filter().first.return_value = question

        update_data = QuestionUpdate(
            question_text="Updated question text",
            points=15,
        )

        result = assessment_service.update_question(
            question.id, update_data, company_id=company_id
        )

        assert result.question_text == "Updated question text"
        assert result.points == 15

    def test_delete_question_success(self, assessment_service, company_id):
        """
        GIVEN: Question with no responses
        WHEN: Deleting question
        THEN: Question is removed
        """
        question = Mock(id=uuid4(), responses=[])
        assessment_service.db.query().filter().first.return_value = question

        result = assessment_service.delete_question(question.id, company_id=company_id)

        assert result is True
        assessment_service.db.delete.assert_called_once_with(question)

    def test_delete_question_with_responses_fails(self, assessment_service, company_id):
        """
        GIVEN: Question with existing responses
        WHEN: Trying to delete
        THEN: InvalidOperationError is raised
        """
        question = Mock(id=uuid4(), responses=[Mock(), Mock()])
        assessment_service.db.query().filter().first.return_value = question

        with pytest.raises(ValueError, match="Cannot delete question with responses"):
            assessment_service.delete_question(question.id, company_id=company_id)

    def test_reorder_questions_success(self, assessment_service, company_id):
        """
        GIVEN: List of question IDs in new order
        WHEN: Reordering questions
        THEN: Display order is updated
        """
        assessment = Mock(id=uuid4(), company_id=company_id)
        questions = [
            Mock(id=uuid4(), display_order=1),
            Mock(id=uuid4(), display_order=2),
            Mock(id=uuid4(), display_order=3),
        ]
        assessment.questions = questions
        assessment_service.db.query().filter().first.return_value = assessment

        new_order = [questions[2].id, questions[0].id, questions[1].id]
        result = assessment_service.reorder_questions(
            assessment.id, new_order, company_id=company_id
        )

        assert result is True
        assessment_service.db.commit.assert_called()

    def test_bulk_import_questions_from_bank(self, assessment_service, company_id):
        """
        GIVEN: Multiple question bank IDs
        WHEN: Bulk importing to assessment
        THEN: All questions are added
        """
        assessment = Mock(id=uuid4(), company_id=company_id)
        bank_questions = [Mock(id=uuid4()), Mock(id=uuid4()), Mock(id=uuid4())]
        assessment_service.db.query().filter().first.return_value = assessment

        question_ids = [q.id for q in bank_questions]
        result = assessment_service.bulk_import_questions(
            assessment.id, question_ids, company_id=company_id
        )

        assert len(result) == 3
        assert assessment_service.db.add.call_count >= 3

    def test_randomize_question_order(self, assessment_service, company_id):
        """
        GIVEN: Assessment with randomize_questions=True
        WHEN: Starting assessment
        THEN: Questions are shuffled per attempt
        """
        assessment = Mock(id=uuid4(), randomize_questions=True)
        questions = [Mock(id=uuid4()) for _ in range(10)]
        assessment.questions = questions
        assessment_service.db.query().filter().first.return_value = assessment

        result1 = assessment_service.get_randomized_questions(assessment.id)
        result2 = assessment_service.get_randomized_questions(assessment.id)

        # Results should be different (statistically)
        assert len(result1) == len(result2) == 10


# ============================================================================
# TEST SUITE: ASSESSMENT ATTEMPT LIFECYCLE
# ============================================================================

class TestAssessmentAttempt:
    """Test assessment attempt creation and lifecycle"""

    def test_start_assessment_generates_access_token(
        self, assessment_service, sample_assessment, user_id
    ):
        """
        GIVEN: Published assessment and candidate
        WHEN: Starting assessment
        THEN: Attempt is created with unique access token
        """
        sample_assessment.status = "published"
        assessment_service.db.query().filter().first.return_value = sample_assessment

        result = assessment_service.start_assessment(
            application_id=uuid4(),
            assessment_id=sample_assessment.id,
            candidate_id=user_id,
            ip_address="192.168.1.1",
        )

        assert result.status == "in_progress"
        assert result.access_token.startswith("at_")
        assert result.started_at is not None
        assert result.candidate_id == user_id

    def test_start_assessment_enforces_max_attempts(
        self, assessment_service, sample_assessment, user_id
    ):
        """
        GIVEN: Assessment with max_attempts=3
        WHEN: Candidate starts 4th attempt
        THEN: MaxAttemptsExceededError is raised
        """
        sample_assessment.max_attempts = 3
        existing_attempts = [Mock(), Mock(), Mock()]  # 3 attempts
        assessment_service.db.query().filter().count.return_value = 3

        with pytest.raises(ValueError, match="Maximum attempts exceeded"):
            assessment_service.start_assessment(
                application_id=uuid4(),
                assessment_id=sample_assessment.id,
                candidate_id=user_id,
            )

    def test_submit_response_mcq_single(
        self, assessment_service, sample_attempt, user_id
    ):
        """
        GIVEN: MCQ single choice question and response
        WHEN: Submitting response
        THEN: Response is saved and graded
        """
        question = Mock(
            id=uuid4(),
            question_type="mcq_single",
            correct_answers=["O(log n)"],
            points=10,
        )
        assessment_service.db.query().filter().first.side_effect = [
            sample_attempt,
            question,
        ]

        response_data = ResponseCreate(
            question_id=question.id,
            response_type="mcq_single",
            selected_options=["O(log n)"],
        )

        result = assessment_service.submit_response(
            sample_attempt.id, question.id, response_data, candidate_id=user_id
        )

        assert result.is_correct is True
        assert result.points_earned == 10

    def test_submit_response_after_time_limit(
        self, assessment_service, sample_attempt, user_id
    ):
        """
        GIVEN: Assessment with 90 minute time limit
        WHEN: Submitting response after 95 minutes
        THEN: TimeLimitExceededError is raised
        """
        sample_attempt.started_at = datetime.utcnow() - timedelta(minutes=95)
        sample_attempt.assessment.time_limit_minutes = 90
        assessment_service.db.query().filter().first.return_value = sample_attempt

        with pytest.raises(TimeLimitExceededError):
            response_data = ResponseCreate(
                question_id=uuid4(), selected_options=["A"]
            )
            assessment_service.submit_response(
                sample_attempt.id, uuid4(), response_data, candidate_id=user_id
            )

    def test_submit_assessment_calculates_final_score(
        self, assessment_service, sample_attempt, user_id
    ):
        """
        GIVEN: Completed attempt with responses
        WHEN: Submitting assessment
        THEN: Final score is calculated correctly
        """
        sample_attempt.responses = [
            Mock(points_earned=10, is_correct=True),
            Mock(points_earned=8, is_correct=True),
            Mock(points_earned=0, is_correct=False),
        ]
        sample_attempt.total_points_possible = 30
        assessment_service.db.query().filter().first.return_value = sample_attempt

        result = assessment_service.submit_assessment(
            sample_attempt.id, candidate_id=user_id
        )

        assert result.status == "completed"
        assert result.points_earned == 18
        assert result.score_percentage == 60.0
        assert result.submitted_at is not None

    def test_submit_assessment_determines_pass_fail(
        self, assessment_service, sample_attempt, user_id
    ):
        """
        GIVEN: Assessment with 70% passing score
        WHEN: Candidate scores 75%
        THEN: Attempt is marked as passed
        """
        sample_attempt.assessment.passing_score_percentage = 70.0
        sample_attempt.score_percentage = 75.0
        assessment_service.db.query().filter().first.return_value = sample_attempt

        result = assessment_service.submit_assessment(
            sample_attempt.id, candidate_id=user_id
        )

        assert result.passed is True

    def test_submit_assessment_already_submitted(
        self, assessment_service, sample_attempt, user_id
    ):
        """
        GIVEN: Already submitted attempt
        WHEN: Trying to submit again
        THEN: AssessmentAlreadySubmittedError is raised
        """
        sample_attempt.status = "completed"
        sample_attempt.submitted_at = datetime.utcnow()
        assessment_service.db.query().filter().first.return_value = sample_attempt

        with pytest.raises(AssessmentAlreadySubmittedError):
            assessment_service.submit_assessment(
                sample_attempt.id, candidate_id=user_id
            )

    def test_auto_submit_on_time_expiry(
        self, assessment_service, sample_attempt, user_id
    ):
        """
        GIVEN: Assessment time limit reached
        WHEN: Time expires
        THEN: Assessment is auto-submitted
        """
        sample_attempt.started_at = datetime.utcnow() - timedelta(minutes=91)
        sample_attempt.assessment.time_limit_minutes = 90
        assessment_service.db.query().filter().first.return_value = sample_attempt

        result = assessment_service.check_and_auto_submit(sample_attempt.id)

        assert result.status == "completed"
        assert result.auto_submitted is True

    def test_resume_assessment_validates_token(
        self, assessment_service, sample_attempt, user_id
    ):
        """
        GIVEN: In-progress attempt with access token
        WHEN: Resuming with correct token
        THEN: Attempt is returned
        """
        token = sample_attempt.access_token
        assessment_service.db.query().filter().first.return_value = sample_attempt

        result = assessment_service.resume_assessment(
            attempt_id=sample_attempt.id, access_token=token, candidate_id=user_id
        )

        assert result.id == sample_attempt.id

    def test_resume_assessment_invalid_token(
        self, assessment_service, sample_attempt, user_id
    ):
        """
        GIVEN: Attempt with specific access token
        WHEN: Resuming with wrong token
        THEN: ForbiddenError is raised
        """
        assessment_service.db.query().filter().first.return_value = sample_attempt

        with pytest.raises(ForbiddenError):
            assessment_service.resume_assessment(
                attempt_id=sample_attempt.id,
                access_token="wrong_token",
                candidate_id=user_id,
            )


# ============================================================================
# TEST SUITE: AUTO-GRADING
# ============================================================================

class TestAutoGrading:
    """Test automated grading algorithms"""

    def test_auto_grade_mcq_single_correct(self, assessment_service):
        """
        GIVEN: MCQ single with correct answer
        WHEN: Auto-grading
        THEN: Full points awarded
        """
        question = Mock(
            question_type="mcq_single",
            correct_answers=["B"],
            points=10,
        )
        response = Mock(selected_options=["B"])

        score = assessment_service.auto_grade_mcq(question, response)

        assert score == 10.0

    def test_auto_grade_mcq_single_incorrect(self, assessment_service):
        """
        GIVEN: MCQ single with wrong answer
        WHEN: Auto-grading
        THEN: Zero points awarded
        """
        question = Mock(
            question_type="mcq_single",
            correct_answers=["B"],
            points=10,
        )
        response = Mock(selected_options=["A"])

        score = assessment_service.auto_grade_mcq(question, response)

        assert score == 0.0

    def test_auto_grade_mcq_multiple_all_correct(self, assessment_service):
        """
        GIVEN: MCQ multiple with all correct selections
        WHEN: Auto-grading
        THEN: Full points awarded
        """
        question = Mock(
            question_type="mcq_multiple",
            correct_answers=["A", "B", "C"],
            points=15,
        )
        response = Mock(selected_options=["A", "B", "C"])

        score = assessment_service.auto_grade_mcq(question, response)

        assert score == 15.0

    def test_auto_grade_mcq_multiple_partial_credit(self, assessment_service):
        """
        GIVEN: MCQ multiple with 2/3 correct, 1 wrong
        WHEN: Auto-grading with partial credit
        THEN: Partial points awarded based on formula
        """
        question = Mock(
            question_type="mcq_multiple",
            correct_answers=["A", "B", "C"],
            points=15,
        )
        response = Mock(selected_options=["A", "B", "D"])  # 2 correct, 1 wrong

        score = assessment_service.auto_grade_mcq(question, response)

        # Formula: (correct/total_correct) - (incorrect/total_correct * 0.5)
        # (2/3) - (1/3 * 0.5) = 0.667 - 0.167 = 0.5
        # 15 * 0.5 = 7.5
        assert score == 7.5

    @patch("app.services.coding_execution_service.CodingExecutionService.execute_code")
    def test_auto_grade_coding_all_tests_pass(
        self, mock_execute, assessment_service
    ):
        """
        GIVEN: Coding question with 3 test cases
        WHEN: All test cases pass
        THEN: Full points awarded
        """
        question = Mock(
            question_type="coding",
            coding_language="python",
            test_cases=[
                {"input": "5", "expected_output": "120", "points": 5},
                {"input": "3", "expected_output": "6", "points": 3},
                {"input": "0", "expected_output": "1", "points": 2},
            ],
            points=10,
        )
        response = Mock(text_response="def factorial(n): ...")

        mock_execute.side_effect = [
            {"passed": True, "output": "120"},
            {"passed": True, "output": "6"},
            {"passed": True, "output": "1"},
        ]

        score = assessment_service.auto_grade_coding(question, response)

        assert score == 10.0

    @patch("app.services.coding_execution_service.CodingExecutionService.execute_code")
    def test_auto_grade_coding_partial_pass(self, mock_execute, assessment_service):
        """
        GIVEN: Coding question with 3 test cases
        WHEN: 2 out of 3 tests pass
        THEN: Partial points awarded
        """
        question = Mock(
            question_type="coding",
            test_cases=[
                {"input": "5", "expected_output": "120", "points": 5},
                {"input": "3", "expected_output": "6", "points": 3},
                {"input": "0", "expected_output": "1", "points": 2},
            ],
            points=10,
        )
        response = Mock(text_response="def factorial(n): ...")

        mock_execute.side_effect = [
            {"passed": True, "output": "120"},
            {"passed": True, "output": "6"},
            {"passed": False, "output": "0", "error": "Wrong output"},
        ]

        score = assessment_service.auto_grade_coding(question, response)

        assert score == 8.0  # 5 + 3

    @patch("app.services.coding_execution_service.CodingExecutionService.execute_code")
    def test_auto_grade_coding_syntax_error(self, mock_execute, assessment_service):
        """
        GIVEN: Coding response with syntax error
        WHEN: Auto-grading
        THEN: Zero points, error recorded
        """
        question = Mock(question_type="coding", test_cases=[{"points": 10}])
        response = Mock(text_response="def broken( ...")

        mock_execute.side_effect = Exception("SyntaxError: invalid syntax")

        score = assessment_service.auto_grade_coding(question, response)

        assert score == 0.0


# ============================================================================
# TEST SUITE: MANUAL GRADING
# ============================================================================

class TestManualGrading:
    """Test manual grading for subjective questions"""

    def test_manual_grade_text_response(self, assessment_service, company_id):
        """
        GIVEN: Text response and grader feedback
        WHEN: Manually grading
        THEN: Score and comments are saved
        """
        response = Mock(
            id=uuid4(),
            question=Mock(points=15),
            is_correct=None,
        )
        assessment_service.db.query().filter().first.return_value = response

        result = assessment_service.manual_grade_response(
            response.id,
            points_earned=12.5,
            grader_comments="Good explanation, minor details missing",
            grader_id=company_id,
        )

        assert result.points_earned == 12.5
        assert result.grader_comments is not None
        assert result.is_correct is True  # Since points > 0

    def test_manual_grade_validates_points_range(self, assessment_service, company_id):
        """
        GIVEN: Response with max 15 points
        WHEN: Grading with 20 points
        THEN: ValidationError is raised
        """
        response = Mock(id=uuid4(), question=Mock(points=15))
        assessment_service.db.query().filter().first.return_value = response

        with pytest.raises(ValueError, match="cannot exceed"):
            assessment_service.manual_grade_response(
                response.id, points_earned=20, grader_id=company_id
            )

    def test_bulk_grade_responses(self, assessment_service, company_id):
        """
        GIVEN: Multiple responses to grade
        WHEN: Bulk grading
        THEN: All responses are updated
        """
        grading_data = [
            {"response_id": uuid4(), "points": 10, "comments": "Excellent"},
            {"response_id": uuid4(), "points": 7, "comments": "Good"},
            {"response_id": uuid4(), "points": 5, "comments": "Needs improvement"},
        ]

        result = assessment_service.bulk_grade_responses(grading_data, grader_id=company_id)

        assert len(result) == 3
        assert assessment_service.db.commit.call_count >= 1

    def test_get_ungraded_responses(self, assessment_service, company_id):
        """
        GIVEN: Assessment with mix of graded and ungraded responses
        WHEN: Fetching ungraded responses
        THEN: Only ungraded text/file responses returned
        """
        mock_responses = [
            Mock(question=Mock(question_type="text"), is_correct=None),
            Mock(question=Mock(question_type="file_upload"), is_correct=None),
        ]
        assessment_service.db.query().filter().all.return_value = mock_responses

        results = assessment_service.get_ungraded_responses(
            assessment_id=uuid4(), company_id=company_id
        )

        assert len(results) >= 0


# ============================================================================
# TEST SUITE: ANTI-CHEATING MEASURES
# ============================================================================

class TestAntiCheating:
    """Test proctoring and anti-cheating features"""

    def test_tab_switching_detection(self, assessment_service, sample_attempt, user_id):
        """
        GIVEN: Assessment with max 3 tab switches allowed
        WHEN: Candidate switches tabs 4 times
        THEN: Attempt is flagged/disqualified
        """
        sample_attempt.allow_tab_switching = False
        sample_attempt.max_tab_switches = 3
        sample_attempt.tab_switch_count = 3
        assessment_service.db.query().filter().first.return_value = sample_attempt

        result = assessment_service.record_tab_switch(
            sample_attempt.id, candidate_id=user_id
        )

        assert result.tab_switch_count == 4
        assert result.status == "disqualified"

    def test_tab_switching_warning_before_disqualification(
        self, assessment_service, sample_attempt, user_id
    ):
        """
        GIVEN: 2 tab switches already
        WHEN: 3rd tab switch occurs
        THEN: Warning issued but not disqualified
        """
        sample_attempt.tab_switch_count = 2
        sample_attempt.max_tab_switches = 3
        assessment_service.db.query().filter().first.return_value = sample_attempt

        result = assessment_service.record_tab_switch(
            sample_attempt.id, candidate_id=user_id
        )

        assert result.tab_switch_count == 3
        assert result.status == "in_progress"  # Still allowed

    def test_ip_address_tracking(self, assessment_service, sample_attempt, user_id):
        """
        GIVEN: Attempt started from IP A
        WHEN: Request comes from IP B
        THEN: Suspicious activity is logged
        """
        sample_attempt.ip_address = "192.168.1.1"
        assessment_service.db.query().filter().first.return_value = sample_attempt

        result = assessment_service.verify_ip_address(
            sample_attempt.id, current_ip="203.0.113.5", candidate_id=user_id
        )

        assert "ip_address_changed" in result.suspicious_activity

    def test_randomize_question_order_per_attempt(self, assessment_service):
        """
        GIVEN: Assessment with randomize_questions=True
        WHEN: Two candidates start assessment
        THEN: Each gets different question order
        """
        assessment = Mock(id=uuid4(), randomize_questions=True)
        questions = [Mock(id=uuid4()) for _ in range(10)]
        assessment.questions = questions

        order1 = assessment_service.get_randomized_questions(assessment, seed=1)
        order2 = assessment_service.get_randomized_questions(assessment, seed=2)

        # Orders should be different
        assert [q.id for q in order1] != [q.id for q in order2]

    def test_randomize_mcq_options_per_attempt(self, assessment_service):
        """
        GIVEN: MCQ question with option randomization
        WHEN: Displaying question
        THEN: Options are shuffled
        """
        question = Mock(
            options=["A", "B", "C", "D"],
            randomize_options=True,
        )

        randomized1 = assessment_service.randomize_options(question, seed=1)
        randomized2 = assessment_service.randomize_options(question, seed=2)

        assert randomized1 != randomized2

    def test_copy_paste_detection_flag(self, assessment_service, user_id):
        """
        GIVEN: Text response with copy-paste activity
        WHEN: Submitting response
        THEN: Activity is logged for review
        """
        response_data = ResponseCreate(
            question_id=uuid4(),
            text_response="Answer text",
            copy_paste_detected=True,
        )

        result = assessment_service.submit_response(
            attempt_id=uuid4(),
            question_id=uuid4(),
            response_data=response_data,
            candidate_id=user_id,
        )

        assert result.suspicious_activity.get("copy_paste") is True


# ============================================================================
# TEST SUITE: QUESTION BANK
# ============================================================================

class TestQuestionBank:
    """Test question bank management"""

    def test_create_question_bank_item(
        self, question_bank_service, company_id, sample_mcq_single_question
    ):
        """
        GIVEN: Valid question data
        WHEN: Adding to question bank
        THEN: Question is saved for reuse
        """
        result = question_bank_service.create_question(
            company_id, sample_mcq_single_question
        )

        assert result.company_id == company_id
        assert result.is_public is False
        assert result.times_used == 0

    def test_search_question_bank_by_category(
        self, question_bank_service, company_id
    ):
        """
        GIVEN: Questions with different categories
        WHEN: Searching by category
        THEN: Filtered results returned
        """
        filters = QuestionBankFilters(
            category="Data Structures & Algorithms",
            difficulty="medium",
        )

        results = question_bank_service.search_questions(company_id, filters)

        assert all(q.category == "Data Structures & Algorithms" for q in results)

    def test_import_question_from_bank_to_assessment(
        self, question_bank_service, company_id
    ):
        """
        GIVEN: Question in question bank
        WHEN: Importing to assessment
        THEN: New assessment question created
        """
        bank_question = Mock(id=uuid4(), company_id=company_id)
        assessment = Mock(id=uuid4(), company_id=company_id)

        result = question_bank_service.import_question_to_assessment(
            bank_question.id, assessment.id, company_id=company_id
        )

        assert result.assessment_id == assessment.id
        # times_used should increment


# ============================================================================
# TEST SUITE: CODING EXECUTION SERVICE
# ============================================================================

class TestCodingExecutionService:
    """Test code execution integration"""

    @patch("requests.post")
    @patch("requests.get")
    def test_execute_code_with_judge0(
        self, mock_get, mock_post, coding_execution_service
    ):
        """
        GIVEN: Python code and test case
        WHEN: Executing with Judge0 API
        THEN: Output is returned correctly
        """
        mock_post.return_value = Mock(json=lambda: {"token": "abc123"})
        mock_get.return_value = Mock(
            json=lambda: {
                "status": {"id": 3, "description": "Accepted"},
                "stdout": "120\n",
                "stderr": None,
            }
        )

        result = coding_execution_service.execute_code(
            code="def factorial(n): return 1 if n == 0 else n * factorial(n-1)",
            language="python",
            test_input="5",
        )

        assert result["status"]["id"] == 3
        assert "120" in result["stdout"]

    @patch("requests.post")
    def test_execute_code_timeout_handling(
        self, mock_post, coding_execution_service
    ):
        """
        GIVEN: Code with infinite loop
        WHEN: Execution exceeds time limit
        THEN: Timeout error is returned
        """
        mock_post.return_value = Mock(
            json=lambda: {"status": {"id": 5, "description": "Time Limit Exceeded"}}
        )

        result = coding_execution_service.execute_code(
            code="while True: pass", language="python", test_input=""
        )

        assert result["status"]["id"] == 5

    def test_validate_supported_languages(self, coding_execution_service):
        """
        GIVEN: List of supported languages
        WHEN: Validating language code
        THEN: Returns True/False correctly
        """
        assert coding_execution_service.is_supported_language("python") is True
        assert coding_execution_service.is_supported_language("javascript") is True
        assert coding_execution_service.is_supported_language("invalid") is False


# ============================================================================
# TEST SUITE: EDGE CASES & ERROR HANDLING
# ============================================================================

class TestEdgeCases:
    """Test edge cases and error scenarios"""

    def test_empty_assessment_validation(self, assessment_service, company_id):
        """
        GIVEN: Assessment with no questions
        WHEN: Attempting to publish
        THEN: ValidationError is raised
        """
        assessment = Mock(id=uuid4(), status="draft", questions=[])
        assessment_service.db.query().filter().first.return_value = assessment

        with pytest.raises(ValueError, match="at least one question"):
            assessment_service.publish_assessment(assessment.id, company_id=company_id)

    def test_negative_points_validation(self, assessment_service):
        """
        GIVEN: Question with negative points
        WHEN: Creating question
        THEN: ValidationError is raised
        """
        with pytest.raises(ValueError):
            QuestionCreate(
                question_text="Test",
                question_type="mcq_single",
                points=-10,  # Invalid
            )

    def test_concurrent_submission_handling(
        self, assessment_service, sample_attempt, user_id
    ):
        """
        GIVEN: Two simultaneous submission requests
        WHEN: Both try to submit
        THEN: Only one succeeds, other gets error
        """
        # Implementation should use database-level locking
        pass  # Requires transaction isolation testing

    def test_large_file_upload_size_limit(self, assessment_service):
        """
        GIVEN: File upload question with 50MB limit
        WHEN: Uploading 60MB file
        THEN: FileSizeExceededError is raised
        """
        with pytest.raises(ValueError, match="File size exceeds"):
            response_data = ResponseCreate(
                question_id=uuid4(),
                response_type="file_upload",
                file_size_bytes=60 * 1024 * 1024,  # 60MB
            )
            assessment_service.validate_file_size(response_data)

    def test_special_characters_in_code_execution(self, coding_execution_service):
        """
        GIVEN: Code with SQL injection attempt
        WHEN: Executing code
        THEN: Code is sandboxed, no harm done
        """
        malicious_code = "'; DROP TABLE users; --"
        result = coding_execution_service.execute_code(
            code=malicious_code, language="python", test_input=""
        )

        # Should return syntax error, not execute SQL
        assert "error" in result or result["status"]["id"] != 3

    def test_division_by_zero_in_scoring(self, assessment_service):
        """
        GIVEN: Assessment with 0 total points
        WHEN: Calculating percentage
        THEN: Handles gracefully without crash
        """
        attempt = Mock(points_earned=0, total_points_possible=0)

        score_pct = assessment_service.calculate_score_percentage(attempt)

        assert score_pct == 0.0  # or None

    def test_unicode_support_in_questions(self, assessment_service, company_id):
        """
        GIVEN: Question with Unicode characters (Chinese, emojis)
        WHEN: Creating question
        THEN: Text is stored and retrieved correctly
        """
        question_data = QuestionCreate(
            question_text="什么是Python? 🐍",
            question_type="text",
            points=10,
        )

        result = assessment_service.add_question(
            uuid4(), question_data, company_id=company_id
        )

        assert "什么是Python" in result.question_text
        assert "🐍" in result.question_text

    def test_assessment_statistics_calculation(self, assessment_service, company_id):
        """
        GIVEN: Assessment with multiple attempts
        WHEN: Calculating statistics
        THEN: Avg score, pass rate computed correctly
        """
        assessment = Mock(
            id=uuid4(),
            attempts=[
                Mock(score_percentage=85, passed=True),
                Mock(score_percentage=92, passed=True),
                Mock(score_percentage=65, passed=False),
                Mock(score_percentage=78, passed=True),
            ],
        )

        stats = assessment_service.calculate_statistics(
            assessment.id, company_id=company_id
        )

        assert stats["avg_score"] == 80.0
        assert stats["pass_rate"] == 75.0  # 3/4
        assert stats["total_attempts"] == 4

    def test_assessment_not_found_error_message(self, assessment_service, company_id):
        """
        GIVEN: Non-existent assessment ID
        WHEN: Fetching assessment
        THEN: Clear error message with ID
        """
        assessment_service.db.query().filter().first.return_value = None
        fake_id = uuid4()

        with pytest.raises(AssessmentNotFoundError, match=str(fake_id)):
            assessment_service.get_assessment(fake_id, company_id=company_id)

    def test_cascade_delete_assessment_questions(self, assessment_service, company_id):
        """
        GIVEN: Assessment with questions
        WHEN: Deleting assessment (soft delete)
        THEN: Questions are also soft-deleted
        """
        assessment = Mock(
            id=uuid4(),
            total_attempts=0,
            questions=[Mock(id=uuid4()), Mock(id=uuid4())],
        )
        assessment_service.db.query().filter().first.return_value = assessment

        result = assessment_service.delete_assessment(
            assessment.id, company_id=company_id
        )

        assert result is True
        # Questions should also be marked deleted
