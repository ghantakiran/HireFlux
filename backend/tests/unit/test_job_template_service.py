"""Unit Tests for Job Template Service

Tests job template functionality with TDD approach:
- Template CRUD operations
- Template categorization
- Public vs. private templates
- Usage tracking
- Template application to jobs
- Authorization checks

Test Approach: BDD-style with Given-When-Then pattern
"""

import pytest
from datetime import datetime
from uuid import uuid4
from sqlalchemy.orm import Session

from app.services.job_template_service import JobTemplateService
from app.db.models.company import Company, CompanyMember
from app.db.models.job_template import JobTemplate
from app.db.models.user import User
from app.schemas.job_template import (
    JobTemplateCreate,
    JobTemplateUpdate,
    TemplateVisibility,
    TemplateCategory,
)


# ============================================================================
# Fixtures
# ============================================================================


@pytest.fixture
def sample_company_with_owner(db_session: Session):
    """Create a sample company with owner for testing"""
    # Create user
    owner = User(
        id=uuid4(),
        email="owner@testcompany.com",
        password_hash="hashed_password_123",
        email_verified=True,
    )
    db_session.add(owner)

    # Create company
    company = Company(
        id=uuid4(),
        name="Test Company",
        domain="testcompany.com",
        industry="Technology",
        size="1-10",
        subscription_tier="growth",
        subscription_status="active",
    )
    db_session.add(company)

    # Create company member (owner)
    member = CompanyMember(
        id=uuid4(),
        company_id=company.id,
        user_id=owner.id,
        role="owner",
        status="active",
        joined_at=datetime.utcnow(),
    )
    db_session.add(member)

    db_session.commit()
    db_session.refresh(company)
    db_session.refresh(owner)
    db_session.refresh(member)

    return {"company": company, "owner": owner, "member": member}


@pytest.fixture
def sample_template_data():
    """Sample job template data"""
    return JobTemplateCreate(
        name="Senior Software Engineer Template",
        category=TemplateCategory.ENGINEERING,
        visibility=TemplateVisibility.PRIVATE,
        title="Senior Software Engineer",
        department="Engineering",
        employment_type="full_time",
        experience_level="senior",
        description="We are seeking a Senior Software Engineer to join our growing team...",
        requirements=[
            "5+ years of professional software development experience",
            "Strong proficiency in Python, JavaScript, or similar languages",
            "Experience with cloud platforms (AWS, GCP, or Azure)",
        ],
        responsibilities=[
            "Design and build scalable backend systems",
            "Lead technical design discussions",
            "Mentor junior engineers",
        ],
        skills=["Python", "React", "AWS", "Docker", "PostgreSQL"],
    )


# ============================================================================
# Test Cases - Template Creation
# ============================================================================


class TestJobTemplateCreation:
    """Test job template creation with validation"""

    def test_create_private_template_success(
        self, db_session: Session, sample_company_with_owner, sample_template_data
    ):
        """
        GIVEN: A company owner wants to create a reusable job template
        WHEN: They provide valid template data
        THEN: Template is created and saved with correct fields
        """
        # Given
        company = sample_company_with_owner["company"]
        service = JobTemplateService(db_session)

        # When
        template = service.create_template(
            template_data=sample_template_data, company_id=company.id
        )

        # Then
        assert template.id is not None
        assert template.name == "Senior Software Engineer Template"
        assert template.category == TemplateCategory.ENGINEERING
        assert template.visibility == TemplateVisibility.PRIVATE
        assert template.company_id == company.id
        assert template.title == "Senior Software Engineer"
        assert len(template.requirements) == 3
        assert len(template.responsibilities) == 3
        assert len(template.skills) == 5
        assert template.usage_count == 0

    def test_create_public_template_success(
        self, db_session: Session, sample_company_with_owner
    ):
        """
        GIVEN: Platform admin wants to create a public template
        WHEN: They create a template with public visibility
        THEN: Template is accessible to all companies
        """
        # Given
        service = JobTemplateService(db_session)
        public_template_data = JobTemplateCreate(
            name="Product Manager Template",
            category=TemplateCategory.PRODUCT,
            visibility=TemplateVisibility.PUBLIC,
            title="Product Manager",
            department="Product",
            employment_type="full_time",
            experience_level="mid",
            description="Join our product team...",
            requirements=["3+ years PM experience"],
            responsibilities=["Define product roadmap"],
            skills=["Product Strategy", "Analytics"],
        )

        # When
        template = service.create_template(
            template_data=public_template_data, company_id=None  # Public templates
        )

        # Then
        assert template.visibility == TemplateVisibility.PUBLIC
        assert template.company_id is None

    def test_create_template_with_missing_required_fields_fails(
        self, db_session: Session, sample_company_with_owner
    ):
        """
        GIVEN: User attempts to create a template
        WHEN: Required fields are missing
        THEN: Validation error is raised
        """
        # Given
        company = sample_company_with_owner["company"]
        service = JobTemplateService(db_session)

        # When/Then
        with pytest.raises(ValueError, match="Template name is required"):
            service.create_template(
                template_data=JobTemplateCreate(
                    name="",  # Empty name
                    category=TemplateCategory.ENGINEERING,
                    visibility=TemplateVisibility.PRIVATE,
                    title="Engineer",
                    description="Description",
                ),
                company_id=company.id,
            )


# ============================================================================
# Test Cases - Template Retrieval
# ============================================================================


class TestJobTemplateRetrieval:
    """Test job template listing and filtering"""

    def test_list_private_templates_for_company(
        self, db_session: Session, sample_company_with_owner, sample_template_data
    ):
        """
        GIVEN: Company has multiple private templates
        WHEN: They list templates
        THEN: Only their private templates are returned
        """
        # Given
        company = sample_company_with_owner["company"]
        service = JobTemplateService(db_session)

        # Create 3 private templates
        for i in range(3):
            data = sample_template_data.copy()
            data.name = f"Template {i+1}"
            service.create_template(template_data=data, company_id=company.id)

        # When
        templates = service.list_templates(
            company_id=company.id, visibility=TemplateVisibility.PRIVATE
        )

        # Then
        assert len(templates) == 3

    def test_list_public_templates(self, db_session: Session):
        """
        GIVEN: Multiple public templates exist
        WHEN: User lists public templates
        THEN: All public templates are returned
        """
        # Given
        service = JobTemplateService(db_session)

        # Create public templates
        public_template = JobTemplateCreate(
            name="Public Template",
            category=TemplateCategory.ENGINEERING,
            visibility=TemplateVisibility.PUBLIC,
            title="Software Engineer",
            description="Description",
        )
        service.create_template(template_data=public_template, company_id=None)

        # When
        templates = service.list_templates(visibility=TemplateVisibility.PUBLIC)

        # Then
        assert len(templates) >= 1
        assert all(t.visibility == TemplateVisibility.PUBLIC for t in templates)

    def test_filter_templates_by_category(
        self, db_session: Session, sample_company_with_owner
    ):
        """
        GIVEN: Templates exist across multiple categories
        WHEN: User filters by specific category
        THEN: Only templates in that category are returned
        """
        # Given
        company = sample_company_with_owner["company"]
        service = JobTemplateService(db_session)

        # Create templates in different categories
        eng_template = JobTemplateCreate(
            name="Engineering Template",
            category=TemplateCategory.ENGINEERING,
            visibility=TemplateVisibility.PRIVATE,
            title="Engineer",
            description="Description",
        )
        sales_template = JobTemplateCreate(
            name="Sales Template",
            category=TemplateCategory.SALES,
            visibility=TemplateVisibility.PRIVATE,
            title="Sales Rep",
            description="Description",
        )

        service.create_template(template_data=eng_template, company_id=company.id)
        service.create_template(template_data=sales_template, company_id=company.id)

        # When
        eng_templates = service.list_templates(
            company_id=company.id, category=TemplateCategory.ENGINEERING
        )

        # Then
        assert len(eng_templates) == 1
        assert eng_templates[0].category == TemplateCategory.ENGINEERING


# ============================================================================
# Test Cases - Template Updates
# ============================================================================


class TestJobTemplateUpdate:
    """Test job template updates and modifications"""

    def test_update_template_success(
        self, db_session: Session, sample_company_with_owner, sample_template_data
    ):
        """
        GIVEN: Company has an existing template
        WHEN: They update template fields
        THEN: Template is updated successfully
        """
        # Given
        company = sample_company_with_owner["company"]
        service = JobTemplateService(db_session)
        template = service.create_template(
            template_data=sample_template_data, company_id=company.id
        )

        # When
        update_data = JobTemplateUpdate(
            name="Updated Template Name",
            description="Updated description with more details...",
        )
        updated_template = service.update_template(
            template_id=template.id, template_data=update_data, company_id=company.id
        )

        # Then
        assert updated_template.name == "Updated Template Name"
        assert updated_template.description == "Updated description with more details..."

    def test_update_template_unauthorized_fails(
        self, db_session: Session, sample_company_with_owner, sample_template_data
    ):
        """
        GIVEN: Company A has a private template
        WHEN: Company B attempts to update it
        THEN: Authorization error is raised
        """
        # Given
        company_a = sample_company_with_owner["company"]
        service = JobTemplateService(db_session)

        template = service.create_template(
            template_data=sample_template_data, company_id=company_a.id
        )

        # Create company B
        company_b_id = uuid4()

        # When/Then
        with pytest.raises(PermissionError, match="Not authorized"):
            service.update_template(
                template_id=template.id,
                template_data=JobTemplateUpdate(name="Hacked"),
                company_id=company_b_id,
            )


# ============================================================================
# Test Cases - Template Deletion
# ============================================================================


class TestJobTemplateDeletion:
    """Test job template deletion with authorization"""

    def test_delete_template_success(
        self, db_session: Session, sample_company_with_owner, sample_template_data
    ):
        """
        GIVEN: Company has a template
        WHEN: They delete it
        THEN: Template is removed from database
        """
        # Given
        company = sample_company_with_owner["company"]
        service = JobTemplateService(db_session)
        template = service.create_template(
            template_data=sample_template_data, company_id=company.id
        )

        # When
        service.delete_template(template_id=template.id, company_id=company.id)

        # Then
        with pytest.raises(ValueError, match="Template not found"):
            service.get_template(template_id=template.id, company_id=company.id)

    def test_delete_template_unauthorized_fails(
        self, db_session: Session, sample_company_with_owner, sample_template_data
    ):
        """
        GIVEN: Company A has a template
        WHEN: Company B attempts to delete it
        THEN: Authorization error is raised
        """
        # Given
        company_a = sample_company_with_owner["company"]
        service = JobTemplateService(db_session)
        template = service.create_template(
            template_data=sample_template_data, company_id=company_a.id
        )

        company_b_id = uuid4()

        # When/Then
        with pytest.raises(PermissionError, match="Not authorized"):
            service.delete_template(template_id=template.id, company_id=company_b_id)


# ============================================================================
# Test Cases - Template Usage Tracking
# ============================================================================


class TestJobTemplateUsageTracking:
    """Test template usage count incrementation"""

    def test_increment_usage_count_on_apply(
        self, db_session: Session, sample_company_with_owner, sample_template_data
    ):
        """
        GIVEN: A template exists with usage_count = 0
        WHEN: It is used to create a job
        THEN: Usage count is incremented
        """
        # Given
        company = sample_company_with_owner["company"]
        service = JobTemplateService(db_session)
        template = service.create_template(
            template_data=sample_template_data, company_id=company.id
        )
        assert template.usage_count == 0

        # When
        service.increment_usage_count(template_id=template.id)

        # Then
        updated_template = service.get_template(
            template_id=template.id, company_id=company.id
        )
        assert updated_template.usage_count == 1

    def test_usage_count_multiple_increments(
        self, db_session: Session, sample_company_with_owner, sample_template_data
    ):
        """
        GIVEN: A template is used multiple times
        WHEN: Usage count is incremented each time
        THEN: Count accurately reflects total usage
        """
        # Given
        company = sample_company_with_owner["company"]
        service = JobTemplateService(db_session)
        template = service.create_template(
            template_data=sample_template_data, company_id=company.id
        )

        # When
        for _ in range(5):
            service.increment_usage_count(template_id=template.id)

        # Then
        updated_template = service.get_template(
            template_id=template.id, company_id=company.id
        )
        assert updated_template.usage_count == 5


# ============================================================================
# Test Cases - Edge Cases
# ============================================================================


class TestJobTemplateEdgeCases:
    """Test edge cases and error handling"""

    def test_get_nonexistent_template_fails(
        self, db_session: Session, sample_company_with_owner
    ):
        """
        GIVEN: Template does not exist
        WHEN: User attempts to retrieve it
        THEN: Not found error is raised
        """
        # Given
        company = sample_company_with_owner["company"]
        service = JobTemplateService(db_session)
        fake_template_id = uuid4()

        # When/Then
        with pytest.raises(ValueError, match="Template not found"):
            service.get_template(template_id=fake_template_id, company_id=company.id)

    def test_create_duplicate_template_name_allowed(
        self, db_session: Session, sample_company_with_owner, sample_template_data
    ):
        """
        GIVEN: Template with name "X" exists
        WHEN: User creates another template with name "X"
        THEN: Duplicate names are allowed (users can manage this themselves)
        """
        # Given
        company = sample_company_with_owner["company"]
        service = JobTemplateService(db_session)

        # When
        template1 = service.create_template(
            template_data=sample_template_data, company_id=company.id
        )
        template2 = service.create_template(
            template_data=sample_template_data, company_id=company.id
        )

        # Then
        assert template1.name == template2.name
        assert template1.id != template2.id
