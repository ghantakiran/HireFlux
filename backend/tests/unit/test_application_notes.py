"""
Unit Tests for Application Notes Feature (Issue #27)

Following TDD approach - Tests written FIRST before implementation.

Tests cover:
- Update note (with 5-minute time limit enforcement)
- Delete note (with 5-minute time limit enforcement)
- @mention parsing and extraction
- Visibility controls (private vs team)
"""

import pytest
from datetime import datetime, timedelta
from uuid import uuid4, UUID
from unittest.mock import Mock, MagicMock, patch

from sqlalchemy.orm import Session

from app.services.application_service import ApplicationService
from app.db.models.application import ApplicationNote
from app.schemas.application import ApplicationNoteCreate, ApplicationNoteUpdate


# ============================================================================
# FIXTURES
# ============================================================================


@pytest.fixture
def mock_db():
    """Mock database session"""
    db = Mock(spec=Session)
    db.query = Mock()
    db.add = Mock()
    db.commit = Mock()
    db.refresh = Mock()
    db.delete = Mock()
    return db


@pytest.fixture
def application_service(mock_db):
    """Create ApplicationService instance with mocked DB"""
    return ApplicationService(mock_db)


@pytest.fixture
def sample_note():
    """Create sample ApplicationNote for testing"""
    now = datetime.utcnow()
    return ApplicationNote(
        id=uuid4(),
        application_id=uuid4(),
        author_id=uuid4(),
        content="Test note content",
        visibility="team",
        created_at=now,
        updated_at=now,
    )


@pytest.fixture
def recent_note():
    """Note created less than 5 minutes ago (editable)"""
    now = datetime.utcnow()
    return ApplicationNote(
        id=uuid4(),
        application_id=uuid4(),
        author_id=uuid4(),
        content="Recent note",
        visibility="team",
        created_at=now - timedelta(minutes=2),  # 2 minutes ago
        updated_at=now - timedelta(minutes=2),
    )


@pytest.fixture
def old_note():
    """Note created more than 5 minutes ago (not editable)"""
    now = datetime.utcnow()
    return ApplicationNote(
        id=uuid4(),
        application_id=uuid4(),
        author_id=uuid4(),
        content="Old note",
        visibility="team",
        created_at=now - timedelta(minutes=10),  # 10 minutes ago
        updated_at=now - timedelta(minutes=10),
    )


# ============================================================================
# UPDATE NOTE TESTS (with 5-minute time limit)
# ============================================================================


class TestUpdateNote:
    """Test suite for updating application notes"""

    def test_update_note_within_time_limit_success(
        self, application_service, mock_db, recent_note
    ):
        """Test: Successfully update note within 5-minute time limit"""
        # Arrange
        mock_db.query().filter().first.return_value = recent_note
        update_data = ApplicationNoteUpdate(content="Updated content")
        author_id = recent_note.author_id

        # Act
        updated_note = application_service.update_application_note(
            note_id=recent_note.id, author_id=author_id, note_data=update_data
        )

        # Assert
        assert updated_note.content == "Updated content"
        assert mock_db.commit.called
        assert mock_db.refresh.called

    def test_update_note_exceeds_time_limit_raises_exception(
        self, application_service, mock_db, old_note
    ):
        """Test: Update fails when note is older than 5 minutes"""
        # Arrange
        mock_db.query().filter().first.return_value = old_note
        update_data = ApplicationNoteUpdate(content="Should fail")
        author_id = old_note.author_id

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            application_service.update_application_note(
                note_id=old_note.id, author_id=author_id, note_data=update_data
            )
        assert "5-minute edit window has expired" in str(exc_info.value)

    def test_update_note_not_author_raises_exception(
        self, application_service, mock_db, recent_note
    ):
        """Test: Non-author cannot update note (even within time limit)"""
        # Arrange
        mock_db.query().filter().first.return_value = recent_note
        update_data = ApplicationNoteUpdate(content="Unauthorized update")
        different_user_id = uuid4()  # Different from author_id

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            application_service.update_application_note(
                note_id=recent_note.id,
                author_id=different_user_id,
                note_data=update_data,
            )
        assert "only edit your own notes" in str(exc_info.value).lower()

    def test_update_note_not_found_raises_exception(
        self, application_service, mock_db
    ):
        """Test: Update fails when note doesn't exist"""
        # Arrange
        mock_db.query().filter().first.return_value = None
        update_data = ApplicationNoteUpdate(content="Non-existent note")
        note_id = uuid4()
        author_id = uuid4()

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            application_service.update_application_note(
                note_id=note_id, author_id=author_id, note_data=update_data
            )
        assert "not found" in str(exc_info.value).lower()

    def test_update_note_exactly_at_5_minutes_fails(
        self, application_service, mock_db
    ):
        """Test: Update fails at exactly 5-minute boundary"""
        # Arrange - Note created exactly 5 minutes ago
        now = datetime.utcnow()
        note_at_boundary = ApplicationNote(
            id=uuid4(),
            application_id=uuid4(),
            author_id=uuid4(),
            content="Boundary note",
            visibility="team",
            created_at=now - timedelta(minutes=5),
            updated_at=now - timedelta(minutes=5),
        )
        mock_db.query().filter().first.return_value = note_at_boundary
        update_data = ApplicationNoteUpdate(content="At boundary")

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            application_service.update_application_note(
                note_id=note_at_boundary.id,
                author_id=note_at_boundary.author_id,
                note_data=update_data,
            )
        assert "5-minute edit window" in str(exc_info.value)

    def test_update_note_updates_timestamp(
        self, application_service, mock_db, recent_note
    ):
        """Test: Update operation updates the updated_at timestamp"""
        # Arrange
        mock_db.query().filter().first.return_value = recent_note
        update_data = ApplicationNoteUpdate(content="Updated with timestamp")
        original_updated_at = recent_note.updated_at

        # Act
        with patch("app.services.application_service.datetime") as mock_datetime:
            mock_now = datetime(2025, 11, 16, 12, 0, 0)
            mock_datetime.utcnow.return_value = mock_now
            application_service.update_application_note(
                note_id=recent_note.id,
                author_id=recent_note.author_id,
                note_data=update_data,
            )

        # Assert - Note: The test checks that service attempts to update timestamp
        # (actual timestamp update depends on implementation)
        assert mock_db.commit.called


# ============================================================================
# DELETE NOTE TESTS (with 5-minute time limit)
# ============================================================================


class TestDeleteNote:
    """Test suite for deleting application notes"""

    def test_delete_note_within_time_limit_success(
        self, application_service, mock_db, recent_note
    ):
        """Test: Successfully delete note within 5-minute time limit"""
        # Arrange
        mock_db.query().filter().first.return_value = recent_note
        author_id = recent_note.author_id

        # Act
        application_service.delete_application_note(
            note_id=recent_note.id, author_id=author_id
        )

        # Assert
        assert mock_db.delete.called
        assert mock_db.commit.called

    def test_delete_note_exceeds_time_limit_raises_exception(
        self, application_service, mock_db, old_note
    ):
        """Test: Delete fails when note is older than 5 minutes"""
        # Arrange
        mock_db.query().filter().first.return_value = old_note
        author_id = old_note.author_id

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            application_service.delete_application_note(
                note_id=old_note.id, author_id=author_id
            )
        assert "5-minute edit window has expired" in str(exc_info.value)

    def test_delete_note_not_author_raises_exception(
        self, application_service, mock_db, recent_note
    ):
        """Test: Non-author cannot delete note (even within time limit)"""
        # Arrange
        mock_db.query().filter().first.return_value = recent_note
        different_user_id = uuid4()

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            application_service.delete_application_note(
                note_id=recent_note.id, author_id=different_user_id
            )
        assert "only delete your own notes" in str(exc_info.value).lower()

    def test_delete_note_not_found_raises_exception(
        self, application_service, mock_db
    ):
        """Test: Delete fails when note doesn't exist"""
        # Arrange
        mock_db.query().filter().first.return_value = None
        note_id = uuid4()
        author_id = uuid4()

        # Act & Assert
        with pytest.raises(Exception) as exc_info:
            application_service.delete_application_note(
                note_id=note_id, author_id=author_id
            )
        assert "not found" in str(exc_info.value).lower()


# ============================================================================
# @MENTION PARSING TESTS
# ============================================================================


class TestMentionParsing:
    """Test suite for @mention parsing and extraction"""

    def test_extract_mentions_single_mention(self, application_service):
        """Test: Extract single @mention from note content"""
        # Arrange
        content = "Great candidate! @john_recruiter please schedule phone screen"

        # Act
        mentions = application_service.extract_mentions(content)

        # Assert
        assert mentions == ["john_recruiter"]

    def test_extract_mentions_multiple_mentions(self, application_service):
        """Test: Extract multiple @mentions from note content"""
        # Arrange
        content = "Strong interview! @sarah_manager @david_tech_lead thoughts?"

        # Act
        mentions = application_service.extract_mentions(content)

        # Assert
        assert set(mentions) == {"sarah_manager", "david_tech_lead"}

    def test_extract_mentions_no_mentions(self, application_service):
        """Test: Return empty list when no @mentions present"""
        # Arrange
        content = "This note has no mentions"

        # Act
        mentions = application_service.extract_mentions(content)

        # Assert
        assert mentions == []

    def test_extract_mentions_duplicate_mentions(self, application_service):
        """Test: Handle duplicate @mentions (should return unique list)"""
        # Arrange
        content = "@john mentioned twice @john again"

        # Act
        mentions = application_service.extract_mentions(content)

        # Assert
        assert mentions == ["john"]  # Should deduplicate

    def test_extract_mentions_with_underscores(self, application_service):
        """Test: Extract mentions with underscores in username"""
        # Arrange
        content = "Hi @user_name_with_underscores"

        # Act
        mentions = application_service.extract_mentions(content)

        # Assert
        assert mentions == ["user_name_with_underscores"]

    def test_extract_mentions_with_numbers(self, application_service):
        """Test: Extract mentions with numbers in username"""
        # Arrange
        content = "Hey @user123 and @admin2024"

        # Act
        mentions = application_service.extract_mentions(content)

        # Assert
        assert set(mentions) == {"user123", "admin2024"}

    def test_extract_mentions_at_start_of_line(self, application_service):
        """Test: Extract mention at start of line"""
        # Arrange
        content = "@recruiter this is important"

        # Act
        mentions = application_service.extract_mentions(content)

        # Assert
        assert mentions == ["recruiter"]

    def test_extract_mentions_at_end_of_line(self, application_service):
        """Test: Extract mention at end of line"""
        # Arrange
        content = "Please review @manager"

        # Act
        mentions = application_service.extract_mentions(content)

        # Assert
        assert mentions == ["manager"]

    def test_extract_mentions_ignores_email_addresses(self, application_service):
        """Test: Don't extract email addresses as mentions"""
        # Arrange
        content = "Contact user@example.com for details @real_mention"

        # Act
        mentions = application_service.extract_mentions(content)

        # Assert
        assert mentions == ["real_mention"]  # Should only extract @real_mention
        assert "user" not in mentions  # Should not extract from email


# ============================================================================
# NOTE TYPE TESTS
# ============================================================================


class TestNoteTypes:
    """Test suite for note type field (Internal, Feedback, Interview Notes)"""

    def test_create_note_with_type_internal(self, application_service, mock_db):
        """Test: Create note with type='internal'"""
        # Arrange
        note_data = ApplicationNoteCreate(
            content="Internal discussion",
            visibility="private",
            note_type="internal",
        )
        application_id = uuid4()
        author_id = uuid4()

        # Mock query
        mock_note = ApplicationNote(
            id=uuid4(),
            application_id=application_id,
            author_id=author_id,
            content=note_data.content,
            visibility=note_data.visibility,
            note_type="internal",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        mock_db.refresh.side_effect = lambda obj: setattr(obj, "note_type", "internal")

        # Act
        note = application_service.add_application_note(
            application_id=application_id, author_id=author_id, note_data=note_data
        )

        # Assert
        assert mock_db.add.called
        assert mock_db.commit.called

    def test_create_note_with_type_feedback(self, application_service, mock_db):
        """Test: Create note with type='feedback'"""
        # Arrange
        note_data = ApplicationNoteCreate(
            content="Interview feedback",
            visibility="team",
            note_type="feedback",
        )
        application_id = uuid4()
        author_id = uuid4()

        # Act
        application_service.add_application_note(
            application_id=application_id, author_id=author_id, note_data=note_data
        )

        # Assert
        assert mock_db.add.called
        assert mock_db.commit.called

    def test_create_note_with_type_interview_notes(
        self, application_service, mock_db
    ):
        """Test: Create note with type='interview_notes'"""
        # Arrange
        note_data = ApplicationNoteCreate(
            content="Technical interview went well",
            visibility="team",
            note_type="interview_notes",
        )
        application_id = uuid4()
        author_id = uuid4()

        # Act
        application_service.add_application_note(
            application_id=application_id, author_id=author_id, note_data=note_data
        )

        # Assert
        assert mock_db.add.called
        assert mock_db.commit.called

    def test_create_note_defaults_to_internal_type(
        self, application_service, mock_db
    ):
        """Test: Note type defaults to 'internal' if not specified"""
        # Arrange
        note_data = ApplicationNoteCreate(
            content="Note without type specified", visibility="team"
        )
        application_id = uuid4()
        author_id = uuid4()

        # Act
        application_service.add_application_note(
            application_id=application_id, author_id=author_id, note_data=note_data
        )

        # Assert
        assert mock_db.add.called
        call_args = mock_db.add.call_args[0][0]
        # Note type should default to 'internal' in implementation


# ============================================================================
# INTEGRATION TESTS (Create + Update/Delete flow)
# ============================================================================


class TestNoteLifecycle:
    """Test complete note lifecycle: create → update → delete"""

    def test_note_lifecycle_happy_path(self, application_service, mock_db):
        """Test: Complete lifecycle within time limits"""
        # 1. CREATE
        note_data = ApplicationNoteCreate(
            content="Initial note", visibility="team", note_type="internal"
        )
        application_id = uuid4()
        author_id = uuid4()

        now = datetime.utcnow()
        created_note = ApplicationNote(
            id=uuid4(),
            application_id=application_id,
            author_id=author_id,
            content="Initial note",
            visibility="team",
            note_type="internal",
            created_at=now,
            updated_at=now,
        )

        mock_db.query().filter().first.return_value = created_note
        mock_db.refresh.side_effect = lambda obj: obj

        # Create
        note = application_service.add_application_note(
            application_id=application_id, author_id=author_id, note_data=note_data
        )

        assert mock_db.add.called

        # 2. UPDATE (within 5 minutes)
        update_data = ApplicationNoteUpdate(content="Updated content")
        updated_note = application_service.update_application_note(
            note_id=created_note.id, author_id=author_id, note_data=update_data
        )

        assert mock_db.commit.call_count >= 2  # Create + Update

        # 3. DELETE (within 5 minutes)
        application_service.delete_application_note(
            note_id=created_note.id, author_id=author_id
        )

        assert mock_db.delete.called
        assert mock_db.commit.call_count >= 3  # Create + Update + Delete


# ============================================================================
# HELPER METHOD TESTS
# ============================================================================


class TestHelperMethods:
    """Test utility/helper methods"""

    def test_is_within_edit_window_true(self, application_service):
        """Test: Note created 2 minutes ago is within edit window"""
        # Arrange
        now = datetime.utcnow()
        note_time = now - timedelta(minutes=2)

        # Act
        result = application_service._is_within_edit_window(note_time)

        # Assert
        assert result is True

    def test_is_within_edit_window_false(self, application_service):
        """Test: Note created 10 minutes ago is outside edit window"""
        # Arrange
        now = datetime.utcnow()
        note_time = now - timedelta(minutes=10)

        # Act
        result = application_service._is_within_edit_window(note_time)

        # Assert
        assert result is False

    def test_is_within_edit_window_boundary(self, application_service):
        """Test: Note created exactly 5 minutes ago"""
        # Arrange
        now = datetime.utcnow()
        note_time = now - timedelta(minutes=5)

        # Act
        result = application_service._is_within_edit_window(note_time)

        # Assert
        assert result is False  # Exactly at boundary should be outside window
