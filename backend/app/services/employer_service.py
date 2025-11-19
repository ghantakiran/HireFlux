"""Employer Service - Business logic for company/employer operations

Following Test-Driven Development: This service is implemented to satisfy the tests
in test_employer_service.py.

Service Responsibilities:
- Company registration and onboarding
- Team member management
- Subscription limit enforcement
- Company profile updates
"""

from datetime import datetime, timedelta
from typing import Optional, List
from uuid import UUID, uuid4

from passlib.context import CryptContext
from sqlalchemy.orm import Session, joinedload

from app.db.models.company import Company, CompanyMember, CompanySubscription
from app.db.models.user import User
from app.schemas.company import CompanyCreate, CompanyUpdate, CompanyMemberCreate


# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class EmployerService:
    """Service for employer/company operations"""

    def __init__(self, db: Session):
        self.db = db

    def create_company(self, data: CompanyCreate) -> Company:
        """
        Create new company with founder account

        Steps:
        1. Validate email doesn't already exist
        2. Hash password
        3. Create User with user_type='employer'
        4. Extract domain from email
        5. Create Company with subscription_tier='starter', status='trial'
        6. Set trial_ends_at = now + 14 days
        7. Set starter plan limits (1 job, 10 views, 1 member)
        8. Create CompanyMember with role='owner', status='active'
        9. Create CompanySubscription with status='trialing'
        10. Commit and return company with relationships

        Args:
            data: Company registration data including founder email/password

        Returns:
            Company: Created company with members and subscription loaded

        Raises:
            ValueError: If email format invalid or password too weak (handled by Pydantic)
            IntegrityError: If domain already exists
        """
        # Extract domain from email (e.g., "founder@testcompany.com" -> "testcompany.com")
        domain = data.email.split("@")[1] if "@" in data.email else None

        # Hash password
        hashed_password = pwd_context.hash(data.password)

        # Create user for founder
        user = User(
            id=uuid4(),
            email=data.email,
            password_hash=hashed_password,
            user_type="employer",
        )
        self.db.add(user)
        self.db.flush()  # Get user.id

        # Create company with starter plan defaults
        company = Company(
            id=uuid4(),
            name=data.name,
            domain=domain,
            industry=data.industry,
            size=data.size,
            location=data.location,
            website=data.website,
            subscription_tier="starter",
            subscription_status="trial",
            trial_ends_at=datetime.utcnow() + timedelta(days=14),
            billing_email=data.email,
            # Starter plan limits
            max_active_jobs=1,
            max_candidate_views=10,
            max_team_members=1,
        )
        self.db.add(company)
        self.db.flush()  # Get company.id

        # Create founder as company owner
        member = CompanyMember(
            id=uuid4(),
            company_id=company.id,
            user_id=user.id,
            role="owner",
            status="active",
            joined_at=datetime.utcnow(),
        )
        self.db.add(member)

        # Create subscription record
        subscription = CompanySubscription(
            id=uuid4(),
            company_id=company.id,
            plan_tier="starter",
            status="trialing",
            current_period_start=datetime.utcnow(),
            current_period_end=datetime.utcnow() + timedelta(days=14),
            jobs_posted_this_month=0,
            candidate_views_this_month=0,
        )
        self.db.add(subscription)

        # Commit all changes
        self.db.commit()

        # Refresh company to load relationships
        self.db.refresh(company)

        return company

    def get_company(self, company_id: UUID) -> Optional[Company]:
        """
        Get company by ID with all relationships loaded

        Args:
            company_id: UUID of company to retrieve

        Returns:
            Company with members and subscription loaded, or None if not found
        """
        company = (
            self.db.query(Company)
            .options(joinedload(Company.members), joinedload(Company.subscription))
            .filter(Company.id == company_id)
            .first()
        )
        return company

    def update_company(self, company_id: UUID, data: CompanyUpdate) -> Company:
        """
        Update company profile

        Args:
            company_id: UUID of company to update
            data: Fields to update (only provided fields are updated)

        Returns:
            Updated company

        Raises:
            Exception: If company not found
        """
        company = self.get_company(company_id)
        if not company:
            raise Exception(f"Company {company_id} not found")

        # Update only provided fields
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(company, field, value)

        company.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(company)

        return company

    def add_team_member(
        self,
        company_id: UUID,
        member_data: CompanyMemberCreate,
        invited_by_user_id: UUID,
    ) -> CompanyMember:
        """
        Invite new team member to company

        Args:
            company_id: Company to add member to
            member_data: Email and role for new member
            invited_by_user_id: User ID of person sending invitation

        Returns:
            CompanyMember with status='invited'

        Raises:
            Exception: If team member limit exceeded
        """
        # Get company with members
        company = self.get_company(company_id)
        if not company:
            raise Exception(f"Company {company_id} not found")

        # Check team member limit
        current_member_count = len(company.members)
        if current_member_count >= company.max_team_members:
            raise Exception(
                f"Team member limit ({company.max_team_members}) exceeded. "
                f"Upgrade your plan to add more members."
            )

        # Create or get user for invitee
        # For now, just create the member record with "invited" status
        # In real implementation, would send invitation email
        member = CompanyMember(
            id=uuid4(),
            company_id=company_id,
            user_id=uuid4(),  # Placeholder - would be set when user accepts invitation
            role=member_data.role,
            permissions=member_data.permissions,
            status="invited",
            invited_by=invited_by_user_id,
            invited_at=datetime.utcnow(),
            joined_at=None,  # Will be set when invitation accepted
        )
        self.db.add(member)
        self.db.commit()
        self.db.refresh(member)

        return member

    def remove_team_member(self, company_id: UUID, member_id: UUID) -> None:
        """
        Remove team member from company

        Args:
            company_id: Company to remove member from
            member_id: Member to remove

        Raises:
            Exception: If member not found
        """
        member = (
            self.db.query(CompanyMember)
            .filter(
                CompanyMember.id == member_id, CompanyMember.company_id == company_id
            )
            .first()
        )

        if not member:
            raise Exception(f"Member {member_id} not found in company {company_id}")

        self.db.delete(member)
        self.db.commit()

    def get_team_members(self, company_id: UUID) -> List[CompanyMember]:
        """
        Get all team members for a company

        Args:
            company_id: Company to get members for

        Returns:
            List of company members
        """
        members = (
            self.db.query(CompanyMember)
            .filter(CompanyMember.company_id == company_id)
            .all()
        )
        return list(members)

    def check_can_post_job(self, company_id: UUID) -> bool:
        """
        Check if company can post another job based on subscription limits

        Args:
            company_id: Company to check

        Returns:
            True if company can post more jobs, False if limit reached
        """
        company = self.get_company(company_id)
        if not company or not company.subscription:
            return False

        # Check if jobs posted this month is less than max allowed
        jobs_posted = company.subscription.jobs_posted_this_month
        max_jobs = company.max_active_jobs

        return jobs_posted < max_jobs

    def check_can_view_candidate(self, company_id: UUID) -> bool:
        """
        Check if company can view another candidate based on subscription limits

        Args:
            company_id: Company to check

        Returns:
            True if company can view more candidates, False if limit reached
        """
        company = self.get_company(company_id)
        if not company or not company.subscription:
            return False

        # Check if candidate views this month is less than max allowed
        views_this_month = company.subscription.candidate_views_this_month
        max_views = company.max_candidate_views

        return views_this_month < max_views

    # ========================================================================
    # Company Profile Management Methods (Issue #21)
    # ========================================================================

    def upload_logo(
        self, company_id: UUID, file_content: bytes, filename: str
    ) -> dict:
        """
        Upload and process company logo

        Steps:
        1. Validate file size (<5MB) and format (PNG, JPG, JPEG, SVG)
        2. Open image with Pillow
        3. Resize to 400x400 if larger
        4. Upload to S3 with company-specific key
        5. Update company.logo_url
        6. Return upload response

        Args:
            company_id: Company to upload logo for
            file_content: File bytes
            filename: Original filename

        Returns:
            dict with logo_url, resized, original_size, final_size, file_size_bytes

        Raises:
            ValueError: If file too large or invalid format
            Exception: If company not found
        """
        try:
            from PIL import Image
            import boto3
            import io
            import os
        except ImportError:
            raise Exception("Required dependencies not installed: pip install Pillow boto3")

        # Get company
        company = self.get_company(company_id)
        if not company:
            raise Exception(f"Company {company_id} not found")

        # Validate file size (<5MB)
        file_size = len(file_content)
        max_size = 5 * 1024 * 1024  # 5MB
        if file_size > max_size:
            raise ValueError(f"File size must be under 5MB (current: {file_size / 1024 / 1024:.2f}MB)")

        # Validate format
        file_ext = filename.lower().split('.')[-1]
        allowed_formats = ['png', 'jpg', 'jpeg', 'svg']
        if file_ext not in allowed_formats:
            raise ValueError(f"Only PNG, JPG, and SVG formats are allowed (got: {file_ext})")

        # Handle SVG separately (no resizing needed)
        if file_ext == 'svg':
            # Upload SVG directly to S3
            s3_key = f"company-logos/{company_id}/logo.svg"
            # TODO: Implement S3 upload when S3 is configured
            logo_url = f"https://s3.amazonaws.com/hireflux-logos/{s3_key}"

            # Update company
            company.logo_url = logo_url
            self.db.commit()

            return {
                "logo_url": logo_url,
                "resized": False,
                "original_size": (0, 0),  # SVG doesn't have fixed size
                "final_size": (0, 0),
                "file_size_bytes": file_size,
            }

        # Process raster images (PNG, JPG)
        try:
            img = Image.open(io.BytesIO(file_content))
        except Exception as e:
            raise ValueError(f"Invalid image file: {str(e)}")

        original_size = img.size

        # Resize to 400x400 if larger
        target_size = (400, 400)
        resized = False

        if img.size[0] > target_size[0] or img.size[1] > target_size[1]:
            img.thumbnail(target_size, Image.Resampling.LANCZOS)
            resized = True

        final_size = img.size

        # Convert to bytes for upload
        output = io.BytesIO()
        img_format = 'PNG' if file_ext == 'png' else 'JPEG'
        img.save(output, format=img_format)
        output.seek(0)
        processed_content = output.read()

        # Upload to S3 (placeholder - requires S3 configuration)
        s3_key = f"company-logos/{company_id}/logo.{file_ext}"
        # TODO: Implement actual S3 upload when configured
        # For now, return a mock URL
        logo_url = f"https://s3.amazonaws.com/hireflux-logos/{s3_key}"

        # Delete old logo if exists
        if company.logo_url:
            self._delete_logo_from_s3(company.logo_url)

        # Update company
        company.logo_url = logo_url
        company.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(company)

        return {
            "logo_url": logo_url,
            "resized": resized,
            "original_size": original_size,
            "final_size": final_size,
            "file_size_bytes": file_size,
        }

    def delete_logo(self, company_id: UUID) -> dict:
        """
        Delete company logo

        Args:
            company_id: Company to delete logo from

        Returns:
            dict with success message

        Raises:
            Exception: If company not found
        """
        company = self.get_company(company_id)
        if not company:
            raise Exception(f"Company {company_id} not found")

        if company.logo_url:
            # Delete from S3
            self._delete_logo_from_s3(company.logo_url)

        # Clear logo_url
        company.logo_url = None
        company.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(company)

        return {"message": "Logo deleted successfully"}

    def _delete_logo_from_s3(self, logo_url: str) -> None:
        """
        Delete logo file from S3

        Args:
            logo_url: S3 URL of logo to delete
        """
        # TODO: Implement actual S3 deletion when configured
        # For now, this is a no-op
        pass

    def update_settings(
        self, company_id: UUID, settings_data: "CompanySettingsUpdate"
    ) -> Company:
        """
        Update company settings (timezone, notifications, default template)

        Args:
            company_id: Company to update
            settings_data: Settings to update

        Returns:
            Updated company

        Raises:
            Exception: If company not found
        """
        company = self.get_company(company_id)
        if not company:
            raise Exception(f"Company {company_id} not found")

        # Update timezone
        if settings_data.timezone is not None:
            company.timezone = settings_data.timezone

        # Update notification settings
        if settings_data.notification_settings is not None:
            # Convert Pydantic model to dict for JSON storage
            company.notification_settings = settings_data.notification_settings.model_dump()

        # Update default job template
        if settings_data.default_job_template_id is not None:
            company.default_job_template_id = settings_data.default_job_template_id

        company.updated_at = datetime.utcnow()
        self.db.commit()
        self.db.refresh(company)

        return company
