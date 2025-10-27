"""
Interview Service
Handles interview coaching sessions, question generation, and feedback
"""
from typing import List, Optional, Dict
from datetime import datetime
from sqlalchemy.orm import Session
import re
import json

from app.db.models.user import User
from app.db.models.interview import InterviewSession, InterviewQuestion
from app.schemas.interview import (
    InterviewSessionCreate,
    AnswerSubmit,
    QuestionFeedback,
    InterviewSessionResponse,
    InterviewQuestionResponse,
    SessionStats,
)
from app.services.openai_service import OpenAIService
from app.core.exceptions import ServiceError, NotFoundError, ValidationError


class InterviewService:
    """Service for managing interview coaching sessions"""

    def __init__(self):
        self.openai_service = OpenAIService()

    def create_session(
        self, db: Session, user: User, request: InterviewSessionCreate
    ) -> InterviewSessionResponse:
        """Create a new interview session and generate questions"""
        try:
            # Validate request
            if request.total_questions < 1 or request.total_questions > 20:
                raise ValidationError("Total questions must be between 1 and 20")

            # Create session in database
            session = self._create_session_in_db(db, user, request)

            # Generate questions
            self._generate_questions(db, session, request)

            db.commit()
            db.refresh(session)

            return InterviewSessionResponse.model_validate(session)

        except (ValidationError, NotFoundError):
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise ServiceError(f"Failed to create interview session: {str(e)}")

    def _create_session_in_db(
        self, db: Session, user: User, request: InterviewSessionCreate
    ) -> InterviewSession:
        """Create session record in database"""
        session = InterviewSession(
            user_id=user.id,
            interview_type=request.interview_type.value,
            role_level=request.role_level.value,
            company_type=request.company_type.value,
            focus_area=request.focus_area,
            target_company=request.target_company,
            target_role=request.target_role,
            total_questions=request.total_questions,
            status="in_progress",
        )

        db.add(session)
        db.flush()  # Get the ID without committing
        return session

    def _generate_questions(
        self, db: Session, session: InterviewSession, request: InterviewSessionCreate
    ) -> List[InterviewQuestion]:
        """Generate interview questions using OpenAI"""
        try:
            # Build prompt based on interview type
            prompt = self._build_question_generation_prompt(request)

            # Generate questions
            response = self.openai_service.generate_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert interview coach who generates high-quality interview questions.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.8,  # More creative for question variety
                max_tokens=1500,
            )

            # Parse questions from response
            questions_data = self._parse_questions_from_response(
                response["content"], request.total_questions
            )

            # Create question records
            questions = []
            for i, q_data in enumerate(questions_data, 1):
                question = InterviewQuestion(
                    session_id=session.id,
                    question_number=i,
                    question_text=q_data["text"],
                    question_category=q_data.get("category"),
                    difficulty_level=q_data.get("difficulty", "medium"),
                )
                db.add(question)
                questions.append(question)

            return questions

        except Exception as e:
            raise ServiceError(f"Failed to generate questions: {str(e)}")

    def _build_question_generation_prompt(self, request: InterviewSessionCreate) -> str:
        """Build prompt for question generation"""
        base_prompt = f"""Generate {request.total_questions} {request.interview_type.value} interview questions for a {request.role_level.value} level position at a {request.company_type.value} company."""

        if request.focus_area:
            base_prompt += f"\nFocus area: {request.focus_area}"

        if request.target_company:
            base_prompt += f"\nTarget company: {request.target_company}"

        if request.target_role:
            base_prompt += f"\nTarget role: {request.target_role}"

        # Add interview-type specific instructions
        if request.interview_type.value == "behavioral":
            base_prompt += """\n\nGenerate behavioral questions that can be answered using the STAR framework (Situation, Task, Action, Result).
Focus on leadership, conflict resolution, teamwork, and problem-solving scenarios."""

        elif request.interview_type.value == "technical":
            base_prompt += """\n\nGenerate technical questions that assess depth of knowledge, problem-solving ability, and real-world application.
Include questions about algorithms, data structures, system design concepts, and best practices."""

        elif request.interview_type.value == "system-design":
            base_prompt += """\n\nGenerate system design questions that require architectural thinking.
Focus on scalability, reliability, trade-offs, and real-world constraints."""

        base_prompt += """\n\nFormat each question on a new line as:
1. [Question text]
2. [Question text]
etc.

Make questions realistic, challenging, and appropriate for the seniority level."""

        return base_prompt

    def _parse_questions_from_response(
        self, response: str, expected_count: int
    ) -> List[Dict]:
        """Parse questions from OpenAI response"""
        questions = []
        lines = response.strip().split("\n")

        for line in lines:
            line = line.strip()
            if not line:
                continue

            # Match numbered questions: "1. Question text" or "1) Question text"
            match = re.match(r"^(\d+)[.)\]]\s*(.+)$", line)
            if match:
                question_text = match.group(2).strip()
                questions.append(
                    {
                        "text": question_text,
                        "category": None,  # Could be enhanced with categorization
                        "difficulty": "medium",  # Could be enhanced with difficulty assessment
                    }
                )

        # Ensure we have the right number of questions
        if len(questions) < expected_count:
            # If we didn't get enough, take what we have
            pass
        elif len(questions) > expected_count:
            # If we got too many, trim to expected count
            questions = questions[:expected_count]

        return questions

    def submit_answer(
        self, db: Session, question_id: int, request: AnswerSubmit
    ) -> QuestionFeedback:
        """Submit an answer to a question and get feedback"""
        try:
            # Get the question
            question = self._get_question(db, question_id)
            if not question:
                raise NotFoundError(f"Question {question_id} not found")

            # Update question with answer
            question.user_answer = request.user_answer
            question.time_taken_seconds = request.time_taken_seconds
            question.answered_at = datetime.now()

            # Generate feedback
            feedback = self._generate_feedback(question, request.user_answer)

            # Update question with feedback
            question.score = feedback.score
            question.ai_feedback = feedback.ai_feedback
            question.sample_answer = feedback.sample_answer
            question.strengths = feedback.strengths
            question.improvements = feedback.improvements
            question.has_situation = feedback.has_situation
            question.has_task = feedback.has_task
            question.has_action = feedback.has_action
            question.has_result = feedback.has_result
            question.star_completeness_score = feedback.star_completeness_score

            # Update session answered count
            session = question.session
            session.questions_answered += 1

            db.commit()
            db.refresh(question)

            return feedback

        except (NotFoundError, ValidationError):
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise ServiceError(f"Failed to submit answer: {str(e)}")

    def _get_question(
        self, db: Session, question_id: int
    ) -> Optional[InterviewQuestion]:
        """Get question by ID"""
        return (
            db.query(InterviewQuestion)
            .filter(InterviewQuestion.id == question_id)
            .first()
        )

    def _generate_feedback(
        self, question: InterviewQuestion, user_answer: str
    ) -> QuestionFeedback:
        """Generate AI feedback for an answer"""
        try:
            # Build feedback prompt
            prompt = self._build_feedback_prompt(question, user_answer)

            # Generate feedback
            response = self.openai_service.generate_completion(
                messages=[
                    {
                        "role": "system",
                        "content": "You are an expert interview coach providing constructive feedback.",
                    },
                    {"role": "user", "content": prompt},
                ],
                temperature=0.7,
                max_tokens=1000,
            )

            # Parse feedback response
            feedback = self._parse_feedback_response(
                response["content"], question.session.interview_type
            )

            return feedback

        except Exception as e:
            raise ServiceError(f"Failed to generate feedback: {str(e)}")

    def _build_feedback_prompt(
        self, question: InterviewQuestion, user_answer: str
    ) -> str:
        """Build prompt for feedback generation"""
        is_behavioral = question.session.interview_type == "behavioral"

        prompt = f"""Interview Question: {question.question_text}

Interview Type: {question.session.interview_type}
Role Level: {question.session.role_level}

Candidate's Answer:
{user_answer}

Please provide detailed feedback on this answer. Format your response as follows:

SCORE: [0-10]
FEEDBACK: [Detailed constructive feedback]
SAMPLE_ANSWER: [Example of a strong answer]
STRENGTHS: [Comma-separated list of strengths]
IMPROVEMENTS: [Comma-separated list of improvement suggestions]"""

        if is_behavioral:
            prompt += """
STAR: [Analyze if answer includes Situation, Task, Action, Result. Format: S=Yes/No T=Yes/No A=Yes/No R=Yes/No]
STAR_SCORE: [0-10 score for STAR framework completeness]"""

        return prompt

    def _parse_feedback_response(
        self, response: str, interview_type: str
    ) -> QuestionFeedback:
        """Parse feedback from OpenAI response"""
        try:
            # Extract components using regex
            score_match = re.search(
                r"SCORE:\s*(\d+(?:\.\d+)?)", response, re.IGNORECASE
            )
            score = float(score_match.group(1)) if score_match else 5.0

            feedback_match = re.search(
                r"FEEDBACK:\s*(.+?)(?=SAMPLE_ANSWER:|$)",
                response,
                re.IGNORECASE | re.DOTALL,
            )
            ai_feedback = (
                feedback_match.group(1).strip() if feedback_match else "Good effort!"
            )

            sample_match = re.search(
                r"SAMPLE_ANSWER:\s*(.+?)(?=STRENGTHS:|$)",
                response,
                re.IGNORECASE | re.DOTALL,
            )
            sample_answer = sample_match.group(1).strip() if sample_match else ""

            strengths_match = re.search(
                r"STRENGTHS:\s*(.+?)(?=IMPROVEMENTS:|$)",
                response,
                re.IGNORECASE | re.DOTALL,
            )
            strengths_text = strengths_match.group(1).strip() if strengths_match else ""
            strengths = [s.strip() for s in strengths_text.split(";") if s.strip()]

            improvements_match = re.search(
                r"IMPROVEMENTS:\s*(.+?)(?=STAR:|$)", response, re.IGNORECASE | re.DOTALL
            )
            improvements_text = (
                improvements_match.group(1).strip() if improvements_match else ""
            )
            improvements = [
                i.strip() for i in improvements_text.split(";") if i.strip()
            ]

            # Parse STAR framework if behavioral
            has_situation = False
            has_task = False
            has_action = False
            has_result = False
            star_score = None

            if interview_type == "behavioral":
                star_match = re.search(
                    r"STAR:\s*(.+?)(?=STAR_SCORE:|$)", response, re.IGNORECASE
                )
                if star_match:
                    star_text = star_match.group(1)
                    has_situation = "S=Yes" in star_text or "S=yes" in star_text
                    has_task = "T=Yes" in star_text or "T=yes" in star_text
                    has_action = "A=Yes" in star_text or "A=yes" in star_text
                    has_result = "R=Yes" in star_text or "R=yes" in star_text

                star_score_match = re.search(
                    r"STAR_SCORE:\s*(\d+(?:\.\d+)?)", response, re.IGNORECASE
                )
                if star_score_match:
                    star_score = float(star_score_match.group(1))

            return QuestionFeedback(
                score=min(10.0, max(0.0, score)),  # Clamp to 0-10
                ai_feedback=ai_feedback,
                sample_answer=sample_answer,
                strengths=strengths[:5],  # Limit to 5 strengths
                improvements=improvements[:5],  # Limit to 5 improvements
                has_situation=has_situation,
                has_task=has_task,
                has_action=has_action,
                has_result=has_result,
                star_completeness_score=star_score,
            )

        except Exception as e:
            # Return default feedback if parsing fails
            return QuestionFeedback(
                score=5.0,
                ai_feedback="Unable to parse detailed feedback. Please try again.",
                sample_answer="",
                strengths=[],
                improvements=[],
            )

    def get_next_question(
        self, db: Session, session_id: int
    ) -> Optional[InterviewQuestionResponse]:
        """Get the next unanswered question in the session"""
        session = self._get_session(db, session_id)
        if not session:
            raise NotFoundError(f"Session {session_id} not found")

        # Find first unanswered question
        for question in sorted(session.questions, key=lambda q: q.question_number):
            if not question.is_answered:
                return InterviewQuestionResponse.model_validate(question)

        return None

    def complete_session(
        self, db: Session, session_id: int
    ) -> InterviewSessionResponse:
        """Mark session as completed and calculate final scores"""
        try:
            session = self._get_session(db, session_id)
            if not session:
                raise NotFoundError(f"Session {session_id} not found")

            # Calculate overall scores
            scores = self._calculate_session_scores(session)

            # Update session
            session.status = "completed"
            session.completed_at = datetime.now()
            session.overall_score = scores.get("overall_score")
            session.star_framework_score = scores.get("star_framework_score")
            session.technical_accuracy_score = scores.get("technical_accuracy_score")
            session.communication_score = scores.get("communication_score")
            session.confidence_score = scores.get("confidence_score")

            # Generate summary feedback
            session.feedback_summary = self._generate_session_summary(session)

            # Aggregate strengths and improvements
            all_strengths = []
            all_improvements = []
            for q in session.questions:
                if q.strengths:
                    all_strengths.extend(q.strengths)
                if q.improvements:
                    all_improvements.extend(q.improvements)

            # Get top 5 most common
            session.strengths = list(set(all_strengths))[:5]
            session.improvement_areas = list(set(all_improvements))[:5]

            db.commit()
            db.refresh(session)

            return InterviewSessionResponse.model_validate(session)

        except NotFoundError:
            db.rollback()
            raise
        except Exception as e:
            db.rollback()
            raise ServiceError(f"Failed to complete session: {str(e)}")

    def _get_session(self, db: Session, session_id: int) -> Optional[InterviewSession]:
        """Get session by ID"""
        return (
            db.query(InterviewSession).filter(InterviewSession.id == session_id).first()
        )

    def _calculate_session_scores(self, session: InterviewSession) -> Dict[str, float]:
        """Calculate aggregate scores for the session"""
        answered_questions = [q for q in session.questions if q.score is not None]

        if not answered_questions:
            return {"overall_score": 0.0}

        # Overall score is average of all question scores
        overall_score = sum(q.score for q in answered_questions) / len(
            answered_questions
        )

        scores = {"overall_score": round(overall_score, 2)}

        # For behavioral interviews, calculate STAR score
        if session.interview_type == "behavioral":
            star_scores = [
                q.star_completeness_score
                for q in answered_questions
                if q.star_completeness_score
            ]
            if star_scores:
                scores["star_framework_score"] = round(
                    sum(star_scores) / len(star_scores), 2
                )

        # Could add more sophisticated scoring logic here
        scores["technical_accuracy_score"] = round(overall_score, 2)
        scores["communication_score"] = round(overall_score * 0.9, 2)  # Placeholder
        scores["confidence_score"] = round(overall_score * 0.95, 2)  # Placeholder

        return scores

    def _generate_session_summary(self, session: InterviewSession) -> str:
        """Generate overall session feedback summary"""
        score = session.overall_score or 0

        if score >= 9:
            return f"Excellent performance! You demonstrated strong expertise in {session.interview_type} interviews."
        elif score >= 7:
            return f"Good job! You showed solid understanding with room for improvement in a few areas."
        elif score >= 5:
            return f"Decent effort. Focus on providing more detailed and structured responses."
        else:
            return f"Keep practicing! Review the feedback and sample answers to improve your interview skills."

    def get_user_stats(
        self, db: Session, user_id: int, limit: int = 10
    ) -> SessionStats:
        """Get user's interview practice statistics"""
        sessions = self._get_user_sessions(db, user_id)

        completed_sessions = [s for s in sessions if s.status == "completed"]

        # Calculate stats
        total_questions_answered = sum(s.questions_answered for s in sessions)

        # Average score from completed sessions
        scores = [s.overall_score for s in completed_sessions if s.overall_score]
        average_score = round(sum(scores) / len(scores), 2) if scores else None

        # Group by type
        sessions_by_type = {}
        for session in sessions:
            sessions_by_type[session.interview_type] = (
                sessions_by_type.get(session.interview_type, 0) + 1
            )

        # Recent sessions
        recent = sorted(sessions, key=lambda s: s.started_at, reverse=True)[:limit]
        recent_sessions = [InterviewSessionResponse.model_validate(s) for s in recent]

        # Calculate improvement rate (simplified)
        improvement_rate = None
        if len(completed_sessions) >= 2:
            first_half = completed_sessions[: len(completed_sessions) // 2]
            second_half = completed_sessions[len(completed_sessions) // 2 :]
            first_avg = sum(
                s.overall_score for s in first_half if s.overall_score
            ) / len(first_half)
            second_avg = sum(
                s.overall_score for s in second_half if s.overall_score
            ) / len(second_half)
            improvement_rate = (
                round(((second_avg - first_avg) / first_avg) * 100, 1)
                if first_avg > 0
                else 0
            )

        return SessionStats(
            total_sessions=len(sessions),
            sessions_completed=len(completed_sessions),
            total_questions_answered=total_questions_answered,
            average_score=average_score,
            improvement_rate=improvement_rate,
            sessions_by_type=sessions_by_type,
            recent_sessions=recent_sessions,
        )

    def _get_user_sessions(self, db: Session, user_id: int) -> List[InterviewSession]:
        """Get all sessions for a user"""
        return (
            db.query(InterviewSession)
            .filter(InterviewSession.user_id == user_id)
            .order_by(InterviewSession.started_at.desc())
            .all()
        )
