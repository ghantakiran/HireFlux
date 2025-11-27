"""
Integration Tests for Messaging API Endpoints (Issue #70)

Tests all 10 RESTful API endpoints with real database and authentication.
Following TDD methodology - comprehensive test coverage before deployment.

Test Coverage:
- Message sending with rate limiting
- Thread listing with pagination and filters
- Thread detail retrieval
- Message read receipts
- Unread count tracking
- User blocking/unblocking
- Thread archiving
- Thread deletion
- Message flagging
- Access control validation
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime, timedelta
from uuid import uuid4

from app.main import app
from app.db.base import Base
from app.api.dependencies import get_db, get_current_user
from app.db.models.user import User
from app.db.models.message import MessageThread, Message, MessageBlocklist
from app.db.models.application import Application
from app.db.models.job import Job
from app.core.security import create_access_token


# ============================================================================
# TEST DATABASE SETUP
# ============================================================================

SQLALCHEMY_TEST_DATABASE_URL = "sqlite:///./test_messages.db"

engine = create_engine(
    SQLALCHEMY_TEST_DATABASE_URL, connect_args={"check_same_thread": False}
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Create a fresh database for each test"""
    Base.metadata.create_all(bind=engine)
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()
        Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def client(db_session):
    """Create test client with database override"""
    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()


# ============================================================================
# TEST FIXTURES
# ============================================================================

@pytest.fixture
def employer_user(db_session):
    """Create employer user for testing"""
    user = User(
        id=uuid4(),
        email="employer@company.com",
        hashed_password="hashed_password",
        role="employer",
        first_name="Jane",
        last_name="Recruiter",
        is_active=True,
        email_verified=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def candidate_user(db_session):
    """Create candidate user for testing"""
    user = User(
        id=uuid4(),
        email="candidate@example.com",
        hashed_password="hashed_password",
        role="candidate",
        first_name="John",
        last_name="Doe",
        is_active=True,
        email_verified=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def candidate_user_2(db_session):
    """Create second candidate user for blocking tests"""
    user = User(
        id=uuid4(),
        email="candidate2@example.com",
        hashed_password="hashed_password",
        role="candidate",
        first_name="Alice",
        last_name="Smith",
        is_active=True,
        email_verified=True
    )
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)
    return user


@pytest.fixture
def mock_job(db_session, employer_user):
    """Create mock job for application context"""
    job = Job(
        id=uuid4(),
        employer_id=employer_user.id,
        title="Senior Software Engineer",
        description="Great opportunity",
        requirements=["Python", "FastAPI"],
        location="San Francisco, CA",
        salary_min=120000,
        salary_max=180000,
        is_active=True
    )
    db_session.add(job)
    db_session.commit()
    db_session.refresh(job)
    return job


@pytest.fixture
def mock_application(db_session, candidate_user, mock_job):
    """Create mock application for thread context"""
    application = Application(
        id=uuid4(),
        job_id=mock_job.id,
        candidate_id=candidate_user.id,
        status="applied",
        resume_url="https://example.com/resume.pdf"
    )
    db_session.add(application)
    db_session.commit()
    db_session.refresh(application)
    return application


@pytest.fixture
def employer_token(employer_user):
    """Create JWT token for employer"""
    return create_access_token(data={"sub": str(employer_user.id)})


@pytest.fixture
def candidate_token(candidate_user):
    """Create JWT token for candidate"""
    return create_access_token(data={"sub": str(candidate_user.id)})


@pytest.fixture
def candidate_token_2(candidate_user_2):
    """Create JWT token for second candidate"""
    return create_access_token(data={"sub": str(candidate_user_2.id)})


@pytest.fixture
def auth_headers_employer(employer_token):
    """Create authorization headers for employer"""
    return {"Authorization": f"Bearer {employer_token}"}


@pytest.fixture
def auth_headers_candidate(candidate_token):
    """Create authorization headers for candidate"""
    return {"Authorization": f"Bearer {candidate_token}"}


@pytest.fixture
def auth_headers_candidate_2(candidate_token_2):
    """Create authorization headers for second candidate"""
    return {"Authorization": f"Bearer {candidate_token_2}"}


# ============================================================================
# TEST: SEND MESSAGE (POST /messages)
# ============================================================================

class TestSendMessage:
    """Test message sending endpoint"""

    def test_send_message_success(
        self, client, employer_user, candidate_user, auth_headers_employer
    ):
        """Test successful message sending"""
        response = client.post(
            "/api/v1/messages",
            json={
                "recipient_id": str(candidate_user.id),
                "subject": "Interview Invitation",
                "body": "We'd like to invite you for an interview...",
                "body_format": "plain",
                "message_type": "interview_invitation"
            },
            headers=auth_headers_employer
        )

        assert response.status_code == 201
        data = response.json()
        assert "message" in data
        assert "thread" in data
        assert data["message"]["body"] == "We'd like to invite you for an interview..."
        assert data["message"]["sender_id"] == str(employer_user.id)
        assert data["message"]["recipient_id"] == str(candidate_user.id)
        assert data["message"]["is_read"] is False

    def test_send_message_with_application_context(
        self, client, employer_user, candidate_user, mock_application, auth_headers_employer
    ):
        """Test message with application context"""
        response = client.post(
            "/api/v1/messages",
            json={
                "recipient_id": str(candidate_user.id),
                "application_id": str(mock_application.id),
                "body": "Your application looks great!",
            },
            headers=auth_headers_employer
        )

        assert response.status_code == 201
        data = response.json()
        assert data["thread"]["application_id"] == str(mock_application.id)

    def test_send_message_rate_limiting(
        self, client, employer_user, candidate_user, auth_headers_employer, db_session
    ):
        """Test rate limiting (10 messages/day)"""
        # Send 10 messages successfully
        for i in range(10):
            response = client.post(
                "/api/v1/messages",
                json={
                    "recipient_id": str(candidate_user.id),
                    "body": f"Message {i+1}",
                },
                headers=auth_headers_employer
            )
            assert response.status_code == 201

        # 11th message should fail
        response = client.post(
            "/api/v1/messages",
            json={
                "recipient_id": str(candidate_user.id),
                "body": "This should fail",
            },
            headers=auth_headers_employer
        )

        assert response.status_code == 400
        assert "rate limit" in response.json()["detail"].lower()

    def test_send_message_to_blocked_user(
        self, client, employer_user, candidate_user, auth_headers_employer, db_session
    ):
        """Test sending message to user who blocked sender"""
        # Candidate blocks employer
        block = MessageBlocklist(
            blocker_id=candidate_user.id,
            blocked_id=employer_user.id,
            reason="spam"
        )
        db_session.add(block)
        db_session.commit()

        response = client.post(
            "/api/v1/messages",
            json={
                "recipient_id": str(candidate_user.id),
                "body": "This should fail",
            },
            headers=auth_headers_employer
        )

        assert response.status_code == 403
        assert "blocked" in response.json()["detail"].lower()

    def test_send_message_validation_empty_body(
        self, client, candidate_user, auth_headers_employer
    ):
        """Test validation fails for empty message body"""
        response = client.post(
            "/api/v1/messages",
            json={
                "recipient_id": str(candidate_user.id),
                "body": "   ",  # Whitespace only
            },
            headers=auth_headers_employer
        )

        assert response.status_code == 422  # Validation error

    def test_send_message_unauthenticated(self, client, candidate_user):
        """Test sending message without authentication"""
        response = client.post(
            "/api/v1/messages",
            json={
                "recipient_id": str(candidate_user.id),
                "body": "This should fail",
            }
        )

        assert response.status_code == 401


# ============================================================================
# TEST: LIST THREADS (GET /messages/threads)
# ============================================================================

class TestListThreads:
    """Test thread listing endpoint"""

    def test_list_threads_empty(self, client, auth_headers_employer):
        """Test listing threads when none exist"""
        response = client.get(
            "/api/v1/messages/threads",
            headers=auth_headers_employer
        )

        assert response.status_code == 200
        data = response.json()
        assert data["threads"] == []
        assert data["total"] == 0
        assert data["unread_count"] == 0

    def test_list_threads_with_messages(
        self, client, employer_user, candidate_user, auth_headers_employer, db_session
    ):
        """Test listing threads with messages"""
        # Create thread and message
        thread = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id,
            subject="Job Application Discussion",
            unread_count_employer=0,
            unread_count_candidate=1
        )
        db_session.add(thread)
        db_session.commit()

        message = Message(
            thread_id=thread.id,
            sender_id=candidate_user.id,
            recipient_id=employer_user.id,
            body="Hello, I have a question",
            is_read=False
        )
        db_session.add(message)
        thread.last_message_at = datetime.utcnow()
        db_session.commit()

        response = client.get(
            "/api/v1/messages/threads",
            headers=auth_headers_employer
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["threads"]) == 1
        assert data["threads"][0]["subject"] == "Job Application Discussion"

    def test_list_threads_unread_only_filter(
        self, client, employer_user, candidate_user, auth_headers_employer, db_session
    ):
        """Test filtering threads by unread status"""
        # Thread with unread messages
        thread1 = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id,
            unread_count_employer=2,
            unread_count_candidate=0
        )
        db_session.add(thread1)

        # Thread with all read
        thread2 = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id,
            unread_count_employer=0,
            unread_count_candidate=0
        )
        db_session.add(thread2)
        db_session.commit()

        response = client.get(
            "/api/v1/messages/threads?unread_only=true",
            headers=auth_headers_employer
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["threads"]) == 1  # Only thread with unread messages

    def test_list_threads_pagination(
        self, client, employer_user, candidate_user, auth_headers_employer, db_session
    ):
        """Test thread pagination"""
        # Create 25 threads
        for i in range(25):
            thread = MessageThread(
                employer_id=employer_user.id,
                candidate_id=candidate_user.id
            )
            db_session.add(thread)
        db_session.commit()

        # Get first page (20 items)
        response = client.get(
            "/api/v1/messages/threads?page=1&limit=20",
            headers=auth_headers_employer
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["threads"]) == 20
        assert data["page"] == 1
        assert data["limit"] == 20

        # Get second page (5 items)
        response = client.get(
            "/api/v1/messages/threads?page=2&limit=20",
            headers=auth_headers_employer
        )

        assert response.status_code == 200
        data = response.json()
        assert len(data["threads"]) == 5


# ============================================================================
# TEST: GET THREAD DETAIL (GET /messages/threads/{id})
# ============================================================================

class TestGetThreadDetail:
    """Test thread detail endpoint"""

    def test_get_thread_detail_success(
        self, client, employer_user, candidate_user, auth_headers_employer, db_session
    ):
        """Test retrieving thread with message history"""
        thread = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id,
            subject="Interview Process"
        )
        db_session.add(thread)
        db_session.commit()

        # Add 3 messages
        for i in range(3):
            message = Message(
                thread_id=thread.id,
                sender_id=employer_user.id if i % 2 == 0 else candidate_user.id,
                recipient_id=candidate_user.id if i % 2 == 0 else employer_user.id,
                body=f"Message {i+1}"
            )
            db_session.add(message)
        db_session.commit()

        response = client.get(
            f"/api/v1/messages/threads/{thread.id}",
            headers=auth_headers_employer
        )

        assert response.status_code == 200
        data = response.json()
        assert data["thread"]["subject"] == "Interview Process"
        assert len(data["messages"]) == 3
        assert data["total_messages"] == 3

    def test_get_thread_detail_not_participant(
        self, client, employer_user, candidate_user, candidate_user_2,
        auth_headers_candidate_2, db_session
    ):
        """Test access denied for non-participants"""
        thread = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id
        )
        db_session.add(thread)
        db_session.commit()

        response = client.get(
            f"/api/v1/messages/threads/{thread.id}",
            headers=auth_headers_candidate_2
        )

        assert response.status_code == 403

    def test_get_thread_detail_not_found(self, client, auth_headers_employer):
        """Test retrieving non-existent thread"""
        fake_id = uuid4()
        response = client.get(
            f"/api/v1/messages/threads/{fake_id}",
            headers=auth_headers_employer
        )

        assert response.status_code == 404


# ============================================================================
# TEST: MARK AS READ (PUT /messages/{id}/read)
# ============================================================================

class TestMarkAsRead:
    """Test mark message as read endpoint"""

    def test_mark_as_read_success(
        self, client, employer_user, candidate_user, auth_headers_candidate, db_session
    ):
        """Test marking message as read"""
        thread = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id,
            unread_count_candidate=1
        )
        db_session.add(thread)
        db_session.commit()

        message = Message(
            thread_id=thread.id,
            sender_id=employer_user.id,
            recipient_id=candidate_user.id,
            body="Hello",
            is_read=False
        )
        db_session.add(message)
        db_session.commit()

        response = client.put(
            f"/api/v1/messages/{message.id}/read",
            headers=auth_headers_candidate
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_read"] is True
        assert data["read_at"] is not None

        # Verify unread count decremented
        db_session.refresh(thread)
        assert thread.unread_count_candidate == 0

    def test_mark_as_read_not_recipient(
        self, client, employer_user, candidate_user, auth_headers_employer, db_session
    ):
        """Test only recipient can mark as read"""
        thread = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id
        )
        db_session.add(thread)
        db_session.commit()

        message = Message(
            thread_id=thread.id,
            sender_id=employer_user.id,
            recipient_id=candidate_user.id,
            body="Hello",
            is_read=False
        )
        db_session.add(message)
        db_session.commit()

        # Sender tries to mark as read
        response = client.put(
            f"/api/v1/messages/{message.id}/read",
            headers=auth_headers_employer
        )

        assert response.status_code == 403


# ============================================================================
# TEST: UNREAD COUNT (GET /messages/unread-count)
# ============================================================================

class TestUnreadCount:
    """Test unread count endpoint"""

    def test_unread_count_zero(self, client, auth_headers_employer):
        """Test unread count when no messages"""
        response = client.get(
            "/api/v1/messages/unread-count",
            headers=auth_headers_employer
        )

        assert response.status_code == 200
        data = response.json()
        assert data["unread_count"] == 0
        assert data["unread_threads"] == 0

    def test_unread_count_with_messages(
        self, client, employer_user, candidate_user, auth_headers_employer, db_session
    ):
        """Test unread count with multiple threads"""
        # Thread 1 with 2 unread
        thread1 = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id,
            unread_count_employer=2
        )
        db_session.add(thread1)

        # Thread 2 with 3 unread
        thread2 = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id,
            unread_count_employer=3
        )
        db_session.add(thread2)
        db_session.commit()

        response = client.get(
            "/api/v1/messages/unread-count",
            headers=auth_headers_employer
        )

        assert response.status_code == 200
        data = response.json()
        assert data["unread_count"] == 5  # 2 + 3
        assert data["unread_threads"] == 2


# ============================================================================
# TEST: BLOCK USER (POST /messages/block)
# ============================================================================

class TestBlockUser:
    """Test block user endpoint"""

    def test_block_user_success(
        self, client, candidate_user, auth_headers_employer
    ):
        """Test successfully blocking a user"""
        response = client.post(
            "/api/v1/messages/block",
            json={
                "user_id": str(candidate_user.id),
                "reason": "spam"
            },
            headers=auth_headers_employer
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert data["blocked_user_id"] == str(candidate_user.id)
        assert data["reason"] == "spam"

    def test_block_user_already_blocked(
        self, client, employer_user, candidate_user, auth_headers_employer, db_session
    ):
        """Test blocking already blocked user (idempotent)"""
        # Block user first
        block = MessageBlocklist(
            blocker_id=employer_user.id,
            blocked_id=candidate_user.id,
            reason="spam"
        )
        db_session.add(block)
        db_session.commit()

        # Try to block again
        response = client.post(
            "/api/v1/messages/block",
            json={
                "user_id": str(candidate_user.id),
                "reason": "harassment"
            },
            headers=auth_headers_employer
        )

        assert response.status_code == 200  # Should succeed (idempotent)


# ============================================================================
# TEST: UNBLOCK USER (DELETE /messages/block/{id})
# ============================================================================

class TestUnblockUser:
    """Test unblock user endpoint"""

    def test_unblock_user_success(
        self, client, employer_user, candidate_user, auth_headers_employer, db_session
    ):
        """Test successfully unblocking a user"""
        # Block user first
        block = MessageBlocklist(
            blocker_id=employer_user.id,
            blocked_id=candidate_user.id,
            reason="spam"
        )
        db_session.add(block)
        db_session.commit()

        response = client.delete(
            f"/api/v1/messages/block/{candidate_user.id}",
            headers=auth_headers_employer
        )

        assert response.status_code == 204

        # Verify block removed
        remaining_blocks = db_session.query(MessageBlocklist).filter(
            MessageBlocklist.blocker_id == employer_user.id,
            MessageBlocklist.blocked_id == candidate_user.id
        ).count()
        assert remaining_blocks == 0


# ============================================================================
# TEST: ARCHIVE THREAD (PATCH /messages/threads/{id}/archive)
# ============================================================================

class TestArchiveThread:
    """Test archive thread endpoint"""

    def test_archive_thread_success(
        self, client, employer_user, candidate_user, auth_headers_employer, db_session
    ):
        """Test archiving a thread"""
        thread = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id,
            archived_by_employer=False
        )
        db_session.add(thread)
        db_session.commit()

        response = client.patch(
            f"/api/v1/messages/threads/{thread.id}/archive",
            headers=auth_headers_employer
        )

        assert response.status_code == 200

        # Verify archived
        db_session.refresh(thread)
        assert thread.archived_by_employer is True
        assert thread.archived_by_candidate is False  # Other user not affected

    def test_archive_thread_not_participant(
        self, client, employer_user, candidate_user, candidate_user_2,
        auth_headers_candidate_2, db_session
    ):
        """Test non-participant cannot archive"""
        thread = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id
        )
        db_session.add(thread)
        db_session.commit()

        response = client.patch(
            f"/api/v1/messages/threads/{thread.id}/archive",
            headers=auth_headers_candidate_2
        )

        assert response.status_code == 403


# ============================================================================
# TEST: DELETE THREAD (DELETE /messages/threads/{id})
# ============================================================================

class TestDeleteThread:
    """Test delete thread endpoint"""

    def test_delete_thread_success(
        self, client, employer_user, candidate_user, auth_headers_employer, db_session
    ):
        """Test soft deleting a thread"""
        thread = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id,
            is_deleted=False
        )
        db_session.add(thread)
        db_session.commit()

        response = client.delete(
            f"/api/v1/messages/threads/{thread.id}",
            headers=auth_headers_employer
        )

        assert response.status_code == 204

        # Verify soft deleted
        db_session.refresh(thread)
        assert thread.is_deleted is True
        assert thread.deleted_at is not None


# ============================================================================
# TEST: FLAG MESSAGE (POST /messages/{id}/flag)
# ============================================================================

class TestFlagMessage:
    """Test flag message endpoint"""

    def test_flag_message_success(
        self, client, employer_user, candidate_user, auth_headers_candidate, db_session
    ):
        """Test flagging a message as spam"""
        thread = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id
        )
        db_session.add(thread)
        db_session.commit()

        message = Message(
            thread_id=thread.id,
            sender_id=employer_user.id,
            recipient_id=candidate_user.id,
            body="Spam message",
            is_flagged=False
        )
        db_session.add(message)
        db_session.commit()

        response = client.post(
            f"/api/v1/messages/{message.id}/flag?reason=spam",
            headers=auth_headers_candidate
        )

        assert response.status_code == 200
        data = response.json()
        assert data["is_flagged"] is True
        assert data["flagged_reason"] == "spam"

    def test_flag_message_not_participant(
        self, client, employer_user, candidate_user, candidate_user_2,
        auth_headers_candidate_2, db_session
    ):
        """Test non-participant cannot flag message"""
        thread = MessageThread(
            employer_id=employer_user.id,
            candidate_id=candidate_user.id
        )
        db_session.add(thread)
        db_session.commit()

        message = Message(
            thread_id=thread.id,
            sender_id=employer_user.id,
            recipient_id=candidate_user.id,
            body="Message"
        )
        db_session.add(message)
        db_session.commit()

        response = client.post(
            f"/api/v1/messages/{message.id}/flag?reason=spam",
            headers=auth_headers_candidate_2
        )

        assert response.status_code == 403
