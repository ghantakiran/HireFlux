# HireFlux API Documentation

**Version**: 1.0.0
**Base URL**: `http://localhost:8000/api/v1` (Development)
**Production URL**: `https://api.hireflux.com/api/v1`

---

## Overview

HireFlux API is a RESTful API that powers an AI-driven job application copilot.

---

## Interactive Documentation

FastAPI provides **auto-generated interactive documentation**:

### Swagger UI (Recommended)
**URL**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)

Features:
- Interactive API explorer
- Try endpoints directly from browser
- Request/response examples
- Schema definitions
- Authentication support

### ReDoc
**URL**: [http://localhost:8000/api/v1/redoc](http://localhost:8000/api/v1/redoc)

Features:
- Clean, three-panel layout
- Search functionality
- Code samples in multiple languages
- Download OpenAPI spec

### OpenAPI JSON
**URL**: [http://localhost:8000/api/v1/openapi.json](http://localhost:8000/api/v1/openapi.json)

Raw OpenAPI 3.0 specification for Postman import, code generation, and custom tooling.

---

## Quick Start

1. **Start Backend**: `uvicorn app.main:app --reload`
2. **Open Swagger**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
3. **Authenticate**: Click "Authorize" and enter JWT token
4. **Explore**: Try endpoints interactively

---

## Authentication

All endpoints except `/auth/*` and `/health` require JWT Bearer tokens.

**Header Format**:
```
Authorization: Bearer <your_jwt_token>
```

**Obtain Token**: `POST /api/v1/auth/login`

---

## API Endpoints Summary

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Authentication** | 11 endpoints | Login, OAuth, token refresh |
| **Resumes** | 11 endpoints | Upload, parse, version, optimize |
| **Cover Letters** | 7 endpoints | AI generation, edit, export |
| **Jobs** | 8 endpoints | Search, match, recommendations |
| **Applications** | 8 endpoints | Track, manage, analytics |
| **Auto-Apply** | 5 endpoints | Automated submissions |
| **Billing** | 8 endpoints | Subscriptions, credits, Stripe |
| **Analytics** | 4 endpoints | Stats, trends, conversion |
| **Interview** | 5 endpoints | Mock interviews, feedback |
| **Notifications** | 5 endpoints | User notifications |

**Total**: ~72 endpoints

---

## Response Format

### Success
```json
{
  "success": true,
  "data": { ... },
  "meta": { "page": 1, "total": 100 }
}
```

### Error
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Description",
    "request_id": "uuid"
  }
}
```

---

## Rate Limiting

- **Per Minute**: 60 requests
- **Per Hour**: 1000 requests

---

## Complete Documentation

For detailed endpoint documentation, examples, and workflows, visit:
- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc

---

**Last Updated**: October 29, 2025
**API Version**: 1.0.0
