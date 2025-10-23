# HireFlux - MCP Integration Architecture

**Version**: 1.0
**Last Updated**: 2025-10-23
**Document Owner**: Architecture Team
**Status**: Implementation Ready

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [MCP Server Categories](#mcp-server-categories)
3. [Development Tools MCPs](#development-tools-mcps)
4. [Infrastructure & Operations MCPs](#infrastructure--operations-mcps)
5. [Integration Patterns](#integration-patterns)
6. [Implementation Roadmap](#implementation-roadmap)
7. [Configuration Files](#configuration-files)

---

## Executive Summary

This document defines the complete Model Context Protocol (MCP) integration strategy for HireFlux. MCP servers enable Claude Code and development workflows to interact with external services, databases, APIs, and tools through standardized interfaces.

**Categories**:
- **Development Tools**: Code quality, testing, documentation, version control
- **Infrastructure**: Databases, caching, storage, monitoring
- **AI/ML Operations**: LLM providers, embeddings, cost tracking
- **External Services**: Payments, email, job boards, authentication
- **Operations**: Logging, monitoring, compliance, security

---

## MCP Server Categories

### P0 - Critical (MVP Blockers)
Required for basic product functionality

### P1 - High Priority (Beta Requirements)
Required for production readiness and scaling

### P2 - Nice to Have (Post-GA)
Enhances developer experience and operational efficiency

---

## Development Tools MCPs

### 1. Version Control & Code Management

#### **GitHub MCP** ✓ (Already Connected)
**Priority**: P0
**Package**: `@modelcontextprotocol/server-github`
**Purpose**: Repository management, PRs, issues, code reviews

**Capabilities**:
- Create/update files and branches
- PR creation and review workflows
- Issue tracking and project management
- GitHub Actions integration
- Code search across repositories

**Configuration**:
```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    }
  }
}
```

**Use Cases**:
- Automated PR creation for schema migrations
- Issue creation for LLM regression tracking
- Code review automation
- Release management

---

### 2. Code Quality & Linting

#### **Python Linting MCP** (Custom Build)
**Priority**: P1
**Purpose**: Real-time code quality checks for FastAPI backend

**Capabilities**:
- Run Black formatter checks
- Execute Flake8 linting
- MyPy type checking
- Pre-commit hook validation
- Security linting with Bandit

**Tool Interface**:
```python
# mcp-servers/python-linting/server.py
{
  "tools": [
    "run_black",      # Format check/auto-fix
    "run_flake8",     # Style linting
    "run_mypy",       # Type checking
    "run_bandit",     # Security scanning
    "run_precommit"   # All pre-commit hooks
  ]
}
```

**Integration Pattern**:
```python
# Before committing code
mcp.call("python_linting", "run_precommit", {
    "files": ["app/services/resume.py"],
    "fix": True  # Auto-fix issues
})
```

---

#### **ESLint/Prettier MCP** (Custom Build)
**Priority**: P1
**Purpose**: Frontend code quality for Next.js

**Capabilities**:
- ESLint rule enforcement
- Prettier formatting
- TypeScript type checking
- Next.js specific linting
- Import sorting

**Tool Interface**:
```json
{
  "tools": [
    "run_eslint",
    "run_prettier",
    "check_types",
    "fix_imports"
  ]
}
```

---

### 3. Testing & Quality Assurance

#### **Pytest MCP** (Custom Build)
**Priority**: P0
**Purpose**: Backend test execution and coverage

**Capabilities**:
- Run pytest with filters (unit/integration/e2e)
- Coverage reporting (target: >80%)
- Async test support
- Fixture management
- Snapshot testing for LLM outputs

**Tool Interface**:
```python
{
  "tools": [
    "run_tests",           # Execute test suite
    "run_coverage",        # Coverage report
    "run_test_file",       # Single file
    "run_test_marker",     # @pytest.mark filter
    "snapshot_llm_output"  # LLM regression testing
  ]
}
```

**Example Usage**:
```python
# Run tests before deployment
result = mcp.call("pytest", "run_coverage", {
    "min_coverage": 80,
    "exclude": ["tests/", "alembic/"],
    "fail_under": True
})
```

---

#### **Jest/Playwright MCP** (Custom Build)
**Priority**: P1
**Purpose**: Frontend testing (unit + E2E)

**Capabilities**:
- Jest unit/component tests
- Playwright E2E scenarios
- Visual regression testing
- Accessibility testing (WCAG 2.1 AA)
- Performance budgets

**Tool Interface**:
```json
{
  "tools": [
    "run_jest",
    "run_e2e",
    "run_a11y_tests",
    "run_visual_regression",
    "check_performance_budget"
  ]
}
```

---

### 4. Documentation & Schema Management

#### **OpenAPI Schema MCP** (Custom Build)
**Priority**: P1
**Purpose**: API documentation validation

**Capabilities**:
- Generate OpenAPI 3.1 spec from FastAPI
- Validate request/response schemas
- Detect breaking changes
- Generate client SDKs
- API versioning support

**Tool Interface**:
```python
{
  "tools": [
    "generate_openapi_spec",
    "validate_schema",
    "detect_breaking_changes",
    "generate_typescript_client"
  ]
}
```

---

#### **Database Schema MCP** (Custom Build)
**Priority**: P0
**Purpose**: Alembic migration management

**Capabilities**:
- Generate migrations from model changes
- Validate migration safety
- Detect schema drift
- Rollback simulations
- Multi-environment sync

**Tool Interface**:
```python
{
  "tools": [
    "generate_migration",
    "validate_migration",
    "check_schema_drift",
    "simulate_rollback",
    "compare_environments"  # dev vs staging
  ]
}
```

**Integration Pattern**:
```python
# Validate migration before commit
mcp.call("db_schema", "validate_migration", {
    "migration_file": "alembic/versions/001_add_resume_versions.py",
    "checks": ["no_data_loss", "backward_compatible", "index_coverage"]
})
```

---

## Infrastructure & Operations MCPs

### 5. Database Operations

#### **PostgreSQL MCP** ✓
**Priority**: P0
**Package**: `@modelcontextprotocol/server-postgres`
**Purpose**: Direct Supabase/Postgres access

**Capabilities**:
- Execute queries with parameter binding
- Schema introspection
- Query performance analysis (EXPLAIN)
- Connection pooling status
- Index usage statistics

**Configuration**:
```json
{
  "mcpServers": {
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${SUPABASE_DB_URL}"
      }
    }
  }
}
```

**Use Cases**:
- Debug slow queries (p95 > 300ms)
- Validate migration data integrity
- Monitor connection pool health
- Generate test fixtures from production snapshots

---

#### **Redis MCP** (Custom Build)
**Priority**: P0
**Purpose**: Cache management and queue monitoring

**Capabilities**:
- Cache hit/miss rate monitoring
- RQ job queue inspection
- TTL management
- Cache invalidation
- Memory usage analytics

**Tool Interface**:
```python
{
  "tools": [
    "get_cache_stats",
    "inspect_queue",      # RQ jobs pending/failed
    "invalidate_pattern", # Cache busting
    "monitor_memory",
    "list_slow_keys"      # Performance debugging
  ]
}
```

**Integration Pattern**:
```python
# Monitor cache effectiveness
stats = mcp.call("redis", "get_cache_stats", {
    "keys_pattern": "resume:*",
    "period": "1h"
})
# Expected: hit_rate > 0.85 for resume generation
```

---

### 6. Vector Database

#### **Pinecone MCP** (Custom Build)
**Priority**: P0
**Purpose**: Skills embeddings and job matching

**Capabilities**:
- Upsert user/job embeddings
- Similarity search with filters
- Index statistics (dimension, count)
- Query performance metrics
- Bulk operations for batch jobs

**Tool Interface**:
```python
{
  "tools": [
    "upsert_vectors",
    "query_similar",
    "get_index_stats",
    "delete_by_filter",
    "bulk_upsert"         # Batch job ingestion
  ]
}
```

**Integration Pattern**:
```python
# Job matching flow
matches = mcp.call("pinecone", "query_similar", {
    "index": "jobs-production",
    "vector": user_skills_embedding,  # 1536-dim from OpenAI
    "top_k": 50,
    "filter": {
        "remote": True,
        "salary_min": {"$gte": 120000},
        "seniority": {"$in": ["senior", "staff"]}
    },
    "include_metadata": True
})
# Returns: [{id, score, metadata: {title, company, ...}}]
```

---

### 7. Storage & File Management

#### **Filesystem MCP** ✓ (Secured)
**Priority**: P1
**Package**: `@modelcontextprotocol/server-filesystem`
**Purpose**: Local file operations (dev/staging only)

**Capabilities**:
- Resume parsing (PDF/DOCX → text)
- Template management
- Artifact staging before S3 upload
- Log file analysis

**Security Configuration**:
```json
{
  "mcpServers": {
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp/hireflux"],
      "env": {
        "ALLOWED_DIRECTORIES": "/tmp/hireflux/uploads,/tmp/hireflux/templates"
      }
    }
  }
}
```

**Use Cases**:
- Parse uploaded resumes before DB storage
- Generate PDF artifacts from templates
- Temporary file staging (deleted after 1h)

---

#### **AWS S3 MCP** (Custom Build)
**Priority**: P1
**Purpose**: Production artifact storage

**Capabilities**:
- Upload resume PDFs with versioning
- Generate presigned URLs (expiry: 1h)
- Lifecycle policy management
- Storage cost analytics
- CORS configuration validation

**Tool Interface**:
```python
{
  "tools": [
    "upload_file",
    "generate_presigned_url",
    "list_bucket_objects",
    "get_storage_costs",
    "validate_cors"
  ]
}
```

**Integration Pattern**:
```python
# Store generated resume
url = mcp.call("s3", "upload_file", {
    "bucket": "hireflux-artifacts-prod",
    "key": f"resumes/{user_id}/{resume_id}/v{version}.pdf",
    "body": pdf_bytes,
    "content_type": "application/pdf",
    "metadata": {
        "user_id": user_id,
        "job_family": "backend_engineer",
        "generated_at": "2025-10-23T10:30:00Z"
    },
    "versioning": True
})
```

---

### 8. AI/ML Operations

#### **OpenAI MCP** (Custom Build)
**Priority**: P0
**Purpose**: LLM request orchestration with cost tracking

**Capabilities**:
- Chat completions with streaming
- Token usage tracking per user/feature
- Cost attribution ($0.01/1K tokens GPT-4)
- Model fallback (GPT-4 → GPT-3.5)
- Prompt versioning and A/B testing
- Rate limit handling with retries

**Tool Interface**:
```python
{
  "tools": [
    "chat_completion",
    "create_embedding",
    "get_cost_breakdown",    # By user/feature
    "test_prompt_variant",   # A/B testing
    "estimate_tokens"        # Pre-request cost estimation
  ]
}
```

**Integration Pattern**:
```python
# Resume generation with cost control
response = mcp.call("openai", "chat_completion", {
    "model": "gpt-4-turbo",
    "messages": [
        {"role": "system", "content": resume_system_prompt},
        {"role": "user", "content": user_experience_json}
    ],
    "temperature": 0.7,
    "max_tokens": 1500,
    "metadata": {
        "user_id": user.id,
        "feature": "resume_generation",
        "tone": "formal",
        "budget_limit": 0.50,      # Auto-fallback if exceeds
        "fallback_model": "gpt-3.5-turbo"
    }
})

# Cost tracking
costs = mcp.call("openai", "get_cost_breakdown", {
    "user_id": user.id,
    "period": "month",
    "group_by": "feature"
})
# Expected: avg_cost_per_user < $1.20/month
```

**Rate Limiting Strategy**:
```python
{
    "tier": "tier-4",  # $1000+ spend
    "limits": {
        "rpm": 10000,    # Requests per minute
        "tpm": 2000000,  # Tokens per minute
        "rpd": 500000    # Requests per day
    },
    "retry_strategy": "exponential_backoff",
    "max_retries": 3,
    "backoff_base": 2  # 2s, 4s, 8s
}
```

---

#### **Embeddings Service MCP** (Custom Build)
**Priority**: P0
**Purpose**: Centralized embedding generation and caching

**Capabilities**:
- Generate text embeddings (OpenAI text-embedding-3-small)
- Cache embeddings in Redis (TTL: 30 days)
- Batch embedding generation
- Similarity computation
- Cost optimization (cache hit rate monitoring)

**Tool Interface**:
```python
{
  "tools": [
    "generate_embedding",
    "batch_embed",
    "compute_similarity",
    "get_cache_stats"
  ]
}
```

**Integration Pattern**:
```python
# Skills embedding with caching
embedding = mcp.call("embeddings", "generate_embedding", {
    "text": "Python, FastAPI, PostgreSQL, Redis, Docker, AWS",
    "model": "text-embedding-3-small",  # 1536-dim, $0.00002/1K tokens
    "cache_key": f"skills:{user.id}",
    "ttl": 2592000  # 30 days
})

# Batch job embeddings (ingestion pipeline)
job_embeddings = mcp.call("embeddings", "batch_embed", {
    "texts": [job.description for job in new_jobs],
    "model": "text-embedding-3-small",
    "batch_size": 100  # Process in chunks
})
```

---

### 9. Payment & Billing

#### **Stripe MCP** (Custom Build)
**Priority**: P0
**Purpose**: Subscription and credit management

**Capabilities**:
- Create/update subscriptions
- Metered usage reporting (auto-apply credits)
- Refund processing
- Invoice reconciliation
- Webhook validation
- Payment method management

**Tool Interface**:
```python
{
  "tools": [
    "create_subscription",
    "report_usage",           # Metered billing
    "process_refund",
    "validate_webhook",
    "get_customer_balance",
    "list_invoices"
  ]
}
```

**Integration Pattern**:
```python
# Auto-apply credit consumption
mcp.call("stripe", "report_usage", {
    "subscription_item": user.stripe_metered_item_id,
    "quantity": 1,  # 1 auto-apply credit
    "action": "increment",
    "metadata": {
        "job_id": job.id,
        "application_id": application.id,
        "timestamp": "2025-10-23T10:30:00Z"
    }
})

# Refund for invalid job match
refund = mcp.call("stripe", "process_refund", {
    "user_id": user.id,
    "amount": 1,  # 1 credit
    "reason": "invalid_job_match",
    "metadata": {
        "job_id": job.id,
        "issue": "job_description_unavailable",
        "fit_score": 35  # Below 40 threshold
    }
})
```

**Subscription Tiers**:
```python
{
    "free": {
        "price": 0,
        "credits": {"cover_letters": 3, "job_suggestions": 10}
    },
    "plus": {
        "price": 19,
        "stripe_price_id": "price_plus_monthly",
        "credits": {"cover_letters": -1, "job_suggestions": 100}  # -1 = unlimited
    },
    "pro": {
        "price": 49,
        "stripe_price_id": "price_pro_monthly",
        "credits": {"auto_apply": 50},  # Metered usage
        "includes": "plus"
    }
}
```

---

### 10. Communication

#### **Email MCP (Resend)** (Custom Build)
**Priority**: P0
**Purpose**: Transactional emails and notifications

**Capabilities**:
- Send transactional emails (confirmations, alerts)
- Template rendering with personalization
- High-fit job notifications
- Batch email sending
- Delivery tracking
- Bounce/complaint handling

**Tool Interface**:
```python
{
  "tools": [
    "send_email",
    "send_batch",
    "render_template",
    "track_delivery",
    "handle_webhook"  # Bounces/complaints
  ]
}
```

**Integration Pattern**:
```python
# High-fit job notification
mcp.call("email", "send_email", {
    "to": user.email,
    "template": "high_fit_job_alert",
    "data": {
        "user_name": user.first_name,
        "job_title": job.title,
        "company": job.company,
        "fit_score": 92,
        "match_reasons": [
            "5+ years Python/FastAPI experience",
            "Remote-friendly role",
            "Salary range matches ($140K-$180K)"
        ],
        "apply_url": f"https://app.hireflux.com/jobs/{job.id}/apply"
    },
    "tags": ["job_match", "high_fit"],
    "metadata": {"job_id": job.id}
})
```

**Email Templates**:
- `welcome` - Onboarding email
- `resume_generated` - Resume ready for download
- `high_fit_job_alert` - Job match notification (Fit Index ≥ 80)
- `application_status_change` - Interview/rejection updates
- `credit_low_balance` - Credit reminder
- `weekly_job_digest` - Personalized job suggestions

---

### 11. Monitoring & Observability

#### **OpenTelemetry MCP** (Custom Build)
**Priority**: P0
**Purpose**: Distributed tracing and metrics

**Capabilities**:
- Trace LLM generation flows
- p95 latency tracking (TTFB, generation time)
- Error rate monitoring
- Custom metrics (business KPIs)
- Span attribution to users/features

**Tool Interface**:
```python
{
  "tools": [
    "create_trace",
    "add_span",
    "record_metric",
    "get_latency_stats",
    "query_traces"
  ]
}
```

**Integration Pattern**:
```python
# Trace resume generation flow
with mcp.call("otel", "create_trace", {"name": "resume_generation"}) as trace:
    trace.add_span("parse_user_data", duration_ms=45)
    trace.add_span("generate_llm_content", duration_ms=4200, attributes={
        "model": "gpt-4-turbo",
        "tokens": 1500,
        "cost": 0.045
    })
    trace.add_span("render_pdf", duration_ms=320)
    trace.add_span("upload_s3", duration_ms=180)

# Total duration: 4745ms (target: <6000ms for p95)
```

**Key Metrics**:
```python
metrics = [
    "resume_generation.duration",      # p50/p95/p99
    "resume_generation.success_rate",  # Target: >99%
    "job_match.fit_score",             # Distribution
    "auto_apply.success_rate",         # Target: >85%
    "llm.cost_per_user",               # Target: <$1.20/month
    "cache.hit_rate"                   # Target: >85%
]
```

---

#### **Sentry MCP** (Custom Build)
**Priority**: P1
**Package**: Extend `sentry-sdk` with MCP interface
**Purpose**: Error tracking and alerting

**Capabilities**:
- Capture exceptions with context
- User-facing error correlation
- Release health metrics
- Performance monitoring
- Custom error grouping

**Tool Interface**:
```python
{
  "tools": [
    "capture_exception",
    "capture_message",
    "set_user_context",
    "add_breadcrumb",
    "get_release_health"
  ]
}
```

**Integration Pattern**:
```python
# Capture LLM generation failure
mcp.call("sentry", "capture_exception", {
    "exception": openai_error,
    "level": "error",
    "tags": {
        "feature": "resume_generation",
        "model": "gpt-4-turbo",
        "user_tier": user.subscription_tier
    },
    "contexts": {
        "llm": {
            "prompt_length": 3500,
            "model": "gpt-4-turbo",
            "temperature": 0.7
        },
        "user": {
            "id": user.id,
            "email": user.email,
            "tier": "plus"
        }
    },
    "fingerprint": ["llm_generation", "rate_limit"]  # Custom grouping
})
```

---

### 12. Security & Compliance

#### **Audit Log MCP** (Custom Build)
**Priority**: P0
**Purpose**: Immutable compliance logs

**Capabilities**:
- Record application events (immutable)
- Consent management validation
- GDPR/CCPA data lineage queries
- Retention policy enforcement
- Forensic analysis

**Tool Interface**:
```python
{
  "tools": [
    "record_event",
    "verify_consent",
    "query_data_lineage",
    "export_user_data",      # GDPR right to access
    "delete_user_data"       # Right to be forgotten
  ]
}
```

**Integration Pattern**:
```python
# Record auto-apply event
mcp.call("audit_log", "record_event", {
    "event_type": "application_submitted",
    "user_id": user.id,
    "timestamp": "2025-10-23T10:30:00Z",
    "metadata": {
        "job_id": job.id,
        "job_board": "greenhouse",
        "application_id": app.id,
        "consent_verified": True,
        "consent_timestamp": "2025-10-20T14:00:00Z",
        "ip_address": "192.0.2.1",
        "user_agent": "Mozilla/5.0...",
        "artifacts": {
            "resume_version": "v3",
            "cover_letter_id": "cl_123",
            "s3_urls": ["s3://..."]
        }
    },
    "immutable": True  # Cannot be modified
})

# Verify consent before auto-apply
consent = mcp.call("audit_log", "verify_consent", {
    "user_id": user.id,
    "job_board": "greenhouse",
    "consent_type": "auto_apply"
})
if not consent.valid:
    raise ConsentRequiredError("User must re-authorize auto-apply")
```

**Event Types**:
- `application_submitted` - Auto-apply/Apply Assist
- `consent_granted` - Job board authorization
- `consent_revoked` - User withdrawal
- `data_export_requested` - GDPR access request
- `data_deleted` - Right to be forgotten
- `credit_consumed` - Usage tracking
- `credit_refunded` - Invalid job refund

---

#### **Secrets Manager MCP** (Custom Build)
**Priority**: P1
**Purpose**: Centralized secrets management (AWS Secrets Manager / HashiCorp Vault)

**Capabilities**:
- Retrieve secrets by environment
- Secret rotation notifications
- Audit secret access
- Multi-environment configuration
- Emergency secret revocation

**Tool Interface**:
```python
{
  "tools": [
    "get_secret",
    "list_secrets",
    "rotate_secret",
    "audit_access"
  ]
}
```

**Integration Pattern**:
```python
# Retrieve OpenAI API key
api_key = mcp.call("secrets", "get_secret", {
    "name": "openai_api_key",
    "environment": "production",
    "cache_ttl": 300  # Cache for 5 minutes
})

# Audit secret access
access_log = mcp.call("secrets", "audit_access", {
    "secret_name": "stripe_secret_key",
    "period": "7d"
})
```

---

### 13. Job Board Integrations

#### **Job Boards MCP** (Custom Build)
**Priority**: P0
**Purpose**: Unified job board API interface

**Capabilities**:
- Fetch job listings (Greenhouse, Lever)
- Submit applications
- Rate limit coordination
- ToS compliance validation
- Application status tracking

**Tool Interface**:
```python
{
  "tools": [
    "fetch_jobs",
    "get_job_details",
    "submit_application",
    "check_tos_compliance",
    "track_application_status"
  ]
}
```

**Integration Pattern**:
```python
# Fetch jobs from Greenhouse
jobs = mcp.call("job_boards", "fetch_jobs", {
    "source": "greenhouse",
    "filters": {
        "remote": True,
        "departments": ["engineering", "product"],
        "posted_since": "2025-10-16"  # Last 7 days
    },
    "page_size": 100
})

# Submit application (auto-apply)
result = mcp.call("job_boards", "submit_application", {
    "source": "greenhouse",
    "job_id": job.external_id,
    "candidate": {
        "first_name": user.first_name,
        "last_name": user.last_name,
        "email": user.email,
        "phone": user.phone,
        "resume_url": resume_presigned_url,  # From S3 MCP
        "cover_letter": cover_letter_text,
        "answers": custom_questions_answers
    },
    "metadata": {
        "source": "hireflux",
        "application_id": app.id,
        "consent_verified": True
    }
})

# Validate ToS compliance before applying
compliance = mcp.call("job_boards", "check_tos_compliance", {
    "source": "greenhouse",
    "action": "auto_apply"
})
if not compliance.allowed:
    # Fallback to Apply Assist (manual submission)
    notify_user_manual_apply(job)
```

**Supported Job Boards**:
- Greenhouse (API available)
- Lever (API available)
- Workable (API available)
- Custom ATS (HTML form parsing - Apply Assist only)

**Rate Limiting**:
```python
{
    "greenhouse": {"rpm": 100, "burst": 200},
    "lever": {"rpm": 60, "burst": 100},
    "workable": {"rpm": 50, "burst": 75}
}
```

---

## Integration Patterns

### Pattern 1: Multi-MCP Orchestration (Resume Generation)

```python
async def generate_resume_flow(user_id: str, job_id: str, tone: str):
    """
    Orchestrates multiple MCP servers for resume generation
    """

    # 1. Fetch user data (Postgres MCP)
    user_data = await mcp.call("postgres", "query", {
        "sql": "SELECT * FROM profiles WHERE user_id = $1",
        "params": [user_id]
    })

    # 2. Fetch job details (Job Boards MCP)
    job = await mcp.call("job_boards", "get_job_details", {
        "source": "greenhouse",
        "job_id": job_id
    })

    # 3. Check cache (Redis MCP)
    cache_key = f"resume:{user_id}:{job_id}:{tone}"
    cached = await mcp.call("redis", "get", {"key": cache_key})
    if cached:
        return cached

    # 4. Generate embedding for skills matching (Embeddings MCP)
    user_embedding = await mcp.call("embeddings", "generate_embedding", {
        "text": user_data["skills"],
        "cache_key": f"skills:{user_id}"
    })

    # 5. Generate resume content (OpenAI MCP)
    with mcp.call("otel", "create_trace", {"name": "resume_generation"}):
        resume_content = await mcp.call("openai", "chat_completion", {
            "model": "gpt-4-turbo",
            "messages": build_resume_prompt(user_data, job, tone),
            "metadata": {
                "user_id": user_id,
                "feature": "resume_generation",
                "budget_limit": 0.50
            }
        })

    # 6. Render PDF (Filesystem MCP)
    pdf_bytes = await mcp.call("filesystem", "render_pdf", {
        "template": "resume_template_ats.html",
        "data": resume_content
    })

    # 7. Upload to S3 (S3 MCP)
    s3_url = await mcp.call("s3", "upload_file", {
        "bucket": "hireflux-artifacts-prod",
        "key": f"resumes/{user_id}/{job_id}.pdf",
        "body": pdf_bytes,
        "versioning": True
    })

    # 8. Cache result (Redis MCP)
    await mcp.call("redis", "set", {
        "key": cache_key,
        "value": s3_url,
        "ttl": 3600  # 1 hour
    })

    # 9. Record event (Audit Log MCP)
    await mcp.call("audit_log", "record_event", {
        "event_type": "resume_generated",
        "user_id": user_id,
        "metadata": {"job_id": job_id, "tone": tone, "s3_url": s3_url}
    })

    # 10. Send notification (Email MCP)
    await mcp.call("email", "send_email", {
        "to": user_data["email"],
        "template": "resume_generated",
        "data": {"download_url": s3_url, "job_title": job["title"]}
    })

    return s3_url
```

**MCPs Used**: 8 (Postgres, Job Boards, Redis, Embeddings, OpenAI, S3, Audit Log, Email)
**Expected Duration**: <6s (p95 target)

---

### Pattern 2: Job Matching Pipeline

```python
async def job_matching_pipeline(user_id: str):
    """
    Semantic job matching with Fit Index calculation
    """

    # 1. Get user profile and preferences (Postgres MCP)
    user = await mcp.call("postgres", "query", {
        "sql": """
            SELECT skills, experience_years, remote_preference,
                   min_salary, visa_sponsorship_required
            FROM profiles WHERE user_id = $1
        """,
        "params": [user_id]
    })

    # 2. Generate/retrieve skills embedding (Embeddings MCP)
    user_embedding = await mcp.call("embeddings", "generate_embedding", {
        "text": user["skills"],
        "cache_key": f"skills:{user_id}",
        "ttl": 2592000  # 30 days
    })

    # 3. Vector similarity search (Pinecone MCP)
    similar_jobs = await mcp.call("pinecone", "query_similar", {
        "index": "jobs-production",
        "vector": user_embedding,
        "top_k": 100,
        "filter": {
            "remote": user["remote_preference"],
            "salary_min": {"$gte": user["min_salary"]},
            "visa_sponsorship": user["visa_sponsorship_required"]
        }
    })

    # 4. Calculate Fit Index with LLM reasoning (OpenAI MCP)
    fit_scores = []
    for job in similar_jobs[:50]:  # Top 50 by vector similarity
        fit_analysis = await mcp.call("openai", "chat_completion", {
            "model": "gpt-3.5-turbo",  # Cheaper for scoring
            "messages": build_fit_scoring_prompt(user, job),
            "metadata": {"feature": "job_matching", "budget_limit": 0.10}
        })

        fit_scores.append({
            "job_id": job["id"],
            "fit_score": fit_analysis["score"],  # 0-100
            "match_reasons": fit_analysis["reasons"],
            "vector_similarity": job["similarity"]
        })

    # 5. Store match scores (Postgres MCP)
    await mcp.call("postgres", "execute", {
        "sql": """
            INSERT INTO match_scores (user_id, job_id, fit_score, match_reasons)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (user_id, job_id) DO UPDATE SET
                fit_score = EXCLUDED.fit_score,
                match_reasons = EXCLUDED.match_reasons,
                updated_at = NOW()
        """,
        "params_batch": [
            (user_id, m["job_id"], m["fit_score"], m["match_reasons"])
            for m in fit_scores
        ]
    })

    # 6. Send high-fit notifications (Email MCP)
    high_fit_jobs = [m for m in fit_scores if m["fit_score"] >= 80]
    if high_fit_jobs:
        await mcp.call("email", "send_email", {
            "to": user["email"],
            "template": "high_fit_job_alert",
            "data": {"jobs": high_fit_jobs[:5]}  # Top 5
        })

    # 7. Record metrics (OpenTelemetry MCP)
    await mcp.call("otel", "record_metric", {
        "name": "job_match.fit_score",
        "value": fit_scores[0]["fit_score"],
        "attributes": {"user_id": user_id}
    })

    return fit_scores
```

**MCPs Used**: 5 (Postgres, Embeddings, Pinecone, OpenAI, Email, OpenTelemetry)
**Expected Duration**: <10s for 50 jobs

---

### Pattern 3: Auto-Apply with Compliance

```python
async def auto_apply_flow(user_id: str, job_id: str):
    """
    Compliance-first auto-apply with audit trail
    """

    # 1. Verify consent (Audit Log MCP)
    job = await mcp.call("postgres", "query_one", {
        "sql": "SELECT source, external_id FROM jobs WHERE id = $1",
        "params": [job_id]
    })

    consent = await mcp.call("audit_log", "verify_consent", {
        "user_id": user_id,
        "job_board": job["source"],
        "consent_type": "auto_apply"
    })

    if not consent["valid"]:
        raise ConsentRequiredError("User must re-authorize")

    # 2. Check ToS compliance (Job Boards MCP)
    compliance = await mcp.call("job_boards", "check_tos_compliance", {
        "source": job["source"],
        "action": "auto_apply"
    })

    if not compliance["allowed"]:
        # Fallback to Apply Assist
        return {"mode": "apply_assist", "reason": "tos_restriction"}

    # 3. Check/consume credit (Stripe MCP)
    balance = await mcp.call("stripe", "get_customer_balance", {
        "user_id": user_id,
        "credit_type": "auto_apply"
    })

    if balance["remaining"] <= 0:
        raise InsufficientCreditsError("No auto-apply credits remaining")

    # 4. Generate application artifacts
    resume_url = await generate_resume_flow(user_id, job_id, tone="formal")
    cover_letter = await generate_cover_letter(user_id, job_id)

    # 5. Submit application (Job Boards MCP)
    with mcp.call("otel", "create_trace", {"name": "auto_apply"}):
        result = await mcp.call("job_boards", "submit_application", {
            "source": job["source"],
            "job_id": job["external_id"],
            "candidate": build_candidate_data(user_id),
            "resume_url": resume_url,
            "cover_letter": cover_letter
        })

    # 6. Report usage (Stripe MCP)
    await mcp.call("stripe", "report_usage", {
        "user_id": user_id,
        "quantity": 1,
        "metadata": {"job_id": job_id, "application_id": result["id"]}
    })

    # 7. Record immutable audit event (Audit Log MCP)
    await mcp.call("audit_log", "record_event", {
        "event_type": "application_submitted",
        "user_id": user_id,
        "metadata": {
            "job_id": job_id,
            "job_board": job["source"],
            "application_id": result["id"],
            "consent_verified": True,
            "artifacts": {"resume_url": resume_url},
            "timestamp": datetime.utcnow().isoformat()
        },
        "immutable": True
    })

    # 8. Send confirmation (Email MCP)
    await mcp.call("email", "send_email", {
        "to": user["email"],
        "template": "application_submitted",
        "data": {
            "job_title": job["title"],
            "company": job["company"],
            "application_id": result["id"]
        }
    })

    # 9. Check for refund eligibility (async background job)
    schedule_refund_check(user_id, job_id, application_id=result["id"])

    return result
```

**MCPs Used**: 6 (Postgres, Audit Log, Job Boards, Stripe, OpenTelemetry, Email)
**Compliance Checks**: 2 (Consent, ToS)

---

## Implementation Roadmap

### Phase 1: MVP (Weeks 1-2)
**Goal**: Core functionality with critical MCPs

**MCP Installations**:
1. ✅ GitHub MCP (already connected)
2. PostgreSQL MCP
3. Redis MCP (custom build)
4. OpenAI MCP (custom build)
5. Pinecone MCP (custom build)
6. Stripe MCP (custom build)
7. Job Boards MCP (custom build)
8. Audit Log MCP (custom build)

**Integration Tasks**:
- [ ] Configure Postgres MCP with Supabase connection
- [ ] Build custom Redis MCP for RQ queue monitoring
- [ ] Build OpenAI MCP with cost tracking
- [ ] Build Pinecone MCP for vector search
- [ ] Build Stripe MCP for subscription management
- [ ] Build Job Boards MCP (Greenhouse, Lever)
- [ ] Build Audit Log MCP for compliance

**Validation**:
- Resume generation flow working end-to-end
- Job matching with Fit Index calculation
- Apply Assist functional (auto-apply in Phase 2)
- Credit system operational

---

### Phase 2: Beta (Weeks 3-4)
**Goal**: Production readiness and monitoring

**MCP Installations**:
9. S3 MCP (custom build)
10. Email MCP (custom build)
11. OpenTelemetry MCP (custom build)
12. Secrets Manager MCP (custom build)
13. Filesystem MCP (secured)
14. Database Schema MCP (custom build)

**Integration Tasks**:
- [ ] S3 MCP for artifact storage
- [ ] Email MCP for transactional emails
- [ ] OpenTelemetry MCP for tracing
- [ ] Secrets Manager for environment config
- [ ] Filesystem MCP for resume parsing
- [ ] Database Schema MCP for migration validation

**Validation**:
- Auto-apply functional with compliance
- p95 latency < 6s for resume generation
- Email notifications working
- Full observability stack operational

---

### Phase 3: GA (Weeks 5-6)
**Goal**: Developer experience and operations

**MCP Installations**:
15. Sentry MCP (custom build)
16. Python Linting MCP (custom build)
17. ESLint/Prettier MCP (custom build)
18. Pytest MCP (custom build)
19. Jest/Playwright MCP (custom build)
20. OpenAPI Schema MCP (custom build)

**Integration Tasks**:
- [ ] Sentry MCP for error tracking
- [ ] Code quality MCPs for automated checks
- [ ] Testing MCPs for CI/CD integration
- [ ] OpenAPI MCP for API documentation

**Validation**:
- All tests passing (coverage >80%)
- Error tracking fully operational
- API documentation auto-generated
- Pre-commit hooks enforcing quality

---

## Configuration Files

### Main MCP Configuration (`~/.config/claude-code/mcp-config.json`)

```json
{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_PERSONAL_ACCESS_TOKEN": "${GITHUB_TOKEN}"
      }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${SUPABASE_DB_URL}"
      }
    },
    "redis": {
      "command": "python",
      "args": ["mcp-servers/redis/server.py"],
      "env": {
        "REDIS_URL": "${REDIS_URL}"
      }
    },
    "openai": {
      "command": "python",
      "args": ["mcp-servers/openai/server.py"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}",
        "COST_TRACKING_ENABLED": "true"
      }
    },
    "pinecone": {
      "command": "python",
      "args": ["mcp-servers/pinecone/server.py"],
      "env": {
        "PINECONE_API_KEY": "${PINECONE_API_KEY}",
        "PINECONE_ENVIRONMENT": "us-west1-gcp"
      }
    },
    "stripe": {
      "command": "python",
      "args": ["mcp-servers/stripe/server.py"],
      "env": {
        "STRIPE_SECRET_KEY": "${STRIPE_SECRET_KEY}",
        "STRIPE_WEBHOOK_SECRET": "${STRIPE_WEBHOOK_SECRET}"
      }
    },
    "job_boards": {
      "command": "python",
      "args": ["mcp-servers/job-boards/server.py"],
      "env": {
        "GREENHOUSE_API_KEY": "${GREENHOUSE_API_KEY}",
        "LEVER_API_KEY": "${LEVER_API_KEY}"
      }
    },
    "audit_log": {
      "command": "python",
      "args": ["mcp-servers/audit-log/server.py"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${SUPABASE_DB_URL}",
        "IMMUTABLE_STORAGE": "enabled"
      }
    },
    "s3": {
      "command": "python",
      "args": ["mcp-servers/s3/server.py"],
      "env": {
        "AWS_ACCESS_KEY_ID": "${AWS_ACCESS_KEY_ID}",
        "AWS_SECRET_ACCESS_KEY": "${AWS_SECRET_ACCESS_KEY}",
        "AWS_REGION": "us-west-2",
        "S3_BUCKET": "hireflux-artifacts-prod"
      }
    },
    "email": {
      "command": "python",
      "args": ["mcp-servers/email/server.py"],
      "env": {
        "RESEND_API_KEY": "${RESEND_API_KEY}"
      }
    },
    "otel": {
      "command": "python",
      "args": ["mcp-servers/otel/server.py"],
      "env": {
        "OTEL_EXPORTER_OTLP_ENDPOINT": "${OTEL_ENDPOINT}",
        "SERVICE_NAME": "hireflux-backend"
      }
    },
    "secrets": {
      "command": "python",
      "args": ["mcp-servers/secrets/server.py"],
      "env": {
        "AWS_REGION": "us-west-2",
        "SECRETS_PREFIX": "hireflux/prod/"
      }
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp/hireflux"],
      "env": {
        "ALLOWED_DIRECTORIES": "/tmp/hireflux/uploads,/tmp/hireflux/templates"
      }
    },
    "sentry": {
      "command": "python",
      "args": ["mcp-servers/sentry/server.py"],
      "env": {
        "SENTRY_DSN": "${SENTRY_DSN}",
        "ENVIRONMENT": "production"
      }
    },
    "embeddings": {
      "command": "python",
      "args": ["mcp-servers/embeddings/server.py"],
      "env": {
        "OPENAI_API_KEY": "${OPENAI_API_KEY}",
        "REDIS_URL": "${REDIS_URL}",
        "CACHE_TTL": "2592000"
      }
    },
    "db_schema": {
      "command": "python",
      "args": ["mcp-servers/db-schema/server.py"],
      "env": {
        "POSTGRES_CONNECTION_STRING": "${SUPABASE_DB_URL}",
        "ALEMBIC_CONFIG": "alembic.ini"
      }
    },
    "python_linting": {
      "command": "python",
      "args": ["mcp-servers/python-linting/server.py"],
      "env": {
        "PROJECT_ROOT": "/Users/kiranreddyghanta/Developer/HireFlux"
      }
    },
    "pytest": {
      "command": "python",
      "args": ["mcp-servers/pytest/server.py"],
      "env": {
        "PROJECT_ROOT": "/Users/kiranreddyghanta/Developer/HireFlux",
        "MIN_COVERAGE": "80"
      }
    }
  }
}
```

---

### Environment Variables (`.env`)

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
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Job Boards
GREENHOUSE_API_KEY=...
LEVER_API_KEY=...

# Storage
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-west-2
S3_BUCKET=hireflux-artifacts-prod

# Email
RESEND_API_KEY=re_...

# Monitoring
OTEL_ENDPOINT=https://otel-collector.hireflux.com
SENTRY_DSN=https://...@sentry.io/...

# GitHub
GITHUB_TOKEN=ghp_...
```

---

## Custom MCP Server Template

```python
# mcp-servers/template/server.py
"""
MCP Server Template for HireFlux
"""
import asyncio
from typing import Any, Dict
from mcp import Server, Tool

class HireFluxMCPServer:
    def __init__(self):
        self.server = Server("hireflux-template")
        self.register_tools()

    def register_tools(self):
        """Register available tools"""

        @self.server.tool()
        async def example_tool(params: Dict[str, Any]) -> Dict[str, Any]:
            """
            Example tool implementation

            Args:
                params: Tool parameters

            Returns:
                Tool result
            """
            # Implementation
            return {"status": "success", "data": {}}

    async def run(self):
        """Run the MCP server"""
        await self.server.run()

if __name__ == "__main__":
    server = HireFluxMCPServer()
    asyncio.run(server.run())
```

---

## Success Metrics

### MCP Integration KPIs

1. **Coverage**: ≥18/20 MCPs operational by GA
2. **Reliability**: MCP uptime >99.9%
3. **Performance**: MCP call overhead <50ms (p95)
4. **Developer Experience**: ≥90% developer satisfaction
5. **Cost Efficiency**: LLM costs <$1.20/user/month via OpenAI MCP
6. **Observability**: 100% of critical flows traced via OpenTelemetry MCP

---

**Next Steps**:
1. Review and approve MCP architecture
2. Prioritize custom MCP builds (P0 first)
3. Set up MCP development environment
4. Begin Phase 1 implementation

