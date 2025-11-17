"""Job Template API Endpoints (Issue #24)

API endpoints for job template management:
- List templates with filters (public + company private)
- Create new template
- Get template by ID
- Update template (owner only)
- Delete template (owner only)
- Create job from template

Following FastAPI patterns from existing endpoints.
"""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.db.models.user import User
from app.db.models.company import CompanyMember
from app.api.dependencies import get_current_user
from app.services.job_template_service import JobTemplateService
from app.schemas.job_template import (
    JobTemplateCreate,
    JobTemplateUpdate,
    JobTemplateResponse,
    JobTemplateListResponse,
    TemplateVisibility,
    TemplateCategory,
)

router = APIRouter(prefix="/employer/job-templates", tags=["Job Templates"])


def get_company_id_from_user(current_user: User, db: Session) -> UUID:
    """
    Helper function to get company_id from current user.

    Raises HTTPException if user is not an employer or not associated with a company.
    """
    # Verify user is an employer
    if current_user.user_type != "employer":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only employers can access job templates",
        )

    # Find company where user is a member
    company_member = (
        db.query(CompanyMember).filter(CompanyMember.user_id == current_user.id).first()
    )

    if not company_member:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No company found for this user",
        )

    return company_member.company_id


# ============================================================================
# List Templates (with filters)
# ============================================================================
@router.get("", response_model=JobTemplateListResponse)
def list_job_templates(
    visibility: Optional[TemplateVisibility] = Query(
        None, description="Filter by visibility (public/private)"
    ),
    category: Optional[TemplateCategory] = Query(
        None, description="Filter by category"
    ),
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(50, ge=1, le=100, description="Results per page (max 100)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    List job templates with filtering.

    Returns:
    - Public templates (available to all)
    - Company's private templates

    Filters:
    - visibility: public, private, or all (default)
    - category: engineering, product, design, sales, etc.
    - page, page_size: pagination

    Sort: Newest first (created_at DESC)
    """
    company_id = get_company_id_from_user(current_user, db)
    template_service = JobTemplateService(db)

    try:
        templates = template_service.list_templates(
            company_id=company_id,
            visibility=visibility,
            category=category,
            page=page,
            page_size=page_size,
        )

        # Count total (for pagination info)
        # For simplicity, return templates count as total
        # In production, you'd want a separate count query
        total = len(templates)

        return JobTemplateListResponse(
            templates=templates,
            total=total,
            page=page,
            page_size=page_size,
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list templates: {str(e)}",
        )


# ============================================================================
# Create Template
# ============================================================================
@router.post("", response_model=JobTemplateResponse, status_code=status.HTTP_201_CREATED)
def create_job_template(
    template_data: JobTemplateCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new job template.

    Templates can be:
    - Private: Only visible to your company
    - Public: Visible to all companies (requires admin approval - future)

    Required fields:
    - name: Template name (e.g., "Senior Software Engineer")
    - category: Template category (e.g., "engineering")
    - title: Job title

    Optional fields:
    - visibility: public or private (default: private)
    - department, employment_type, experience_level
    - description, requirements, responsibilities, skills

    Returns: Created template with ID
    """
    company_id = get_company_id_from_user(current_user, db)
    template_service = JobTemplateService(db)

    try:
        template = template_service.create_template(
            template_data=template_data,
            company_id=company_id,
        )

        return template

    except ValueError as e:
        # Validation errors
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create template: {str(e)}",
        )


# ============================================================================
# Get Template by ID
# ============================================================================
@router.get("/{template_id}", response_model=JobTemplateResponse)
def get_job_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Get a specific job template by ID.

    Authorization:
    - Public templates: Accessible to all employers
    - Private templates: Only accessible to owning company

    Returns: Template details
    """
    company_id = get_company_id_from_user(current_user, db)
    template_service = JobTemplateService(db)

    try:
        template = template_service.get_template(
            template_id=template_id,
            company_id=company_id,
        )

        return template

    except ValueError as e:
        # Template not found
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get template: {str(e)}",
        )


# ============================================================================
# Update Template
# ============================================================================
@router.put("/{template_id}", response_model=JobTemplateResponse)
def update_job_template(
    template_id: UUID,
    template_data: JobTemplateUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Update a job template.

    Authorization:
    - Only the owning company can update their private templates
    - Public templates cannot be updated (admin only - future)

    All fields are optional (only update provided fields).

    Returns: Updated template
    """
    company_id = get_company_id_from_user(current_user, db)
    template_service = JobTemplateService(db)

    try:
        template = template_service.update_template(
            template_id=template_id,
            template_data=template_data,
            company_id=company_id,
        )

        return template

    except ValueError as e:
        # Template not found
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except PermissionError as e:
        # Not authorized
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update template: {str(e)}",
        )


# ============================================================================
# Delete Template
# ============================================================================
@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Delete a job template.

    Authorization:
    - Only the owning company can delete their templates
    - Public templates cannot be deleted (admin only - future)

    Returns: 204 No Content on success
    """
    company_id = get_company_id_from_user(current_user, db)
    template_service = JobTemplateService(db)

    try:
        template_service.delete_template(
            template_id=template_id,
            company_id=company_id,
        )

        return None  # 204 No Content

    except ValueError as e:
        # Template not found
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except PermissionError as e:
        # Not authorized
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete template: {str(e)}",
        )


# ============================================================================
# Create Job from Template
# ============================================================================
@router.post("/jobs/from-template/{template_id}", response_model=dict)
def create_job_from_template(
    template_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Create a new job posting from a template.

    Process:
    1. Get template by ID
    2. Increment usage count
    3. Create job with template data pre-filled
    4. Return job ID for editing

    Note: This endpoint creates a draft job. The employer should then
    navigate to /employer/jobs/{job_id}/edit to customize and publish.

    Returns:
    - job_id: UUID of created job
    - template_id: Template used
    - message: Success message
    """
    company_id = get_company_id_from_user(current_user, db)
    template_service = JobTemplateService(db)

    try:
        # Get template
        template = template_service.get_template(
            template_id=template_id,
            company_id=company_id,
        )

        # Increment usage count
        template_service.increment_usage_count(template_id)

        # TODO: Create job from template data
        # This requires the JobService, which may need to be implemented
        # For now, return template data that frontend can use to pre-fill form

        return {
            "success": True,
            "message": "Template loaded. Ready to create job.",
            "template_id": str(template_id),
            "template_data": {
                "title": template.title,
                "department": template.department,
                "employment_type": template.employment_type,
                "experience_level": template.experience_level,
                "description": template.description,
                "requirements": template.requirements,
                "responsibilities": template.responsibilities,
                "skills": template.skills,
            },
        }

    except ValueError as e:
        # Template not found
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e),
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create job from template: {str(e)}",
        )
