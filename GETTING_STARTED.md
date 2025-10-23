# HireFlux - Developer Getting Started Guide

**Welcome to the HireFlux development team!** 🎉

This guide will help you get up and running quickly with the HireFlux codebase.

---

## 📚 Quick Links

### Essential Documentation
- [**README**](./README.md) - Project overview and setup
- [**ARCHITECTURE**](./ARCHITECTURE.md) - Technical architecture
- [**API_DESIGN**](./API_DESIGN.md) - API specification
- [**DATABASE_DESIGN**](./DATABASE_DESIGN.md) - Database schema
- [**DEPLOYMENT**](./DEPLOYMENT.md) - Deployment guide

### Product & Planning
- [**PRD**](./HireFlux_PRD.md) - Product requirements
- [**PRODUCT_BACKLOG**](./PRODUCT_BACKLOG.md) - User stories & epics
- [**SPRINT_PLAN**](./SPRINT_PLAN.md) - Sprint breakdown
- [**TECHNICAL_TASKS**](./TECHNICAL_TASKS.md) - Detailed tasks

---

## 🚀 Quick Setup (15 minutes)

### 1. Clone Repository
```bash
git clone https://github.com/your-org/hireflux.git
cd hireflux
```

### 2. Install Prerequisites

**macOS**:
```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install required tools
brew install node python@3.11 postgresql redis
```

**Windows**:
```bash
# Install via Chocolatey
choco install nodejs python postgresql redis-64
```

**Linux (Ubuntu/Debian)**:
```bash
sudo apt update
sudo apt install nodejs npm python3.11 postgresql redis-server
```

### 3. Frontend Setup
```bash
cd frontend
npm install
cp .env.example .env.local

# Edit .env.local with your settings
# Minimum required: NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1

npm run dev
```

✅ Frontend running at http://localhost:3000

### 4. Backend Setup
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env

# Edit .env with your settings
# Minimum required: DATABASE_URL, REDIS_URL, SECRET_KEY, JWT_SECRET_KEY

# Run migrations
alembic upgrade head

# Start server
uvicorn app.main:app --reload
```

✅ Backend running at http://localhost:8000

### 5. Start Redis
```bash
# macOS/Linux
redis-server

# Windows
redis-server.exe
```

✅ Redis running at localhost:6379

### 6. Verify Setup
```bash
# Test backend health
curl http://localhost:8000/health

# Test frontend
open http://localhost:3000
```

---

## 🔑 Getting API Keys

### Required for Development

#### OpenAI (Required for AI features)
1. Go to https://platform.openai.com/signup
2. Create account
3. Add payment method ($5 minimum)
4. Generate API key: https://platform.openai.com/api-keys
5. Add to `backend/.env`: `OPENAI_API_KEY=sk-...`

#### Supabase (Required for database)
1. Go to https://supabase.com
2. Create new project: `hireflux-dev`
3. Copy database URL from Settings → Database
4. Add to `backend/.env`: `DATABASE_URL=postgresql://...`

#### Stripe (Required for billing)
1. Go to https://dashboard.stripe.com/register
2. Get test mode keys from Developers → API keys
3. Add to `backend/.env`:
   ```
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```
4. Add to `frontend/.env.local`:
   ```
   NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
   ```

### Optional for Development

#### Pinecone (For job matching)
- Sign up: https://www.pinecone.io
- Create index: `job-embeddings` (dimension: 1536)
- Get API key

#### Resend (For emails)
- Sign up: https://resend.com
- Get API key
- Test emails work in development

---

## 📝 Development Workflow

### Daily Workflow
```bash
# 1. Pull latest code
git checkout develop
git pull origin develop

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Start dev servers
cd frontend && npm run dev    # Terminal 1
cd backend && uvicorn app.main:app --reload  # Terminal 2
redis-server                  # Terminal 3

# 4. Make changes, test locally

# 5. Run tests before committing
cd frontend && npm test
cd backend && pytest

# 6. Commit and push
git add .
git commit -m "feat(scope): description"
git push origin feature/your-feature-name

# 7. Create pull request to develop branch
```

### Git Commit Format
```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

**Types**: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**:
```
feat(resume): add AI resume generation endpoint
fix(auth): resolve token refresh race condition
docs(api): update API documentation for jobs endpoint
```

### Branch Strategy
- `main` → Production
- `develop` → Integration/staging
- `feature/*` → New features
- `bugfix/*` → Bug fixes
- `hotfix/*` → Production hotfixes

---

## 🧪 Running Tests

### Frontend Tests
```bash
cd frontend

# Unit tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm test -- --coverage

# E2E tests
npm run test:e2e
```

### Backend Tests
```bash
cd backend

# All tests
pytest

# Specific test file
pytest tests/test_auth.py

# With coverage
pytest --cov=app --cov-report=html

# Watch mode (requires pytest-watch)
ptw
```

---

## 🐛 Debugging

### Frontend Debugging
- Use React DevTools: https://react.dev/learn/react-developer-tools
- Check browser console for errors
- Use Next.js debug mode: `DEBUG=* npm run dev`

### Backend Debugging
```python
# Add breakpoints in code
import pdb; pdb.set_trace()

# Or use VS Code debugger with this launch.json:
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "FastAPI",
      "type": "python",
      "request": "launch",
      "module": "uvicorn",
      "args": ["app.main:app", "--reload"],
      "jinja": true
    }
  ]
}
```

### Database Debugging
```bash
# Connect to PostgreSQL
psql postgresql://user:pass@localhost:5432/hireflux

# View tables
\dt

# Query users
SELECT * FROM users LIMIT 10;

# Check migrations
alembic current
alembic history
```

---

## 📦 Project Structure Quick Reference

```
HireFlux/
├── frontend/
│   ├── app/              # Next.js pages (App Router)
│   │   ├── page.tsx      # Home page
│   │   ├── (auth)/       # Auth pages (login, signup)
│   │   └── (dashboard)/  # Dashboard pages
│   ├── components/       # React components
│   │   ├── ui/           # UI components (buttons, cards)
│   │   └── ...           # Feature components
│   ├── lib/              # Utilities
│   │   ├── api.ts        # API client
│   │   └── utils.ts      # Helper functions
│   └── types/            # TypeScript types
│
├── backend/
│   ├── app/
│   │   ├── main.py       # FastAPI app
│   │   ├── api/v1/       # API endpoints
│   │   ├── core/         # Config, security
│   │   ├── db/           # Database models
│   │   ├── services/     # Business logic
│   │   └── workers/      # Background jobs
│   ├── alembic/          # DB migrations
│   └── tests/            # Tests
│
└── docs/                 # Documentation
```

---

## 🎯 Your First Task

### Sprint 1 - Week 1 (Foundation)

Pick a task from [TECHNICAL_TASKS.md](./TECHNICAL_TASKS.md):

**Backend Team**:
- TASK-001.5: Initialize FastAPI project ✅ (Done - starter code provided)
- TASK-003.2: Create users and profiles tables
- TASK-002.3: Implement email/password authentication

**Frontend Team**:
- TASK-001.1: Initialize Next.js project ✅ (Done - starter code provided)
- TASK-002.6: Create login/signup UI
- TASK-005.1: Create welcome/landing page ✅ (Done - starter code provided)

**DevOps**:
- TASK-001.9: GitHub Actions CI/CD pipeline
- TASK-001.10: Provision Supabase project

---

## 💡 Helpful Resources

### Learning Resources
- **Next.js**: https://nextjs.org/docs
- **FastAPI**: https://fastapi.tiangolo.com
- **SQLAlchemy**: https://docs.sqlalchemy.org
- **Tailwind CSS**: https://tailwindcss.com/docs
- **OpenAI API**: https://platform.openai.com/docs

### Internal Resources
- **Figma Designs**: [Link to Figma]
- **Slack Channel**: #hireflux-dev
- **Sprint Board**: [Link to Jira/Linear]
- **Wiki**: [Link to Confluence/Notion]

### Code Standards
- **TypeScript Style**: Follow Airbnb style guide
- **Python Style**: Follow PEP 8, use Black formatter
- **Commit Messages**: Conventional Commits
- **PR Template**: Use `.github/pull_request_template.md`

---

## 🆘 Getting Help

### Stuck? Here's what to do:

1. **Check documentation** (this guide, README, architecture docs)
2. **Search codebase** for similar examples
3. **Ask in Slack** #hireflux-dev channel
4. **Create GitHub discussion** for architectural questions
5. **Pair program** with a teammate

### Common Issues

**"Module not found" error**:
```bash
# Frontend
cd frontend && npm install

# Backend
cd backend && pip install -r requirements.txt
```

**"Database connection failed"**:
- Check `.env` has correct `DATABASE_URL`
- Ensure PostgreSQL is running: `pg_isready`
- Run migrations: `alembic upgrade head`

**"Redis connection failed"**:
- Start Redis: `redis-server`
- Check if running: `redis-cli ping` (should return PONG)

**"OpenAI API error"**:
- Verify API key in `.env`
- Check API quota: https://platform.openai.com/account/usage
- Ensure billing is set up

---

## 🎉 You're Ready!

You now have:
- ✅ Development environment set up
- ✅ Understanding of project structure
- ✅ Access to documentation
- ✅ Knowledge of development workflow
- ✅ First task to work on

**Welcome to the team! Let's build something amazing together.** 🚀

---

## 📞 Team Contacts

- **Tech Lead**: [Name] - @tech-lead
- **Product Manager**: [Name] - @product
- **Frontend Lead**: [Name] - @frontend-lead
- **Backend Lead**: [Name] - @backend-lead
- **DevOps**: [Name] - @devops

**Office Hours**: Mon/Wed/Fri 2-3pm PT for any questions

---

*Last Updated: 2025-10-22*
*Version: 1.0*
