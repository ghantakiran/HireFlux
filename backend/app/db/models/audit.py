"""Audit log model for compliance"""
from sqlalchemy import Column, String, TIMESTAMP, UUID, ForeignKey, JSON, Text
from sqlalchemy.dialects.postgresql import INET
from sqlalchemy.sql import func
import uuid

from app.db.base import Base


class EventAudit(Base):
    """Immutable audit log for compliance"""
    __tablename__ = "events_audit"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    event_type = Column(String(100), index=True)  # 'application_submitted', 'data_export', etc.
    event_data = Column(JSON, default={})
    ip_address = Column(INET)
    user_agent = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Note: No relationships to maintain immutability
