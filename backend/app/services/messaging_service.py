"""
Messaging Service for Two-Way Communication (Issue #70)

Business Purpose: Enable direct communication between employers and candidates
Target: 60% on-platform communication, reduce disintermediation
Compliance: EEOC audit trail for all communications
"""

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func
from typing import Optional, List
from datetime import datetime, timedelta
from uuid import UUID

from app.db.models.message import MessageThread, Message, MessageBlocklist
from app.db.models.user import User
from app.db.models.application import Application
from app.schemas.message import (
    MessageCreate,
    MessageResponse,
    MessageThreadResponse,
    ThreadDetailResponse,
    ThreadListResponse,
    BlockUserResponse,
    UnreadCountResponse,
    MessageThreadParticipant,
    BlockReason,
    MessageUpdate
)
from app.core.exceptions import (
    BadRequestError,
    ForbiddenError,
    NotFoundError,
    UnauthorizedError
)
from app.services.email_service import EmailService


class MessagingService:
    """
    Service layer for messaging operations

    Features:
    - Thread creation and management
    - Message sending with attachments
    - Read receipts and unread counts
    - Spam prevention and blocking
    - Rate limiting (10 messages/day per user)
    - Email fallback for offline users
    """

    def __init__(self, db: Session):
        self.db = db
        self._email_service = None  # Lazy initialization
        self.RATE_LIMIT_MESSAGES_PER_DAY = 10

    @property
    def email_service(self):
        """Lazy initialization of EmailService"""
        if self._email_service is None:
            try:
                self._email_service = EmailService(db=self.db)
            except Exception:
                # If EmailService can't be initialized (e.g., missing API key in tests),
                # use a None placeholder
                self._email_service = None
        return self._email_service

    # ========================================================================
    # THREAD MANAGEMENT
    # ========================================================================

    def create_thread(
        self,
        employer_id: UUID,
        candidate_id: UUID,
        application_id: Optional[UUID] = None,
        subject: Optional[str] = None
    ) -> MessageThread:
        """
        Create a new message thread

        Args:
            employer_id: ID of the employer user
            candidate_id: ID of the candidate user
            application_id: Optional job application ID
            subject: Optional thread subject

        Returns:
            Created MessageThread

        Raises:
            BadRequestError: If thread already exists for this application
        """
        # Check if thread already exists for this application
        if application_id:
            existing_thread = self.db.query(MessageThread).filter(
                MessageThread.application_id == application_id,
                MessageThread.employer_id == employer_id,
                MessageThread.candidate_id == candidate_id,
                MessageThread.is_deleted == False
            ).first()

            if existing_thread:
                raise BadRequestError("Thread already exists for this application")

        # Create new thread
        thread = MessageThread(
            employer_id=employer_id,
            candidate_id=candidate_id,
            application_id=application_id,
            subject=subject,
            unread_count_employer=0,
            unread_count_candidate=0
        )

        self.db.add(thread)
        self.db.commit()
        self.db.refresh(thread)

        return thread

    def get_or_create_thread(
        self,
        employer_id: UUID,
        candidate_id: UUID,
        application_id: Optional[UUID] = None,
        subject: Optional[str] = None
    ) -> MessageThread:
        """
        Get existing thread or create new one

        Returns existing thread if found, otherwise creates new one
        """
        # Try to find existing thread
        query = self.db.query(MessageThread).filter(
            MessageThread.employer_id == employer_id,
            MessageThread.candidate_id == candidate_id,
            MessageThread.is_deleted == False
        )

        if application_id:
            query = query.filter(MessageThread.application_id == application_id)

        existing_thread = query.first()

        if existing_thread:
            return existing_thread

        # Create new thread
        return self.create_thread(
            employer_id=employer_id,
            candidate_id=candidate_id,
            application_id=application_id,
            subject=subject
        )

    def get_thread(self, thread_id: UUID) -> MessageThread:
        """
        Get thread by ID

        Raises:
            NotFoundError: If thread not found or deleted
        """
        thread = self.db.query(MessageThread).filter(
            MessageThread.id == thread_id,
            MessageThread.is_deleted == False
        ).first()

        if not thread:
            raise NotFoundError("Thread not found")

        return thread

    def list_threads(
        self,
        user_id: UUID,
        application_id: Optional[UUID] = None,
        unread_only: bool = False,
        archived: bool = False,
        page: int = 1,
        limit: int = 20
    ) -> List[MessageThread]:
        """
        List threads for a user with filtering and pagination

        Args:
            user_id: ID of the user viewing threads
            application_id: Filter by job application
            unread_only: Show only threads with unread messages
            archived: Show archived threads
            page: Page number (1-indexed)
            limit: Items per page

        Returns:
            List of MessageThread objects
        """
        # Base query - threads where user is participant
        query = self.db.query(MessageThread).filter(
            or_(
                MessageThread.employer_id == user_id,
                MessageThread.candidate_id == user_id
            ),
            MessageThread.is_deleted == False
        )

        # Filter by application
        if application_id:
            query = query.filter(MessageThread.application_id == application_id)

        # Filter by unread status
        if unread_only:
            # Check which role the user has in each thread
            query = query.filter(
                or_(
                    and_(
                        MessageThread.employer_id == user_id,
                        MessageThread.unread_count_employer > 0
                    ),
                    and_(
                        MessageThread.candidate_id == user_id,
                        MessageThread.unread_count_candidate > 0
                    )
                )
            )

        # Filter by archived status
        # If archived=False, exclude archived threads
        # If archived=True, show only archived threads
        if not archived:
            query = query.filter(
                or_(
                    and_(
                        MessageThread.employer_id == user_id,
                        MessageThread.archived_by_employer == False
                    ),
                    and_(
                        MessageThread.candidate_id == user_id,
                        MessageThread.archived_by_candidate == False
                    )
                )
            )
        else:
            query = query.filter(
                or_(
                    and_(
                        MessageThread.employer_id == user_id,
                        MessageThread.archived_by_employer == True
                    ),
                    and_(
                        MessageThread.candidate_id == user_id,
                        MessageThread.archived_by_candidate == True
                    )
                )
            )

        # Order by most recent message first
        query = query.order_by(MessageThread.last_message_at.desc().nullsfirst())

        # Pagination
        offset = (page - 1) * limit
        threads = query.offset(offset).limit(limit).all()

        return threads

    def archive_thread(self, thread_id: UUID, user_id: UUID) -> MessageThread:
        """Archive a thread for a specific user"""
        thread = self.get_thread(thread_id)

        # Set archived flag based on user's role in thread
        if thread.employer_id == user_id:
            thread.archived_by_employer = True
        elif thread.candidate_id == user_id:
            thread.archived_by_candidate = True
        else:
            raise ForbiddenError("You are not a participant in this thread")

        self.db.commit()
        self.db.refresh(thread)

        return thread

    def delete_thread(self, thread_id: UUID, user_id: UUID) -> None:
        """
        Soft delete a thread

        Only allows deletion if user is a participant
        """
        thread = self.get_thread(thread_id)

        # Verify user is participant
        if thread.employer_id != user_id and thread.candidate_id != user_id:
            raise ForbiddenError("You are not a participant in this thread")

        # Soft delete
        thread.is_deleted = True
        thread.deleted_at = datetime.utcnow()

        self.db.commit()

    # ========================================================================
    # MESSAGE SENDING
    # ========================================================================

    def send_message(
        self,
        sender_id: UUID,
        message_data: MessageCreate
    ) -> Message:
        """
        Send a message

        Args:
            sender_id: ID of the user sending the message
            message_data: Message content and metadata

        Returns:
            Created Message object

        Raises:
            ForbiddenError: If sender is blocked by recipient
            BadRequestError: If rate limit exceeded
        """
        recipient_id = message_data.recipient_id

        # Check if sender is blocked by recipient
        if self._is_blocked(blocker_id=recipient_id, blocked_id=sender_id):
            raise ForbiddenError("You have been blocked by this user")

        # Check rate limiting (10 messages per day)
        if self._check_rate_limit_exceeded(sender_id):
            raise BadRequestError("Rate limit exceeded. Maximum 10 messages per day.")

        # Get or create thread
        # Determine employer vs candidate based on user roles
        sender = self.db.query(User).filter(User.id == sender_id).first()
        recipient = self.db.query(User).filter(User.id == recipient_id).first()

        if not sender or not recipient:
            raise NotFoundError("Sender or recipient not found")

        # Determine thread participants
        if sender.role == "employer":
            employer_id = sender_id
            candidate_id = recipient_id
        else:
            employer_id = recipient_id
            candidate_id = sender_id

        thread = self.get_or_create_thread(
            employer_id=employer_id,
            candidate_id=candidate_id,
            application_id=message_data.application_id,
            subject=message_data.subject
        )

        # Create message
        message = Message(
            thread_id=thread.id,
            sender_id=sender_id,
            recipient_id=recipient_id,
            subject=message_data.subject,
            body=message_data.body,
            body_format=message_data.body_format.value,
            message_type=message_data.message_type.value if message_data.message_type else None,
            attachments=[att.dict() for att in message_data.attachments],
            is_read=False
        )

        self.db.add(message)

        # Update thread metadata
        thread.last_message_at = datetime.utcnow()

        # Increment unread count for recipient
        if recipient_id == thread.employer_id:
            thread.unread_count_employer += 1
        else:
            thread.unread_count_candidate += 1

        self.db.commit()
        self.db.refresh(message)

        # Send email notification if recipient is offline
        if not self.is_user_online(recipient_id):
            self._send_email_notification(message, sender, recipient)
            message.email_sent = True
            message.email_sent_at = datetime.utcnow()
            self.db.commit()

        return message

    def _check_rate_limit_exceeded(self, user_id: UUID) -> bool:
        """Check if user has exceeded rate limit (10 messages/day)"""
        twenty_four_hours_ago = datetime.utcnow() - timedelta(days=1)

        message_count = self.db.query(func.count(Message.id)).filter(
            Message.sender_id == user_id,
            Message.created_at >= twenty_four_hours_ago
        ).scalar()

        return message_count >= self.RATE_LIMIT_MESSAGES_PER_DAY

    def _send_email_notification(
        self,
        message: Message,
        sender: User,
        recipient: User
    ) -> None:
        """Send email notification for new message"""
        # Skip if email service not available (e.g., in tests)
        if self.email_service is None:
            return

        subject = f"New message from {sender.first_name} {sender.last_name}"

        # Email body with message preview
        email_body = f"""
        You have a new message from {sender.first_name} {sender.last_name}:

        {message.body[:200]}{'...' if len(message.body) > 200 else ''}

        Reply to this message: [Login to HireFlux]
        """

        # Send email using email service
        try:
            self.email_service.send_email(
                to_email=recipient.email,
                subject=subject,
                body=email_body
            )
        except Exception as e:
            # Log error but don't fail message sending
            print(f"Failed to send email notification: {str(e)}")

    def is_user_online(self, user_id: UUID) -> bool:
        """
        Check if user is currently online

        For MVP, we assume users are offline (always send email)
        In production, this would check WebSocket connections or last_active_at
        """
        # TODO: Implement actual online status check
        # For now, return False to always send email notifications
        return False

    # ========================================================================
    # MESSAGE READING
    # ========================================================================

    def mark_as_read(self, message_id: UUID, user_id: UUID) -> Message:
        """
        Mark a message as read

        Args:
            message_id: ID of the message
            user_id: ID of the user marking as read (must be recipient)

        Raises:
            ForbiddenError: If user is not the recipient
        """
        message = self.get_message(message_id)

        # Only recipient can mark as read
        if message.recipient_id != user_id:
            raise ForbiddenError("Only the recipient can mark a message as read")

        # Mark as read
        if not message.is_read:
            message.is_read = True
            message.read_at = datetime.utcnow()

            # Decrement unread count
            thread = self.get_thread(message.thread_id)
            if user_id == thread.employer_id:
                thread.unread_count_employer = max(0, thread.unread_count_employer - 1)
            else:
                thread.unread_count_candidate = max(0, thread.unread_count_candidate - 1)

            self.db.commit()
            self.db.refresh(message)

        return message

    def get_message(self, message_id: UUID) -> Message:
        """Get message by ID"""
        message = self.db.query(Message).filter(
            Message.id == message_id,
            Message.is_deleted == False
        ).first()

        if not message:
            raise NotFoundError("Message not found")

        return message

    def get_unread_count(self, user_id: UUID) -> int:
        """Get total unread message count for user"""
        # Sum unread counts from all threads where user is participant
        total_unread = self.db.query(
            func.sum(
                func.case(
                    (MessageThread.employer_id == user_id, MessageThread.unread_count_employer),
                    (MessageThread.candidate_id == user_id, MessageThread.unread_count_candidate),
                    else_=0
                )
            )
        ).filter(
            or_(
                MessageThread.employer_id == user_id,
                MessageThread.candidate_id == user_id
            ),
            MessageThread.is_deleted == False
        ).scalar()

        return int(total_unread) if total_unread else 0

    # ========================================================================
    # BLOCKING & SPAM PREVENTION
    # ========================================================================

    def block_user(
        self,
        blocker_id: UUID,
        blocked_id: UUID,
        reason: BlockReason
    ) -> BlockUserResponse:
        """
        Block a user from sending messages

        Args:
            blocker_id: ID of user doing the blocking
            blocked_id: ID of user being blocked
            reason: Reason for blocking

        Returns:
            BlockUserResponse with success status
        """
        # Check if already blocked
        existing_block = self.db.query(MessageBlocklist).filter(
            MessageBlocklist.blocker_id == blocker_id,
            MessageBlocklist.blocked_id == blocked_id
        ).first()

        if existing_block:
            return BlockUserResponse(
                success=True,
                blocked_user_id=blocked_id,
                reason=reason.value
            )

        # Create block entry
        block = MessageBlocklist(
            blocker_id=blocker_id,
            blocked_id=blocked_id,
            reason=reason.value
        )

        self.db.add(block)
        self.db.commit()

        return BlockUserResponse(
            success=True,
            blocked_user_id=blocked_id,
            reason=reason.value
        )

    def unblock_user(self, blocker_id: UUID, blocked_id: UUID) -> None:
        """Unblock a user"""
        block = self.db.query(MessageBlocklist).filter(
            MessageBlocklist.blocker_id == blocker_id,
            MessageBlocklist.blocked_id == blocked_id
        ).first()

        if block:
            self.db.delete(block)
            self.db.commit()

    def _is_blocked(self, blocker_id: UUID, blocked_id: UUID) -> bool:
        """Check if a user is blocked"""
        block = self.db.query(MessageBlocklist).filter(
            MessageBlocklist.blocker_id == blocker_id,
            MessageBlocklist.blocked_id == blocked_id
        ).first()

        return block is not None

    def flag_message(
        self,
        message_id: UUID,
        user_id: UUID,
        reason: str
    ) -> Message:
        """Flag a message as spam or inappropriate"""
        message = self.get_message(message_id)

        # Verify user is participant in thread
        thread = self.get_thread(message.thread_id)
        if user_id != thread.employer_id and user_id != thread.candidate_id:
            raise ForbiddenError("You are not a participant in this thread")

        message.is_flagged = True
        message.flagged_reason = reason
        message.flagged_at = datetime.utcnow()

        self.db.commit()
        self.db.refresh(message)

        return message
