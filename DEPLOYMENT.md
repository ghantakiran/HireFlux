# HireFlux Deployment Guide

**Version**: 1.0
**Last Updated**: 2025-10-22

---

## Table of Contents

1. [Deployment Overview](#deployment-overview)
2. [Prerequisites](#prerequisites)
3. [Environment Setup](#environment-setup)
4. [Frontend Deployment](#frontend-deployment)
5. [Backend Deployment](#backend-deployment)
6. [Database Setup](#database-setup)
7. [Infrastructure as Code](#infrastructure-as-code)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Monitoring & Alerting](#monitoring--alerting)
10. [Rollback Procedures](#rollback-procedures)
11. [Security Checklist](#security-checklist)

---

## Deployment Overview

### Architecture Diagram

```
┌─────────────┐
│   Users     │
└──────┬──────┘
       │
       │ HTTPS
       ▼
┌──────────────────┐
│  CloudFront CDN  │  (or Vercel Edge)
└────────┬─────────┘
         │
    ┌────┴────┐
    │         │
    ▼         ▼
┌────────┐ ┌────────────┐
│Vercel  │ │    ALB     │
│(Next.js│ │ (FastAPI)  │
└────────┘ └──────┬─────┘
                  │
         ┌────────┴─────────┐
         │                  │
    ┌────▼────┐      ┌─────▼────┐
    │   ECS   │      │  Worker  │
    │(API)    │      │  (ECS)   │
    └────┬────┘      └─────┬────┘
         │                 │
         └────────┬────────┘
                  │
         ┌────────▼─────────┐
         │                  │
    ┌────▼────┐      ┌─────▼────┐
    │   RDS   │      │  Redis   │
    │(Postgres│      │ElastiCache
    └─────────┘      └──────────┘
```

### Deployment Environments

| Environment | Purpose | Auto-Deploy | URL |
|------------|---------|-------------|-----|
| **Development** | Local dev | No | localhost |
| **Staging** | Pre-prod testing | Yes (main branch) | staging.hireflux.com |
| **Production** | Live users | Manual approval | app.hireflux.com |

---

## Prerequisites

### Required Accounts
- [x] AWS Account (or GCP)
- [x] Vercel Account
- [x] Supabase Account
- [x] Pinecone Account
- [x] Stripe Account
- [x] OpenAI Account
- [x] Sentry Account
- [x] GitHub Account

### Required CLI Tools
```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install Vercel CLI
npm install -g vercel

# Install Docker
# Follow: https://docs.docker.com/get-docker/

# Install Terraform (optional)
brew install terraform  # macOS
```

---

## Environment Setup

### Production Environment Variables

#### Frontend (.env.production)
```bash
# API
NEXT_PUBLIC_API_URL=https://api.hireflux.com/api/v1

# App
NEXT_PUBLIC_APP_URL=https://app.hireflux.com

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your-key

# Analytics
NEXT_PUBLIC_POSTHOG_KEY=your-posthog-key
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com

# Sentry
NEXT_PUBLIC_SENTRY_DSN=https://your-sentry-dsn
```

#### Backend (.env.production)
```bash
# Environment
ENVIRONMENT=production
DEBUG=False

# Database
DATABASE_URL=postgresql://user:pass@prod-db.supabase.co:5432/hireflux

# Redis
REDIS_URL=redis://production-redis.cache.amazonaws.com:6379/0

# JWT
JWT_SECRET_KEY=your-production-secret-key-min-32-chars

# OpenAI
OPENAI_API_KEY=sk-your-production-key

# Pinecone
PINECONE_API_KEY=your-production-key
PINECONE_ENVIRONMENT=us-west1-gcp

# Stripe
STRIPE_SECRET_KEY=sk_live_your-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# AWS S3
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET=hireflux-production-uploads

# Email
RESEND_API_KEY=re_your-production-key

# Sentry
SENTRY_DSN=https://your-production-sentry-dsn

# CORS
CORS_ORIGINS=["https://app.hireflux.com"]
```

---

## Frontend Deployment

### Option 1: Vercel (Recommended)

#### Initial Setup
```bash
cd frontend
vercel login
vercel link  # Link to existing project or create new
```

#### Configure Environment Variables in Vercel
```bash
# Via CLI
vercel env add NEXT_PUBLIC_API_URL production
vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production

# Or via Vercel Dashboard:
# https://vercel.com/your-team/hireflux/settings/environment-variables
```

#### Deploy to Production
```bash
# Manual deployment
vercel --prod

# Or via Git integration (automatic)
# Push to main branch triggers production deployment
git push origin main
```

#### Custom Domain Setup
1. Go to Vercel Dashboard → Domains
2. Add custom domain: `app.hireflux.com`
3. Configure DNS:
   ```
   CNAME app.hireflux.com cname.vercel-dns.com
   ```
4. Vercel auto-provisions SSL certificate

### Option 2: AWS S3 + CloudFront

```bash
cd frontend

# Build
npm run build

# Upload to S3
aws s3 sync out/ s3://hireflux-frontend-prod --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id E1234567890ABC \
  --paths "/*"
```

---

## Backend Deployment

### Docker Image Build

#### Dockerfile
Create `backend/Dockerfile`:
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run application
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

#### Build and Push to ECR
```bash
cd backend

# Build image
docker build -t hireflux-api:latest .

# Tag image
docker tag hireflux-api:latest \
  123456789012.dkr.ecr.us-east-1.amazonaws.com/hireflux-api:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin \
  123456789012.dkr.ecr.us-east-1.amazonaws.com

# Push image
docker push 123456789012.dkr.ecr.us-east-1.amazonaws.com/hireflux-api:latest
```

### AWS ECS Deployment

#### Task Definition (JSON)
```json
{
  "family": "hireflux-api",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "1024",
  "memory": "2048",
  "containerDefinitions": [
    {
      "name": "api",
      "image": "123456789012.dkr.ecr.us-east-1.amazonaws.com/hireflux-api:latest",
      "portMappings": [
        {
          "containerPort": 8000,
          "protocol": "tcp"
        }
      ],
      "environment": [
        {
          "name": "ENVIRONMENT",
          "value": "production"
        }
      ],
      "secrets": [
        {
          "name": "DATABASE_URL",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:hireflux/database-url"
        },
        {
          "name": "OPENAI_API_KEY",
          "valueFrom": "arn:aws:secretsmanager:us-east-1:123456789012:secret:hireflux/openai-key"
        }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/hireflux-api",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      }
    }
  ]
}
```

#### Deploy Service
```bash
# Register task definition
aws ecs register-task-definition --cli-input-json file://task-definition.json

# Update service
aws ecs update-service \
  --cluster hireflux-production \
  --service hireflux-api \
  --task-definition hireflux-api:12 \
  --desired-count 2 \
  --force-new-deployment
```

### Worker Deployment (Separate ECS Service)

Similar to API deployment, but with different CMD:
```dockerfile
CMD ["rq", "worker", "--url", "$REDIS_URL"]
```

---

## Database Setup

### Supabase Production Setup

1. **Create Production Project**
   - Go to https://supabase.com
   - Create new project: `hireflux-production`
   - Select region: `us-east-1`
   - Strong password (save in secrets manager)

2. **Run Migrations**
   ```bash
   cd backend
   export DATABASE_URL="postgresql://user:pass@db.supabase.co:5432/postgres"
   alembic upgrade head
   ```

3. **Configure Connection Pooling**
   - Enable connection pooling in Supabase dashboard
   - Use connection pool URL for application
   - Transaction mode for API
   - Session mode for workers

4. **Enable Row Level Security (RLS)**
   ```sql
   -- Enable RLS on sensitive tables
   ALTER TABLE users ENABLE ROW LEVEL SECURITY;
   ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

   -- Create policies
   CREATE POLICY "Users can view own data" ON users
     FOR SELECT USING (auth.uid() = id);
   ```

5. **Configure Backups**
   - Daily automated backups (Supabase default)
   - Point-in-time recovery enabled
   - 7-day retention

### Redis Setup (AWS ElastiCache)

```bash
# Create ElastiCache cluster
aws elasticache create-cache-cluster \
  --cache-cluster-id hireflux-production-redis \
  --engine redis \
  --cache-node-type cache.t3.micro \
  --num-cache-nodes 1 \
  --engine-version 7.0 \
  --vpc-security-group-ids sg-1234567890abcdef0 \
  --preferred-availability-zone us-east-1a
```

---

## Infrastructure as Code

### Terraform Configuration

#### main.tf
```hcl
terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "hireflux-terraform-state"
    key    = "production/terraform.tfstate"
    region = "us-east-1"
  }
}

provider "aws" {
  region = "us-east-1"
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "hireflux-production"
}

# Application Load Balancer
resource "aws_lb" "api" {
  name               = "hireflux-api-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = var.public_subnet_ids
}

# Target Group
resource "aws_lb_target_group" "api" {
  name        = "hireflux-api-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = var.vpc_id
  target_type = "ip"

  health_check {
    path                = "/health"
    healthy_threshold   = 2
    unhealthy_threshold = 10
    timeout             = 30
    interval            = 60
  }
}

# ECS Service
resource "aws_ecs_service" "api" {
  name            = "hireflux-api"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.api.arn
  desired_count   = 2
  launch_type     = "FARGATE"

  network_configuration {
    subnets         = var.private_subnet_ids
    security_groups = [aws_security_group.ecs_tasks.id]
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = 8000
  }
}
```

#### Deploy Infrastructure
```bash
cd infrastructure
terraform init
terraform plan
terraform apply
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

#### .github/workflows/deploy-production.yml
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

env:
  AWS_REGION: us-east-1
  ECR_REPOSITORY: hireflux-api
  ECS_SERVICE: hireflux-api
  ECS_CLUSTER: hireflux-production

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Frontend Tests
        run: |
          cd frontend
          npm ci
          npm run lint
          npm run type-check
          npm test

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'

      - name: Backend Tests
        run: |
          cd backend
          pip install -r requirements.txt
          pytest

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
          working-directory: ./frontend

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: ${{ env.AWS_REGION }}

      - name: Login to Amazon ECR
        id: login-ecr
        uses: aws-actions/amazon-ecr-login@v1

      - name: Build and push Docker image
        env:
          ECR_REGISTRY: ${{ steps.login-ecr.outputs.registry }}
          IMAGE_TAG: ${{ github.sha }}
        run: |
          cd backend
          docker build -t $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG .
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG
          docker tag $ECR_REGISTRY/$ECR_REPOSITORY:$IMAGE_TAG \
            $ECR_REGISTRY/$ECR_REPOSITORY:latest
          docker push $ECR_REGISTRY/$ECR_REPOSITORY:latest

      - name: Update ECS service
        run: |
          aws ecs update-service \
            --cluster $ECS_CLUSTER \
            --service $ECS_SERVICE \
            --force-new-deployment
```

---

## Monitoring & Alerting

### Sentry Setup
```python
# backend/app/main.py
import sentry_sdk
from sentry_sdk.integrations.fastapi import FastApiIntegration

sentry_sdk.init(
    dsn=settings.SENTRY_DSN,
    environment=settings.ENVIRONMENT,
    traces_sample_rate=0.1,
    integrations=[FastApiIntegration()],
)
```

### CloudWatch Alarms
```bash
# High error rate
aws cloudwatch put-metric-alarm \
  --alarm-name hireflux-api-high-error-rate \
  --alarm-description "API error rate > 5%" \
  --metric-name 5XXError \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts

# High latency
aws cloudwatch put-metric-alarm \
  --alarm-name hireflux-api-high-latency \
  --metric-name TargetResponseTime \
  --namespace AWS/ApplicationELB \
  --statistic Average \
  --period 300 \
  --evaluation-periods 2 \
  --threshold 1.0 \
  --comparison-operator GreaterThanThreshold \
  --alarm-actions arn:aws:sns:us-east-1:123456789012:ops-alerts
```

---

## Rollback Procedures

### Frontend Rollback (Vercel)
```bash
# Via Vercel CLI
vercel rollback

# Or via Dashboard:
# Deployments → Select previous deployment → Promote to Production
```

### Backend Rollback (ECS)
```bash
# List task definitions
aws ecs list-task-definitions --family-prefix hireflux-api

# Rollback to previous version
aws ecs update-service \
  --cluster hireflux-production \
  --service hireflux-api \
  --task-definition hireflux-api:11  # Previous version
```

### Database Rollback
```bash
# Rollback migration
cd backend
alembic downgrade -1

# Or restore from backup (last resort)
# Contact Supabase support
```

---

## Security Checklist

### Pre-Deployment Security Review

- [ ] All secrets stored in AWS Secrets Manager (not in code)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] CORS configured for production domain only
- [ ] Rate limiting enabled on all public endpoints
- [ ] SQL injection protection (parameterized queries)
- [ ] XSS protection (input sanitization)
- [ ] CSRF protection enabled
- [ ] Security headers configured (CSP, HSTS, X-Frame-Options)
- [ ] PII encrypted at rest and in transit
- [ ] Database backups enabled and tested
- [ ] Sentry error tracking configured
- [ ] CloudWatch logging enabled
- [ ] IAM roles follow least-privilege principle
- [ ] Security groups allow minimal necessary access
- [ ] VPC configured with private subnets for backend
- [ ] SSH disabled on production instances
- [ ] Dependency vulnerability scan passed (Snyk, npm audit)

---

## Post-Deployment Verification

### Smoke Tests
```bash
# Health check
curl https://api.hireflux.com/health

# API root
curl https://api.hireflux.com/api/v1/

# Frontend
curl https://app.hireflux.com
```

### Monitoring Dashboard
- Check CloudWatch metrics (CPU, memory, requests)
- Verify Sentry error rate
- Monitor database connections
- Check Redis cache hit rate

---

**Deployment Status**: Ready for Production
**Last Deployed**: TBD
**Next Review**: 2025-11-01
