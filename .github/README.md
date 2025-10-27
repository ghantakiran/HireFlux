# GitHub Actions CI/CD Setup

## Overview
This CI/CD pipeline provides automated testing, linting, building, and deployment for the HireFlux project.

## Workflow Features

### Frontend Pipeline
- **Node.js 18** setup with npm caching
- **ESLint** code quality checks
- **TypeScript** type checking
- **Prettier** formatting validation
- **Jest** unit tests with coverage
- **Next.js** production build
- **Codecov** coverage reporting

### Backend Pipeline
- **Python 3.11** setup with pip caching
- **PostgreSQL 15** and **Redis 7** services
- **Black** code formatting check
- **Flake8** linting
- **MyPy** type checking
- **Pytest** unit and integration tests
- **Coverage** reporting
- **Codecov** integration

### E2E Testing
- **Playwright** browser automation
- Cross-browser testing (Chrome, Firefox, Safari)
- Visual regression testing
- Test result artifacts

### Security Scanning
- **Trivy** vulnerability scanning
- **SARIF** security report upload to GitHub
- File system and dependency scanning

### Deployment
- **Vercel** frontend deployment (staging)
- **AWS ECS** backend deployment (staging)
- Production deployment on main branch

## Required Secrets

Add these secrets to your GitHub repository:

### Vercel Deployment
```
VERCEL_TOKEN=your_vercel_token
VERCEL_ORG_ID=your_org_id
VERCEL_PROJECT_ID=your_project_id
```

### AWS Deployment
```
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
```

### Optional Notifications
```
SLACK_WEBHOOK_URL=your_slack_webhook_url
```

## Environment Variables

### Backend Tests
```bash
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/hireflux_test
REDIS_URL=redis://localhost:6379/0
```

### Frontend Tests
```bash
CI=true
```

## Workflow Triggers

- **Push** to `main` or `develop` branches
- **Pull requests** to `main` or `develop` branches
- **Manual** trigger (workflow_dispatch)

## Job Dependencies

```
frontend ──┐
           ├── e2e ──┐
backend ────┘         ├── deploy-staging
security ─────────────┘
```

## Coverage Thresholds

- **Frontend**: >80% code coverage
- **Backend**: >80% code coverage
- **E2E**: All critical user flows

## Artifacts

- Frontend build artifacts
- Backend coverage HTML reports
- Playwright test results
- Security scan results

## Local Development

To run the same checks locally:

```bash
# Frontend
cd frontend
npm run lint
npm run type-check
npm test
npm run build

# Backend
cd backend
black --check .
flake8 .
mypy app
pytest tests/ -v --cov=app
```

## Troubleshooting

### Common Issues

1. **Node.js version mismatch**
   - Ensure local Node.js version matches CI (18.x)

2. **Python dependency conflicts**
   - Use virtual environment
   - Pin dependency versions

3. **Database connection failures**
   - Check PostgreSQL service health
   - Verify connection strings

4. **Redis connection issues**
   - Ensure Redis service is running
   - Check port availability

### Performance Optimization

- Use `npm ci` instead of `npm install`
- Cache dependencies between runs
- Parallel job execution
- Selective test running based on changed files

## Next Steps

1. **Set up secrets** in GitHub repository settings
2. **Configure Vercel** project and get tokens
3. **Set up AWS ECS** cluster and get credentials
4. **Test the pipeline** with a sample PR
5. **Monitor** build times and optimize as needed
