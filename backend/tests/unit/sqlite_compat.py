"""SQLite compatibility patches for PostgreSQL-specific types"""

from sqlalchemy import Text, CHAR, event
from sqlalchemy.dialects import postgresql

def patch_postgresql_types_for_sqlite(metadata):
    """
    Replace PostgreSQL-specific column types with SQLite-compatible types.

    This function must be called with Base.metadata before creating tables.
    """
    @event.listens_for(metadata, "before_create")
    def receive_before_create(target, connection, **kw):
        """Replace PostgreSQL types during table creation"""
        if connection.dialect.name != "sqlite":
            return

        for table in target.tables.values():
            for column in table.columns:
                col_type = column.type

                # Handle UUID types
                if isinstance(col_type, postgresql.UUID):
                    column.type = CHAR(36)

                # Handle JSONB types
                elif hasattr(col_type, '__class__') and col_type.__class__.__name__ == 'JSONB':
                    column.type = Text()

                # Handle ARRAY types
                elif hasattr(col_type, '__class__') and col_type.__class__.__name__ == 'ARRAY':
                    column.type = Text()
