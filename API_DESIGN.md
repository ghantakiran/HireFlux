# HireFlux - API Design Specification

**Version**: 1.0
**Last Updated**: 2025-10-22
**Base URL**: `https://api.hireflux.com/v1`
**Protocol**: REST over HTTPS

---

## Table of Contents

1. [API Principles](#api-principles)
2. [Authentication](#authentication)
3. [Common Patterns](#common-patterns)
4. [Endpoints](#endpoints)
5. [Error Handling](#error-handling)
6. [Rate Limiting](#rate-limiting)
7. [Webhooks](#webhooks)

---

## API Principles

### REST Guidelines
- Use HTTP verbs correctly (GET, POST, PUT, PATCH, DELETE)
- Resource-oriented URLs
- Stateless requests
- JSON request/response bodies
- Consistent error responses

### Versioning
- API version in URL path (`/v1/`)
- Major version bumps for breaking changes
- Maintain previous version for 6 months

### Naming Conventions
- URLs: lowercase, kebab-case (`/resume-versions`)
- JSON: snake_case (`user_id`, `created_at`)
- Timestamps: ISO 8601 UTC (`2025-10-22T10:30:00Z`)

---

## Authentication

### JWT Bearer Token

**Request Header**:
```
Authorization: Bearer <jwt_token>
```

**Token Payload**:
```json
{
  "sub": "user_id",
  "email": "user@example.com",
  "plan": "plus",
  "exp": 1730000000,
  "iat": 1729000000
}
```

**Token Expiry**:
- Access Token: 1 hour
- Refresh Token: 30 days

---

## Common Patterns

### Pagination

**Request**:
```
GET /api/v1/jobs?page=2&limit=20
```

**Response**:
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total_pages": 10,
    "total_items": 200
  }
}
```

### Filtering & Sorting

**Request**:
```
GET /api/v1/jobs?remote_policy=remote&salary_min=80000&sort=-posted_at
```

**Parameters**:
- Filter: `field=value`
- Sort: `sort=field` (ascending) or `sort=-field` (descending)
- Multiple: `sort=field1,-field2`

### Field Selection

**Request**:
```
GET /api/v1/users/me?fields=id,email,profile.first_name
```

### Standard Response Format

**Success (200 OK)**:
```json
{
  "success": true,
  "data": { ... }
}
```

**Error (4xx/5xx)**:
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

---

## Endpoints

---

## 1. Authentication

### POST /auth/register
Register a new user.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "email_verified": false,
      "created_at": "2025-10-22T10:30:00Z"
    },
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

**Errors**:
- `400` - Invalid email/password format
- `409` - Email already exists

---

### POST /auth/login
Authenticate user and get tokens.

**Request**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_123",
      "email": "user@example.com",
      "plan": "plus"
    },
    "access_token": "eyJhbGc...",
    "refresh_token": "eyJhbGc...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

**Errors**:
- `401` - Invalid credentials
- `403` - Account suspended

---

### POST /auth/refresh
Refresh access token.

**Request**:
```json
{
  "refresh_token": "eyJhbGc..."
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGc...",
    "token_type": "Bearer",
    "expires_in": 3600
  }
}
```

---

### POST /auth/oauth/google
OAuth login with Google.

**Request**:
```json
{
  "code": "google_auth_code",
  "redirect_uri": "https://app.hireflux.com/auth/callback"
}
```

**Response**: Same as `/auth/login`

---

## 2. Users & Profiles

### GET /users/me
Get current user profile.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "user_123",
    "email": "user@example.com",
    "profile": {
      "first_name": "John",
      "last_name": "Doe",
      "phone": "+1234567890",
      "location": "San Francisco, CA",
      "target_titles": ["Software Engineer", "Backend Developer"],
      "salary_min": 120000,
      "salary_max": 180000,
      "industries": ["Technology", "FinTech"],
      "skills": ["Python", "FastAPI", "PostgreSQL"],
      "preferences": {
        "remote_policy": "remote",
        "visa_sponsorship": false
      }
    },
    "plan": "plus",
    "credits": 50,
    "created_at": "2025-10-20T10:00:00Z"
  }
}
```

---

### PATCH /users/me
Update current user profile.

**Request**:
```json
{
  "profile": {
    "first_name": "John",
    "location": "New York, NY",
    "skills": ["Python", "FastAPI", "PostgreSQL", "Redis"]
  }
}
```

**Response (200 OK)**: Updated user object

---

### POST /users/me/onboarding
Complete onboarding.

**Request**:
```json
{
  "target_titles": ["Product Manager", "Senior PM"],
  "salary_min": 140000,
  "salary_max": 200000,
  "industries": ["SaaS", "B2B"],
  "locations": ["Remote", "San Francisco"],
  "skills": ["Product Strategy", "Roadmapping", "SQL", "Analytics"]
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "onboarding_completed": true,
    "profile_completion": 85
  }
}
```

---

## 3. Resumes

### POST /resumes/upload
Upload resume file.

**Request** (multipart/form-data):
```
file: <resume.pdf>
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "resume_456",
    "file_url": "https://storage.hireflux.com/resumes/user_123/resume_456.pdf",
    "parsed_data": {
      "name": "John Doe",
      "email": "john@example.com",
      "phone": "+1234567890",
      "experience": [...],
      "education": [...],
      "skills": ["Python", "JavaScript", "SQL"]
    },
    "created_at": "2025-10-22T10:30:00Z"
  }
}
```

**Errors**:
- `400` - Invalid file type (must be PDF or DOCX)
- `413` - File too large (max 5MB)

---

### POST /resumes/generate
Generate AI-optimized resume.

**Request**:
```json
{
  "resume_id": "resume_456",
  "target_title": "Senior Software Engineer",
  "tone": "professional",
  "version_name": "Tech Companies"
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "resume_version_789",
    "resume_id": "resume_456",
    "version_name": "Tech Companies",
    "target_title": "Senior Software Engineer",
    "tone": "professional",
    "content": {
      "summary": "Results-driven Senior Software Engineer...",
      "experience": [...],
      "skills": [...],
      "education": [...]
    },
    "generation_time_ms": 4200,
    "created_at": "2025-10-22T10:35:00Z"
  }
}
```

**Errors**:
- `400` - Invalid tone or missing resume_id
- `402` - Payment required (Free plan limit reached)
- `429` - Rate limit exceeded

---

### GET /resumes/versions
List all resume versions.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "resume_version_789",
      "version_name": "Tech Companies",
      "target_title": "Senior Software Engineer",
      "tone": "professional",
      "is_default": true,
      "created_at": "2025-10-22T10:35:00Z"
    },
    ...
  ]
}
```

---

### GET /resumes/versions/:id
Get specific resume version.

**Response (200 OK)**: Full resume version object with content

---

### POST /resumes/versions/:id/export
Export resume as PDF or DOCX.

**Request**:
```json
{
  "format": "pdf",
  "template": "modern"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "download_url": "https://storage.hireflux.com/exports/resume_version_789.pdf",
    "expires_at": "2025-10-22T11:35:00Z"
  }
}
```

---

## 4. Cover Letters

### POST /cover-letters/generate
Generate AI cover letter.

**Request**:
```json
{
  "job_id": "job_123",
  "job_description": "We are looking for a Senior Software Engineer...",
  "resume_version_id": "resume_version_789",
  "tone": "professional",
  "length": "medium",
  "personalize_company": true
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "cover_letter_234",
    "job_id": "job_123",
    "resume_version_id": "resume_version_789",
    "content": "Dear Hiring Manager,\n\nI am writing to express...",
    "tone": "professional",
    "length": "medium",
    "word_count": 280,
    "generation_time_ms": 3800,
    "created_at": "2025-10-22T10:40:00Z"
  }
}
```

**Errors**:
- `400` - Invalid job_description or resume_version_id
- `402` - Payment required (Free plan limit: 3/month)

---

### GET /cover-letters
List all cover letters.

**Query Parameters**:
- `job_id` - Filter by job
- `page`, `limit` - Pagination

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "cover_letter_234",
      "job_id": "job_123",
      "job_title": "Senior Software Engineer",
      "company": "TechCorp",
      "word_count": 280,
      "created_at": "2025-10-22T10:40:00Z"
    },
    ...
  ],
  "pagination": { ... }
}
```

---

### GET /cover-letters/:id
Get specific cover letter.

**Response (200 OK)**: Full cover letter object with content

---

## 5. Jobs

### GET /jobs/matches
Get matched jobs for current user.

**Query Parameters**:
- `min_fit_index` (default: 60) - Minimum Fit Index score
- `remote_policy` - Filter: remote, hybrid, onsite
- `visa_friendly` - Boolean
- `salary_min`, `salary_max` - Salary range
- `posted_after` - ISO date (e.g., 2025-10-15)
- `page`, `limit` - Pagination
- `sort` - Sort field (default: -fit_index)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "job_123",
      "title": "Senior Software Engineer",
      "company": "TechCorp",
      "location": "San Francisco, CA",
      "remote_policy": "hybrid",
      "salary_min": 150000,
      "salary_max": 200000,
      "visa_friendly": false,
      "posted_at": "2025-10-20T08:00:00Z",
      "fit_index": 85,
      "match_rationale": "Strong match based on Python, FastAPI skills and 5+ years experience. Target seniority aligns with Senior level.",
      "matched_skills": ["Python", "FastAPI", "PostgreSQL"],
      "missing_skills": ["Kubernetes"]
    },
    ...
  ],
  "pagination": { ... }
}
```

---

### GET /jobs/:id
Get job details.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "job_123",
    "title": "Senior Software Engineer",
    "company": "TechCorp",
    "description": "We are looking for...",
    "location": "San Francisco, CA",
    "remote_policy": "hybrid",
    "salary_min": 150000,
    "salary_max": 200000,
    "visa_friendly": false,
    "posted_at": "2025-10-20T08:00:00Z",
    "expires_at": "2025-11-20T08:00:00Z",
    "source": {
      "name": "Greenhouse",
      "apply_url": "https://boards.greenhouse.io/techcorp/jobs/123"
    },
    "fit_index": 85,
    "match_rationale": "...",
    "matched_skills": [...],
    "missing_skills": [...]
  }
}
```

---

### POST /jobs/:id/save
Save job for later.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "saved": true,
    "saved_at": "2025-10-22T10:45:00Z"
  }
}
```

---

### POST /jobs/search
Advanced job search.

**Request**:
```json
{
  "query": "Python backend engineer",
  "filters": {
    "remote_policy": ["remote", "hybrid"],
    "salary_min": 120000,
    "visa_friendly": false,
    "posted_after": "2025-10-01"
  },
  "sort": "-fit_index",
  "limit": 50
}
```

**Response (200 OK)**: List of matched jobs

---

## 6. Applications

### POST /applications
Create application (Apply Assist).

**Request**:
```json
{
  "job_id": "job_123",
  "resume_version_id": "resume_version_789",
  "cover_letter_id": "cover_letter_234",
  "answers": {
    "question_1": "I am authorized to work in the US",
    "question_2": "Yes"
  }
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "application_345",
    "job_id": "job_123",
    "job_title": "Senior Software Engineer",
    "company": "TechCorp",
    "resume_version_id": "resume_version_789",
    "cover_letter_id": "cover_letter_234",
    "status": "applied",
    "applied_at": "2025-10-22T10:50:00Z",
    "artifact_bundle_url": "https://storage.hireflux.com/applications/application_345.zip"
  }
}
```

**Errors**:
- `400` - Invalid job_id or resume_version_id
- `402` - Insufficient credits (for auto-apply)
- `409` - Already applied to this job

---

### GET /applications
List all applications.

**Query Parameters**:
- `status` - Filter: saved, applied, interview, offer, rejected
- `page`, `limit` - Pagination

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "application_345",
      "job_id": "job_123",
      "job_title": "Senior Software Engineer",
      "company": "TechCorp",
      "status": "applied",
      "applied_at": "2025-10-22T10:50:00Z"
    },
    ...
  ],
  "pagination": { ... }
}
```

---

### PATCH /applications/:id
Update application status.

**Request**:
```json
{
  "status": "interview",
  "notes": "Phone screen scheduled for 10/25"
}
```

**Response (200 OK)**: Updated application object

---

### GET /applications/analytics
Get application analytics.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "pipeline": {
      "saved": 15,
      "applied": 45,
      "interview": 8,
      "offer": 2,
      "rejected": 10
    },
    "conversion_rates": {
      "applied_to_interview": 0.178,
      "interview_to_offer": 0.25
    },
    "avg_fit_index": 78,
    "avg_response_time_days": 7,
    "top_matched_skills": ["Python", "FastAPI", "PostgreSQL"]
  }
}
```

---

## 7. Subscriptions & Billing

### GET /subscriptions/plans
Get available subscription plans.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "free",
      "name": "Free",
      "price": 0,
      "interval": null,
      "features": {
        "resumes": "1 preview",
        "cover_letters": 3,
        "job_suggestions": 10,
        "auto_apply": false
      }
    },
    {
      "id": "plus",
      "name": "Plus",
      "price": 1900,
      "interval": "month",
      "stripe_price_id": "price_123",
      "features": {
        "resumes": "unlimited",
        "cover_letters": "unlimited",
        "job_suggestions": 100,
        "auto_apply": false,
        "interview_coach": true
      }
    },
    {
      "id": "pro",
      "name": "Pro",
      "price": 4900,
      "interval": "month",
      "stripe_price_id": "price_456",
      "features": {
        "resumes": "unlimited",
        "cover_letters": "unlimited",
        "job_suggestions": "unlimited",
        "auto_apply": true,
        "auto_apply_credits": 50,
        "interview_coach": true,
        "analytics": "advanced"
      }
    }
  ]
}
```

---

### POST /subscriptions/checkout
Create Stripe checkout session.

**Request**:
```json
{
  "plan_id": "plus",
  "success_url": "https://app.hireflux.com/dashboard?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://app.hireflux.com/pricing"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
    "session_id": "cs_test_123"
  }
}
```

---

### GET /subscriptions/current
Get current subscription.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "id": "sub_123",
    "plan": "plus",
    "status": "active",
    "current_period_start": "2025-10-01T00:00:00Z",
    "current_period_end": "2025-11-01T00:00:00Z",
    "cancel_at_period_end": false
  }
}
```

---

### POST /subscriptions/cancel
Cancel subscription.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "cancel_at_period_end": true,
    "canceled_at": "2025-10-22T11:00:00Z",
    "ends_at": "2025-11-01T00:00:00Z"
  }
}
```

---

### GET /credits/balance
Get current credit balance.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "balance": 45,
    "last_updated": "2025-10-22T10:50:00Z"
  }
}
```

---

### POST /credits/purchase
Purchase credits.

**Request**:
```json
{
  "amount": 100,
  "success_url": "https://app.hireflux.com/credits?session_id={CHECKOUT_SESSION_ID}",
  "cancel_url": "https://app.hireflux.com/credits"
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "checkout_url": "https://checkout.stripe.com/c/pay/cs_test_...",
    "session_id": "cs_test_456",
    "price": 5000,
    "credits": 100
  }
}
```

---

### GET /credits/ledger
Get credit transaction history.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "ledger_789",
      "amount": -1,
      "transaction_type": "apply",
      "reason": "Auto-apply to TechCorp - Senior SWE",
      "application_id": "application_345",
      "created_at": "2025-10-22T10:50:00Z"
    },
    {
      "id": "ledger_788",
      "amount": 100,
      "transaction_type": "purchase",
      "reason": "Credit purchase",
      "created_at": "2025-10-20T09:00:00Z"
    },
    ...
  ],
  "pagination": { ... }
}
```

---

## 8. Auto-Apply

### POST /auto-apply/config
Configure auto-apply settings.

**Request**:
```json
{
  "enabled": true,
  "min_fit_index": 70,
  "daily_limit": 5,
  "job_sources": ["greenhouse", "lever"],
  "default_resume_version_id": "resume_version_789",
  "auto_generate_cover_letter": true
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "config": { ... },
    "updated_at": "2025-10-22T11:00:00Z"
  }
}
```

---

### GET /auto-apply/config
Get auto-apply configuration.

**Response (200 OK)**: Auto-apply config object

---

### GET /auto-apply/audit-log
Get auto-apply audit log.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "audit_123",
      "job_id": "job_456",
      "job_title": "Backend Engineer",
      "company": "StartupCo",
      "action": "submitted",
      "credits_used": 1,
      "timestamp": "2025-10-22T09:00:00Z"
    },
    {
      "id": "audit_122",
      "job_id": "job_455",
      "action": "refunded",
      "reason": "Job no longer available",
      "credits_refunded": 1,
      "timestamp": "2025-10-22T08:30:00Z"
    },
    ...
  ],
  "pagination": { ... }
}
```

---

## 9. Interview Coach

### GET /interview/questions
Get interview questions.

**Query Parameters**:
- `role` - Target role (e.g., "software-engineer")
- `difficulty` - easy, medium, hard
- `limit` - Number of questions (default: 10)

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "question_123",
      "question": "Tell me about a time you had to debug a critical production issue.",
      "category": "behavioral",
      "difficulty": "medium",
      "tips": "Use the STAR framework: Situation, Task, Action, Result"
    },
    ...
  ]
}
```

---

### POST /interview/sessions
Start interview session.

**Request**:
```json
{
  "role": "software-engineer",
  "question_ids": ["question_123", "question_124"]
}
```

**Response (201 Created)**:
```json
{
  "success": true,
  "data": {
    "id": "session_789",
    "role": "software-engineer",
    "questions": [...],
    "started_at": "2025-10-22T11:00:00Z"
  }
}
```

---

### POST /interview/sessions/:id/answers
Submit answer to question.

**Request**:
```json
{
  "question_id": "question_123",
  "answer": "In my previous role at XYZ Corp, we experienced a critical database outage..."
}
```

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "question_id": "question_123",
    "answer": "...",
    "feedback": {
      "score": 8,
      "clarity": "Good - answer was clear and well-structured",
      "star_structure": "Excellent - all STAR elements present",
      "content_depth": "Good - specific details and quantified results",
      "improvements": [
        "Consider adding more context about team size",
        "Quantify the impact of the fix (e.g., reduced downtime by X%)"
      ]
    }
  }
}
```

---

### GET /interview/sessions/:id
Get interview session details.

**Response (200 OK)**: Full session with all Q&A and feedback

---

## 10. Notifications

### GET /notifications
Get in-app notifications.

**Query Parameters**:
- `unread_only` - Boolean (default: false)
- `type` - Filter: job_match, application_update, credit, system
- `page`, `limit` - Pagination

**Response (200 OK)**:
```json
{
  "success": true,
  "data": [
    {
      "id": "notif_123",
      "type": "job_match",
      "title": "10 new high-fit jobs!",
      "message": "We found 10 jobs matching your profile with Fit Index > 80",
      "read": false,
      "created_at": "2025-10-22T10:00:00Z",
      "action_url": "/jobs/matches"
    },
    ...
  ],
  "pagination": { ... },
  "unread_count": 5
}
```

---

### PATCH /notifications/:id/read
Mark notification as read.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "read": true
  }
}
```

---

### POST /notifications/mark-all-read
Mark all notifications as read.

**Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "marked_read": 12
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable error message",
    "details": [
      {
        "field": "field_name",
        "message": "Specific error for this field"
      }
    ],
    "request_id": "req_abc123"
  }
}
```

### Error Codes

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | VALIDATION_ERROR | Invalid request parameters |
| 401 | UNAUTHORIZED | Missing or invalid authentication |
| 402 | PAYMENT_REQUIRED | Subscription or credits required |
| 403 | FORBIDDEN | Insufficient permissions |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Resource conflict (duplicate) |
| 422 | UNPROCESSABLE_ENTITY | Semantic validation error |
| 429 | RATE_LIMIT_EXCEEDED | Too many requests |
| 500 | INTERNAL_ERROR | Server error |
| 502 | BAD_GATEWAY | External service error |
| 503 | SERVICE_UNAVAILABLE | Service temporarily unavailable |

---

## Rate Limiting

### Rate Limit Headers

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1730000000
```

### Rate Limits by Plan

| Endpoint | Free | Plus | Pro |
|----------|------|------|-----|
| `/resumes/generate` | 5/day | 50/day | 200/day |
| `/cover-letters/generate` | 3/month | unlimited | unlimited |
| `/jobs/matches` | 100/day | 1000/day | unlimited |
| `/applications` (manual) | 10/day | 50/day | 100/day |
| General API | 1000/hour | 5000/hour | 10000/hour |

### 429 Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Rate limit exceeded. Try again in 3600 seconds.",
    "retry_after": 3600
  }
}
```

---

## Webhooks

### Stripe Webhooks

**Endpoint**: `POST /webhooks/stripe`

**Events Handled**:
- `checkout.session.completed`
- `invoice.paid`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.deleted`

**Verification**: Stripe signature in `Stripe-Signature` header

---

## API Versioning

### Current Version: v1

**Deprecation Policy**:
- 6 months notice before deprecation
- Maintain previous version for 6 months after new version release
- Sunset notice in response headers:
  ```
  Sunset: Sat, 01 May 2026 00:00:00 GMT
  Deprecation: true
  ```

---

## Appendix

### Postman Collection
Available at: `https://www.postman.com/hireflux/api-v1`

### OpenAPI Spec
Available at: `https://api.hireflux.com/v1/openapi.json`

### SDKs
- JavaScript/TypeScript: `npm install @hireflux/api-client`
- Python: `pip install hireflux-client`

---

**Document Status**: Draft
**Next Review**: 2025-11-01
