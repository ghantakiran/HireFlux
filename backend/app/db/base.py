"""
Database base configuration
"""
from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

# Note: Import models in alembic/env.py instead to avoid circular imports
__all__ = ["Base"]
