# CI/CD Setup Guide

This document provides a comprehensive guide to the Continuous Integration and Deployment infrastructure for HireFlux.

## Overview

The HireFlux project uses GitHub Actions for CI/CD with the following workflows:

1. **Backend Test Suite** (`.github/workflows/test.yml`)
2. **Frontend CI** (`.github/workflows/frontend-ci.yml`)
3. **E2E Tests** (`.github/workflows/e2e-tests.yml`)
4. **Production Deployment** (`.github/workflows/deploy.yml`)

## Workflow Architecture

```
Push to main/develop
├─> Backend Tests (lint, type-check, unit tests, coverage)
├─> Frontend CI (lint, type-check, unit tests, build, accessibility)
└─> E2E Tests (multi-browser, visual regression)

Push to main (only)
└─> Deployment
    ├─> Run Backend Tests
    ├─> Run Frontend Tests
    ├─> Deploy to Vercel
    ├─> Run Smoke Tests
    └─> Rollback on Failure (if smoke tests fail)
```

## Required GitHub Secrets

### Vercel Deployment

1. **VERCEL_TOKEN**
   - Description: Vercel authentication token
   - How to get:
     1. Go to https://vercel.com/account/tokens
     2. Click "Create Token"
     3. Name it "GitHub Actions"
     4. Copy the token

2. **VERCEL_ORG_ID**
   - Description: Your Vercel organization ID
   - How to get:
     ```bash
     # Install Vercel CLI
     npm i -g vercel

     # Link project
     cd frontend
     vercel link

     # Get org ID from .vercel/project.json
     cat .vercel/project.json
     ```

3. **VERCEL_PROJECT_ID**
   - Description: Your Vercel project ID
   - How to get: Same as above, found in `.vercel/project.json`

### API Keys (Optional for E2E Tests)

4. **OPENAI_API_KEY** (Optional)
   - Description: OpenAI API key for LLM features
   - Required for: E2E tests that use AI features
   - Falls back to: `'test-key'` in testing environment

5. **PINECONE_API_KEY** (Optional)
   - Description: Pinecone API key for vector search
   - Required for: E2E tests that use job matching
   - Falls back to: `'test-key'` in testing environment

### Code Coverage

6. **CODECOV_TOKEN** (Optional)
   - Description: Codecov token for coverage reports
   - How to get:
     1. Go to https://codecov.io
     2. Connect your GitHub repository
     3. Copy the upload token
   - Note: Public repositories don't require this

### Test Credentials (for E2E tests)

7. **E2E_TEST_EMAIL** (Optional)
   - Description: Email for E2E test user
   - Default: `test@example.com`
   - Note: Must be a valid user in your test database

8. **E2E_TEST_PASSWORD** (Optional)
   - Description: Password for E2E test user
   - Default: `TestPassword123!`
   - Note: Must match the password for E2E_TEST_EMAIL

## Setting GitHub Secrets

1. Go to your repository on GitHub
2. Navigate to **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add each secret with its name and value
5. Click **Add secret**

## Vercel Setup

### Initial Setup

1. **Create Vercel Account**
   ```bash
   # Visit https://vercel.com and sign up with GitHub
   ```

2. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

3. **Link Project**
   ```bash
   cd frontend
   vercel link
   # Follow the prompts to link to your Vercel project
   ```

4. **Configure Environment Variables in Vercel**
   - Go to https://vercel.com/dashboard
   - Select your project
   - Go to **Settings** → **Environment Variables**
   - Add the following:
     - `NEXT_PUBLIC_API_URL` → Your backend API URL
     - `NEXT_PUBLIC_SUPABASE_URL` → Your Supabase project URL
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Your Supabase anon key

5. **Get Deployment IDs**
   ```bash
   # This creates .vercel/project.json
   cat .vercel/project.json
   # Copy projectId and orgId to GitHub secrets
   ```

### Vercel Configuration

The `vercel.json` file in the root directory configures:
- Next.js build process
- API routing to backend
- Environment variables
- Multi-region deployment (San Francisco, Virginia)
- GitHub integration with auto-aliasing

## Playwright E2E Tests

### Test Structure

```
frontend/tests/e2e/
├── 01-authentication.spec.ts    # Sign up, sign in, OAuth
├── 02-onboarding.spec.ts        # 4-step onboarding flow
├── 03-resume-generation.spec.ts # Resume creation & management
├── 04-job-matching.spec.ts      # Job matching & applications
├── global-setup.ts              # Creates authenticated sessions
└── fixtures/
    └── sample-resume.txt        # Test data
```

### Running Tests Locally

```bash
cd frontend

# Install dependencies
npm install

# Install Playwright browsers
npx playwright install

# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test 01-authentication

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run specific browser
npx playwright test --project=chromium

# Generate test report
npx playwright show-report
```

### Authentication Setup

E2E tests use global setup to create authenticated sessions:

1. `global-setup.ts` runs before all tests
2. Signs in with test credentials
3. Saves authentication state to `tests/e2e/.auth/user.json`
4. Tests requiring auth use: `test.use({ storageState: 'tests/e2e/.auth/user.json' })`

### Browser Coverage

- Chromium (Desktop)
- Firefox (Desktop)
- WebKit/Safari (Desktop)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 12)

## Workflow Details

### Backend Test Suite

**Triggers**: Push/PR to main or develop

**Jobs**:
1. **Lint**: Ruff linting
2. **Type Check**: MyPy type checking
3. **Unit Tests**: pytest with coverage
4. **Integration Tests**: API integration tests
5. **Security Scan**: Bandit security analysis

**Coverage**: Uploads to Codecov, requires ≥80%

### Frontend CI

**Triggers**: Push/PR to main or develop (when frontend files change)

**Jobs**:
1. **Lint & Type Check**: ESLint + TypeScript
2. **Unit Tests**: Jest with coverage
3. **Build Check**: Next.js production build
4. **Accessibility**: @axe-core/cli WCAG 2.1 AA compliance

**Coverage**: Uploads to Codecov

### E2E Tests

**Triggers**:
- Push/PR to main or develop
- Scheduled: Daily at 2 AM UTC
- Manual: workflow_dispatch

**Services**:
- PostgreSQL 15 (test database)
- Redis 7 (caching)

**Jobs**:
1. **E2E Tests**: Matrix across browsers (Chromium, Firefox, WebKit)
2. **Visual Regression**: Screenshot comparison tests
3. **Summary**: Aggregates results, comments on PRs

**Artifacts**: Test reports, videos, screenshots (retained 7-30 days)

### Deployment

**Triggers**: Push to main (only)

**Jobs**:
1. **Backend Tests**: Runs test.yml workflow
2. **Frontend Tests**: Runs frontend-ci.yml workflow
3. **Deploy Frontend**: Deploys to Vercel production
4. **Smoke Tests**: Validates production deployment
5. **Rollback**: Automatic rollback if smoke tests fail
6. **Summary**: Creates deployment summary

**Safety Features**:
- Pre-deployment testing (both backend and frontend)
- Smoke tests on production URL
- Automatic rollback on failure
- GitHub issue creation on rollback
- Deployment URL commenting on commits

## Monitoring & Debugging

### GitHub Actions

1. **View Workflow Runs**
   - Go to **Actions** tab in your repository
   - Click on a workflow run to see details

2. **Download Artifacts**
   - Click on a workflow run
   - Scroll to **Artifacts** section
   - Download test reports, videos, screenshots

3. **Re-run Failed Jobs**
   - Click on failed workflow run
   - Click **Re-run jobs** → **Re-run failed jobs**

### Local Debugging

```bash
# Run backend tests locally
cd backend
pytest tests/unit -v

# Run frontend tests locally
cd frontend
npm test

# Run E2E tests with debugging
cd frontend
npx playwright test --debug

# Generate HTML report
npx playwright show-report
```

### Common Issues

1. **E2E Tests Failing on CI**
   - Check if backend server started successfully
   - Verify database migrations ran
   - Check environment variables

2. **Vercel Deployment Fails**
   - Verify secrets are set correctly
   - Check Vercel project settings
   - Review build logs in Vercel dashboard

3. **Smoke Tests Fail**
   - Check if deployment URL is accessible
   - Verify production environment variables
   - Review Playwright test output

## Best Practices

### Testing

1. **Write Tests Before Code** (TDD)
   - Write failing test first
   - Implement feature
   - Verify test passes

2. **Use Descriptive Test Names**
   ```typescript
   test('should display validation error when email is invalid', ...)
   ```

3. **Tag Critical Flows**
   ```typescript
   test('should complete payment @smoke', ...)
   ```

### CI/CD

1. **Keep Workflows Fast**
   - Run tests in parallel
   - Cache dependencies
   - Use matrix strategy

2. **Fail Fast**
   - Run linting/type-checking first
   - Use `fail-fast: false` for E2E matrix

3. **Meaningful Commit Messages**
   - Use conventional commits
   - Reference issues/PRs

### Security

1. **Never Commit Secrets**
   - Use GitHub Secrets
   - Add `.env` to `.gitignore`
   - Rotate tokens regularly

2. **Review Security Scans**
   - Check Bandit reports
   - Update dependencies regularly
   - Monitor Dependabot alerts

## Troubleshooting

### Playwright Issues

```bash
# Clear Playwright cache
npx playwright install --force

# Update Playwright
npm install -D @playwright/test@latest

# Check browser versions
npx playwright --version
```

### Vercel Issues

```bash
# Check deployment status
vercel ls

# View deployment logs
vercel logs <deployment-url>

# Redeploy manually
cd frontend
vercel --prod
```

### GitHub Actions Issues

```bash
# Validate workflow syntax locally
# Install act: brew install act
act -l  # List workflows
act -j <job-name>  # Run specific job
```

## Next Steps

1. **Set up all GitHub Secrets** (see Required GitHub Secrets section)
2. **Configure Vercel project** (see Vercel Setup section)
3. **Create test user** in your database for E2E tests
4. **Run E2E tests locally** to verify setup
5. **Push to main** to trigger deployment workflow
6. **Monitor first deployment** and verify smoke tests pass

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Playwright Documentation](https://playwright.dev)
- [Vercel Documentation](https://vercel.com/docs)
- [Codecov Documentation](https://docs.codecov.com)

## Support

For issues or questions:
1. Check workflow logs in GitHub Actions
2. Review this documentation
3. Open an issue in the repository
4. Contact the development team
