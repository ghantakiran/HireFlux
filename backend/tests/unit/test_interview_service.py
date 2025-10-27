"""Unit tests for Interview Service"""
import pytest
from unittest.mock import Mock, patch, MagicMock, AsyncMock
from datetime import datetime, timedelta

from app.services.interview_service import InterviewService
from app.schemas.interview import (
    InterviewSessionCreate,
    InterviewType,
    RoleLevel,
    CompanyType,
    AnswerSubmit,
    QuestionFeedback
)
from app.core.exceptions import ServiceError, NotFoundError, ValidationError


@pytest.fixture
def interview_service():
    """Create Interview service instance"""
    return InterviewService()


@pytest.fixture
def mock_db_session():
    """Create mock database session"""
    return Mock()


@pytest.fixture
def mock_user():
    """Create mock user"""
    user = Mock()
    user.id = 1
    user.email = "test@example.com"
    user.name = "Test User"
    return user


@pytest.fixture
def mock_session():
    """Create mock interview session"""
    session = Mock()
    session.id = 1
    session.user_id = 1
    session.interview_type = "technical"
    session.role_level = "senior"
    session.company_type = "tech"
    session.focus_area = "python"
    session.status = "in_progress"
    session.total_questions = 5
    session.questions_answered = 0
    session.questions = []
    session.started_at = datetime.now()
    session.is_completed = False
    session.completion_percentage = 0.0
    return session


@pytest.fixture
def mock_question():
    """Create mock interview question"""
    question = Mock()
    question.id = 1
    question.session_id = 1
    question.question_number = 1
    question.question_text = "Explain the difference between a list and a tuple in Python."
    question.question_category = "data structures"
    question.difficulty_level = "easy"
    question.user_answer = None
    question.is_answered = False
    return question


@pytest.fixture
def session_create_request():
    """Create session request"""
    return InterviewSessionCreate(
        interview_type=InterviewType.TECHNICAL,
        role_level=RoleLevel.SENIOR,
        company_type=CompanyType.TECH,
        focus_area="python",
        target_company="Google",
        target_role="Senior Software Engineer",
        total_questions=5
    )


@pytest.fixture
def answer_submit_request():
    """Create answer submission request"""
    return AnswerSubmit(
        user_answer="Lists are mutable while tuples are immutable. Lists use square brackets [] and tuples use parentheses (). Lists have more methods like append() and remove(), while tuples have fewer methods due to immutability.",
        time_taken_seconds=120
    )


class TestInterviewServiceInitialization:
    """Test Interview service initialization"""

    def test_service_initializes_successfully(self):
        """Test service initialization"""
        service = InterviewService()
        assert service is not None

    def test_service_has_openai_service(self, interview_service):
        """Test service has OpenAI service dependency"""
        assert hasattr(interview_service, 'openai_service')


class TestCreateSession:
    """Test creating interview sessions"""

    def test_create_session_success(self, interview_service, mock_db_session, mock_user, session_create_request):
        """Test successful session creation"""
        with patch.object(interview_service, '_create_session_in_db') as mock_create:
            mock_session = Mock()
            mock_session.id = 1
            mock_create.return_value = mock_session

            with patch.object(interview_service, '_generate_questions') as mock_gen:
                result = interview_service.create_session(
                    db=mock_db_session,
                    user=mock_user,
                    request=session_create_request
                )

                assert result is not None
                assert result.id == 1
                mock_create.assert_called_once()
                mock_gen.assert_called_once_with(mock_db_session, mock_session, session_create_request)

    def test_create_session_validates_total_questions(self, interview_service, mock_db_session, mock_user):
        """Test session creation validates total questions"""
        request = InterviewSessionCreate(
            interview_type=InterviewType.TECHNICAL,
            role_level=RoleLevel.SENIOR,
            company_type=CompanyType.TECH,
            total_questions=0  # Invalid
        )

        with pytest.raises((ValidationError, ValueError)):
            interview_service.create_session(
                db=mock_db_session,
                user=mock_user,
                request=request
            )


class TestGenerateQuestions:
    """Test question generation"""

    def test_generate_questions_creates_correct_count(self, interview_service, mock_db_session, mock_session, session_create_request):
        """Test generates correct number of questions"""
        with patch.object(interview_service.openai_service, 'generate_completion') as mock_openai:
            mock_openai.return_value = {
                "content": """1. Explain the GIL in Python and its implications for multi-threading.
2. What are Python decorators and how do they work?
3. Describe the difference between @staticmethod and @classmethod.
4. Explain Python's memory management and garbage collection.
5. What are generators and when would you use them?"""
            }

            with patch.object(interview_service, '_parse_questions_from_response') as mock_parse:
                mock_parse.return_value = [
                    {"text": "Question 1", "category": "python", "difficulty": "medium"},
                    {"text": "Question 2", "category": "python", "difficulty": "medium"},
                    {"text": "Question 3", "category": "python", "difficulty": "medium"},
                    {"text": "Question 4", "category": "python", "difficulty": "hard"},
                    {"text": "Question 5", "category": "python", "difficulty": "medium"},
                ]

                questions = interview_service._generate_questions(
                    db=mock_db_session,
                    session=mock_session,
                    request=session_create_request
                )

                assert len(questions) == 5
                mock_openai.assert_called_once()

    def test_generate_questions_adapts_to_interview_type(self, interview_service, mock_db_session):
        """Test generates appropriate questions for behavioral interviews"""
        behavioral_session = Mock()
        behavioral_session.interview_type = "behavioral"
        behavioral_session.role_level = "senior"
        behavioral_session.company_type = "faang"
        behavioral_session.total_questions = 5

        request = InterviewSessionCreate(
            interview_type=InterviewType.BEHAVIORAL,
            role_level=RoleLevel.SENIOR,
            company_type=CompanyType.FAANG,
            total_questions=5
        )

        with patch.object(interview_service.openai_service, 'generate_completion') as mock_openai:
            mock_openai.return_value = {
                "content": """1. Tell me about a time you had to handle a difficult stakeholder.
2. Describe a situation where you had to make a difficult technical decision.
3. Give me an example of when you failed and what you learned.
4. Tell me about a time you had to influence without authority.
5. Describe how you handled a conflict within your team."""
            }

            with patch.object(interview_service, '_parse_questions_from_response') as mock_parse:
                mock_parse.return_value = [{"text": f"Q{i}", "category": "behavioral", "difficulty": "medium"} for i in range(1, 6)]

                interview_service._generate_questions(
                    db=mock_db_session,
                    session=behavioral_session,
                    request=request
                )

                call_args = mock_openai.call_args
                messages = call_args.kwargs['messages']
                prompt_text = ' '.join([m['content'] for m in messages])
                assert 'behavioral' in prompt_text.lower() or 'star' in prompt_text.lower()


class TestSubmitAnswer:
    """Test answer submission and feedback"""

    def test_submit_answer_success(self, interview_service, mock_db_session, mock_question, answer_submit_request):
        """Test successful answer submission"""
        with patch.object(interview_service, '_get_question') as mock_get:
            mock_get.return_value = mock_question

            with patch.object(interview_service, '_generate_feedback') as mock_feedback:
                mock_feedback.return_value = QuestionFeedback(
                    score=8.5,
                    ai_feedback="Great answer! You covered the key differences clearly.",
                    sample_answer="An excellent answer would also mention performance implications...",
                    strengths=["Clear explanation", "Accurate information"],
                    improvements=["Could add performance considerations"],
                    has_situation=False,
                    has_task=False,
                    has_action=False,
                    has_result=False
                )

                result = interview_service.submit_answer(
                    db=mock_db_session,
                    question_id=1,
                    request=answer_submit_request
                )

                assert result is not None
                assert result.score == 8.5
                mock_get.assert_called_once_with(mock_db_session, 1)
                mock_feedback.assert_called_once()

    def test_submit_answer_updates_question(self, interview_service, mock_db_session, mock_question, answer_submit_request):
        """Test answer submission updates question record"""
        with patch.object(interview_service, '_get_question') as mock_get:
            mock_get.return_value = mock_question

            with patch.object(interview_service, '_generate_feedback') as mock_feedback:
                mock_feedback.return_value = QuestionFeedback(
                    score=7.0,
                    ai_feedback="Good answer",
                    sample_answer="Sample",
                    strengths=["Clear"],
                    improvements=["More detail"]
                )

                interview_service.submit_answer(
                    db=mock_db_session,
                    question_id=1,
                    request=answer_submit_request
                )

                # Verify question was updated
                assert mock_question.user_answer == answer_submit_request.user_answer
                assert mock_question.time_taken_seconds == answer_submit_request.time_taken_seconds

    def test_submit_answer_question_not_found(self, interview_service, mock_db_session, answer_submit_request):
        """Test error when question not found"""
        with patch.object(interview_service, '_get_question') as mock_get:
            mock_get.return_value = None

            with pytest.raises(NotFoundError):
                interview_service.submit_answer(
                    db=mock_db_session,
                    question_id=999,
                    request=answer_submit_request
                )


class TestGenerateFeedback:
    """Test feedback generation"""

    def test_generate_feedback_for_technical_question(self, interview_service):
        """Test generates appropriate feedback for technical questions"""
        question = Mock()
        question.question_text = "Explain Python's GIL"
        question.question_category = "concurrency"
        question.session.interview_type = "technical"

        user_answer = "The Global Interpreter Lock (GIL) is a mutex that protects access to Python objects."

        with patch.object(interview_service.openai_service, 'generate_completion') as mock_openai:
            mock_openai.return_value = {
                "content": """SCORE: 7.5
FEEDBACK: Good start, but could expand on implications for multi-threaded applications and when it matters.
SAMPLE_ANSWER: The GIL is a mutex that prevents multiple threads from executing Python bytecode simultaneously. This means that even on multi-core systems, only one thread can execute Python code at a time. It primarily affects CPU-bound operations, while I/O-bound operations can still benefit from threading.
STRENGTHS: Accurate definition; Concise explanation
IMPROVEMENTS: Discuss implications for multi-threading; Mention alternatives like multiprocessing
STAR: N/A"""
            }

            with patch.object(interview_service, '_parse_feedback_response') as mock_parse:
                mock_parse.return_value = QuestionFeedback(
                    score=7.5,
                    ai_feedback="Good start, but could expand...",
                    sample_answer="The GIL is a mutex...",
                    strengths=["Accurate definition", "Concise explanation"],
                    improvements=["Discuss implications", "Mention alternatives"]
                )

                feedback = interview_service._generate_feedback(question, user_answer)

                assert feedback.score == 7.5
                assert len(feedback.strengths) > 0
                assert len(feedback.improvements) > 0

    def test_generate_feedback_for_behavioral_question_with_star(self, interview_service):
        """Test generates STAR framework analysis for behavioral questions"""
        question = Mock()
        question.question_text = "Tell me about a time you resolved a conflict"
        question.question_category = "leadership"
        question.session.interview_type = "behavioral"

        user_answer = """At my previous role, two senior engineers disagreed on the architecture approach (Situation).
        My task was to facilitate a resolution without delaying the project (Task).
        I organized a technical review session where each could present their approach, and we evaluated based on our requirements (Action).
        We reached consensus on a hybrid approach and delivered on time (Result)."""

        with patch.object(interview_service.openai_service, 'generate_completion') as mock_openai:
            mock_openai.return_value = {
                "content": """SCORE: 9.0
FEEDBACK: Excellent answer with complete STAR framework. Clear situation, well-defined task, specific actions, and measurable results.
SAMPLE_ANSWER: Similar structure would work well.
STRENGTHS: Complete STAR framework; Specific actions; Measurable outcome
IMPROVEMENTS: Could add more detail on the technical approaches; Mention long-term impact
STAR: S=Yes T=Yes A=Yes R=Yes
STAR_SCORE: 9.5"""
            }

            with patch.object(interview_service, '_parse_feedback_response') as mock_parse:
                mock_parse.return_value = QuestionFeedback(
                    score=9.0,
                    ai_feedback="Excellent answer with complete STAR framework.",
                    sample_answer="Similar structure would work well.",
                    strengths=["Complete STAR", "Specific actions", "Measurable outcome"],
                    improvements=["Add more technical detail", "Mention long-term impact"],
                    has_situation=True,
                    has_task=True,
                    has_action=True,
                    has_result=True,
                    star_completeness_score=9.5
                )

                feedback = interview_service._generate_feedback(question, user_answer)

                assert feedback.has_situation
                assert feedback.has_task
                assert feedback.has_action
                assert feedback.has_result
                assert feedback.star_completeness_score == 9.5


class TestGetNextQuestion:
    """Test getting next question"""

    def test_get_next_question_returns_first_unanswered(self, interview_service, mock_db_session, mock_session):
        """Test returns first unanswered question"""
        q1 = Mock(question_number=1, is_answered=True)
        q2 = Mock(question_number=2, is_answered=False)
        q3 = Mock(question_number=3, is_answered=False)
        mock_session.questions = [q1, q2, q3]

        with patch.object(interview_service, '_get_session') as mock_get:
            mock_get.return_value = mock_session

            next_q = interview_service.get_next_question(mock_db_session, session_id=1)

            assert next_q.question_number == 2

    def test_get_next_question_returns_none_when_all_answered(self, interview_service, mock_db_session, mock_session):
        """Test returns None when all questions answered"""
        q1 = Mock(question_number=1, is_answered=True)
        q2 = Mock(question_number=2, is_answered=True)
        mock_session.questions = [q1, q2]

        with patch.object(interview_service, '_get_session') as mock_get:
            mock_get.return_value = mock_session

            next_q = interview_service.get_next_question(mock_db_session, session_id=1)

            assert next_q is None


class TestCompleteSession:
    """Test session completion"""

    def test_complete_session_calculates_scores(self, interview_service, mock_db_session, mock_session):
        """Test session completion calculates overall scores"""
        q1 = Mock(score=8.0, star_completeness_score=None)
        q2 = Mock(score=7.5, star_completeness_score=None)
        q3 = Mock(score=9.0, star_completeness_score=None)
        mock_session.questions = [q1, q2, q3]
        mock_session.interview_type = "technical"

        with patch.object(interview_service, '_get_session') as mock_get:
            mock_get.return_value = mock_session

            with patch.object(interview_service, '_calculate_session_scores') as mock_calc:
                mock_calc.return_value = {
                    "overall_score": 8.17,
                    "technical_accuracy_score": 8.5,
                    "communication_score": 8.0
                }

                result = interview_service.complete_session(mock_db_session, session_id=1)

                assert result.status == "completed"
                assert result.completed_at is not None
                mock_calc.assert_called_once()

    def test_complete_session_generates_summary(self, interview_service, mock_db_session, mock_session):
        """Test session completion generates feedback summary"""
        mock_session.questions = [Mock(score=8.0)]

        with patch.object(interview_service, '_get_session') as mock_get:
            mock_get.return_value = mock_session

            with patch.object(interview_service, '_calculate_session_scores') as mock_calc:
                mock_calc.return_value = {"overall_score": 8.0}

            with patch.object(interview_service, '_generate_session_summary') as mock_summary:
                mock_summary.return_value = "Great session! You demonstrated strong technical knowledge."

                result = interview_service.complete_session(mock_db_session, session_id=1)

                assert result.feedback_summary is not None
                mock_summary.assert_called_once()


class TestGetUserStats:
    """Test getting user statistics"""

    def test_get_user_stats_calculates_correctly(self, interview_service, mock_db_session, mock_user):
        """Test user stats calculation"""
        sessions = [
            Mock(status="completed", overall_score=8.0, interview_type="technical", questions_answered=5),
            Mock(status="completed", overall_score=7.5, interview_type="behavioral", questions_answered=5),
            Mock(status="in_progress", overall_score=None, interview_type="technical", questions_answered=2),
        ]

        with patch.object(interview_service, '_get_user_sessions') as mock_get:
            mock_get.return_value = sessions

            stats = interview_service.get_user_stats(mock_db_session, user_id=1)

            assert stats.total_sessions == 3
            assert stats.sessions_completed == 2
            assert stats.total_questions_answered == 12  # 5 + 5 + 2
            assert stats.average_score == 7.75  # (8.0 + 7.5) / 2

    def test_get_user_stats_groups_by_type(self, interview_service, mock_db_session, mock_user):
        """Test stats grouped by interview type"""
        sessions = [
            Mock(interview_type="technical"),
            Mock(interview_type="technical"),
            Mock(interview_type="behavioral"),
        ]

        with patch.object(interview_service, '_get_user_sessions') as mock_get:
            mock_get.return_value = sessions

            stats = interview_service.get_user_stats(mock_db_session, user_id=1)

            assert stats.sessions_by_type.get("technical") == 2
            assert stats.sessions_by_type.get("behavioral") == 1


class TestErrorHandling:
    """Test error handling"""

    def test_handles_openai_api_errors(self, interview_service, mock_db_session, mock_session, session_create_request):
        """Test handles OpenAI API errors gracefully"""
        with patch.object(interview_service.openai_service, 'generate_completion') as mock_openai:
            mock_openai.side_effect = Exception("OpenAI API error")

            with pytest.raises(ServiceError):
                interview_service._generate_questions(
                    db=mock_db_session,
                    session=mock_session,
                    request=session_create_request
                )

    def test_handles_database_errors(self, interview_service, mock_db_session, mock_user, session_create_request):
        """Test handles database errors"""
        mock_db_session.add.side_effect = Exception("Database error")

        with pytest.raises(ServiceError):
            interview_service.create_session(
                db=mock_db_session,
                user=mock_user,
                request=session_create_request
            )
