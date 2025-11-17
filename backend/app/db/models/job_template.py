"""Job Template Model

Reusable job description templates for employers.
Supports public templates (available to all) and private templates (company-specific).
"""

from sqlalchemy import Column, String, TIMESTAMP, ForeignKey, Text, Integer, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from app.db.base import Base
from app.db.types import GUID


class JobTemplate(Base):
    """Job template for reusable job descriptions"""

    __tablename__ = "job_templates"

    id = Column(GUID(), primary_key=True, default=uuid.uuid4)

    # Ownership (None for public templates)
    company_id = Column(
        GUID(),
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=True,
        index=True,
    )

    # Template metadata
    name = Column(String(255), nullable=False)
    category = Column(
        String(50), nullable=False, index=True
    )  # engineering, sales, marketing, etc.
    visibility = Column(
        String(50), nullable=False, default="private", index=True
    )  # 'public' or 'private'

    # Job details (template fields)
    title = Column(String(255), nullable=False)
    department = Column(String(255), nullable=True)
    employment_type = Column(String(50), nullable=True)  # full_time, part_time, etc.
    experience_level = Column(String(50), nullable=True)  # entry, mid, senior, etc.

    # Content
    description = Column(Text, nullable=True)
    requirements = Column(
        JSON, default=list
    )  # Array of requirement strings ["5+ years experience", ...]
    responsibilities = Column(
        JSON, default=list
    )  # Array of responsibility strings ["Build scalable systems", ...]
    skills = Column(JSON, default=list)  # Array of skill strings ["Python", "React", ...]

    # Usage tracking
    usage_count = Column(
        Integer, default=0, nullable=False
    )  # How many times template used

    # Timestamps
    created_at = Column(TIMESTAMP, server_default=func.now(), index=True)
    updated_at = Column(TIMESTAMP, server_default=func.now(), onupdate=func.now())

    # Relationships
    company = relationship("Company", back_populates="job_templates")
