# HireFlux API - Quick Start Guide

## 🚀 Getting Started in 60 Seconds

### 1. Start the Backend

```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload
```

### 2. Open Interactive Documentation

Open in your browser: **[http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)**

### 3. Authenticate

1. Click the **"Authorize"** button (🔒 icon at top right)
2. Enter your JWT token: `Bearer your-token-here`
3. Click "Authorize"

### 4. Try an Endpoint

1. Expand any endpoint (e.g., `GET /resumes`)
2. Click **"Try it out"**
3. Fill in parameters (if any)
4. Click **"Execute"**
5. View the response below

---

## 📚 Documentation URLs

| Tool | URL | Use Case |
|------|-----|----------|
| **Swagger UI** | http://localhost:8000/api/v1/docs | Interactive testing |
| **ReDoc** | http://localhost:8000/api/v1/redoc | Clean reading |
| **OpenAPI JSON** | http://localhost:8000/api/v1/openapi.json | Import to Postman |

---

## 🔑 Get Your First Token

### Using cURL

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "your-password"
  }'
```

### Using Swagger UI

1. Go to http://localhost:8000/api/v1/docs
2. Find `POST /auth/login`
3. Click "Try it out"
4. Enter email and password
5. Click "Execute"
6. Copy the `access_token` from response
7. Use it in the "Authorize" button

---

## 🧪 Test Endpoints Without Authentication

These endpoints work without tokens:

- `GET /health` - Health check
- `POST /auth/register` - Create account
- `POST /auth/login` - Get token
- `GET /auth/google/authorize` - OAuth
- `GET /auth/linkedin/authorize` - OAuth

---

## 📋 Example Workflow

### 1. Register
```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Doe",
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

### 2. Login (Get Token)
```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123"
  }'
```

Response:
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "token_type": "bearer"
  }
}
```

### 3. Use Token
```bash
export TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

curl -X GET http://localhost:8000/api/v1/resumes \
  -H "Authorization: Bearer $TOKEN"
```

---

## 🎯 Key Features

### ✅ Interactive Testing
Test all endpoints directly in browser without writing code.

### ✅ Auto-Generated Docs
Documentation updates automatically when you change code.

### ✅ Request/Response Examples
See real examples for every endpoint.

### ✅ Schema Validation
FastAPI validates all requests automatically.

### ✅ Multiple Formats
View docs as Swagger UI, ReDoc, or raw OpenAPI JSON.

---

## 🔍 Finding What You Need

### Search in Swagger UI
Use `Ctrl+F` (or `Cmd+F`) to search for endpoints.

### Filter by Tags
Click tag names (e.g., "Resumes") to see only those endpoints.

### Collapse/Expand All
Use the expand/collapse buttons to navigate faster.

---

## 💡 Pro Tips

### 1. Use Swagger for Testing
Swagger UI is perfect for quick testing during development.

### 2. Use ReDoc for Reading
ReDoc has cleaner layout for understanding all endpoints.

### 3. Export to Postman
Download `openapi.json` and import into Postman for team sharing.

### 4. Generate Client Code
Use OpenAPI Generator to create client libraries:
```bash
openapi-generator-cli generate -i openapi.json -g typescript-axios
```

---

## ❓ Troubleshooting

### "401 Unauthorized" Error
- Check if your token is valid
- Make sure to include "Bearer " prefix
- Token might be expired (60 min lifetime)

### "422 Validation Error"
- Check request body matches schema
- All required fields must be present
- Check field types (string, number, etc.)

### "404 Not Found"
- Check the endpoint URL is correct
- Make sure you're using `/api/v1` prefix
- Resource might not exist (check ID)

---

## 📞 Support

- **Issues**: Open on GitHub
- **Email**: support@hireflux.com
- **Slack**: #hireflux-api

---

**Happy Building! 🎉**

*Last Updated: October 29, 2025*
