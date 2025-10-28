# Staging Environment Setup Guide

Complete guide for setting up and deploying HireFlux to the staging environment.

## Overview

The staging environment mirrors production and is used for:
- Testing features before production deployment
- QA and user acceptance testing
- Integration testing with real external services
- Performance testing under production-like conditions

### Architecture

- **Frontend**: Vercel (Next.js deployment)
- **Backend**: AWS ECS or Railway (containerized FastAPI)
- **Database**: Supabase PostgreSQL
- **Storage**: Supabase Storage
- **Cache**: Redis Cloud or Upstash
- **Monitoring**: Sentry (error tracking)

---

## Prerequisites

Before setting up staging, ensure you have:

- [ ] GitHub account with HireFlux repository access
- [ ] Vercel account (free tier works)
- [ ] Supabase account (free tier works)
- [ ] Redis Cloud or Upstash account
- [ ] AWS account (for ECS) OR Railway account
- [ ] Stripe test account
- [ ] OpenAI API key
- [ ] Pinecone account (free tier)

---

## Part 1: Database Setup (Supabase)

### 1.1 Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in details:
   - **Name**: `hireflux-staging`
   - **Database Password**: Generate strong password (save in password manager)
   - **Region**: Choose closest to your users (e.g., `us-east-1`)
   - **Pricing Plan**: Free (upgrade to Pro for production)

4. Wait 2-3 minutes for provisioning

### 1.2 Get Connection Details

1. In Supabase dashboard, go to **Settings** → **Database**
2. Copy these values:
   - **Host**: `db.xxxxxxxxxxxxx.supabase.co`
   - **Database name**: `postgres`
   - **Port**: `5432`
   - **User**: `postgres`
   - **Password**: (the one you set earlier)

3. Connection string format:
   ```
   postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
   ```

### 1.3 Run Database Migrations

```bash
# Clone repository
git clone https://github.com/yourusername/HireFlux.git
cd HireFlux/backend

# Create .env.staging
cp .env.example .env.staging

# Update DATABASE_URL in .env.staging
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres

# Install dependencies
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run migrations
export ENVIRONMENT=staging
alembic upgrade head

# Verify migration
alembic current
```

Expected output:
```
INFO  [alembic.runtime.migration] Context impl PostgreSQLImpl.
INFO  [alembic.runtime.migration] Will assume transactional DDL.
a2fe65bd1a0d (head)
```

### 1.4 Set Up Supabase Storage

1. In Supabase dashboard, go to **Storage**
2. Create buckets:
   - `resumes` (public: false)
   - `cover-letters` (public: false)
   - `profile-pictures` (public: true)

3. Set bucket policies (RLS):
   ```sql
   -- Allow authenticated users to upload to their folder
   CREATE POLICY "Users can upload their files"
   ON storage.objects FOR INSERT
   TO authenticated
   WITH CHECK (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);

   -- Allow users to read their own files
   CREATE POLICY "Users can read their files"
   ON storage.objects FOR SELECT
   TO authenticated
   USING (bucket_id = 'resumes' AND auth.uid()::text = (storage.foldername(name))[1]);
   ```

---

## Part 2: Redis Setup (Upstash)

### 2.1 Create Upstash Redis Database

1. Go to [https://console.upstash.com](https://console.upstash.com)
2. Click "Create Database"
3. Configure:
   - **Name**: `hireflux-staging`
   - **Region**: Same as Supabase (e.g., `us-east-1`)
   - **Type**: Regional (faster, cheaper than global)
   - **Plan**: Free (10,000 commands/day)

4. Click "Create"

### 2.2 Get Redis Connection String

1. In database dashboard, copy:
   - **Endpoint**: `xxxxxxx.upstash.io`
   - **Port**: `6379`
   - **Password**: (shown in dashboard)

2. Connection string:
   ```
   redis://:[PASSWORD]@xxxxxxx.upstash.io:6379
   ```

3. For TLS (recommended):
   ```
   rediss://:[PASSWORD]@xxxxxxx.upstash.io:6380
   ```

---

## Part 3: Backend Deployment (Railway)

### 3.1 Create Railway Project

1. Go to [https://railway.app](https://railway.app)
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `HireFlux` repository
4. Railway will detect `backend/Dockerfile`

### 3.2 Configure Environment Variables

In Railway dashboard, go to **Variables** and add:

```bash
# Environment
ENVIRONMENT=staging
DEBUG=False
APP_NAME=HireFlux

# Database (from Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.xxxxxxxxxxxxx.supabase.co:5432/postgres
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=10

# Redis (from Upstash)
REDIS_URL=rediss://:[PASSWORD]@xxxxxxx.upstash.io:6380
REDIS_MAX_CONNECTIONS=50

# JWT
JWT_SECRET_KEY=[Generate with: openssl rand -hex 32]
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440
REFRESH_TOKEN_EXPIRE_DAYS=30

# OpenAI
OPENAI_API_KEY=sk-your-openai-key-here
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDINGS_MODEL=text-embedding-ada-002

# Pinecone
PINECONE_API_KEY=your-pinecone-key-here
PINECONE_ENVIRONMENT=us-west1-gcp
PINECONE_INDEX_NAME_JOBS=job-embeddings-staging

# Stripe (TEST MODE)
STRIPE_SECRET_KEY=sk_test_your-stripe-key-here
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key-here
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret-here

# Supabase Storage
SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
SUPABASE_KEY=your-supabase-anon-key

# Email
RESEND_API_KEY=re_your-resend-key-here
FROM_EMAIL=staging@hireflux.com
FROM_NAME=HireFlux Staging

# CORS (add Vercel domain after frontend deployment)
CORS_ORIGINS=["https://hireflux-staging.vercel.app","http://localhost:3000"]

# Sentry (optional)
SENTRY_DSN=your-sentry-dsn-here

# OAuth (optional)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### 3.3 Deploy

1. Railway will automatically deploy on git push
2. Note the deployment URL: `https://your-app.railway.app`
3. Health check: `https://your-app.railway.app/health`

### 3.4 Run Migrations (if needed)

If migrations weren't run earlier:

```bash
# In Railway dashboard, go to "Deployments" → "Shell"
alembic upgrade head
```

---

## Part 4: Frontend Deployment (Vercel)

### 4.1 Create Vercel Project

1. Go to [https://vercel.com](https://vercel.com)
2. Click "Add New..." → "Project"
3. Import `HireFlux` repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

### 4.2 Configure Environment Variables

In Vercel dashboard, go to **Settings** → **Environment Variables**:

```bash
# API
NEXT_PUBLIC_API_URL=https://your-app.railway.app
NEXT_PUBLIC_API_VERSION=v1

# Supabase (for client-side auth/storage)
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key

# Stripe (publishable key - safe for client)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-key-here

# Environment
NEXT_PUBLIC_ENVIRONMENT=staging

# Analytics (optional)
NEXT_PUBLIC_GA_ID=G-XXXXXXXXXX
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn-here
```

### 4.3 Deploy

1. Click "Deploy"
2. Vercel will build and deploy (takes 2-3 minutes)
3. Note deployment URL: `https://hireflux-staging.vercel.app`

### 4.4 Update CORS in Backend

Add Vercel URL to backend CORS_ORIGINS:

```bash
# In Railway, update CORS_ORIGINS
CORS_ORIGINS=["https://hireflux-staging.vercel.app","http://localhost:3000"]

# Redeploy backend
```

---

## Part 5: DNS and Custom Domain (Optional)

### 5.1 Add Custom Staging Domain

1. Buy domain or use subdomain: `staging.hireflux.com`

2. **For Frontend (Vercel)**:
   - In Vercel: Settings → Domains
   - Add `staging.hireflux.com`
   - Add DNS records in your domain provider:
     ```
     Type: CNAME
     Name: staging
     Value: cname.vercel-dns.com
     ```

3. **For Backend (Railway)**:
   - In Railway: Settings → Domains
   - Add `api-staging.hireflux.com`
   - Add DNS record:
     ```
     Type: CNAME
     Name: api-staging
     Value: your-app.railway.app
     ```

4. **Enable SSL**:
   - Both Vercel and Railway auto-provision SSL certificates
   - Wait 5-10 minutes for DNS propagation

5. **Update Environment Variables**:
   ```bash
   # Frontend (Vercel)
   NEXT_PUBLIC_API_URL=https://api-staging.hireflux.com

   # Backend (Railway)
   CORS_ORIGINS=["https://staging.hireflux.com"]
   ```

---

## Part 6: CI/CD Pipeline

The GitHub Actions workflow (`.github/workflows/ci.yml`) is already configured.

### 6.1 Add Deployment Secrets

In GitHub repository: **Settings** → **Secrets and variables** → **Actions**

Add these secrets:

```bash
# Vercel
VERCEL_TOKEN              # From Vercel: Settings → Tokens
VERCEL_ORG_ID             # From Vercel: Settings → General
VERCEL_PROJECT_ID         # From Vercel: Project Settings

# Railway (optional - for automated backend deployment)
RAILWAY_TOKEN             # From Railway: Account → Tokens

# AWS (if using ECS instead of Railway)
AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY
```

### 6.2 Automatic Deployments

The CI/CD pipeline will:

1. **On PR**: Run tests only
2. **On push to `main`**:
   - Run all tests (frontend, backend, E2E)
   - If all pass → deploy to staging
   - Frontend deploys to Vercel
   - Backend deploys to Railway/AWS

### 6.3 Manual Deployment

To deploy manually:

```bash
# Frontend
cd frontend
vercel --prod --token=$VERCEL_TOKEN

# Backend (Railway)
railway up
```

---

## Part 7: External Services Setup

### 7.1 Stripe Webhooks (Staging)

1. In Stripe Dashboard → **Developers** → **Webhooks**
2. Click "Add endpoint"
3. Configure:
   - **URL**: `https://api-staging.hireflux.com/api/v1/webhooks/stripe`
   - **Events**: Select:
     - `customer.subscription.created`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.payment_succeeded`
     - `invoice.payment_failed`

4. Copy **Signing Secret** → Add to backend env as `STRIPE_WEBHOOK_SECRET`

### 7.2 Pinecone Index

Create separate staging index:

```bash
# Install Pinecone CLI
pip install pinecone-client

# Create index
python
>>> import pinecone
>>> pinecone.init(api_key="your-key", environment="us-west1-gcp")
>>> pinecone.create_index("job-embeddings-staging", dimension=1536, metric="cosine")
```

### 7.3 Email Testing (Resend)

1. In Resend: **Domains** → Add `staging.hireflux.com`
2. Add DNS records for SPF/DKIM
3. Verify domain
4. Update backend:
   ```bash
   FROM_EMAIL=noreply@staging.hireflux.com
   ```

---

## Part 8: Testing and Verification

### 8.1 Health Checks

```bash
# Backend health
curl https://api-staging.hireflux.com/health

# Expected:
# {"status": "healthy", "version": "1.0.0", "environment": "staging"}

# Database connectivity
curl https://api-staging.hireflux.com/health/db

# Redis connectivity
curl https://api-staging.hireflux.com/health/redis
```

### 8.2 Frontend Tests

1. Visit `https://staging.hireflux.com`
2. Test key flows:
   - [ ] Sign up (creates user in Supabase)
   - [ ] Sign in (JWT works)
   - [ ] Upload resume
   - [ ] Generate cover letter (OpenAI integration)
   - [ ] View job matches (Pinecone integration)
   - [ ] Start free trial (Stripe integration)

### 8.3 API Tests

```bash
# Run integration tests against staging
cd backend
export API_URL=https://api-staging.hireflux.com
pytest tests/integration -v --tb=short
```

### 8.4 Performance Tests

```bash
# Load test dashboard
ab -n 100 -c 10 https://api-staging.hireflux.com/api/v1/analytics/dashboard \
  -H "Authorization: Bearer $TOKEN"

# Target: p95 < 200ms
```

---

## Part 9: Monitoring and Observability

### 9.1 Sentry Setup

1. Create project in Sentry: `hireflux-staging-backend`
2. Add DSN to backend `.env`
3. Create frontend project: `hireflux-staging-frontend`
4. Add DSN to frontend `.env`

### 9.2 Logging

- **Vercel**: Automatic logging in dashboard
- **Railway**: View logs in deployment page
- **Supabase**: Query logs in Dashboard → Logs

### 9.3 Uptime Monitoring

Use [UptimeRobot](https://uptimerobot.com) (free):

1. Add monitors:
   - `https://staging.hireflux.com` (frontend)
   - `https://api-staging.hireflux.com/health` (backend)

2. Set alerts to email/Slack

---

## Part 10: Rollback Procedures

### 10.1 Frontend Rollback

```bash
# In Vercel dashboard
# Deployments → Find previous deployment → "Promote to Production"

# Or via CLI
vercel rollback [deployment-url]
```

### 10.2 Backend Rollback

```bash
# Railway: Deployments → Previous deployment → "Redeploy"

# Or rollback database migration
alembic downgrade -1
```

### 10.3 Database Rollback

```bash
# Downgrade migration
alembic downgrade -1

# Or restore from backup
pg_restore -d $DATABASE_URL backup.dump
```

---

## Part 11: Cost Breakdown (Free Tier)

Estimated monthly costs for staging:

| Service | Plan | Cost |
|---------|------|------|
| **Vercel** | Hobby | $0 |
| **Railway** | Trial | $5/month |
| **Supabase** | Free | $0 |
| **Upstash Redis** | Free | $0 |
| **Pinecone** | Starter | $0 |
| **Stripe** | Test mode | $0 |
| **Sentry** | Developer | $0 |
| **Total** | | **$5/month** |

---

## Part 12: Troubleshooting

### Database Connection Fails

**Error**: `connection refused` or `SSL required`

**Solution**:
```bash
# Ensure SSL mode in connection string
DATABASE_URL=postgresql://postgres:pass@host:5432/postgres?sslmode=require
```

### CORS Errors in Frontend

**Error**: `Access-Control-Allow-Origin` missing

**Solution**:
1. Check backend `CORS_ORIGINS` includes frontend URL
2. Ensure no trailing slash: `https://staging.hireflux.com` (not `/`)
3. Restart backend after updating env vars

### Build Fails on Vercel

**Error**: `Module not found`

**Solution**:
1. Check `package.json` includes all dependencies
2. Run `npm install` locally to update `package-lock.json`
3. Commit and push `package-lock.json`

### Stripe Webhooks Not Working

**Error**: Webhook signature verification fails

**Solution**:
1. Verify `STRIPE_WEBHOOK_SECRET` matches Stripe dashboard
2. Check endpoint URL is exact (including `/api/v1/webhooks/stripe`)
3. Ensure backend is publicly accessible

---

## Part 13: Security Checklist

Before going live:

- [ ] All API keys are environment variables (not hardcoded)
- [ ] Database has strong password (20+ characters)
- [ ] JWT secret is randomly generated
- [ ] CORS is restricted to specific domains
- [ ] Rate limiting is enabled
- [ ] Stripe is in TEST mode
- [ ] Database backups are enabled (Supabase auto-backup)
- [ ] HTTPS/TLS is enabled everywhere
- [ ] Sensitive data is encrypted at rest
- [ ] Error messages don't expose sensitive info

---

## Part 14: Next Steps

After staging is set up:

1. **Test thoroughly** for 1-2 weeks
2. **Invite beta testers** to use staging
3. **Monitor errors** in Sentry
4. **Optimize performance** based on real usage
5. **Document any issues** for production deployment
6. **Prepare production setup** (similar process with production-grade plans)

---

## Quick Reference

### Important URLs

- **Frontend**: https://staging.hireflux.com
- **Backend API**: https://api-staging.hireflux.com
- **API Docs**: https://api-staging.hireflux.com/docs
- **Supabase**: https://app.supabase.com
- **Vercel**: https://vercel.com/dashboard
- **Railway**: https://railway.app/dashboard

### Support Contacts

- **Vercel**: support@vercel.com
- **Railway**: team@railway.app
- **Supabase**: support@supabase.com

---

**Last Updated**: 2025-10-27
**Maintained By**: DevOps Team
**Review Frequency**: Monthly
