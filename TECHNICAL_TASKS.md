# HireFlux Technical Tasks Breakdown

**Version**: 1.0
**Last Updated**: 2025-10-22
**Purpose**: Detailed technical task breakdown for development team

---

## Task Breakdown by Epic

---

## Epic 1: Foundation & Infrastructure

### US-001: Project Setup & Infrastructure (8 points)

#### Frontend Tasks
- [ ] **TASK-001.1**: Initialize Next.js 14+ project with App Router (2h)
  - Use `create-next-app` with TypeScript template
  - Configure `next.config.js` for environment variables
  - Set up folder structure: `/app`, `/components`, `/lib`, `/types`

- [ ] **TASK-001.2**: Install and configure Tailwind CSS (1h)
  - Install tailwind dependencies
  - Configure `tailwind.config.js`
  - Set up custom theme (colors, fonts)
  - Create base CSS file

- [ ] **TASK-001.3**: Set up environment variables (1h)
  - Create `.env.local`, `.env.production`
  - Document all required env vars in `.env.example`
  - Configure env var validation (e.g., Zod)

- [ ] **TASK-001.4**: Configure ESLint and Prettier (1h)
  - Install ESLint, Prettier
  - Configure `.eslintrc.json`, `.prettierrc`
  - Add pre-commit hooks (Husky)
  - Add scripts to `package.json`

#### Backend Tasks
- [ ] **TASK-001.5**: Initialize FastAPI project with Python 3.11+ (2h)
  - Create virtual environment
  - Install FastAPI, Uvicorn, Pydantic
  - Set up folder structure: `/app`, `/models`, `/routes`, `/services`, `/utils`
  - Create `main.py` with basic app setup

- [ ] **TASK-001.6**: Configure environment management (1h)
  - Install `python-dotenv`
  - Create `.env`, `.env.example`
  - Create `config.py` for centralized config

- [ ] **TASK-001.7**: Set up async workers (Celery/RQ) (3h)
  - Choose between Celery vs RQ (recommend RQ for simplicity)
  - Install dependencies
  - Configure Redis connection
  - Create worker setup and example task
  - Add worker start script

#### DevOps Tasks
- [ ] **TASK-001.8**: Docker Compose setup (optional) (3h)
  - Create `Dockerfile` for frontend
  - Create `Dockerfile` for backend
  - Create `docker-compose.yml` (frontend, backend, postgres, redis)
  - Document local dev setup

- [ ] **TASK-001.9**: GitHub Actions CI/CD pipeline (4h)
  - Create `.github/workflows/ci.yml`
  - Add job: Install dependencies
  - Add job: Run linters
  - Add job: Run tests
  - Add job: Build frontend/backend
  - Configure on PR and main branch push

#### Database Tasks
- [ ] **TASK-001.10**: Provision Supabase project (1h)
  - Create Supabase account and project
  - Note database connection string, API keys
  - Configure row-level security (RLS) policies (basic)

- [ ] **TASK-001.11**: Set up Redis instance (1h)
  - Provision Redis (local or Upstash/Railway)
  - Test connection from backend
  - Document connection string

**Total Estimated Hours**: ~20h (8 points ✓)

---

### US-002: Authentication System (8 points)

#### Backend Tasks
- [ ] **TASK-002.1**: Set up Supabase Auth client (2h)
  - Install Supabase SDK
  - Configure Supabase client in backend
  - Set up JWT verification middleware

- [ ] **TASK-002.2**: Implement OAuth providers (Google, LinkedIn) (4h)
  - Configure Google OAuth in Supabase dashboard
  - Configure LinkedIn OAuth in Supabase dashboard
  - Test OAuth flow (redirect URLs, callbacks)

- [ ] **TASK-002.3**: Implement email/password authentication (3h)
  - Create signup endpoint
  - Create login endpoint
  - Hash passwords (bcrypt)
  - Generate JWT tokens

- [ ] **TASK-002.4**: Implement password reset flow (3h)
  - Create "forgot password" endpoint
  - Send reset email (integrate with email service)
  - Create "reset password" endpoint with token validation

- [ ] **TASK-002.5**: Implement email verification (2h)
  - Send verification email on signup
  - Create email verification endpoint
  - Update user status in database

#### Frontend Tasks
- [ ] **TASK-002.6**: Create login/signup UI (4h)
  - Login page with email/password form
  - Signup page with email/password form
  - OAuth buttons (Google, LinkedIn)
  - Form validation (client-side)

- [ ] **TASK-002.7**: Implement auth context/provider (3h)
  - Create React Context for auth state
  - Store user session (JWT in httpOnly cookie or localStorage)
  - Implement login, logout, signup actions
  - Handle token refresh

- [ ] **TASK-002.8**: Implement protected routes (2h)
  - Create HOC or middleware for route protection
  - Redirect unauthenticated users to login
  - Store intended destination for post-login redirect

**Total Estimated Hours**: ~23h (8 points ✓)

---

### US-003: Database Schema v1 (8 points)

#### Backend Tasks
- [ ] **TASK-003.1**: Set up migration tool (Alembic for Python) (2h)
  - Install Alembic
  - Initialize Alembic (`alembic init`)
  - Configure `alembic.ini` and `env.py`
  - Create initial migration script

- [ ] **TASK-003.2**: Create `users` and `profiles` tables (2h)
  ```sql
  CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    oauth_provider VARCHAR(50),
    oauth_id VARCHAR(255),
    email_verified BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    phone VARCHAR(20),
    location VARCHAR(255),
    target_titles TEXT[], -- Array of job titles
    salary_min INTEGER,
    salary_max INTEGER,
    industries TEXT[],
    skills TEXT[],
    preferences JSONB, -- Remote, visa, etc.
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **TASK-003.3**: Create `resumes` and `resume_versions` tables (2h)
  ```sql
  CREATE TABLE resumes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    original_file_url TEXT,
    parsed_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE resume_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resume_id UUID REFERENCES resumes(id) ON DELETE CASCADE,
    version_name VARCHAR(255),
    content JSONB, -- Structured resume content
    tone VARCHAR(50), -- 'formal', 'concise', 'conversational'
    target_title VARCHAR(255),
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **TASK-003.4**: Create `cover_letters` table (1h)
  ```sql
  CREATE TABLE cover_letters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    resume_version_id UUID REFERENCES resume_versions(id),
    job_id UUID REFERENCES jobs(id),
    content TEXT,
    tone VARCHAR(50),
    length VARCHAR(50), -- 'short', 'medium', 'long'
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **TASK-003.5**: Create `jobs`, `job_sources`, `match_scores` tables (3h)
  ```sql
  CREATE TABLE job_sources (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255), -- 'Greenhouse', 'Lever'
    api_url TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    last_sync_at TIMESTAMP
  );

  CREATE TABLE jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_id UUID REFERENCES job_sources(id),
    external_id VARCHAR(255), -- ID from job board
    title VARCHAR(255),
    company VARCHAR(255),
    description TEXT,
    location VARCHAR(255),
    remote_policy VARCHAR(50), -- 'remote', 'hybrid', 'onsite'
    salary_min INTEGER,
    salary_max INTEGER,
    visa_friendly BOOLEAN,
    posted_at TIMESTAMP,
    expires_at TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(source_id, external_id)
  );

  CREATE TABLE match_scores (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
    fit_index INTEGER, -- 0-100
    rationale TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user_id, job_id)
  );
  ```

- [ ] **TASK-003.6**: Create `applications` table (2h)
  ```sql
  CREATE TABLE applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES jobs(id),
    resume_version_id UUID REFERENCES resume_versions(id),
    cover_letter_id UUID REFERENCES cover_letters(id),
    status VARCHAR(50), -- 'saved', 'applied', 'interview', 'offer', 'rejected'
    applied_at TIMESTAMP,
    notes TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **TASK-003.7**: Create `credit_wallets`, `credit_ledger`, `subscriptions` tables (3h)
  ```sql
  CREATE TABLE credit_wallets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
    balance INTEGER DEFAULT 0,
    updated_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE credit_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    amount INTEGER, -- Positive for credit, negative for debit
    transaction_type VARCHAR(50), -- 'purchase', 'apply', 'refund'
    reason TEXT,
    application_id UUID REFERENCES applications(id),
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    stripe_subscription_id VARCHAR(255) UNIQUE,
    plan VARCHAR(50), -- 'free', 'plus', 'pro'
    status VARCHAR(50), -- 'active', 'canceled', 'past_due'
    current_period_start TIMESTAMP,
    current_period_end TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **TASK-003.8**: Create `events_audit` table and `interview_sessions` table (2h)
  ```sql
  CREATE TABLE events_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    event_type VARCHAR(100),
    event_data JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
  );

  CREATE TABLE interview_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role VARCHAR(255),
    questions JSONB, -- Array of questions asked
    answers JSONB, -- Array of user answers
    feedback JSONB, -- Array of AI feedback
    overall_score DECIMAL(3,1),
    created_at TIMESTAMP DEFAULT NOW()
  );
  ```

- [ ] **TASK-003.9**: Add indexes for performance (2h)
  ```sql
  CREATE INDEX idx_users_email ON users(email);
  CREATE INDEX idx_profiles_user_id ON profiles(user_id);
  CREATE INDEX idx_resumes_user_id ON resumes(user_id);
  CREATE INDEX idx_resume_versions_user_id ON resume_versions(user_id);
  CREATE INDEX idx_cover_letters_user_id ON cover_letters(user_id);
  CREATE INDEX idx_jobs_title ON jobs(title);
  CREATE INDEX idx_jobs_company ON jobs(company);
  CREATE INDEX idx_jobs_is_active ON jobs(is_active);
  CREATE INDEX idx_match_scores_user_id ON match_scores(user_id);
  CREATE INDEX idx_applications_user_id ON applications(user_id);
  CREATE INDEX idx_applications_status ON applications(status);
  CREATE INDEX idx_credit_ledger_user_id ON credit_ledger(user_id);
  ```

- [ ] **TASK-003.10**: Run migrations and verify schema (1h)
  - Run `alembic upgrade head`
  - Verify all tables created
  - Test foreign key constraints
  - Document schema in README

**Total Estimated Hours**: ~20h (8 points ✓)

---

### US-004: Observability & Monitoring Setup (5 points)

#### Backend Tasks
- [ ] **TASK-004.1**: Integrate Sentry for error tracking (2h)
  - Create Sentry account and project
  - Install Sentry SDK (Python, JavaScript)
  - Configure Sentry DSN
  - Test error capture

- [ ] **TASK-004.2**: Set up OpenTelemetry tracing (3h)
  - Install OpenTelemetry SDK
  - Configure tracer for FastAPI
  - Add request ID middleware
  - Export traces to backend (Jaeger or cloud)

- [ ] **TASK-004.3**: Implement structured logging (2h)
  - Configure Python logging (JSON format)
  - Add request ID to all logs
  - Log levels: DEBUG, INFO, WARNING, ERROR
  - Configure log rotation

- [ ] **TASK-004.4**: LLM token cost logging (2h)
  - Create logging decorator for OpenAI calls
  - Log: timestamp, user_id, model, prompt_tokens, completion_tokens, cost
  - Store in database or analytics platform

- [ ] **TASK-004.5**: Performance metrics tracking (3h)
  - Instrument p95 latency for API endpoints
  - Track database query times
  - Track external API call times (OpenAI, Stripe, etc.)
  - Create basic dashboard (Grafana or similar)

**Total Estimated Hours**: ~12h (5 points ✓)

---

## Epic 2: Onboarding & User Profile

### US-005: User Onboarding Flow (5 points)

#### Frontend Tasks
- [ ] **TASK-005.1**: Create welcome/landing page (2h)
  - Hero section with value proposition
  - CTA: "Get Started"
  - Redirect authenticated users to dashboard

- [ ] **TASK-005.2**: Create multi-step onboarding wizard (6h)
  - Step 1: Target job titles (multi-select autocomplete)
  - Step 2: Salary expectations (range slider)
  - Step 3: Industries (multi-select checkboxes)
  - Step 4: Locations + remote preference (multi-select + toggle)
  - Step 5: Skills (autocomplete tags)
  - Progress indicator (1/5, 2/5, etc.)
  - Next/Back/Skip buttons
  - Form validation

- [ ] **TASK-005.3**: Implement onboarding state management (2h)
  - Store partial onboarding data in state
  - Allow users to skip and complete later
  - Mark onboarding as complete in database

- [ ] **TASK-005.4**: Create onboarding API endpoints (2h)
  - POST `/api/onboarding` - Save partial or complete data
  - GET `/api/onboarding/status` - Check if user completed onboarding
  - Update `profiles` table

**Total Estimated Hours**: ~12h (5 points ✓)

---

### US-006: Resume Upload & Parsing (8 points)

#### Frontend Tasks
- [ ] **TASK-006.1**: Create file upload component (3h)
  - Drag-and-drop zone
  - File type validation (PDF, DOCX)
  - File size validation (max 5MB)
  - Upload progress indicator
  - Error handling

- [ ] **TASK-006.2**: Display parsed resume data for review (3h)
  - Show extracted fields: name, email, phone, experience, education, skills
  - Editable form fields
  - Save/Cancel buttons

#### Backend Tasks
- [ ] **TASK-006.3**: Implement file upload endpoint (2h)
  - POST `/api/resumes/upload`
  - Validate file type and size
  - Upload to S3/Supabase Storage
  - Return file URL

- [ ] **TASK-006.4**: Integrate resume parsing library (6h)
  - Evaluate libraries: pyresparser, ResumeParser, custom solution
  - Install and configure chosen library
  - Extract: name, email, phone, experience, education, skills
  - Handle parsing errors (return partial data or empty)

- [ ] **TASK-006.5**: Store parsed resume in database (2h)
  - Save to `resumes` table
  - Store parsed data as JSONB
  - Link to user

- [ ] **TASK-006.6**: Manual fallback for failed parsing (2h)
  - Allow user to manually enter data if parsing fails
  - Provide helpful error message

**Total Estimated Hours**: ~18h (8 points ✓)

---

## Epic 3: AI Resume Builder

### US-008: OpenAI Integration (5 points)

#### Backend Tasks
- [ ] **TASK-008.1**: Install and configure OpenAI SDK (1h)
  - Install `openai` package
  - Configure API key in environment
  - Test basic completion

- [ ] **TASK-008.2**: Implement rate limiting (2h)
  - Use Redis for rate limit tracking
  - Limit: e.g., 100 requests/hour per user
  - Return 429 error with retry-after header

- [ ] **TASK-008.3**: Implement retry logic with exponential backoff (3h)
  - Catch OpenAI errors: timeout, rate limit, API error
  - Retry up to 3 times with exponential backoff
  - Log failures

- [ ] **TASK-008.4**: Token usage tracking and cost calculation (2h)
  - Log prompt_tokens, completion_tokens for each request
  - Calculate cost based on model pricing
  - Store in database or analytics

- [ ] **TASK-008.5**: Create prompt template management system (3h)
  - Store prompts in database or config files
  - Version control for prompts
  - Support variables in templates (e.g., `{target_title}`, `{skills}`)
  - Load prompt by name and version

**Total Estimated Hours**: ~11h (5 points ✓)

---

### US-009: AI Resume Generation (8 points)

#### Frontend Tasks
- [ ] **TASK-009.1**: Create resume generation form (3h)
  - Input: Target job title (required)
  - Tone selection: radio buttons (formal, concise, conversational)
  - Generate button
  - Loading spinner with "Generating..." message

- [ ] **TASK-009.2**: Display generated resume preview (3h)
  - Show generated content in formatted view
  - Edit mode (contentEditable or textarea)
  - Save button
  - Regenerate button

#### Backend Tasks
- [ ] **TASK-009.3**: Create resume generation prompt (4h)
  - Research ATS optimization best practices
  - Write prompt template for resume generation
  - Include: user profile, skills, experience, target title, tone
  - Test and iterate on prompt quality

- [ ] **TASK-009.4**: Implement resume generation endpoint (4h)
  - POST `/api/resumes/generate`
  - Input: user_id, target_title, tone
  - Fetch user profile and parsed resume
  - Call OpenAI API with prompt
  - Parse and structure response
  - Return generated resume content

- [ ] **TASK-009.5**: Optimize generation performance (<6s p95) (3h)
  - Use GPT-4 Turbo for faster response
  - Compress prompts (remove unnecessary tokens)
  - Measure and log generation time
  - Set OpenAI timeout to 10s

- [ ] **TASK-009.6**: Save generated resume as version (2h)
  - POST `/api/resume-versions`
  - Save to `resume_versions` table
  - Link to resume and user

**Total Estimated Hours**: ~19h (8 points ✓)

---

## Epic 4: Cover Letter Generator

### US-012: Cover Letter Generation (8 points)

#### Frontend Tasks
- [ ] **TASK-012.1**: Create cover letter generation form (4h)
  - Input: Job description (textarea or URL)
  - Select resume version (dropdown)
  - Tone selection (formal, concise, conversational)
  - Length selection (short, medium, long)
  - Company personalization toggle
  - Generate button

- [ ] **TASK-012.2**: Display generated cover letter (2h)
  - Show in formatted view
  - Edit mode
  - Save button

#### Backend Tasks
- [ ] **TASK-012.3**: Create cover letter generation prompt (5h)
  - Research successful cover letter patterns
  - Write prompt template with hallucination guardrails
  - Include: job description, resume, tone, length, company personalization
  - Inject quantified achievements from resume
  - Test and iterate

- [ ] **TASK-012.4**: Implement cover letter generation endpoint (4h)
  - POST `/api/cover-letters/generate`
  - Input: job_description, resume_version_id, tone, length, personalize
  - Fetch resume version
  - Call OpenAI API
  - Return generated cover letter

- [ ] **TASK-012.5**: Implement job description URL parsing (optional) (3h)
  - If user provides URL, fetch job description
  - Parse HTML, extract text
  - Fallback: manual paste

**Total Estimated Hours**: ~18h (8 points ✓)

---

## Epic 5: Job Match Engine

### US-014: Pinecone Vector DB Setup (5 points)

#### Backend Tasks
- [ ] **TASK-014.1**: Create Pinecone account and index (1h)
  - Sign up for Pinecone
  - Create index for job embeddings (dimension: 1536 for OpenAI)
  - Create index for user skill embeddings
  - Note API key and environment

- [ ] **TASK-014.2**: Install and configure Pinecone SDK (1h)
  - Install `pinecone-client`
  - Configure API key
  - Test connection

- [ ] **TASK-014.3**: Implement embedding generation service (3h)
  - Function: `generate_embedding(text: str) -> List[float]`
  - Use OpenAI embeddings API (`text-embedding-ada-002`)
  - Cache embeddings to reduce cost

- [ ] **TASK-014.4**: Implement upsert and search operations (3h)
  - Upsert job embeddings to Pinecone
  - Search similar jobs by user profile embedding
  - Support metadata filtering (location, remote, salary)

- [ ] **TASK-014.5**: Optimize for batch operations (2h)
  - Batch upsert jobs (e.g., 100 at a time)
  - Batch embedding generation

**Total Estimated Hours**: ~10h (5 points ✓)

---

### US-015: Job Feed Integration (8 points)

#### Backend Tasks
- [ ] **TASK-015.1**: Integrate Greenhouse API (4h)
  - Research Greenhouse API docs
  - Implement job fetching endpoint
  - Parse job data: title, description, location, salary, etc.
  - Handle pagination

- [ ] **TASK-015.2**: Integrate Lever API (4h)
  - Research Lever API docs
  - Implement job fetching endpoint
  - Parse job data
  - Handle pagination

- [ ] **TASK-015.3**: Create ETL pipeline for job ingestion (6h)
  - Background worker: `sync_jobs_task(source_id)`
  - Fetch jobs from API
  - Normalize data structure
  - Deduplicate jobs (by external_id)
  - Upsert to `jobs` table
  - Generate and upsert embeddings to Pinecone

- [ ] **TASK-015.4**: Schedule periodic job refresh (2h)
  - Use Celery Beat or cron for daily sync
  - Mark expired jobs as inactive

- [ ] **TASK-015.5**: Error handling and logging (2h)
  - Handle API errors (timeout, rate limit, auth)
  - Retry failed jobs
  - Log sync status to `job_sources` table

**Total Estimated Hours**: ~18h (8 points ✓)

---

### US-017: Job Matching Algorithm (8 points)

#### Backend Tasks
- [ ] **TASK-017.1**: Implement embedding similarity scoring (3h)
  - Generate user profile embedding (combine skills, titles, preferences)
  - Query Pinecone for similar jobs
  - Normalize similarity score to 0-100

- [ ] **TASK-017.2**: Implement keyword overlap scoring (3h)
  - Extract keywords from job title/description
  - Compare with user skills and target titles
  - Calculate overlap percentage

- [ ] **TASK-017.3**: Implement recency scoring (2h)
  - Weight recent jobs higher
  - Decay score for older jobs (e.g., >30 days)

- [ ] **TASK-017.4**: Implement seniority alignment scoring (3h)
  - Infer seniority from job title (junior, mid, senior, staff, etc.)
  - Compare with user target titles
  - Penalize mismatches

- [ ] **TASK-017.5**: Combine scores into Fit Index (3h)
  - Weighted average: embedding (50%), keywords (20%), recency (15%), seniority (15%)
  - Normalize to 0-100
  - Store in `match_scores` table

- [ ] **TASK-017.6**: Generate "why this matches" rationale (3h)
  - Use LLM to generate 1-2 sentence explanation
  - Include top matched skills, seniority alignment, location match

- [ ] **TASK-017.7**: Create matching endpoint (2h)
  - GET `/api/jobs/matches?user_id={id}&limit=50`
  - Return jobs with Fit Index >60 (configurable threshold)
  - Pagination

**Total Estimated Hours**: ~19h (8 points ✓)

---

## Epic 6: Apply Assist System

### US-021: Apply Assist - Pre-fill Application (8 points)

#### Frontend Tasks
- [ ] **TASK-021.1**: Create Apply Assist modal/page (4h)
  - Triggered from job details page
  - Display job title, company
  - Show pre-filled form fields
  - Resume version selector
  - Cover letter selector
  - Confirm and Submit button

- [ ] **TASK-021.2**: Handle form submission (2h)
  - POST to application API
  - Show success/error message
  - Redirect to application tracking

#### Backend Tasks
- [ ] **TASK-021.3**: Detect application form fields (4h)
  - Research Greenhouse/Lever external form structure
  - Parse form HTML, extract field names
  - Map fields to user profile (name, email, phone, etc.)

- [ ] **TASK-021.4**: Implement pre-fill logic (3h)
  - Populate form fields with user data
  - Attach resume file
  - Include cover letter text

- [ ] **TASK-021.5**: Submit application via API (4h)
  - POST to job board API (if available)
  - Or: return pre-filled data for manual submission
  - Handle errors (job no longer available, API error)

- [ ] **TASK-021.6**: Track application in database (2h)
  - POST `/api/applications`
  - Save to `applications` table
  - Status: 'applied'
  - Link resume version, cover letter, job

**Total Estimated Hours**: ~19h (8 points ✓)

---

## Epic 7: Stripe Billing & Credits

### US-023: Stripe Integration (5 points)

#### Backend Tasks
- [ ] **TASK-023.1**: Set up Stripe account (1h)
  - Create Stripe account
  - Enable test mode and live mode
  - Note API keys (secret, publishable)

- [ ] **TASK-023.2**: Install Stripe SDK (1h)
  - Install `stripe` package (Python, JavaScript)
  - Configure API keys

- [ ] **TASK-023.3**: Create webhook endpoint (4h)
  - POST `/api/webhooks/stripe`
  - Verify webhook signature
  - Handle events: `checkout.session.completed`, `invoice.paid`, `customer.subscription.deleted`, etc.
  - Update database based on event

- [ ] **TASK-023.4**: Test webhook locally (2h)
  - Use Stripe CLI to forward webhooks
  - Test each event type

- [ ] **TASK-023.5**: Error handling for failed payments (2h)
  - Handle `invoice.payment_failed`
  - Notify user
  - Downgrade plan if necessary

**Total Estimated Hours**: ~10h (5 points ✓)

---

### US-024: Subscription Plans - Free & Plus (8 points)

#### Frontend Tasks
- [ ] **TASK-024.1**: Create pricing page (4h)
  - Display Free and Plus plans side-by-side
  - Feature comparison table
  - CTA buttons: "Start Free" / "Subscribe to Plus"

- [ ] **TASK-024.2**: Implement Stripe Checkout (3h)
  - Redirect to Stripe Checkout on "Subscribe"
  - Pass user ID and plan in metadata
  - Success/cancel URLs

- [ ] **TASK-024.3**: Display subscription status in dashboard (2h)
  - Show current plan
  - Upgrade/Cancel buttons
  - Next billing date

#### Backend Tasks
- [ ] **TASK-024.4**: Create Stripe products and prices (1h)
  - Create product: "HireFlux Plus"
  - Create price: $19/month recurring
  - Note price ID

- [ ] **TASK-024.5**: Implement subscription creation endpoint (3h)
  - POST `/api/subscriptions/create-checkout`
  - Create Stripe Checkout Session
  - Return session URL

- [ ] **TASK-024.6**: Handle subscription webhook events (3h)
  - On `checkout.session.completed`: create subscription in database
  - On `customer.subscription.updated`: update subscription status
  - On `customer.subscription.deleted`: mark as canceled

- [ ] **TASK-024.7**: Implement feature gating (3h)
  - Middleware: check user plan before allowing access
  - Free: limit cover letters to 3/month, job suggestions to 10/month
  - Plus: unlimited
  - Return 403 if limit exceeded

- [ ] **TASK-024.8**: Implement cancellation flow (2h)
  - POST `/api/subscriptions/cancel`
  - Cancel Stripe subscription
  - Update database

**Total Estimated Hours**: ~21h (8 points ✓)

---

## Testing Tasks (Ongoing)

### US-048: Testing Infrastructure (5 points)

- [ ] **TASK-048.1**: Set up Jest + React Testing Library (2h)
- [ ] **TASK-048.2**: Set up Pytest (2h)
- [ ] **TASK-048.3**: Set up Playwright for E2E (3h)
- [ ] **TASK-048.4**: Configure test database (2h)
- [ ] **TASK-048.5**: Add code coverage reporting (2h)

**Total Estimated Hours**: ~11h (5 points ✓)

---

## Summary

This document provides a detailed breakdown of technical tasks for each user story. Each task includes:
- **Task ID** for tracking
- **Estimated hours** for planning
- **Technical details** (code snippets, SQL, APIs, etc.)
- **Dependencies** and sequencing

**Usage**:
1. Assign tasks to developers during sprint planning
2. Track progress in project management tool (Jira, Linear, etc.)
3. Update estimates based on actual time spent
4. Use for velocity calibration

**Total MVP Effort Estimate**: ~250-300 hours across 7-person team over 8 weeks
