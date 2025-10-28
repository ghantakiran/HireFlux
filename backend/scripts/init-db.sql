-- HireFlux Database Initialization Script
-- This script runs automatically when PostgreSQL container is first created

-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";           -- UUID generation
CREATE EXTENSION IF NOT EXISTS "pg_trgm";             -- Text search and similarity
CREATE EXTENSION IF NOT EXISTS "btree_gin";           -- Composite indexes for better query performance
CREATE EXTENSION IF NOT EXISTS "pgcrypto";            -- Cryptographic functions

-- Set timezone to UTC for consistency
SET timezone = 'UTC';

-- Create initial database user if not exists (already created by Docker)
-- The POSTGRES_USER environment variable handles this

-- Log initialization
DO $$
BEGIN
  RAISE NOTICE 'HireFlux database initialized successfully';
  RAISE NOTICE 'Extensions enabled: uuid-ossp, pg_trgm, btree_gin, pgcrypto';
  RAISE NOTICE 'Run Alembic migrations to create tables: alembic upgrade head';
END $$;
