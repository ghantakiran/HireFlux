"""
Notification API Endpoints
Endpoints for managing user notifications
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session

from app.api.dependencies import get_current_user
from app.db.session import get_db
from app.db.models.user import User
from app.schemas.notification import (
    NotificationCreate,
    NotificationResponse,
    NotificationPreferenceUpdate,
    NotificationPreferenceResponse,
    NotificationStats,
)
from app.services.notification_service import NotificationService
from app.core.exceptions import ServiceError, NotFoundError

router = APIRouter(prefix="/notifications", tags=["Notifications"])


@router.get("", response_model=List[NotificationResponse])
def get_notifications(
    unread_only: bool = Query(False, description="Filter to unread notifications only"),
    category: Optional[str] = Query(None, description="Filter by category"),
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get user's notifications

    - **unread_only**: Only return unread notifications
    - **category**: Filter by notification category
    - **skip**: Number of notifications to skip (pagination)
    - **limit**: Maximum number of notifications to return
    """
    try:
        service = NotificationService()
        notifications = service.get_user_notifications(
            db=db,
            user_id=current_user.id,
            unread_only=unread_only,
            category=category,
            skip=skip,
            limit=limit,
        )
        return notifications
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post(
    "", response_model=NotificationResponse, status_code=status.HTTP_201_CREATED
)
def create_notification(
    notification_data: NotificationCreate,
    send_email: Optional[bool] = Query(
        None, description="Override email preference for this notification"
    ),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Create a new notification (typically called by system, not end users)

    - **type**: Notification type
    - **title**: Notification title
    - **message**: Notification message
    - **send_email**: Override user's email preference
    """
    try:
        service = NotificationService()
        notification = service.create_notification(
            db=db,
            user=current_user,
            notification_data=notification_data,
            send_email=send_email,
        )

        if not notification:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Notification not created (user has disabled this notification type)",
            )

        return notification
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.patch("/{notification_id}/read", response_model=NotificationResponse)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Mark a notification as read"""
    try:
        service = NotificationService()
        notification = service.mark_as_read(db, current_user.id, notification_id)
        return notification
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.post("/read-all")
def mark_all_as_read(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Mark all notifications as read"""
    try:
        service = NotificationService()
        count = service.mark_all_as_read(db, current_user.id)
        return {"success": True, "count": count}
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.delete("/{notification_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a notification"""
    try:
        service = NotificationService()
        service.delete_notification(db, current_user.id, notification_id)
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.patch("/{notification_id}/archive", response_model=NotificationResponse)
def archive_notification(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Archive a notification"""
    try:
        service = NotificationService()
        notification = service.archive_notification(
            db, current_user.id, notification_id
        )
        return notification
    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/stats", response_model=NotificationStats)
def get_notification_stats(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """
    Get notification statistics for the current user

    Returns:
    - Total notifications
    - Unread count
    - Notifications by category
    - Notifications by priority
    - Recent notifications
    """
    try:
        service = NotificationService()
        stats = service.get_user_stats(db, current_user.id)
        return stats
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.get("/preferences", response_model=NotificationPreferenceResponse)
def get_notification_preferences(
    db: Session = Depends(get_db), current_user: User = Depends(get_current_user)
):
    """Get user's notification preferences"""
    try:
        service = NotificationService()
        preferences = service.get_preferences(db, current_user.id)
        return NotificationPreferenceResponse.model_validate(preferences)
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )


@router.patch("/preferences", response_model=NotificationPreferenceResponse)
def update_notification_preferences(
    updates: NotificationPreferenceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Update user's notification preferences

    - **email_***: Email notification preferences for different types
    - **inapp_***: In-app notification preferences
    - **job_match_frequency**: immediate, daily, or weekly
    - **quiet_hours_start/end**: Set quiet hours (0-23)
    """
    try:
        service = NotificationService()
        preferences = service.update_preferences(db, current_user.id, updates)
        return NotificationPreferenceResponse.model_validate(preferences)
    except ServiceError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e)
        )
