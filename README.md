# HireFlux - AI-Powered Job Application Copilot

HireFlux is an AI-powered platform that streamlines job search with tailored resumes, personalized cover letters, intelligent job matching, and automated applications.

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Documentation](#documentation)
- [Development](#development)
- [Testing](#testing)
- [Deployment](#deployment)
- [Contributing](#contributing)

---

## 🎯 Project Overview

### Features

- **AI Resume Builder**: Generate ATS-optimized resumes tailored to target roles
- **Cover Letter Generator**: Create personalized cover letters with AI
- **Smart Job Matching**: AI-powered job recommendations with Fit Index scoring
- **Apply Assist**: Pre-fill and streamline job applications
- **Auto-Apply**: Automated job applications with consent-based controls
- **Interview Coach**: Practice interviews with AI feedback
- **Application Tracking**: Manage entire job search pipeline
- **Analytics**: Track performance and optimize job search strategy

### Key Metrics

- **Activation Goal**: 30% of users complete resume + generate 1 cover letter
- **Conversion Target**: 8% Free → Paid within 14 days
- **Performance**: p95 page load < 300ms, AI generation < 6s
- **Uptime**: 99.9% availability

---

## 🛠 Tech Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui, Radix UI
- **State Management**: Zustand, React Context
- **HTTP Client**: Axios

### Backend
- **Framework**: FastAPI (Python 3.11+)
- **Database**: PostgreSQL 15+ (Supabase)
- **Vector DB**: Pinecone
- **Cache/Queue**: Redis
- **Workers**: RQ (Redis Queue)
- **ORM**: SQLAlchemy 2.0+

### AI/ML
- **LLM**: OpenAI GPT-4/GPT-4 Turbo
- **Embeddings**: OpenAI text-embedding-ada-002
- **Vector Search**: Pinecone

### Infrastructure
- **Frontend Hosting**: Vercel
- **Backend Hosting**: AWS ECS/Fargate or GCP Cloud Run
- **Database**: Supabase (managed PostgreSQL)
- **File Storage**: S3 or Supabase Storage
- **CDN**: CloudFront or Vercel Edge
- **Monitoring**: Sentry, OpenTelemetry

### Integrations
- **Payments**: Stripe
- **Email**: Resend or SendGrid
- **Job Boards**: Greenhouse, Lever APIs

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** >= 18.0.0
- **Python** >= 3.11
- **PostgreSQL** >= 15
- **Redis** >= 7.0
- **Git**

### Environment Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/hireflux.git
   cd hireflux
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   cp .env.example .env.local
   # Edit .env.local with your configuration
   npm run dev
   ```

   Frontend will run on `http://localhost:3000`

3. **Backend Setup**
   ```bash
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   cp .env.example .env
   # Edit .env with your configuration
   uvicorn app.main:app --reload
   ```

   Backend will run on `http://localhost:8000`

4. **Database Migrations**
   ```bash
   cd backend
   alembic upgrade head
   ```

5. **Start Redis** (if running locally)
   ```bash
   redis-server
   ```

6. **Start Worker** (for background jobs)
   ```bash
   cd backend
   rq worker --url redis://localhost:6379/1
   ```

### Quick Start with Docker (Coming Soon)

```bash
docker-compose up
```

---

## 📁 Project Structure

```
HireFlux/
├── frontend/                   # Next.js frontend
│   ├── app/                    # App Router pages
│   ├── components/             # React components
│   ├── lib/                    # Utilities & API client
│   ├── types/                  # TypeScript types
│   └── public/                 # Static assets
│
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── api/                # API endpoints
│   │   ├── core/               # Core utilities (config, security)
│   │   ├── db/                 # Database models & session
│   │   ├── services/           # Business logic
│   │   ├── workers/            # Background workers
│   │   ├── integrations/       # External services (OpenAI, Stripe)
│   │   └── main.py             # FastAPI app entry
│   ├── alembic/                # Database migrations
│   ├── tests/                  # Test suite
│   └── requirements.txt        # Python dependencies
│
├── docs/                       # Documentation
│   ├── ARCHITECTURE.md         # Technical architecture
│   ├── API_DESIGN.md           # API specification
│   ├── DATABASE_DESIGN.md      # Database schema
│   ├── PRODUCT_BACKLOG.md      # User stories & epics
│   ├── SPRINT_PLAN.md          # Sprint planning
│   └── TECHNICAL_TASKS.md      # Detailed task breakdown
│
├── CLAUDE.md                   # Claude Code guidance
├── HireFlux_PRD.md             # Product Requirements
└── README.md                   # This file
```

---

## 📖 Documentation

### Architecture & Design
- [**Architecture**](./ARCHITECTURE.md) - High-level design, system architecture, component diagrams
- [**API Design**](./API_DESIGN.md) - Complete API specification with endpoints
- [**Database Design**](./DATABASE_DESIGN.md) - Schema, ERD, migration strategy

### Product & Planning
- [**Product Requirements (PRD)**](./HireFlux_PRD.md) - Complete product requirements
- [**Product Backlog**](./PRODUCT_BACKLOG.md) - User stories, epics, acceptance criteria
- [**Sprint Plan**](./SPRINT_PLAN.md) - Sprint breakdown for MVP
- [**Technical Tasks**](./TECHNICAL_TASKS.md) - Detailed engineering tasks

### Development
- [**CLAUDE.md**](./CLAUDE.md) - Guidance for Claude Code AI assistant

---

## 💻 Development

### Frontend Development

```bash
cd frontend
npm run dev          # Start dev server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run type-check   # TypeScript type checking
npm run format       # Format code with Prettier
npm test             # Run tests
npm run test:e2e     # Run E2E tests
```

### Backend Development

```bash
cd backend
uvicorn app.main:app --reload  # Start dev server
pytest                         # Run tests
pytest --cov                   # Run tests with coverage
black .                        # Format code
flake8                         # Lint code
mypy app                       # Type checking
alembic revision -m "message"  # Create migration
alembic upgrade head           # Apply migrations
```

### Code Quality

**Frontend**:
- ESLint + Prettier for linting and formatting
- TypeScript for type safety
- Jest + React Testing Library for unit tests
- Playwright for E2E tests

**Backend**:
- Black for formatting
- Flake8 for linting
- MyPy for type checking
- Pytest for unit/integration tests

---

## 🧪 Testing

### Unit Tests

```bash
# Frontend
cd frontend
npm test

# Backend
cd backend
pytest tests/unit
```

### Integration Tests

```bash
cd backend
pytest tests/integration
```

### E2E Tests

```bash
cd frontend
npm run test:e2e
```

### Test Coverage

```bash
# Frontend
npm test -- --coverage

# Backend
pytest --cov=app --cov-report=html
```

**Target**: >80% code coverage

---

## 🚢 Deployment

### Environment Configuration

**Production Checklist**:
- [ ] Set `DEBUG=False` in backend
- [ ] Configure production database (Supabase)
- [ ] Set up Redis (Upstash or ElastiCache)
- [ ] Configure S3 bucket for file storage
- [ ] Set OpenAI API key (production)
- [ ] Configure Stripe live mode keys
- [ ] Set up Sentry for error tracking
- [ ] Configure CORS for production domain
- [ ] Set up CDN (CloudFront/Vercel)
- [ ] Configure SSL certificates
- [ ] Set up monitoring and alerting

### Deployment Steps

**Frontend (Vercel)**:
```bash
cd frontend
vercel --prod
```

**Backend (AWS ECS/Fargate)**:
```bash
cd backend
docker build -t hireflux-api .
docker tag hireflux-api:latest <ecr-repo>:latest
docker push <ecr-repo>:latest
# Update ECS service
```

**Database Migrations**:
```bash
cd backend
alembic upgrade head
```

### CI/CD

GitHub Actions workflow runs on every push:
1. Install dependencies
2. Run linters
3. Run tests
4. Build artifacts
5. Deploy to staging (on main branch)
6. Deploy to production (manual approval)

---

## 🤝 Contributing

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches
- `hotfix/*` - Production hotfixes

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**: feat, fix, docs, style, refactor, test, chore

**Example**:
```
feat(resume): add AI resume generation endpoint

- Implement OpenAI integration
- Add rate limiting
- Add token cost tracking

Closes #123
```

### Pull Request Process

1. Create feature branch from `develop`
2. Make changes and commit
3. Write/update tests
4. Run linters and tests locally
5. Create PR to `develop`
6. Code review (2 approvals required)
7. Merge after CI passes

---

## 📄 License

Proprietary - © 2025 HireFlux. All rights reserved.

---

## 📞 Support

- **Email**: support@hireflux.com
- **Documentation**: https://docs.hireflux.com
- **Issues**: https://github.com/your-org/hireflux/issues

---

## 🙏 Acknowledgments

- OpenAI for GPT-4 and embeddings
- Supabase for database and auth
- Pinecone for vector search
- Stripe for payments
- All open-source contributors

---

**Built with ❤️ by the HireFlux Team**
