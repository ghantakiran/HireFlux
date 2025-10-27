"""Alembic environment configuration"""
from logging.config import fileConfig
from sqlalchemy import engine_from_config
from sqlalchemy import pool
from alembic import context
import os
import sys

# Add parent directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from app.db.base import Base
from app.core.config import settings

# Import all models for Alembic to detect them
from app.db.models.user import User, Profile
from app.db.models.resume import Resume, ResumeVersion
from app.db.models.cover_letter import CoverLetter
from app.db.models.job import Job, JobSource, MatchScore
from app.db.models.application import Application
from app.db.models.billing import CreditWallet, CreditLedger, Subscription
from app.db.models.audit import EventAudit
from app.db.models.interview import InterviewSession, InterviewQuestion
from app.db.models.notification import (
    Notification,
    NotificationPreference,
    EmailTemplate,
)
from app.db.models.auto_apply import AutoApplyConfig, AutoApplyJob
from app.db.models.webhook import (
    WebhookEvent,
    ApplicationStatusHistory,
    InterviewSchedule,
    WebhookSubscription,
)

# this is the Alembic Config object
config = context.config

# Interpret the config file for Python logging
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# Set SQLAlchemy URL from settings
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

# Add your model's MetaData object here for 'autogenerate' support
target_metadata = Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
