"""Audit log model for compliance"""

from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, JSON, Text
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class EventAudit(Base):
    """Immutable audit log for compliance"""

    __tablename__ = "events_audit"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)
    user_id = Column(
        GUID(), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    event_type = Column(
        String(100), index=True
    )  # 'application_submitted', 'data_export', etc.
    event_data = Column(JSON, default={})
    ip_address = Column(String(45))  # IPv6 max length
    user_agent = Column(Text)
    created_at = Column(TIMESTAMP, server_default=func.now(), nullable=False)

    # Note: No relationships to maintain immutability
