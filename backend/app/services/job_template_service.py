"""Job Template Service - Business logic for job template operations

Following Test-Driven Development: This service is implemented to satisfy the tests
in test_job_template_service.py.

Service Responsibilities:
- Template CRUD operations
- Template categorization and filtering
- Public vs. private template management
- Usage tracking
- Authorization checks
"""

from typing import Optional, List
from uuid import UUID

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_

from app.db.models.job_template import JobTemplate
from app.schemas.job_template import (
    JobTemplateCreate,
    JobTemplateUpdate,
    TemplateVisibility,
    TemplateCategory,
)


class JobTemplateService:
    """Service for job template operations"""

    def __init__(self, db: Session):
        self.db = db

    def create_template(
        self, template_data: JobTemplateCreate, company_id: Optional[UUID] = None
    ) -> JobTemplate:
        """
        Create a new job template

        Args:
            template_data: Template creation data
            company_id: Company ID (None for public templates)

        Returns:
            JobTemplate: Created template

        Raises:
            ValueError: If required fields are missing
        """
        # Validation
        if not template_data.name or len(template_data.name.strip()) == 0:
            raise ValueError("Template name is required")

        # Create template
        template = JobTemplate(
            company_id=company_id,
            name=template_data.name,
            category=template_data.category.value,
            visibility=template_data.visibility.value,
            title=template_data.title,
            department=template_data.department,
            employment_type=template_data.employment_type,
            experience_level=template_data.experience_level,
            description=template_data.description,
            requirements=template_data.requirements or [],
            responsibilities=template_data.responsibilities or [],
            skills=template_data.skills or [],
            usage_count=0,
        )

        self.db.add(template)
        self.db.commit()
        self.db.refresh(template)

        return template

    def get_template(
        self, template_id: UUID, company_id: Optional[UUID] = None
    ) -> JobTemplate:
        """
        Get a job template by ID

        Args:
            template_id: Template ID
            company_id: Company ID (for authorization)

        Returns:
            JobTemplate: The template

        Raises:
            ValueError: If template not found
        """
        query = self.db.query(JobTemplate).filter(JobTemplate.id == template_id)

        # If company_id provided, only show templates they can access
        if company_id:
            query = query.filter(
                or_(
                    JobTemplate.company_id == company_id,  # Their private templates
                    JobTemplate.visibility == TemplateVisibility.PUBLIC.value,  # Public templates
                )
            )

        template = query.first()

        if not template:
            raise ValueError("Template not found")

        return template

    def list_templates(
        self,
        company_id: Optional[UUID] = None,
        visibility: Optional[TemplateVisibility] = None,
        category: Optional[TemplateCategory] = None,
        page: int = 1,
        page_size: int = 50,
    ) -> List[JobTemplate]:
        """
        List job templates with filtering

        Args:
            company_id: Company ID (to filter by company's private templates)
            visibility: Filter by visibility (public/private)
            category: Filter by category
            page: Page number (1-indexed)
            page_size: Results per page

        Returns:
            List of templates
        """
        query = self.db.query(JobTemplate)

        # Apply filters
        if visibility:
            query = query.filter(JobTemplate.visibility == visibility.value)

        if category:
            query = query.filter(JobTemplate.category == category.value)

        if company_id:
            # Show company's private templates + all public templates
            if visibility == TemplateVisibility.PRIVATE:
                # Only their private templates
                query = query.filter(JobTemplate.company_id == company_id)
            elif visibility == TemplateVisibility.PUBLIC:
                # Only public templates
                query = query.filter(
                    JobTemplate.visibility == TemplateVisibility.PUBLIC.value
                )
            else:
                # Both private and public
                query = query.filter(
                    or_(
                        JobTemplate.company_id == company_id,
                        JobTemplate.visibility == TemplateVisibility.PUBLIC.value,
                    )
                )

        # Order by created_at descending
        query = query.order_by(JobTemplate.created_at.desc())

        # Pagination
        offset = (page - 1) * page_size
        query = query.offset(offset).limit(page_size)

        return query.all()

    def update_template(
        self,
        template_id: UUID,
        template_data: JobTemplateUpdate,
        company_id: UUID,
    ) -> JobTemplate:
        """
        Update a job template

        Args:
            template_id: Template ID
            template_data: Update data
            company_id: Company ID (for authorization)

        Returns:
            JobTemplate: Updated template

        Raises:
            ValueError: If template not found
            PermissionError: If not authorized
        """
        template = self.db.query(JobTemplate).filter(JobTemplate.id == template_id).first()

        if not template:
            raise ValueError("Template not found")

        # Authorization: Only the owning company can update their private templates
        if template.visibility == TemplateVisibility.PRIVATE.value and template.company_id != company_id:
            raise PermissionError("Not authorized to update this template")

        # Public templates can only be updated by admins (not implemented here)
        if template.visibility == TemplateVisibility.PUBLIC.value and template.company_id is None:
            raise PermissionError("Not authorized to update public templates")

        # Update fields (only if provided)
        update_data = template_data.dict(exclude_unset=True)

        for field, value in update_data.items():
            if field in ["category", "visibility"] and value is not None:
                setattr(template, field, value.value)
            elif value is not None:
                setattr(template, field, value)

        self.db.commit()
        self.db.refresh(template)

        return template

    def delete_template(self, template_id: UUID, company_id: UUID) -> None:
        """
        Delete a job template

        Args:
            template_id: Template ID
            company_id: Company ID (for authorization)

        Raises:
            ValueError: If template not found
            PermissionError: If not authorized
        """
        template = self.db.query(JobTemplate).filter(JobTemplate.id == template_id).first()

        if not template:
            raise ValueError("Template not found")

        # Authorization
        if template.company_id != company_id:
            raise PermissionError("Not authorized to delete this template")

        self.db.delete(template)
        self.db.commit()

    def increment_usage_count(self, template_id: UUID) -> None:
        """
        Increment the usage count for a template

        Args:
            template_id: Template ID
        """
        template = self.db.query(JobTemplate).filter(JobTemplate.id == template_id).first()

        if template:
            template.usage_count += 1
            self.db.commit()
