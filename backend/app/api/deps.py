"""
Dependency Injection Helpers (Alias for dependencies.py)

This module re-exports everything from dependencies.py for backward compatibility.
"""

from app.api.dependencies import *  # noqa: F401, F403
from app.db.session import get_db  # noqa: F401

__all__ = [
    "get_db",
    "get_current_user",
    "get_current_user_id",
    "get_current_active_user",
    "require_verified_email",
    "security",
]
