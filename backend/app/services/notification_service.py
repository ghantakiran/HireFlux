"""
Notification Service
Handles creating and managing user notifications
"""
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timedelta

from app.db.models.notification import Notification, NotificationPreference
from app.db.models.user import User
from app.schemas.notification import (
    NotificationCreate,
    NotificationUpdate,
    NotificationResponse,
    NotificationPreferenceUpdate,
    NotificationStats,
)
from app.services.email_service import EmailService
from app.core.exceptions import ServiceError, NotFoundError


class NotificationService:
    """Service for managing notifications"""

    def __init__(self):
        self.email_service = EmailService()

    def create_notification(
        self,
        db: Session,
        user: User,
        notification_data: NotificationCreate,
        send_email: bool = None,
    ) -> NotificationResponse:
        """Create a new notification"""
        try:
            # Get user preferences
            preferences = self._get_or_create_preferences(db, user.id)

            # Check if notification should be sent
            if not preferences.should_send_inapp(notification_data.type.value):
                # User has disabled this notification type
                return None

            # Create notification
            notification = Notification(
                user_id=user.id,
                type=notification_data.type.value,
                title=notification_data.title,
                message=notification_data.message,
                action_url=notification_data.action_url,
                priority=notification_data.priority.value,
                category=notification_data.category.value
                if notification_data.category
                else None,
                data=notification_data.data,
                expires_at=notification_data.expires_at,
            )

            db.add(notification)
            db.flush()

            # Send email if enabled (check user preferences or explicit flag)
            should_send_email = (
                send_email
                if send_email is not None
                else preferences.should_send_email(notification_data.type.value)
            )

            if should_send_email and not preferences.is_quiet_hours():
                self._send_email_notification(db, user, notification)

            db.commit()
            db.refresh(notification)

            return NotificationResponse.model_validate(notification)

        except Exception as e:
            db.rollback()
            raise ServiceError(f"Failed to create notification: {str(e)}")

    def get_user_notifications(
        self,
        db: Session,
        user_id: int,
        unread_only: bool = False,
        category: Optional[str] = None,
        skip: int = 0,
        limit: int = 20,
    ) -> List[NotificationResponse]:
        """Get notifications for a user"""
        query = db.query(Notification).filter(Notification.user_id == user_id)

        if unread_only:
            query = query.filter(Notification.is_read == False)

        if category:
            query = query.filter(Notification.category == category)

        # Exclude archived and expired
        query = query.filter(Notification.is_archived == False)

        notifications = (
            query.order_by(Notification.created_at.desc())
            .offset(skip)
            .limit(limit)
            .all()
        )

        # Filter out expired notifications
        active_notifications = [n for n in notifications if not n.is_expired]

        return [NotificationResponse.model_validate(n) for n in active_notifications]

    def mark_as_read(
        self, db: Session, user_id: int, notification_id: int
    ) -> NotificationResponse:
        """Mark notification as read"""
        notification = (
            db.query(Notification)
            .filter(Notification.id == notification_id, Notification.user_id == user_id)
            .first()
        )

        if not notification:
            raise NotFoundError(f"Notification {notification_id} not found")

        notification.is_read = True
        notification.read_at = datetime.now()

        db.commit()
        db.refresh(notification)

        return NotificationResponse.model_validate(notification)

    def mark_all_as_read(self, db: Session, user_id: int) -> int:
        """Mark all notifications as read for a user"""
        count = (
            db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)
            .update({"is_read": True, "read_at": datetime.now()})
        )

        db.commit()
        return count

    def archive_notification(
        self, db: Session, user_id: int, notification_id: int
    ) -> NotificationResponse:
        """Archive a notification"""
        notification = (
            db.query(Notification)
            .filter(Notification.id == notification_id, Notification.user_id == user_id)
            .first()
        )

        if not notification:
            raise NotFoundError(f"Notification {notification_id} not found")

        notification.is_archived = True
        db.commit()
        db.refresh(notification)

        return NotificationResponse.model_validate(notification)

    def delete_notification(
        self, db: Session, user_id: int, notification_id: int
    ) -> bool:
        """Delete a notification"""
        notification = (
            db.query(Notification)
            .filter(Notification.id == notification_id, Notification.user_id == user_id)
            .first()
        )

        if not notification:
            raise NotFoundError(f"Notification {notification_id} not found")

        db.delete(notification)
        db.commit()
        return True

    def get_user_stats(self, db: Session, user_id: int) -> NotificationStats:
        """Get notification statistics for a user"""
        # Total notifications
        total = db.query(Notification).filter(Notification.user_id == user_id).count()

        # Unread count
        unread = (
            db.query(Notification)
            .filter(Notification.user_id == user_id, Notification.is_read == False)
            .count()
        )

        # By category
        by_category = {}
        categories = (
            db.query(Notification.category, db.func.count(Notification.id))
            .filter(Notification.user_id == user_id)
            .group_by(Notification.category)
            .all()
        )
        for category, count in categories:
            if category:
                by_category[category] = count

        # By priority
        by_priority = {}
        priorities = (
            db.query(Notification.priority, db.func.count(Notification.id))
            .filter(Notification.user_id == user_id)
            .group_by(Notification.priority)
            .all()
        )
        for priority, count in priorities:
            by_priority[priority] = count

        # Recent notifications
        recent = (
            db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(5)
            .all()
        )
        recent_notifications = [NotificationResponse.model_validate(n) for n in recent]

        return NotificationStats(
            total_notifications=total,
            unread_count=unread,
            by_category=by_category,
            by_priority=by_priority,
            recent_notifications=recent_notifications,
        )

    def get_preferences(self, db: Session, user_id: int) -> NotificationPreference:
        """Get user notification preferences"""
        return self._get_or_create_preferences(db, user_id)

    def update_preferences(
        self, db: Session, user_id: int, updates: NotificationPreferenceUpdate
    ) -> NotificationPreference:
        """Update user notification preferences"""
        preferences = self._get_or_create_preferences(db, user_id)

        # Update fields
        update_data = updates.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(preferences, field, value)

        db.commit()
        db.refresh(preferences)

        return preferences

    def _get_or_create_preferences(
        self, db: Session, user_id: int
    ) -> NotificationPreference:
        """Get or create notification preferences for user"""
        preferences = (
            db.query(NotificationPreference)
            .filter(NotificationPreference.user_id == user_id)
            .first()
        )

        if not preferences:
            preferences = NotificationPreference(user_id=user_id)
            db.add(preferences)
            db.flush()

        return preferences

    def _send_email_notification(
        self, db: Session, user: User, notification: Notification
    ):
        """Send email for notification"""
        try:
            email_data = notification.data or {}

            # Route to appropriate email method based on type
            if notification.type == "job_match":
                result = self.email_service.send_job_match_email(
                    to_email=user.email, user_name=user.name, job_data=email_data
                )
            elif notification.type == "application_status":
                result = self.email_service.send_application_status_email(
                    to_email=user.email,
                    user_name=user.name,
                    application_data=email_data,
                )
            elif notification.type == "credit_low":
                result = self.email_service.send_credit_alert_email(
                    to_email=user.email,
                    user_name=user.name,
                    credit_balance=email_data.get("credit_balance", 0),
                    threshold=email_data.get("threshold", 10),
                )
            elif notification.type == "interview_reminder":
                result = self.email_service.send_interview_reminder_email(
                    to_email=user.email, user_name=user.name, interview_data=email_data
                )
            else:
                # Generic email for other types
                from app.schemas.notification import EmailSend

                result = self.email_service.send_email(
                    EmailSend(
                        to_email=user.email,
                        subject=notification.title,
                        html_body=f"<h1>{notification.title}</h1><p>{notification.message}</p>",
                        text_body=notification.message,
                    )
                )

            if result["success"]:
                notification.email_sent = True
                notification.email_sent_at = datetime.now()
                notification.email_message_id = result.get("message_id")

        except Exception as e:
            # Log error but don't fail the notification creation
            print(f"Failed to send email notification: {str(e)}")

    def cleanup_old_notifications(self, db: Session, days: int = 30) -> int:
        """Clean up old read notifications"""
        cutoff_date = datetime.now() - timedelta(days=days)

        count = (
            db.query(Notification)
            .filter(
                Notification.is_read == True,
                Notification.created_at < cutoff_date,
            )
            .delete()
        )

        db.commit()
        return count
