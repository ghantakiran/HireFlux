# Quick Start: PostgreSQL Migration

## Prerequisites

**IMPORTANT**: Start Docker Desktop before running these commands.

## Steps to Complete Migration

### 1. Start Docker Desktop

Make sure Docker Desktop is running on your machine.

### 2. Start Database Services

```bash
# From project root
docker-compose up -d

# Wait 10-20 seconds for services to become healthy
docker-compose ps
```

You should see all services with "Up (healthy)" status.

### 3. Run Database Migrations

```bash
cd backend

# Make sure virtual environment is activated
source venv/bin/activate  # Mac/Linux
# or
.\venv\Scripts\activate   # Windows

# Run migrations to create all tables
/Users/kiranreddyghanta/Developer/HireFlux/backend/venv/bin/alembic upgrade head

# Verify current version
/Users/kiranreddyghanta/Developer/HireFlux/backend/venv/bin/alembic current
```

Expected output:
```
INFO  [alembic.runtime.migration] Context impl PostgreSQLImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
INFO  [alembic.runtime.migration] Running upgrade  -> 86ee369868da, create tables
```

### 4. Verify Database Connection

```bash
# Test PostgreSQL connection
docker exec -it hireflux-postgres psql -U hireflux -d hireflux_dev -c "\dt"

# You should see a list of tables: users, resumes, jobs, applications, etc.
```

### 5. Test Redis Connection

```bash
# Test Redis
docker exec -it hireflux-redis redis-cli -a devpassword ping

# Should return: PONG
```

### 6. Start Backend Server

```bash
cd backend

# Make sure .env is using PostgreSQL (already updated)
grep DATABASE_URL .env

# Start server
uvicorn app.main:app --reload --port 8000
```

Visit http://localhost:8000/docs to see the API documentation.

### 7. Run Tests

```bash
# Unit tests
pytest tests/unit -v

# Integration tests (once created)
pytest tests/integration -v
```

## Troubleshooting

### Docker Not Running

**Error**: `Cannot connect to the Docker daemon`

**Solution**:
- Mac: Open Docker Desktop from Applications
- Windows: Open Docker Desktop from Start Menu
- Wait for Docker to fully start (icon in system tray)

### Port Already in Use

**Error**: `Port 5432 is already allocated`

**Solution**:
```bash
# Find what's using the port
lsof -i :5432  # Mac/Linux

# Option 1: Stop the conflicting service
# Option 2: Change port in docker-compose.yml
# Change "5432:5432" to "5433:5432" and update DATABASE_URL to use port 5433
```

### Migration Fails

**Error**: `Target database is not up to date`

**Solution**:
```bash
# Check current version
alembic current

# Check migration history
alembic history

# If needed, downgrade and re-upgrade
alembic downgrade -1
alembic upgrade head
```

### Can't Connect to Database

**Error**: `connection refused` or `could not connect to server`

**Solution**:
```bash
# Check if PostgreSQL is running
docker-compose ps

# Check logs
docker-compose logs postgres

# Restart if needed
docker-compose restart postgres

# Wait 10 seconds and try again
```

## Admin UIs

Once services are running:

- **pgAdmin** (PostgreSQL UI): http://localhost:5050
  - Login: admin@hireflux.com / admin

- **Redis Commander** (Redis UI): http://localhost:8081

## Data Migration from SQLite (Optional)

If you have existing data in SQLite (`hireflux.db`), you can migrate it manually:

```bash
# 1. Export from SQLite
sqlite3 backend/hireflux.db .dump > sqlite_backup.sql

# 2. The schema is already created by Alembic, so just insert data
# 3. Use pgAdmin or psql to manually import critical records

# Or recreate test data using API endpoints/admin scripts
```

For most development cases, starting fresh with migrations is cleaner.

## Next Steps

After PostgreSQL migration is complete:

- ✅ DevOps: PostgreSQL migration complete
- ⏭️ Backend: Add integration tests for analytics
- ⏭️ Backend: Optimize database queries with indexes
- ⏭️ Frontend: Authentication flow implementation
- ⏭️ DevOps: Create staging environment documentation

## Files Created

- `docker-compose.yml` - PostgreSQL + Redis + Admin UIs
- `.env.docker` - Template environment variables
- `backend/.env` - Updated to use PostgreSQL
- `backend/scripts/init-db.sql` - Database initialization
- `DOCKER_SETUP.md` - Comprehensive setup guide
- `QUICK_START_DOCKER.md` - This quick start guide
