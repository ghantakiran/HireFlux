"""White-Label Branding Management Endpoints - Sprint 17-18 Phase 3

REST API endpoints for managing white-label branding configuration.
Enterprise feature requiring Enterprise plan.
"""

from typing import List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from app.api import deps
from app.db.models.user import User
from app.db.models.company import CompanyMember
from app.schemas.api_key import (
    WhiteLabelBrandingUpdate,
    WhiteLabelBrandingResponse,
    CustomApplicationFieldCreate,
    CustomApplicationFieldUpdate,
    CustomApplicationFieldResponse,
    DomainSetupRequest,
    DomainVerificationResponse,
)
from app.services.white_label_service import WhiteLabelService


router = APIRouter()


# ============================================================================
# DEPENDENCIES
# ============================================================================


def get_white_label_service(db: Session = Depends(deps.get_db)) -> WhiteLabelService:
    """Get white-label service instance"""
    return WhiteLabelService(db=db)


def require_admin_or_owner(
    current_user: User = Depends(deps.get_current_user),
    db: Session = Depends(deps.get_db),
) -> CompanyMember:
    """
    Require user to be company admin or owner

    Only admins and owners can manage white-label settings for security.
    """
    membership = (
        db.query(CompanyMember)
        .filter(CompanyMember.user_id == current_user.id)
        .filter(CompanyMember.status == "active")
        .first()
    )

    if not membership:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You must be a company member to manage white-label settings",
        )

    if membership.role not in ["owner", "admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only company owners and admins can manage white-label settings",
        )

    return membership


# ============================================================================
# WHITE-LABEL CONFIGURATION ENDPOINTS
# ============================================================================


@router.get(
    "/config",
    response_model=WhiteLabelBrandingResponse,
    summary="Get White-Label Configuration",
    description="Retrieve current white-label branding configuration for the company",
)
def get_white_label_config(
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Get white-label branding configuration

    Returns current branding settings including:
    - Brand identity (logos, colors, fonts)
    - Custom domain status
    - Email & career page customization
    - Feature flags

    If no configuration exists, returns default configuration.
    """
    branding = service.get_branding(membership.company_id)
    return WhiteLabelBrandingResponse.model_validate(branding)


@router.put(
    "/config",
    response_model=WhiteLabelBrandingResponse,
    summary="Update White-Label Configuration",
    description="Update white-label branding settings (colors, fonts, email templates, etc.)",
)
def update_white_label_config(
    update_data: WhiteLabelBrandingUpdate,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Update white-label branding configuration

    Allows updating:
    - Company display name
    - Logo URLs (after upload)
    - Color scheme (with WCAG AA validation)
    - Typography settings
    - Email branding
    - Career page customization
    - Social media links
    - Custom CSS
    - Feature flags

    **Color Validation:**
    - Must be valid hex format (#RRGGBB)
    - Text/background must meet WCAG AA contrast ratio (4.5:1 minimum)

    **Enterprise Feature:**
    Requires Enterprise plan to enable white-label features.
    """
    try:
        branding = service.update_branding(membership.company_id, update_data)
        return WhiteLabelBrandingResponse.model_validate(branding)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/enable",
    response_model=WhiteLabelBrandingResponse,
    summary="Enable White-Label Features",
    description="Enable white-label branding (requires Enterprise plan)",
)
def enable_white_label(
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Enable white-label features

    **Requirements:**
    - Enterprise plan subscription
    - Company owner or admin role

    Once enabled:
    - Custom branding applied to all touchpoints
    - Custom domain can be configured
    - Branded emails sent to candidates
    - Career page uses custom branding
    - "Powered by HireFlux" can be hidden
    """
    try:
        branding = service.enable_white_label(membership.company_id)
        return WhiteLabelBrandingResponse.model_validate(branding)
    except PermissionError as e:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=str(e),
        )


@router.post(
    "/disable",
    response_model=WhiteLabelBrandingResponse,
    summary="Disable White-Label Features",
    description="Disable white-label branding (revert to HireFlux branding)",
)
def disable_white_label(
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Disable white-label features

    Reverts to default HireFlux branding but preserves configuration.
    Can be re-enabled later without losing settings.
    """
    branding = service.disable_white_label(membership.company_id)
    return WhiteLabelBrandingResponse.model_validate(branding)


# ============================================================================
# LOGO UPLOAD ENDPOINTS
# ============================================================================


@router.post(
    "/logos/primary",
    summary="Upload Primary Logo",
    description="Upload primary logo (light background)",
)
async def upload_primary_logo(
    file: UploadFile = File(...),
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Upload primary logo

    **Specifications:**
    - Max file size: 2MB
    - Formats: PNG, JPG, SVG
    - Recommended dimensions: 200x200 to 800x800px
    - Used on: Career pages, application portal, emails (light background)

    Returns S3 URL of uploaded logo.
    """
    try:
        file_data = await file.read()
        from io import BytesIO
        file_obj = BytesIO(file_data)
        file_obj.name = file.filename
        file_obj.content_type = file.content_type

        url = service.upload_logo(membership.company_id, "primary", file_obj)
        return {"url": url, "type": "primary"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/logos/dark",
    summary="Upload Dark Logo",
    description="Upload logo for dark backgrounds",
)
async def upload_dark_logo(
    file: UploadFile = File(...),
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """Upload logo for dark backgrounds"""
    try:
        file_data = await file.read()
        from io import BytesIO
        file_obj = BytesIO(file_data)
        file_obj.name = file.filename
        file_obj.content_type = file.content_type

        url = service.upload_logo(membership.company_id, "dark", file_obj)
        return {"url": url, "type": "dark"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/logos/icon",
    summary="Upload Icon/Favicon",
    description="Upload square icon for favicon and app icons",
)
async def upload_icon_logo(
    file: UploadFile = File(...),
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Upload icon/favicon

    **Specifications:**
    - Required dimensions: 512x512px (square)
    - Formats: PNG, SVG
    - Used for: Browser favicon, mobile app icon
    """
    try:
        file_data = await file.read()
        from io import BytesIO
        file_obj = BytesIO(file_data)
        file_obj.name = file.filename
        file_obj.content_type = file.content_type

        url = service.upload_logo(membership.company_id, "icon", file_obj)
        return {"url": url, "type": "icon"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/logos/email",
    summary="Upload Email Header Logo",
    description="Upload logo for email headers (wider format)",
)
async def upload_email_logo(
    file: UploadFile = File(...),
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Upload email header logo

    **Specifications:**
    - Recommended dimensions: 600x200px (3:1 ratio)
    - Formats: PNG, JPG
    - Used in: All candidate emails
    """
    try:
        file_data = await file.read()
        from io import BytesIO
        file_obj = BytesIO(file_data)
        file_obj.name = file.filename
        file_obj.content_type = file.content_type

        url = service.upload_logo(membership.company_id, "email", file_obj)
        return {"url": url, "type": "email"}
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


# ============================================================================
# CUSTOM DOMAIN ENDPOINTS
# ============================================================================


@router.post(
    "/domain",
    response_model=DomainVerificationResponse,
    summary="Set Custom Domain",
    description="Configure custom domain for career page (e.g., careers.company.com)",
)
def set_custom_domain(
    domain_request: DomainSetupRequest,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Set up custom domain

    **Process:**
    1. Submit your custom domain (e.g., careers.acme.com)
    2. Receive DNS records to add to your domain
    3. Add DNS records to your domain registrar
    4. Call verify endpoint to check DNS configuration
    5. SSL certificate auto-provisioned via Let's Encrypt

    **DNS Records Required:**
    - CNAME: Point domain to white-label.hireflux.com
    - TXT: Verification record for domain ownership

    **Enterprise Feature:**
    Requires Enterprise plan and white-label enabled.
    """
    try:
        verification = service.set_custom_domain(
            membership.company_id,
            domain_request.domain,
        )
        return DomainVerificationResponse.model_validate(verification)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.post(
    "/domain/verify",
    summary="Verify Custom Domain",
    description="Verify DNS records for custom domain",
)
def verify_custom_domain(
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Verify custom domain DNS configuration

    Checks:
    - CNAME record points to HireFlux
    - TXT verification record exists
    - Domain resolves correctly

    If verification succeeds:
    - Domain marked as verified
    - SSL certificate auto-provisioned
    - Career page accessible at custom domain
    """
    verified = service.verify_custom_domain(membership.company_id)
    return {
        "verified": verified,
        "message": "Domain verified successfully" if verified else "Domain verification failed",
    }


@router.get(
    "/domain/status",
    summary="Get Domain Verification Status",
    description="Check current status of custom domain verification",
)
def get_domain_status(
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Get domain verification status

    Returns current status and any error messages.
    """
    branding = service.get_branding(membership.company_id)
    return {
        "domain": branding.custom_domain,
        "verified": branding.custom_domain_verified,
        "ssl_enabled": branding.custom_domain_ssl_enabled,
    }


# ============================================================================
# CUSTOM APPLICATION FIELDS ENDPOINTS
# ============================================================================


@router.get(
    "/application-fields",
    response_model=List[CustomApplicationFieldResponse],
    summary="List Custom Application Fields",
    description="Get all custom fields for application forms",
)
def list_custom_fields(
    membership: CompanyMember = Depends(require_admin_or_owner),
    db: Session = Depends(deps.get_db),
):
    """
    List custom application form fields

    Returns fields in display order.
    """
    from app.db.models.api_key import WhiteLabelApplicationField

    fields = (
        db.query(WhiteLabelApplicationField)
        .filter(WhiteLabelApplicationField.company_id == membership.company_id)
        .filter(WhiteLabelApplicationField.is_active == True)
        .order_by(WhiteLabelApplicationField.display_order)
        .all()
    )

    return [CustomApplicationFieldResponse.model_validate(f) for f in fields]


@router.post(
    "/application-fields",
    response_model=CustomApplicationFieldResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create Custom Application Field",
    description="Add custom field to application forms",
)
def create_custom_field(
    field_data: CustomApplicationFieldCreate,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Create custom application field

    **Field Types:**
    - **text**: Single-line text input
    - **textarea**: Multi-line text input
    - **select**: Dropdown selection (requires options)
    - **checkbox**: Yes/no checkbox
    - **file**: File upload

    **Examples:**
    - Diversity statement (textarea)
    - Salary expectations (text)
    - Start date availability (text)
    - Referral source (select)
    - Portfolio upload (file)
    """
    try:
        field = service.create_custom_field(membership.company_id, field_data)
        return CustomApplicationFieldResponse.model_validate(field)
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e),
        )


@router.put(
    "/application-fields/{field_id}",
    response_model=CustomApplicationFieldResponse,
    summary="Update Custom Application Field",
    description="Update custom field configuration",
)
def update_custom_field(
    field_id: UUID,
    update_data: CustomApplicationFieldUpdate,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Update custom application field

    Can update:
    - Field label
    - Options (for select fields)
    - Required status
    - Help text
    - Active status
    """
    field = service.update_custom_field(field_id, membership.company_id, update_data)

    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom field not found",
        )

    return CustomApplicationFieldResponse.model_validate(field)


@router.delete(
    "/application-fields/{field_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete Custom Application Field",
    description="Remove custom field from application forms",
)
def delete_custom_field(
    field_id: UUID,
    membership: CompanyMember = Depends(require_admin_or_owner),
    db: Session = Depends(deps.get_db),
):
    """
    Delete custom application field

    Marks field as inactive rather than hard delete.
    Existing application data preserved.
    """
    from app.db.models.api_key import WhiteLabelApplicationField

    field = (
        db.query(WhiteLabelApplicationField)
        .filter(
            WhiteLabelApplicationField.id == field_id,
            WhiteLabelApplicationField.company_id == membership.company_id,
        )
        .first()
    )

    if not field:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Custom field not found",
        )

    field.is_active = False
    db.commit()

    return None


@router.post(
    "/application-fields/reorder",
    summary="Reorder Custom Fields",
    description="Change display order of custom fields",
)
def reorder_custom_fields(
    field_ids: List[UUID],
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Reorder custom application fields

    **Request Body:**
    Array of field UUIDs in desired display order.

    Fields will be displayed in the order provided.
    """
    success = service.reorder_custom_fields(membership.company_id, field_ids)
    return {"success": success}


# ============================================================================
# PREVIEW ENDPOINTS
# ============================================================================


@router.get(
    "/preview/career-page",
    response_class=HTMLResponse,
    summary="Preview Career Page",
    description="Preview career page with current branding",
)
def preview_career_page(
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Preview branded career page

    Returns HTML preview of career page with current branding settings.
    Includes sample job listings.
    """
    # Sample jobs for preview
    sample_jobs = [
        {"title": "Senior Software Engineer", "location": "San Francisco, CA"},
        {"title": "Product Manager", "location": "Remote"},
        {"title": "UX Designer", "location": "New York, NY"},
    ]

    html = service.render_career_page(membership.company_id, sample_jobs)
    return HTMLResponse(content=html)


@router.post(
    "/preview/email",
    response_class=HTMLResponse,
    summary="Preview Email Template",
    description="Preview email template with current branding",
)
def preview_email_template(
    template_type: str,
    membership: CompanyMember = Depends(require_admin_or_owner),
    service: WhiteLabelService = Depends(get_white_label_service),
):
    """
    Preview branded email template

    **Template Types:**
    - application_received
    - interview_scheduled
    - offer_extended
    - application_rejected

    Returns HTML preview with sample data.
    """
    sample_data = {
        "candidate_name": "John Doe",
        "job_title": "Software Engineer",
    }

    html = service.render_branded_email(
        membership.company_id,
        template_type,
        sample_data,
    )

    return HTMLResponse(content=html)
