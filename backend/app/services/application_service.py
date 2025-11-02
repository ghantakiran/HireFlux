"""Application Service for Employer ATS

Provides application management, notes, assignments, and bulk operations.
"""
from datetime import datetime
from typing import List, Optional, Tuple
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.db.models.application import Application, ApplicationNote
from app.db.models.webhook import ApplicationStatusHistory
from app.schemas.application import (
    ApplicationNoteCreate,
    ApplicationStatusUpdate,
    ApplicationAssignUpdate,
    ApplicationBulkUpdate,
    ATSApplicationStatus,
)


class ApplicationService:
    """Service for managing employer ATS applications"""

    def __init__(self, db: Session):
        self.db = db

    def get_applications_for_job(
        self,
        job_id: UUID,
        status: Optional[str] = None,
        min_fit_index: Optional[int] = None,
        assigned_to: Optional[UUID] = None,
        sort_by: str = "fit_index",
        order: str = "desc",
        page: int = 1,
        limit: int = 20
    ) -> Tuple[List[Application], int]:
        """
        Get paginated list of applications for a job with filtering and sorting.

        Args:
            job_id: Job UUID
            status: Filter by application status
            min_fit_index: Minimum fit score (0-100)
            assigned_to: Filter by assigned user ID
            sort_by: Sort field (fit_index, applied_at, created_at)
            order: Sort order (asc, desc)
            page: Page number (1-indexed)
            limit: Items per page

        Returns:
            Tuple of (applications list, total count)
        """
        query = (
            self.db.query(Application)
            .options(
                joinedload(Application.user),
                joinedload(Application.job)
            )
            .filter(Application.job_id == job_id)
        )

        # Apply filters
        if status:
            query = query.filter(Application.status == status)

        if min_fit_index is not None:
            query = query.filter(Application.fit_index >= min_fit_index)

        if assigned_to:
            # Filter by assigned team member (JSON array contains)
            query = query.filter(
                func.jsonb_contains(
                    Application.assigned_to,
                    func.cast([str(assigned_to)], type_=Application.assigned_to.type)
                )
            )

        # Get total count before pagination
        total = query.count()

        # Apply sorting
        if sort_by == "fit_index":
            sort_column = Application.fit_index
        elif sort_by == "applied_at":
            sort_column = Application.applied_at
        else:
            sort_column = Application.created_at

        if order == "desc":
            sort_column = sort_column.desc()
        else:
            sort_column = sort_column.asc()

        query = query.order_by(sort_column)

        # Apply pagination
        offset = (page - 1) * limit
        applications = query.offset(offset).limit(limit).all()

        return applications, total

    def update_application_status(
        self,
        application_id: UUID,
        status_data: ApplicationStatusUpdate
    ) -> Application:
        """
        Update application status and record history.

        Args:
            application_id: Application UUID
            status_data: New status and optional note

        Returns:
            Updated Application

        Raises:
            Exception: If application not found or invalid transition
        """
        application = self.db.query(Application).filter(
            Application.id == application_id
        ).first()

        if not application:
            raise Exception(f"Application {application_id} not found")

        # Check for invalid transitions
        if application.status == "rejected":
            raise Exception("Cannot change status of rejected application")

        old_status = application.status
        new_status = status_data.status.value

        # Update application status
        application.status = new_status
        application.updated_at = datetime.utcnow()

        # Record status history
        status_history = ApplicationStatusHistory(
            application_id=application_id,
            old_status=old_status,
            new_status=new_status,
            changed_by="user",  # Could be passed from auth context
            change_reason=status_data.note,
            changed_at=datetime.utcnow()
        )

        self.db.add(status_history)
        self.db.commit()
        self.db.refresh(application)

        return application

    def add_application_note(
        self,
        application_id: UUID,
        author_id: UUID,
        note_data: ApplicationNoteCreate
    ) -> ApplicationNote:
        """
        Add internal note to application.

        Args:
            application_id: Application UUID
            author_id: User ID of note author
            note_data: Note content and visibility

        Returns:
            Created ApplicationNote
        """
        note = ApplicationNote(
            application_id=application_id,
            author_id=author_id,
            content=note_data.content,
            visibility=note_data.visibility,
        )

        self.db.add(note)
        self.db.commit()
        self.db.refresh(note)

        return note

    def get_application_notes(
        self,
        application_id: UUID,
        author_id: Optional[UUID] = None
    ) -> List[ApplicationNote]:
        """
        Get notes for an application.

        Args:
            application_id: Application UUID
            author_id: If provided, also include private notes from this author

        Returns:
            List of ApplicationNote ordered by created_at desc
        """
        query = (
            self.db.query(ApplicationNote)
            .options(joinedload(ApplicationNote.author))
            .filter(ApplicationNote.application_id == application_id)
        )

        if author_id:
            # Show team notes + this author's private notes
            query = query.filter(
                (ApplicationNote.visibility == "team") |
                (
                    (ApplicationNote.visibility == "private") &
                    (ApplicationNote.author_id == author_id)
                )
            )
        else:
            # Only show team notes
            query = query.filter(ApplicationNote.visibility == "team")

        notes = query.order_by(ApplicationNote.created_at.desc()).all()

        return notes

    def assign_reviewers(
        self,
        application_id: UUID,
        assign_data: ApplicationAssignUpdate
    ) -> Application:
        """
        Assign or unassign team members to application.

        Args:
            application_id: Application UUID
            assign_data: List of user IDs to assign

        Returns:
            Updated Application
        """
        application = self.db.query(Application).filter(
            Application.id == application_id
        ).first()

        if not application:
            raise Exception(f"Application {application_id} not found")

        # Convert UUIDs to strings for JSON storage
        application.assigned_to = [str(uid) for uid in assign_data.assigned_to]
        application.updated_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(application)

        return application

    def bulk_update_applications(
        self,
        bulk_data: ApplicationBulkUpdate
    ) -> int:
        """
        Bulk update multiple applications.

        Args:
            bulk_data: Application IDs and action to perform

        Returns:
            Number of applications updated
        """
        applications = (
            self.db.query(Application)
            .filter(Application.id.in_(bulk_data.application_ids))
            .all()
        )

        if not applications:
            return 0

        updated_count = 0

        for app in applications:
            if bulk_data.action == "reject":
                app.status = ATSApplicationStatus.REJECTED.value
                updated_count += 1

                # Record status history
                status_history = ApplicationStatusHistory(
                    application_id=app.id,
                    old_status=app.status,
                    new_status=ATSApplicationStatus.REJECTED.value,
                    changed_by="bulk_action",
                    change_reason="Bulk rejected",
                    changed_at=datetime.utcnow()
                )
                self.db.add(status_history)

            elif bulk_data.action == "move_to_stage" and bulk_data.target_status:
                old_status = app.status
                app.status = bulk_data.target_status.value
                updated_count += 1

                # Record status history
                status_history = ApplicationStatusHistory(
                    application_id=app.id,
                    old_status=old_status,
                    new_status=bulk_data.target_status.value,
                    changed_by="bulk_action",
                    change_reason=f"Bulk moved to {bulk_data.target_status.value}",
                    changed_at=datetime.utcnow()
                )
                self.db.add(status_history)

            elif bulk_data.action == "shortlist":
                # Add "shortlisted" tag
                if not app.tags:
                    app.tags = []
                if "shortlisted" not in app.tags:
                    app.tags.append("shortlisted")
                updated_count += 1

            app.updated_at = datetime.utcnow()

        self.db.commit()

        return updated_count
