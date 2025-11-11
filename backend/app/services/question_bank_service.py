"""
QuestionBankService - Reusable Question Library Management

Sprint 17-18 Phase 4

Service for managing reusable question bank items that can be imported into assessments.
"""

from typing import List, Optional
from uuid import UUID

from sqlalchemy import select, and_, or_
from sqlalchemy.orm import Session

from app.db.models.assessment import QuestionBankItem, AssessmentQuestion
from app.schemas.assessment import QuestionBankCreate, QuestionBankFilters


class QuestionBankService:
    """
    Service for managing question bank.

    The question bank allows companies to:
    - Create reusable questions
    - Search and filter questions
    - Import questions into assessments
    - Share public questions across companies
    """

    def __init__(self, db: Session):
        self.db = db

    def create_question(
        self,
        company_id: UUID,
        data: QuestionBankCreate,
        created_by: Optional[UUID] = None
    ) -> QuestionBankItem:
        """
        Create a new question bank item.

        Args:
            company_id: Company UUID
            data: Question data
            created_by: User who created the question

        Returns:
            Created QuestionBankItem object
        """
        question = QuestionBankItem(
            company_id=company_id if not data.is_public else None,
            created_by=created_by,
            question_text=data.question_text,
            question_type=data.question_type,
            description=data.description,
            options=data.options,
            correct_answers=data.correct_answers,
            coding_language=data.coding_language,
            starter_code=data.starter_code,
            solution_code=data.solution_code,
            test_cases=[tc.model_dump() for tc in data.test_cases] if data.test_cases else None,
            allowed_file_types=data.allowed_file_types,
            max_file_size_mb=data.max_file_size_mb,
            points=data.points,
            difficulty=data.difficulty,
            category=data.category,
            tags=data.tags,
            is_public=data.is_public,
        )

        self.db.add(question)
        self.db.commit()
        self.db.refresh(question)

        return question

    def search_questions(
        self,
        company_id: UUID,
        filters: QuestionBankFilters
    ) -> List[QuestionBankItem]:
        """
        Search question bank with filters.

        Args:
            company_id: Company UUID
            filters: Search filters

        Returns:
            List of QuestionBankItem objects
        """
        query = select(QuestionBankItem).where(
            or_(
                QuestionBankItem.company_id == company_id,
                QuestionBankItem.is_public == True
            )
        )

        # Apply filters
        if filters.question_type:
            query = query.where(QuestionBankItem.question_type == filters.question_type)

        if filters.difficulty:
            query = query.where(QuestionBankItem.difficulty == filters.difficulty)

        if filters.category:
            query = query.where(QuestionBankItem.category == filters.category)

        if filters.tags:
            # Match any of the tags
            for tag in filters.tags:
                query = query.where(QuestionBankItem.tags.contains([tag]))

        if filters.is_public is not None:
            query = query.where(QuestionBankItem.is_public == filters.is_public)

        if filters.search:
            search_term = f"%{filters.search}%"
            query = query.where(
                or_(
                    QuestionBankItem.question_text.ilike(search_term),
                    QuestionBankItem.description.ilike(search_term)
                )
            )

        # Order by most used, then most recent
        query = query.order_by(
            QuestionBankItem.times_used.desc(),
            QuestionBankItem.created_at.desc()
        )

        # Pagination
        offset = (filters.page - 1) * filters.limit
        query = query.offset(offset).limit(filters.limit)

        questions = self.db.execute(query).scalars().all()

        return list(questions)

    def import_question_to_assessment(
        self,
        question_id: UUID,
        assessment_id: UUID,
        company_id: UUID
    ) -> AssessmentQuestion:
        """
        Import a question from the bank into an assessment.

        Args:
            question_id: QuestionBankItem UUID
            assessment_id: Assessment UUID
            company_id: Company UUID for authorization

        Returns:
            Created AssessmentQuestion object
        """
        # Get question from bank
        bank_question = self.db.execute(
            select(QuestionBankItem).where(
                and_(
                    QuestionBankItem.id == question_id,
                    or_(
                        QuestionBankItem.company_id == company_id,
                        QuestionBankItem.is_public == True
                    )
                )
            )
        ).scalar_one_or_none()

        if not bank_question:
            raise ValueError(f"Question {question_id} not found or not accessible")

        # Get max display_order for assessment
        from sqlalchemy import func
        max_order = self.db.execute(
            select(func.max(AssessmentQuestion.display_order))
            .where(AssessmentQuestion.assessment_id == assessment_id)
        ).scalar() or 0

        # Create assessment question from bank question
        assessment_question = AssessmentQuestion(
            assessment_id=assessment_id,
            question_text=bank_question.question_text,
            question_type=bank_question.question_type,
            description=bank_question.description,
            options=bank_question.options,
            correct_answers=bank_question.correct_answers,
            coding_language=bank_question.coding_language,
            starter_code=bank_question.starter_code,
            solution_code=bank_question.solution_code,
            test_cases=bank_question.test_cases,
            allowed_file_types=bank_question.allowed_file_types,
            max_file_size_mb=bank_question.max_file_size_mb,
            points=bank_question.points,
            difficulty=bank_question.difficulty,
            category=bank_question.category,
            tags=bank_question.tags,
            display_order=max_order + 1,
        )

        self.db.add(assessment_question)

        # Increment times_used
        bank_question.times_used += 1

        self.db.commit()
        self.db.refresh(assessment_question)

        return assessment_question

    def get_question(
        self,
        question_id: UUID,
        company_id: UUID
    ) -> QuestionBankItem:
        """
        Get question bank item by ID.

        Args:
            question_id: QuestionBankItem UUID
            company_id: Company UUID

        Returns:
            QuestionBankItem object
        """
        question = self.db.execute(
            select(QuestionBankItem).where(
                and_(
                    QuestionBankItem.id == question_id,
                    or_(
                        QuestionBankItem.company_id == company_id,
                        QuestionBankItem.is_public == True
                    )
                )
            )
        ).scalar_one_or_none()

        if not question:
            raise ValueError(f"Question {question_id} not found")

        return question

    def update_question(
        self,
        question_id: UUID,
        data: dict,
        company_id: UUID
    ) -> QuestionBankItem:
        """
        Update question bank item.

        Args:
            question_id: QuestionBankItem UUID
            data: Update data
            company_id: Company UUID for authorization

        Returns:
            Updated QuestionBankItem object
        """
        question = self.db.execute(
            select(QuestionBankItem).where(
                and_(
                    QuestionBankItem.id == question_id,
                    QuestionBankItem.company_id == company_id
                )
            )
        ).scalar_one_or_none()

        if not question:
            raise ValueError(f"Question {question_id} not found or not owned by company")

        # Update fields
        for field, value in data.items():
            if hasattr(question, field):
                setattr(question, field, value)

        self.db.commit()
        self.db.refresh(question)

        return question

    def delete_question(
        self,
        question_id: UUID,
        company_id: UUID
    ) -> bool:
        """
        Delete question bank item.

        Args:
            question_id: QuestionBankItem UUID
            company_id: Company UUID for authorization

        Returns:
            True if deleted
        """
        question = self.db.execute(
            select(QuestionBankItem).where(
                and_(
                    QuestionBankItem.id == question_id,
                    QuestionBankItem.company_id == company_id
                )
            )
        ).scalar_one_or_none()

        if not question:
            raise ValueError(f"Question {question_id} not found")

        self.db.delete(question)
        self.db.commit()

        return True

    def get_public_questions(
        self,
        filters: QuestionBankFilters
    ) -> List[QuestionBankItem]:
        """
        Get public questions available to all companies.

        Args:
            filters: Search filters

        Returns:
            List of public QuestionBankItem objects
        """
        filters.is_public = True
        # Use None for company_id to get all public questions
        return self.search_questions(UUID(int=0), filters)

    def mark_as_verified(
        self,
        question_id: UUID
    ) -> QuestionBankItem:
        """
        Mark question as verified (admin only).

        Args:
            question_id: QuestionBankItem UUID

        Returns:
            Updated QuestionBankItem object
        """
        question = self.db.execute(
            select(QuestionBankItem).where(QuestionBankItem.id == question_id)
        ).scalar_one_or_none()

        if not question:
            raise ValueError(f"Question {question_id} not found")

        question.is_verified = True

        self.db.commit()
        self.db.refresh(question)

        return question
