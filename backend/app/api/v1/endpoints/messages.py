"""
API Endpoints for Two-Way Messaging System (Issue #70)

Provides RESTful API for:
- Sending messages
- Listing threads
- Reading messages
- Blocking users
- Thread management
"""

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from app.api.dependencies import get_current_user, get_db
from app.db.models.user import User
from app.services.messaging_service import MessagingService
from app.schemas.message import (
    MessageCreate,
    MessageResponse,
    MessageSendResponse,
    ThreadListResponse,
    ThreadDetailResponse,
    MessageThreadResponse,
    BlockUserRequest,
    BlockUserResponse,
    UnreadCountResponse,
    MessageUpdate
)
from app.core.exceptions import (
    BadRequestError,
    ForbiddenError,
    NotFoundError
)

router = APIRouter(prefix="/messages", tags=["Messages"])


# ============================================================================
# MESSAGE SENDING
# ============================================================================

@router.post("", response_model=MessageSendResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> MessageSendResponse:
    """
    Send a new message

    **Business Rules:**
    - Rate limit: 10 messages per day per user
    - Blocked users cannot send messages
    - Email notification sent if recipient offline
    - Supports file attachments (max 5, 25MB total)

    **Request Body:**
    - recipient_id: UUID of the recipient
    - application_id: Optional job application context
    - subject: Optional message subject
    - body: Message content (1-10,000 chars)
    - message_type: Optional classification (interview_invitation, offer_letter, etc.)
    - attachments: Optional list of file attachments

    **Returns:**
    - message: Created message object
    - thread: Thread the message belongs to
    """
    try:
        service = MessagingService(db=db)

        message = service.send_message(
            sender_id=current_user.id,
            message_data=message_data
        )

        thread = service.get_thread(message.thread_id)

        return MessageSendResponse(
            message=MessageResponse.from_orm(message),
            thread=MessageThreadResponse.from_orm(thread)
        )

    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
    except BadRequestError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


# ============================================================================
# THREAD LISTING & DETAIL
# ============================================================================

@router.get("/threads", response_model=ThreadListResponse)
async def list_threads(
    application_id: Optional[UUID] = Query(None, description="Filter by job application"),
    unread_only: bool = Query(False, description="Show only threads with unread messages"),
    archived: bool = Query(False, description="Show archived threads"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ThreadListResponse:
    """
    List message threads for current user

    **Query Parameters:**
    - application_id: Filter by specific job application
    - unread_only: Show only threads with unread messages
    - archived: Show archived threads (default: false)
    - page: Page number (default: 1)
    - limit: Items per page (default: 20, max: 100)

    **Returns:**
    - threads: List of thread objects
    - total: Total number of threads
    - page: Current page number
    - limit: Items per page
    - unread_count: Total unread messages across all threads
    """
    service = MessagingService(db=db)

    threads = service.list_threads(
        user_id=current_user.id,
        application_id=application_id,
        unread_only=unread_only,
        archived=archived,
        page=page,
        limit=limit
    )

    # Get total count
    total = len(threads)  # TODO: Add proper count query

    # Get unread count
    unread_count = service.get_unread_count(current_user.id)

    return ThreadListResponse(
        threads=[MessageThreadResponse.from_orm(t) for t in threads],
        total=total,
        page=page,
        limit=limit,
        unread_count=unread_count
    )


@router.get("/threads/{thread_id}", response_model=ThreadDetailResponse)
async def get_thread_detail(
    thread_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> ThreadDetailResponse:
    """
    Get thread details with message history

    **Path Parameters:**
    - thread_id: UUID of the thread

    **Returns:**
    - thread: Thread metadata
    - messages: List of all messages in thread
    - total_messages: Count of messages

    **Access Control:**
    - User must be a participant in the thread
    """
    try:
        service = MessagingService(db=db)
        thread = service.get_thread(thread_id)

        # Verify user is participant
        if current_user.id != thread.employer_id and current_user.id != thread.candidate_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not a participant in this thread"
            )

        # Get all messages in thread
        messages = db.query(Message).filter(
            Message.thread_id == thread_id,
            Message.is_deleted == False
        ).order_by(Message.created_at.asc()).all()

        return ThreadDetailResponse(
            thread=MessageThreadResponse.from_orm(thread),
            messages=[MessageResponse.from_orm(m) for m in messages],
            total_messages=len(messages)
        )

    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))


# ============================================================================
# MESSAGE READING
# ============================================================================

@router.put("/{message_id}/read", response_model=MessageResponse)
async def mark_message_as_read(
    message_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> MessageResponse:
    """
    Mark a message as read

    **Path Parameters:**
    - message_id: UUID of the message

    **Business Rules:**
    - Only the recipient can mark a message as read
    - Decrements unread count for recipient
    - Sets read_at timestamp

    **Returns:**
    - Updated message object with is_read=true
    """
    try:
        service = MessagingService(db=db)
        message = service.mark_as_read(
            message_id=message_id,
            user_id=current_user.id
        )

        return MessageResponse.from_orm(message)

    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> UnreadCountResponse:
    """
    Get unread message count for current user

    **Returns:**
    - unread_count: Total unread messages
    - unread_threads: Number of threads with unread messages
    """
    service = MessagingService(db=db)

    unread_count = service.get_unread_count(current_user.id)

    # Count threads with unread messages
    threads = service.list_threads(
        user_id=current_user.id,
        unread_only=True
    )
    unread_threads = len(threads)

    return UnreadCountResponse(
        unread_count=unread_count,
        unread_threads=unread_threads
    )


# ============================================================================
# BLOCKING & SPAM PREVENTION
# ============================================================================

@router.post("/block", response_model=BlockUserResponse)
async def block_user(
    block_request: BlockUserRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> BlockUserResponse:
    """
    Block a user from sending messages

    **Request Body:**
    - user_id: UUID of user to block
    - reason: Reason for blocking (spam, harassment, inappropriate_content, other)

    **Business Rules:**
    - Blocked user cannot send messages to blocker
    - Existing threads remain visible but messages cannot be sent
    - Blocking is unidirectional (user_id cannot message current_user)

    **Returns:**
    - success: True if blocked successfully
    - blocked_user_id: UUID of blocked user
    - reason: Reason for blocking
    """
    service = MessagingService(db=db)

    result = service.block_user(
        blocker_id=current_user.id,
        blocked_id=block_request.user_id,
        reason=block_request.reason
    )

    return result


@router.delete("/block/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def unblock_user(
    user_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> None:
    """
    Unblock a previously blocked user

    **Path Parameters:**
    - user_id: UUID of user to unblock

    **Returns:**
    - 204 No Content on success
    """
    service = MessagingService(db=db)

    service.unblock_user(
        blocker_id=current_user.id,
        blocked_id=user_id
    )


# ============================================================================
# THREAD MANAGEMENT
# ============================================================================

@router.patch("/threads/{thread_id}/archive", response_model=MessageThreadResponse)
async def archive_thread(
    thread_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> MessageThreadResponse:
    """
    Archive a thread

    **Path Parameters:**
    - thread_id: UUID of thread to archive

    **Business Rules:**
    - Archive is per-user (doesn't affect other participant)
    - Archived threads hidden from default listing
    - Can be unarchived by fetching with archived=true filter

    **Returns:**
    - Updated thread object
    """
    try:
        service = MessagingService(db=db)
        thread = service.archive_thread(
            thread_id=thread_id,
            user_id=current_user.id
        )

        return MessageThreadResponse.from_orm(thread)

    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.delete("/threads/{thread_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_thread(
    thread_id: UUID,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> None:
    """
    Delete a thread (soft delete)

    **Path Parameters:**
    - thread_id: UUID of thread to delete

    **Business Rules:**
    - Soft delete (maintains audit trail)
    - Only participants can delete
    - Deletion is permanent (cannot be undone)

    **Returns:**
    - 204 No Content on success
    """
    try:
        service = MessagingService(db=db)
        service.delete_thread(
            thread_id=thread_id,
            user_id=current_user.id
        )

    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


@router.post("/{message_id}/flag", response_model=MessageResponse)
async def flag_message(
    message_id: UUID,
    reason: str = Query(..., max_length=255, description="Reason for flagging"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
) -> MessageResponse:
    """
    Flag a message as spam or inappropriate

    **Path Parameters:**
    - message_id: UUID of message to flag

    **Query Parameters:**
    - reason: Reason for flagging (spam, harassment, inappropriate, etc.)

    **Business Rules:**
    - Only thread participants can flag messages
    - Flagged messages reviewed by moderation team
    - Multiple flags may result in automatic blocking

    **Returns:**
    - Updated message object with is_flagged=true
    """
    try:
        service = MessagingService(db=db)
        message = service.flag_message(
            message_id=message_id,
            user_id=current_user.id,
            reason=reason
        )

        return MessageResponse.from_orm(message)

    except NotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except ForbiddenError as e:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))


# Add Message import at the top (needed for thread detail)
from app.db.models.message import Message
