# HireFlux Staging Environment - Quick Start Guide

This guide helps you quickly deploy HireFlux to staging using the automated CI/CD pipeline.

## Quick Setup (15 minutes)

### 1. Configure GitHub Secrets

Add these secrets in **Settings → Secrets and variables → Actions**:

#### Required Secrets:
```bash
# Vercel (Frontend Deployment)
VERCEL_TOKEN=<your-vercel-token>
VERCEL_ORG_ID=<your-org-id>
VERCEL_PROJECT_ID=<your-project-id>

# Backend Deployment - Choose ONE platform:

# Option A: Railway (Recommended)
RAILWAY_TOKEN=<your-railway-token>
RAILWAY_ENVIRONMENT_ID=<staging-env-id>
RAILWAY_SERVICE_ID=<backend-service-id>

# Option B: Render
RENDER_API_KEY=<your-render-api-key>
RENDER_SERVICE_ID=<backend-service-id>

# API Configuration
STAGING_API_URL=https://api-staging.hireflux.com

# OpenAI (Required for AI features)
OPENAI_API_KEY=<your-openai-api-key>

# Optional: Notifications
SLACK_WEBHOOK_URL=<your-slack-webhook>
```

#### Optional Repository Variables:
```bash
# Settings → Secrets and variables → Actions → Variables tab
DEPLOY_PLATFORM=railway  # or 'render'
SLACK_NOTIFICATIONS_ENABLED=true
```

### 2. Platform Setup

#### Option A: Railway (Recommended)

**Sign up & Install CLI:**
```bash
# Create account at https://railway.app
npm install -g @railway/cli
railway login
```

**Create Project:**
```bash
cd /Users/kiranreddyghanta/Developer/HireFlux/backend

# Initialize Railway project
railway init

# Link to your GitHub repository
railway link

# Add PostgreSQL
railway add -d postgres

# Add Redis
railway add -d redis
```

**Configure Environment:**
1. Go to Railway Dashboard → Your Project → Variables
2. Copy `.env.staging.example` variables
3. Update with Railway-provided values:
   - `DATABASE_URL`: Use `${{Postgres.DATABASE_URL}}`
   - `REDIS_URL`: Use `${{Redis.REDIS_URL}}`
   - Add all other variables from `.env.staging.example`

**Get Secrets for GitHub:**
```bash
# Get Railway token
railway whoami --token

# Get IDs from Railway dashboard URL:
# https://railway.app/project/{PROJECT_ID}/service/{SERVICE_ID}
# Or use:
railway status
```

**Deploy:**
```bash
railway up
```

**Set Custom Domain:**
- Railway Dashboard → Settings → Domains
- Add: `api-staging.hireflux.com`
- Update your DNS with provided CNAME

#### Option B: Render

**Sign up:**
- Go to https://dashboard.render.com
- Sign in with GitHub

**Create Backend Service:**
1. Click "New +" → "Web Service"
2. Connect GitHub repository
3. Configure:
   - **Name**: hireflux-backend-staging
   - **Environment**: Docker
   - **Branch**: main
   - **Docker Build Context**: backend
   - **Dockerfile Path**: backend/Dockerfile
   - **Region**: Oregon (US West)
   - **Instance Type**: Starter ($7/mo)

**Create Database:**
1. Click "New +" → "PostgreSQL"
2. **Name**: hireflux-db-staging
3. **Plan**: Starter
4. Copy connection string

**Create Redis:**
1. Click "New +" → "Redis"
2. **Name**: hireflux-redis-staging
3. Copy connection string

**Add Environment Variables:**
- Copy all from `.env.staging.example`
- Use Render's internal URLs for DATABASE_URL and REDIS_URL

**Get Secrets for GitHub:**
- API Key: Account Settings → API Keys → Create
- Service ID: From service URL or settings page

### 3. Frontend Setup (Vercel)

**Sign up & Install CLI:**
```bash
npm install -g vercel
vercel login
```

**Link Project:**
```bash
cd /Users/kiranreddyghanta/Developer/HireFlux/frontend
vercel link
```

**Add Environment Variables:**
```bash
# Via CLI
vercel env add NEXT_PUBLIC_API_URL
# Enter: https://api-staging.hireflux.com

# Or via Vercel Dashboard:
# https://vercel.com/dashboard → Project → Settings → Environment Variables
```

**Get Secrets for GitHub:**
```bash
# Token: https://vercel.com/account/tokens
# Create new token → Copy

# Get IDs from .vercel/project.json after running `vercel link`
# Or from Vercel Dashboard → Project → Settings → General
```

**Deploy:**
```bash
vercel --prod
```

**Set Custom Domain:**
- Vercel Dashboard → Domains
- Add: `staging.hireflux.com`
- Update DNS with Vercel's CNAME

### 4. Database Setup (Supabase)

**Create Project:**
1. Go to https://app.supabase.com
2. New project → `hireflux-staging`
3. Region: Choose closest to your backend
4. Strong password → Save it!

**Get Connection String:**
```
Settings → Database → Connection string → URI
```

**Run Migrations:**
```bash
cd backend
source venv/bin/activate

# Set DATABASE_URL from Supabase
export DATABASE_URL="postgresql://postgres:password@db.xxx.supabase.co:5432/postgres"

# Run migrations
alembic upgrade head
```

**Create Storage Bucket:**
1. Storage → New bucket
2. Name: `resumes-staging`
3. Public: No

**Update Backend Environment:**
Add these to Railway/Render:
```bash
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_KEY=<your-anon-key>
SUPABASE_BUCKET=resumes-staging
```

### 5. Redis Setup (Upstash)

**Create Database:**
1. Go to https://console.upstash.com
2. Create database
3. Name: `hireflux-staging`
4. Region: Same as backend
5. Type: Regional

**Get Connection String:**
Copy Redis URL from dashboard

**Update Backend:**
Add to Railway/Render environment variables:
```bash
REDIS_URL=<upstash-redis-url>
```

### 6. Additional Services

#### Pinecone (Vector Database)
```bash
# 1. Sign up at https://app.pinecone.io
# 2. Create index:
#    - Name: hireflux-staging
#    - Dimensions: 1536
#    - Metric: cosine
# 3. Copy API key and environment
# 4. Add to backend env:
PINECONE_API_KEY=<your-key>
PINECONE_ENVIRONMENT=<your-env>
PINECONE_INDEX_NAME=hireflux-staging
```

#### Stripe (Test Mode)
```bash
# 1. Sign up at https://dashboard.stripe.com
# 2. Use test mode keys (start with sk_test_)
# 3. Add to backend env:
STRIPE_API_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

#### Resend (Email)
```bash
# 1. Sign up at https://resend.com
# 2. Create API key
# 3. Add to backend env:
RESEND_API_KEY=re_...
FROM_EMAIL=noreply@staging.hireflux.com
```

### 7. DNS Configuration

Add these DNS records at your domain registrar:

```
# Frontend (Vercel)
Type: CNAME
Name: staging
Value: cname.vercel-dns.com
TTL: 300

# Backend (Railway/Render)
Type: CNAME
Name: api-staging
Value: <from-railway-or-render>
TTL: 300
```

Wait 5-10 minutes for DNS propagation.

### 8. Deploy!

**Automatic Deployment:**
```bash
# Commit and push to main branch
git add .
git commit -m "Configure staging deployment"
git push origin main
```

GitHub Actions will automatically:
1. ✅ Run all tests
2. ✅ Build Docker image
3. ✅ Deploy to Railway/Render
4. ✅ Deploy to Vercel
5. ✅ Run smoke tests
6. ✅ Send notifications

**Manual Deployment:**
```bash
# Go to GitHub → Actions → "Deploy to Staging"
# Click "Run workflow"
# Select options and run
```

### 9. Verify Deployment

**Check Status:**
```bash
# Health check
curl https://api-staging.hireflux.com/health

# API status
curl https://api-staging.hireflux.com/api/v1/auth/status

# Frontend
curl https://staging.hireflux.com
```

**View in Browser:**
- Frontend: https://staging.hireflux.com
- Backend API Docs: https://api-staging.hireflux.com/docs

**Monitor Logs:**
```bash
# Railway
railway logs

# Render
# View in dashboard

# Vercel
vercel logs
```

## Troubleshooting

### Build Failures

**Frontend:**
```bash
# Check Vercel build logs
vercel logs <deployment-url>

# Test build locally
cd frontend
npm run build
```

**Backend:**
```bash
# Check Railway/Render logs
railway logs  # or check Render dashboard

# Test Docker build locally
cd backend
docker build -t test .
docker run -p 8000:8000 test
```

### Database Connection Issues

```bash
# Test connection
cd backend
source venv/bin/activate
python -c "from sqlalchemy import create_engine; engine = create_engine('$DATABASE_URL'); print('Connected!' if engine.connect() else 'Failed')"

# Check Supabase status
# Visit Supabase dashboard

# Verify connection string format
# Should be: postgresql://postgres:password@host:5432/postgres
```

### Environment Variable Issues

**Railway:**
```bash
# List all variables
railway variables

# Check specific variable
railway variables get DATABASE_URL
```

**Render:**
- Check Environment tab in service settings
- Verify no typos in variable names

**Vercel:**
```bash
# List variables
vercel env ls

# Pull variables to local
vercel env pull
```

### DNS Issues

```bash
# Check DNS propagation
dig staging.hireflux.com
dig api-staging.hireflux.com

# Or use online tool:
# https://www.whatsmydns.net
```

### SSL Certificate Issues

- **Vercel**: Auto-provisioned (wait 5-10 minutes)
- **Railway**: Auto-provisioned (wait 5-10 minutes)
- **Render**: Auto-provisioned (wait 5-10 minutes)

If not working after 30 minutes:
1. Verify DNS is correct
2. Check platform status page
3. Contact platform support

## Monitoring

### View Logs

**Backend:**
```bash
# Railway
railway logs --tail

# Render
# Dashboard → Logs tab
```

**Frontend:**
```bash
# Vercel
vercel logs --follow
```

### Metrics

- **Railway**: Dashboard → Metrics tab
- **Render**: Dashboard → Metrics tab
- **Vercel**: Analytics → Overview

### Error Tracking

If Sentry is configured:
- https://sentry.io → Projects → hireflux-staging

## Costs (Approximate)

| Service | Plan | Cost/Month |
|---------|------|------------|
| Railway | Developer | $5 + usage |
| Render | Starter | $7 + usage |
| Vercel | Hobby/Pro | $0 / $20 |
| Supabase | Free/Pro | $0 / $25 |
| Upstash | Free | $0 |
| Pinecone | Starter | $70 |
| OpenAI | Pay-as-go | Variable |
| **Total** | | **~$107-132/mo** |

**Note**: Free tiers available for testing. Upgrade as needed.

## Next Steps

After staging is deployed:

1. ✅ Test all features manually
2. ✅ Run E2E tests
3. ✅ Load test with ~10 concurrent users
4. ✅ Monitor for 24-48 hours
5. ✅ Fix any issues found
6. ✅ Document any environment-specific quirks
7. ✅ Plan production deployment

## Support

- Railway: https://help.railway.app
- Render: https://render.com/docs
- Vercel: https://vercel.com/support
- Supabase: https://supabase.com/docs
- Upstash: https://docs.upstash.com

---

**Last Updated**: 2025-10-28
**Status**: Ready for deployment
**Deployment Time**: ~15-30 minutes (first time)
