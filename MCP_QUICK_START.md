# HireFlux MCP Integration - Quick Start Guide

## Overview

This guide will help you get started with HireFlux's Model Context Protocol (MCP) integrations in under 15 minutes.

## Prerequisites

- Python 3.11+
- Node.js 18+
- Redis running locally or remote connection
- PostgreSQL/Supabase database
- API keys for: OpenAI, Pinecone, Stripe

## Step 1: Install Dependencies

```bash
# Install MCP server dependencies
cd HireFlux
pip install -r mcp-servers/requirements-mcp.txt

# Install official MCP servers
npm install -g @modelcontextprotocol/server-github
npm install -g @modelcontextprotocol/server-postgres
```

## Step 2: Configure Environment Variables

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required variables:
```bash
# Database
SUPABASE_DB_URL=postgresql://user:pass@db.supabase.co:5432/hireflux

# Redis
REDIS_URL=redis://localhost:6379/0

# AI/ML
OPENAI_API_KEY=sk-proj-...
PINECONE_API_KEY=...
PINECONE_ENVIRONMENT=us-west1-gcp

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# GitHub
GITHUB_TOKEN=ghp_...
```

## Step 3: Set Up Database Schema

Create the audit log table:

```sql
CREATE TABLE IF NOT EXISTS events_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(100) NOT NULL,
    user_id VARCHAR(100) NOT NULL,
    event_timestamp TIMESTAMPTZ NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}',
    immutable BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_events_audit_user_id ON events_audit(user_id);
CREATE INDEX idx_events_audit_event_type ON events_audit(event_type);
CREATE INDEX idx_events_audit_timestamp ON events_audit(event_timestamp DESC);
CREATE INDEX idx_events_audit_metadata ON events_audit USING GIN (metadata);
```

## Step 4: Configure MCP Servers

The MCP configuration is in `.mcp-config.json` at the project root.

For Claude Code, copy to your home directory:

```bash
mkdir -p ~/.config/claude-code
cp .mcp-config.json ~/.config/claude-code/mcp-config.json
```

## Step 5: Test MCP Servers

Test each server individually:

```bash
# Test OpenAI MCP
python mcp-servers/openai/server.py &
# Kill with: kill %1

# Test Redis MCP
python mcp-servers/redis/server.py &

# Test Pinecone MCP
python mcp-servers/pinecone/server.py &

# Test Stripe MCP
python mcp-servers/stripe/server.py &

# Test Audit Log MCP
python mcp-servers/audit-log/server.py &
```

## Step 6: Verify Integration

Use Claude Code to test the MCPs:

```
Ask Claude: "List all available MCP tools"
```

Expected tools:
- OpenAI: `chat_completion`, `create_embedding`, `get_cost_breakdown`, `estimate_tokens`
- Redis: `get_cache_stats`, `inspect_queue`, `invalidate_pattern`, `monitor_memory`
- Pinecone: `upsert_vectors`, `query_similar`, `get_index_stats`
- Stripe: `create_subscription`, `report_usage`, `process_refund`
- Audit Log: `record_event`, `verify_consent`, `query_data_lineage`
- GitHub: (already connected)
- Postgres: (already connected)

## Common Integration Patterns

### Pattern 1: Resume Generation with Cost Tracking

```python
# In your backend code (FastAPI)
from mcp_client import MCPClient

mcp = MCPClient()

# Generate resume with cost tracking
result = await mcp.call("openai", "chat_completion", {
    "model": "gpt-4-turbo",
    "messages": [
        {"role": "system", "content": resume_system_prompt},
        {"role": "user", "content": user_data_json}
    ],
    "temperature": 0.7,
    "max_tokens": 1500,
    "metadata": {
        "user_id": user.id,
        "feature": "resume_generation",
        "budget_limit": 0.50
    }
})

# Check cost
if result["cost"] > 0.50:
    logger.warning(f"Budget exceeded: ${result['cost']:.2f}")
```

### Pattern 2: Job Matching with Vector Search

```python
# Generate user skills embedding
embedding_result = await mcp.call("embeddings", "generate_embedding", {
    "text": "Python, FastAPI, PostgreSQL, Redis, Docker",
    "model": "text-embedding-3-small",
    "cache_key": f"skills:{user.id}",
    "ttl": 2592000  # 30 days
})

# Query similar jobs
matches = await mcp.call("pinecone", "query_similar", {
    "vector": embedding_result["embedding"],
    "top_k": 50,
    "filter": {
        "remote": True,
        "salary_min": {"$gte": 120000}
    },
    "include_metadata": True
})
```

### Pattern 3: Compliance-First Auto-Apply

```python
# Verify consent
consent = await mcp.call("audit_log", "verify_consent", {
    "user_id": user.id,
    "job_board": "greenhouse",
    "consent_type": "auto_apply"
})

if not consent["valid"]:
    raise ConsentRequiredError("User must re-authorize")

# Consume credit
await mcp.call("stripe", "report_usage", {
    "subscription_item": user.stripe_metered_item_id,
    "quantity": 1,
    "metadata": {"job_id": job.id}
})

# Record audit event
await mcp.call("audit_log", "record_event", {
    "event_type": "application_submitted",
    "user_id": user.id,
    "metadata": {
        "job_id": job.id,
        "application_id": app.id,
        "consent_verified": True
    },
    "immutable": True
})
```

## Monitoring & Observability

### Check Redis Cache Performance

```python
stats = await mcp.call("redis", "get_cache_stats", {
    "keys_pattern": "resume:*",
    "period": "1h"
})

# Expected: hit_rate > 0.85
print(f"Cache hit rate: {stats['hit_rate']:.2%}")
```

### Monitor LLM Costs

```python
costs = await mcp.call("openai", "get_cost_breakdown", {
    "user_id": user.id,
    "period": "month",
    "group_by": "feature"
})

# Target: <$1.20/user/month
print(f"Total cost: ${costs['total_cost']:.2f}")
```

### Monitor Job Queue

```python
queue_stats = await mcp.call("redis", "inspect_queue", {
    "queue_name": "default"
})

# Alert if pending > 100
if queue_stats["pending_jobs"] > 100:
    logger.warning(f"Queue backlog: {queue_stats['pending_jobs']} jobs")
```

## Troubleshooting

### MCP Server Not Responding

```bash
# Check if server is running
ps aux | grep "mcp-servers"

# Check logs
tail -f /tmp/hireflux-mcp-*.log

# Restart server
pkill -f "openai/server.py"
python mcp-servers/openai/server.py &
```

### Redis Connection Issues

```bash
# Test Redis connection
redis-cli ping

# Check Redis memory
redis-cli info memory
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql $SUPABASE_DB_URL -c "SELECT 1"

# Check connection pool
psql $SUPABASE_DB_URL -c "SELECT count(*) FROM pg_stat_activity"
```

### API Key Issues

```bash
# Verify OpenAI key
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Verify Stripe key
curl https://api.stripe.com/v1/customers \
  -u $STRIPE_SECRET_KEY:
```

## Performance Benchmarks

Expected performance for P0 MCPs:

| MCP | Operation | p95 Latency | Success Rate |
|-----|-----------|-------------|--------------|
| OpenAI | chat_completion | <5s | >99% |
| OpenAI | create_embedding | <500ms | >99.9% |
| Pinecone | query_similar | <200ms | >99.5% |
| Redis | get_cache_stats | <50ms | >99.9% |
| Postgres | query | <100ms | >99.9% |
| Stripe | report_usage | <1s | >99% |
| Audit Log | record_event | <100ms | >99.9% |

## Next Steps

1. **Phase 1 (MVP)**: Complete P0 MCP integrations
   - ✅ OpenAI, Redis, Pinecone, Stripe, Audit Log
   - ⏳ Job Boards MCP (custom build)
   - ⏳ S3 MCP (custom build)
   - ⏳ Email MCP (custom build)

2. **Phase 2 (Beta)**: Add monitoring and observability
   - OpenTelemetry MCP
   - Sentry MCP
   - Database Schema MCP

3. **Phase 3 (GA)**: Developer experience tools
   - Python Linting MCP
   - Pytest MCP
   - OpenAPI Schema MCP

## Resources

- [Full MCP Integration Architecture](./MCP_INTEGRATION_ARCHITECTURE.md)
- [Backend Documentation](./backend/README.md)
- [API Design](./API_DESIGN.md)
- [Database Schema](./DATABASE_DESIGN.md)

## Support

For issues or questions:
- Check [MCP Integration Architecture](./MCP_INTEGRATION_ARCHITECTURE.md)
- Review [Troubleshooting](#troubleshooting) section above
- Open GitHub issue with `[MCP]` prefix

