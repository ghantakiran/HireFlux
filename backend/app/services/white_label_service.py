"""White-Label Branding Service - Sprint 17-18 Phase 3

Service for managing white-label branding configuration for Enterprise customers.

Features:
- Custom branding (logos, colors, fonts)
- Custom domain setup with DNS verification
- Branded email templates
- Branded career pages
- Custom application form fields
"""

import secrets
import socket
import re
import boto3
from datetime import datetime
from io import BytesIO
from typing import Dict, List, Optional
from uuid import UUID, uuid4

from sqlalchemy import and_
from sqlalchemy.orm import Session

from app.db.models.api_key import (
    WhiteLabelBranding,
    WhiteLabelApplicationField,
    WhiteLabelDomainVerification,
)
from app.db.models.company import Company
from app.schemas.api_key import (
    WhiteLabelBrandingUpdate,
    CustomApplicationFieldCreate,
    CustomApplicationFieldUpdate,
)


class WhiteLabelService:
    """Service for managing white-label branding configuration"""

    def __init__(self, db: Session):
        """Initialize service with database session"""
        self.db = db

    # ========================================================================
    # BRANDING CONFIGURATION MANAGEMENT
    # ========================================================================

    def get_branding(self, company_id: UUID) -> WhiteLabelBranding:
        """
        Get white-label configuration for company

        If no configuration exists, creates default configuration.

        Args:
            company_id: Company UUID

        Returns:
            WhiteLabelBranding object
        """
        branding = (
            self.db.query(WhiteLabelBranding)
            .filter(WhiteLabelBranding.company_id == company_id)
            .first()
        )

        if not branding:
            # Create default configuration
            branding = WhiteLabelBranding(
                company_id=company_id,
                is_enabled=False,
                primary_color="#3B82F6",
                secondary_color="#10B981",
                accent_color="#F59E0B",
                text_color="#1F2937",
                background_color="#FFFFFF",
                font_family="Inter",
                career_page_enabled=True,
                hide_hireflux_branding=False,
                use_custom_application_form=False,
                social_links={},
            )
            self.db.add(branding)
            self.db.commit()
            self.db.refresh(branding)

        return branding

    def update_branding(
        self,
        company_id: UUID,
        update_data: WhiteLabelBrandingUpdate,
    ) -> WhiteLabelBranding:
        """
        Update white-label configuration

        Args:
            company_id: Company UUID
            update_data: Update data

        Returns:
            Updated WhiteLabelBranding object

        Raises:
            ValueError: If validation fails (invalid colors, contrast ratio)
        """
        branding = self.get_branding(company_id)

        # Build color dict for validation
        colors_to_validate = {}
        if update_data.primary_color is not None:
            colors_to_validate["primary_color"] = update_data.primary_color
        if update_data.secondary_color is not None:
            colors_to_validate["secondary_color"] = update_data.secondary_color
        if update_data.accent_color is not None:
            colors_to_validate["accent_color"] = update_data.accent_color
        if update_data.text_color is not None:
            colors_to_validate["text_color"] = update_data.text_color
        if update_data.background_color is not None:
            colors_to_validate["background_color"] = update_data.background_color

        # Validate colors if any were provided
        if colors_to_validate:
            # Merge with current colors for contrast validation
            current_colors = {
                "primary_color": branding.primary_color,
                "secondary_color": branding.secondary_color,
                "accent_color": branding.accent_color,
                "text_color": branding.text_color,
                "background_color": branding.background_color,
            }
            current_colors.update(colors_to_validate)

            # Validate color scheme
            self.validate_color_scheme(current_colors)

        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(branding, field, value)

        branding.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(branding)

        return branding

    def enable_white_label(self, company_id: UUID) -> WhiteLabelBranding:
        """
        Enable white-label features

        Requires Enterprise plan.

        Args:
            company_id: Company UUID

        Returns:
            Updated WhiteLabelBranding object

        Raises:
            PermissionError: If company doesn't have Enterprise plan
        """
        # Check company subscription tier
        company = (
            self.db.query(Company)
            .filter(Company.id == company_id)
            .first()
        )

        if not company:
            raise ValueError("Company not found")

        if company.subscription_tier != "enterprise":
            raise PermissionError("Enterprise plan required for white-label features")

        # Get or create branding
        branding = self.get_branding(company_id)

        # Enable white-label
        branding.is_enabled = True
        if not branding.enabled_at:
            branding.enabled_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(branding)

        return branding

    def disable_white_label(self, company_id: UUID) -> WhiteLabelBranding:
        """
        Disable white-label features

        Args:
            company_id: Company UUID

        Returns:
            Updated WhiteLabelBranding object
        """
        branding = self.get_branding(company_id)

        branding.is_enabled = False
        branding.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(branding)

        return branding

    # ========================================================================
    # LOGO UPLOAD
    # ========================================================================

    def upload_logo(
        self,
        company_id: UUID,
        logo_type: str,
        file: BytesIO,
    ) -> str:
        """
        Upload logo asset to S3

        Args:
            company_id: Company UUID
            logo_type: Logo type (primary, dark, icon, email)
            file: File data with name and content_type attributes

        Returns:
            S3 URL of uploaded logo

        Raises:
            ValueError: If file format or size is invalid
        """
        # Validate file format
        valid_formats = {".png", ".jpg", ".jpeg", ".svg"}
        file_ext = None
        for ext in valid_formats:
            if file.name.lower().endswith(ext):
                file_ext = ext
                break

        if not file_ext:
            raise ValueError("Invalid file format. Must be PNG, JPG, or SVG")

        # Check file size (max 2MB)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset to beginning

        if file_size > 2 * 1024 * 1024:  # 2MB
            raise ValueError("File size exceeds 2MB limit")

        # Generate unique filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = f"{company_id}/{logo_type}_{timestamp}{file_ext}"

        # Upload to S3
        s3_client = boto3.client("s3")
        bucket_name = "hireflux-assets"  # Configure via environment variable

        s3_client.upload_fileobj(
            file,
            bucket_name,
            filename,
            ExtraArgs={"ContentType": file.content_type},
        )

        # Generate URL
        url = f"https://s3.amazonaws.com/{bucket_name}/{filename}"

        # Update branding record
        branding = self.get_branding(company_id)
        if logo_type == "primary":
            branding.logo_url = url
        elif logo_type == "dark":
            branding.logo_dark_url = url
        elif logo_type == "icon":
            branding.logo_icon_url = url
        elif logo_type == "email":
            branding.logo_email_url = url

        self.db.commit()

        return url

    # ========================================================================
    # COLOR VALIDATION
    # ========================================================================

    def validate_color_scheme(self, colors: Dict[str, str]) -> bool:
        """
        Validate color scheme

        Checks:
        - Hex format (#RRGGBB)
        - WCAG AA contrast ratios (4.5:1 minimum for text/background)

        Args:
            colors: Dictionary of color values

        Returns:
            True if valid

        Raises:
            ValueError: If colors are invalid or contrast is insufficient
        """
        # Validate hex format
        hex_pattern = re.compile(r'^#[0-9A-Fa-f]{6}$')

        for color_name, color_value in colors.items():
            if not hex_pattern.match(color_value):
                raise ValueError(f"Invalid hex color format for {color_name}: {color_value}")

        # Check contrast ratio for text on background
        if "text_color" in colors and "background_color" in colors:
            text_color = colors["text_color"]
            bg_color = colors["background_color"]

            contrast_ratio = self._calculate_contrast_ratio(text_color, bg_color)

            # WCAG AA requires 4.5:1 for normal text
            if contrast_ratio < 4.5:
                raise ValueError(
                    f"Insufficient contrast ratio: {contrast_ratio:.2f}:1. "
                    f"WCAG AA requires minimum 4.5:1 for text on background"
                )

        return True

    def _calculate_contrast_ratio(self, color1: str, color2: str) -> float:
        """
        Calculate WCAG contrast ratio between two colors

        Args:
            color1: Hex color (#RRGGBB)
            color2: Hex color (#RRGGBB)

        Returns:
            Contrast ratio (1.0 to 21.0)
        """
        # Convert hex to RGB
        def hex_to_rgb(hex_color: str) -> tuple:
            hex_color = hex_color.lstrip('#')
            return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))

        # Calculate relative luminance
        def luminance(rgb: tuple) -> float:
            # sRGB to linear RGB
            def srgb_to_linear(c: int) -> float:
                c = c / 255.0
                if c <= 0.03928:
                    return c / 12.92
                else:
                    return ((c + 0.055) / 1.055) ** 2.4

            r, g, b = [srgb_to_linear(c) for c in rgb]
            return 0.2126 * r + 0.7152 * g + 0.0722 * b

        rgb1 = hex_to_rgb(color1)
        rgb2 = hex_to_rgb(color2)

        lum1 = luminance(rgb1)
        lum2 = luminance(rgb2)

        # Ensure lum1 is lighter
        if lum1 < lum2:
            lum1, lum2 = lum2, lum1

        # Calculate contrast ratio
        ratio = (lum1 + 0.05) / (lum2 + 0.05)
        return ratio

    # ========================================================================
    # CUSTOM DOMAIN
    # ========================================================================

    def set_custom_domain(
        self,
        company_id: UUID,
        domain: str,
    ) -> WhiteLabelDomainVerification:
        """
        Set up custom domain with verification

        Args:
            company_id: Company UUID
            domain: Custom domain (e.g., careers.company.com)

        Returns:
            WhiteLabelDomainVerification object with instructions

        Raises:
            ValueError: If domain format is invalid
        """
        # Validate domain format
        domain_pattern = re.compile(
            r'^([a-zA-Z0-9]([a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$'
        )

        if not domain_pattern.match(domain):
            raise ValueError("Invalid domain format")

        # Check for HireFlux subdomain
        if domain.endswith(".hireflux.com"):
            raise ValueError("Cannot use HireFlux subdomain for white-label")

        # Generate verification token
        verification_token = secrets.token_urlsafe(32)

        # Create DNS records
        dns_records = [
            {
                "type": "CNAME",
                "name": domain,
                "value": "white-label.hireflux.com",
                "ttl": "3600",
            },
            {
                "type": "TXT",
                "name": f"_hireflux-verification.{domain}",
                "value": verification_token,
                "ttl": "3600",
            },
        ]

        # Create or update verification record
        verification = (
            self.db.query(WhiteLabelDomainVerification)
            .filter(WhiteLabelDomainVerification.company_id == company_id)
            .first()
        )

        if not verification:
            verification = WhiteLabelDomainVerification(
                company_id=company_id,
                domain=domain,
                verification_method="dns_cname",
                verification_token=verification_token,
                status="pending",
                dns_records=dns_records,
            )
            self.db.add(verification)
        else:
            verification.domain = domain
            verification.verification_token = verification_token
            verification.status = "pending"
            verification.dns_records = dns_records
            verification.verified_at = None
            verification.error_message = None

        # Update branding record
        branding = self.get_branding(company_id)
        branding.custom_domain = domain
        branding.custom_domain_verified = False
        branding.custom_domain_verification_token = verification_token

        self.db.commit()
        self.db.refresh(verification)

        return verification

    def verify_custom_domain(self, company_id: UUID) -> bool:
        """
        Verify custom domain DNS records

        Args:
            company_id: Company UUID

        Returns:
            True if verified, False otherwise
        """
        branding = self.get_branding(company_id)
        verification = (
            self.db.query(WhiteLabelDomainVerification)
            .filter(WhiteLabelDomainVerification.company_id == company_id)
            .first()
        )

        if not verification:
            return False

        # Check DNS records
        try:
            # Simple DNS check - in production, use proper DNS library
            ip = socket.gethostbyname(verification.domain)

            # Check if domain resolves to HireFlux IP
            # In production, check against actual HireFlux IPs
            hireflux_ips = ["52.0.0.1", "52.0.0.2"]  # Example IPs

            if ip in hireflux_ips:
                # Domain verified
                verification.status = "verified"
                verification.verified_at = datetime.utcnow()
                verification.last_check_at = datetime.utcnow()

                branding.custom_domain_verified = True
                branding.custom_domain_ssl_enabled = True  # Auto-provision SSL

                self.db.commit()
                return True
            else:
                # DNS points to wrong IP
                verification.status = "failed"
                verification.error_message = f"Domain resolves to {ip}, expected HireFlux IP"
                verification.last_check_at = datetime.utcnow()
                self.db.commit()
                return False

        except socket.gaierror:
            # DNS not configured
            verification.status = "failed"
            verification.error_message = "DNS records not found"
            verification.last_check_at = datetime.utcnow()
            self.db.commit()
            return False

    def check_domain_dns_records(self, domain: str) -> dict:
        """
        Check DNS records for domain (utility method)

        Args:
            domain: Domain to check

        Returns:
            Dictionary with DNS record status
        """
        try:
            ip = socket.gethostbyname(domain)
            return {
                "domain": domain,
                "resolved": True,
                "ip": ip,
            }
        except socket.gaierror:
            return {
                "domain": domain,
                "resolved": False,
                "error": "DNS not found",
            }

    # ========================================================================
    # CUSTOM APPLICATION FIELDS
    # ========================================================================

    def create_custom_field(
        self,
        company_id: UUID,
        field_data: CustomApplicationFieldCreate,
    ) -> WhiteLabelApplicationField:
        """
        Create custom application form field

        Args:
            company_id: Company UUID
            field_data: Field configuration

        Returns:
            WhiteLabelApplicationField object

        Raises:
            ValueError: If field type is invalid
        """
        valid_types = {"text", "textarea", "select", "checkbox", "file"}
        if field_data.field_type not in valid_types:
            raise ValueError(f"Invalid field type: {field_data.field_type}")

        # Get max display order
        max_order = (
            self.db.query(WhiteLabelApplicationField)
            .filter(WhiteLabelApplicationField.company_id == company_id)
            .count()
        )

        field = WhiteLabelApplicationField(
            company_id=company_id,
            field_name=field_data.field_name,
            field_label=field_data.field_label,
            field_type=field_data.field_type,
            field_options=field_data.field_options,
            is_required=field_data.is_required,
            help_text=field_data.help_text,
            display_order=max_order,
            is_active=True,
        )

        self.db.add(field)
        self.db.commit()
        self.db.refresh(field)

        return field

    def update_custom_field(
        self,
        field_id: UUID,
        company_id: UUID,
        update_data: CustomApplicationFieldUpdate,
    ) -> Optional[WhiteLabelApplicationField]:
        """
        Update custom application field

        Args:
            field_id: Field UUID
            company_id: Company UUID (for authorization)
            update_data: Update data

        Returns:
            Updated field or None if not found
        """
        field = (
            self.db.query(WhiteLabelApplicationField)
            .filter(
                and_(
                    WhiteLabelApplicationField.id == field_id,
                    WhiteLabelApplicationField.company_id == company_id,
                )
            )
            .first()
        )

        if not field:
            return None

        # Update fields
        update_dict = update_data.model_dump(exclude_unset=True)
        for attr, value in update_dict.items():
            setattr(field, attr, value)

        self.db.commit()
        self.db.refresh(field)

        return field

    def reorder_custom_fields(
        self,
        company_id: UUID,
        field_ids: List[UUID],
    ) -> bool:
        """
        Reorder custom application fields

        Args:
            company_id: Company UUID
            field_ids: List of field UUIDs in desired order

        Returns:
            True if successful
        """
        fields = (
            self.db.query(WhiteLabelApplicationField)
            .filter(WhiteLabelApplicationField.company_id == company_id)
            .all()
        )

        # Create mapping of field_id to field
        field_map = {field.id: field for field in fields}

        # Update display_order based on position in field_ids
        for index, field_id in enumerate(field_ids):
            if field_id in field_map:
                field_map[field_id].display_order = index

        self.db.commit()
        return True

    # ========================================================================
    # EMAIL & CAREER PAGE RENDERING
    # ========================================================================

    def render_branded_email(
        self,
        company_id: UUID,
        template_type: str,
        data: dict,
    ) -> str:
        """
        Render email template with company branding

        Args:
            company_id: Company UUID
            template_type: Email template type
            data: Template data

        Returns:
            HTML email content
        """
        branding = (
            self.db.query(WhiteLabelBranding)
            .filter(WhiteLabelBranding.company_id == company_id)
            .first()
        )

        # Default branding if not configured
        company_name = branding.company_display_name if branding else "HireFlux"
        header_html = branding.email_header_html if branding else ""

        # Simple email template (in production, use proper templating engine)
        html = f"""
        <html>
        <head>
            <style>
                body {{ font-family: {branding.font_family if branding else 'Arial, sans-serif'}; }}
                .header {{ background-color: {branding.primary_color if branding else '#3B82F6'}; padding: 20px; }}
                .content {{ padding: 20px; }}
            </style>
        </head>
        <body>
            <div class="header">
                {header_html or f'<h1>{company_name}</h1>'}
            </div>
            <div class="content">
                <p>Dear {data.get('candidate_name', 'Candidate')},</p>
                <p>Thank you for applying for the {data.get('job_title', 'position')} role.</p>
            </div>
        </body>
        </html>
        """

        return html

    def render_career_page(
        self,
        company_id: UUID,
        jobs: list,
    ) -> str:
        """
        Render branded career page

        Args:
            company_id: Company UUID
            jobs: List of job postings

        Returns:
            HTML career page content
        """
        branding = (
            self.db.query(WhiteLabelBranding)
            .filter(WhiteLabelBranding.company_id == company_id)
            .first()
        )

        # Default branding if not configured
        company_name = branding.company_display_name if branding else "Company"
        header_html = branding.career_page_header_html if branding else ""
        show_hireflux = not (branding and branding.hide_hireflux_branding)

        # Simple career page template
        jobs_html = "\n".join([
            f"<div class='job'><h3>{job.get('title', 'Job Title')}</h3><p>{job.get('location', 'Location')}</p></div>"
            for job in jobs
        ])

        footer = "Powered by HireFlux" if show_hireflux else ""

        html = f"""
        <html>
        <head>
            <title>{company_name} - Careers</title>
            <style>
                body {{ font-family: {branding.font_family if branding else 'Arial, sans-serif'}; }}
                .header {{ background-color: {branding.primary_color if branding else '#3B82F6'}; padding: 40px; }}
            </style>
        </head>
        <body>
            <div class="header">
                {header_html or f'<h1>Join {company_name}</h1>'}
            </div>
            <div class="jobs">
                {jobs_html}
            </div>
            <div class="footer">
                {footer}
            </div>
        </body>
        </html>
        """

        return html
