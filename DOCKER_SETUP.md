# Docker Development Environment Setup

This guide explains how to set up and use the Docker-based development environment for HireFlux, including PostgreSQL and Redis.

## Prerequisites

- Docker Desktop installed (Mac/Windows) or Docker Engine + Docker Compose (Linux)
- Docker running on your machine
- At least 2GB free RAM for containers

## Quick Start

### 1. Start Docker Services

```bash
# Start all services (PostgreSQL, Redis, pgAdmin, Redis Commander)
docker-compose up -d

# Check that all services are healthy
docker-compose ps
```

Expected output:
```
NAME                    STATUS              PORTS
hireflux-postgres       Up (healthy)        0.0.0.0:5432->5432/tcp
hireflux-redis          Up (healthy)        0.0.0.0:6379->6379/tcp
hireflux-pgadmin        Up                  0.0.0.0:5050->80/tcp
hireflux-redis-commander Up                 0.0.0.0:8081->8081/tcp
```

### 2. Configure Backend Environment

```bash
# Copy Docker environment variables to backend .env
cp .env.docker backend/.env

# Or manually update backend/.env with PostgreSQL connection string:
# DATABASE_URL=postgresql://hireflux:devpassword@localhost:5432/hireflux_dev
```

### 3. Run Database Migrations

```bash
cd backend

# Activate virtual environment
source venv/bin/activate  # Mac/Linux
# or
.\venv\Scripts\activate   # Windows

# Run Alembic migrations to create all tables
alembic upgrade head

# Verify current migration version
alembic current
```

### 4. Verify Setup

```bash
# Test PostgreSQL connection
docker exec -it hireflux-postgres psql -U hireflux -d hireflux_dev -c "\dt"

# Test Redis connection
docker exec -it hireflux-redis redis-cli -a devpassword ping
```

## Accessing Admin UIs

### pgAdmin (PostgreSQL Management)

1. Open browser: http://localhost:5050
2. Login credentials:
   - Email: `admin@hireflux.com`
   - Password: `admin`
3. Add server connection:
   - Name: `HireFlux Local`
   - Host: `postgres` (container name) or `host.docker.internal` (from Mac/Windows host)
   - Port: `5432`
   - Database: `hireflux_dev`
   - Username: `hireflux`
   - Password: `devpassword`

### Redis Commander (Redis Management)

1. Open browser: http://localhost:8081
2. No login required
3. View keys, set values, monitor commands

## Common Tasks

### Stop Services

```bash
# Stop all containers (preserves data)
docker-compose stop

# Stop and remove containers (preserves data volumes)
docker-compose down

# Stop and remove containers + volumes (deletes all data)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f postgres
docker-compose logs -f redis
```

### Reset Database

```bash
# Stop containers and delete volumes
docker-compose down -v

# Start fresh
docker-compose up -d

# Re-run migrations
cd backend
alembic upgrade head
```

### Backup Database

```bash
# Create backup
docker exec hireflux-postgres pg_dump -U hireflux hireflux_dev > backup_$(date +%Y%m%d).sql

# Restore from backup
docker exec -i hireflux-postgres psql -U hireflux hireflux_dev < backup_20250127.sql
```

## Migrating from SQLite to PostgreSQL

If you have existing data in SQLite that you want to migrate:

### Option 1: Manual Migration (Recommended for small datasets)

```bash
# 1. Export data from SQLite (if needed)
cd backend
sqlite3 ./app.db .dump > sqlite_dump.sql

# 2. Start PostgreSQL with Docker
docker-compose up -d postgres

# 3. Run Alembic migrations to create schema
alembic upgrade head

# 4. Manually recreate critical test data or seed data using API/admin scripts
```

### Option 2: Using pgloader (For large datasets)

```bash
# Install pgloader (Mac)
brew install pgloader

# Create pgloader config file
cat > migrate.load <<EOF
LOAD DATABASE
  FROM sqlite://./backend/app.db
  INTO postgresql://hireflux:devpassword@localhost:5432/hireflux_dev
  WITH include drop, create tables, create indexes, reset sequences
  SET work_mem to '16MB', maintenance_work_mem to '512 MB';
EOF

# Run migration
pgloader migrate.load
```

## Troubleshooting

### Port Already in Use

If port 5432 or 6379 is already in use:

```bash
# Find process using port
lsof -i :5432  # Mac/Linux
netstat -ano | findstr :5432  # Windows

# Either kill that process or change port in docker-compose.yml
# Example: Change "5433:5432" to use host port 5433
```

### Container Won't Start

```bash
# Check logs
docker-compose logs postgres

# Remove and recreate
docker-compose down -v
docker-compose up -d
```

### Connection Refused from Backend

Make sure you're using the correct host:
- From Docker container to container: Use service name `postgres`
- From host machine (your code): Use `localhost` or `127.0.0.1`

Update `DATABASE_URL` in `.env`:
```bash
# From host machine
DATABASE_URL=postgresql://hireflux:devpassword@localhost:5432/hireflux_dev

# From Docker container
DATABASE_URL=postgresql://hireflux:devpassword@postgres:5432/hireflux_dev
```

### Health Check Failing

```bash
# Check health status
docker inspect hireflux-postgres | grep -A 10 Health

# Wait for services to become healthy (can take 30-60 seconds on first start)
docker-compose ps
```

## Performance Tuning

For development, the default settings are sufficient. For production-like testing:

### PostgreSQL

Edit `docker-compose.yml` to add performance settings:

```yaml
services:
  postgres:
    command:
      - "postgres"
      - "-c"
      - "shared_buffers=256MB"
      - "-c"
      - "max_connections=200"
      - "-c"
      - "effective_cache_size=1GB"
```

### Redis

Edit `docker-compose.yml` to add memory limits:

```yaml
services:
  redis:
    command: redis-server --appendonly yes --requirepass devpassword --maxmemory 512mb --maxmemory-policy allkeys-lru
```

## Environment Variables

Key variables in `.env.docker`:

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://hireflux:devpassword@localhost:5432/hireflux_dev` |
| `REDIS_URL` | Redis connection string | `redis://:devpassword@localhost:6379/0` |
| `POSTGRES_USER` | Database username | `hireflux` |
| `POSTGRES_PASSWORD` | Database password | `devpassword` |
| `POSTGRES_DB` | Database name | `hireflux_dev` |

## Next Steps

After setup is complete:

1. Run backend server: `cd backend && uvicorn app.main:app --reload`
2. Run frontend: `cd frontend && npm run dev`
3. Run tests: `cd backend && pytest -v`
4. Access API docs: http://localhost:8000/docs

## Security Notes

- **IMPORTANT**: The `.env.docker` file contains development credentials only
- Never commit production credentials to version control
- Change all passwords before deploying to staging/production
- Use Docker secrets or environment variables for sensitive data in production

## Additional Resources

- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)
- [pgAdmin Documentation](https://www.pgadmin.org/docs/)
