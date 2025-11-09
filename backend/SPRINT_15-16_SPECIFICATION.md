# Sprint 15-16: Advanced Analytics & Reporting

**Sprint Duration**: Weeks 29-32 (4 weeks)
**Team Velocity**: ~400 LOC/day, 8 tests/day
**Methodology**: TDD (Test-Driven Development) + BDD (Behavior-Driven Development)

## 📋 Sprint Overview

Build comprehensive employer analytics dashboard with 5 key metric categories:
1. **Sourcing Metrics** - Application sources, quality distribution
2. **Pipeline Metrics** - Stage conversion rates, drop-off analysis
3. **Time Metrics** - Time to hire, time to offer, time to shortlist
4. **Quality Metrics** - Fit Index, interview show-up, offer acceptance
5. **Cost Metrics** - Cost per application, cost per hire, ROI

**Success Criteria**:
- ✅ All analytics APIs return in <500ms for 90 days of data
- ✅ Dashboard updates in real-time as applications progress
- ✅ 100% test coverage for analytics service
- ✅ E2E tests with Playwright for all chart interactions

---

## 🎯 User Stories

### US-15.1: Sourcing Metrics Dashboard
**As a** hiring manager
**I want to** see where our applications are coming from
**So that** I can optimize our recruitment channels

**Acceptance Criteria**:
- [ ] View application count per source (auto-apply, manual, referral, job board)
- [ ] See average Fit Index per source
- [ ] Compare source conversion rates (application → hire)
- [ ] Filter by date range (7d, 30d, 90d, custom)

### US-15.2: Pipeline Funnel Visualization
**As a** hiring manager
**I want to** see conversion rates between pipeline stages
**So that** I can identify bottlenecks in our hiring process

**Acceptance Criteria**:
- [ ] Visualize funnel with 8 stages (new → hired/rejected)
- [ ] Show conversion rate between each stage
- [ ] Display average days in each stage
- [ ] Highlight stages with >30% drop-off rate

### US-15.3: Time-to-Hire Analytics
**As a** company owner
**I want to** track time-to-hire metrics
**So that** I can optimize hiring speed

**Acceptance Criteria**:
- [ ] Display average time to first application (job post → first app)
- [ ] Show average time to shortlist (app → phone_screen status)
- [ ] Track average time to offer (app → offer status)
- [ ] Calculate overall time to hire (app → hired status)
- [ ] Compare against industry benchmarks (30 days target)

### US-15.4: Quality of Hire Metrics
**As a** hiring manager
**I want to** measure candidate quality
**So that** I can validate our AI ranking effectiveness

**Acceptance Criteria**:
- [ ] Display average Fit Index for all applications
- [ ] Track interview show-up rate (scheduled → completed)
- [ ] Measure offer acceptance rate (offer → hired)
- [ ] Show 6-month retention rate (hired candidates still employed)

### US-15.5: Cost Per Hire Tracking
**As a** company owner
**I want to** understand recruitment costs
**So that** I can optimize our hiring budget

**Acceptance Criteria**:
- [ ] Calculate cost per application (subscription cost / total apps)
- [ ] Display cost per hire (total cost / successful hires)
- [ ] Show ROI per job posting
- [ ] Compare costs by source channel

---

## 🗄️ Database Schema Design

### New Tables

#### 1. `analytics_snapshots` (Materialized views cache)
```sql
CREATE TABLE analytics_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    snapshot_date DATE NOT NULL,
    metric_type VARCHAR(50) NOT NULL, -- 'sourcing', 'pipeline', 'time', 'quality', 'cost'

    -- Aggregated metrics (JSONB for flexibility)
    metrics JSONB NOT NULL,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, snapshot_date, metric_type)
);

CREATE INDEX idx_analytics_snapshots_company_date ON analytics_snapshots(company_id, snapshot_date);
CREATE INDEX idx_analytics_snapshots_metric_type ON analytics_snapshots(metric_type);
```

**Example metrics JSONB**:
```json
{
  "sourcing": {
    "auto_apply": { "count": 150, "avg_fit": 78, "hires": 12 },
    "manual": { "count": 45, "avg_fit": 82, "hires": 8 },
    "referral": { "count": 20, "avg_fit": 88, "hires": 5 }
  },
  "pipeline": {
    "new": 215,
    "reviewing": 120,
    "phone_screen": 60,
    "technical_interview": 30,
    "final_interview": 15,
    "offer": 10,
    "hired": 8,
    "rejected": 180
  }
}
```

#### 2. `application_stage_history` (Audit trail for time metrics)
```sql
CREATE TABLE application_stage_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES applications(id) ON DELETE CASCADE,

    -- Stage transition
    from_stage VARCHAR(50),
    to_stage VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES company_members(id) ON DELETE SET NULL,

    -- Timestamps
    changed_at TIMESTAMP DEFAULT NOW(),

    -- Metadata
    notes TEXT,
    automated BOOLEAN DEFAULT FALSE -- True if changed by system (e.g., auto-reject)
);

CREATE INDEX idx_stage_history_application ON application_stage_history(application_id);
CREATE INDEX idx_stage_history_changed_at ON application_stage_history(changed_at);
```

#### 3. `company_analytics_config` (Settings for analytics)
```sql
CREATE TABLE company_analytics_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,

    -- Benchmark targets
    target_time_to_hire_days INT DEFAULT 30,
    target_cost_per_hire_usd DECIMAL(10, 2),

    -- Snapshot schedule
    snapshot_frequency VARCHAR(20) DEFAULT 'daily', -- 'hourly', 'daily', 'weekly'

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

### Schema Additions to Existing Tables

#### `applications` table enhancements
```sql
ALTER TABLE applications ADD COLUMN IF NOT EXISTS source VARCHAR(50); -- 'auto_apply', 'manual', 'referral', 'job_board'
ALTER TABLE applications ADD COLUMN IF NOT EXISTS cost_attribution DECIMAL(10, 2); -- Portion of subscription cost attributed to this application
```

#### `interview_schedules` table enhancements
```sql
ALTER TABLE interview_schedules ADD COLUMN IF NOT EXISTS candidate_showed_up BOOLEAN; -- Track no-shows
```

---

## 🧪 TDD Test Plan

### Test Coverage Target: 100%

#### Unit Tests: `tests/unit/test_analytics_service.py` (200+ lines)

**Test Suite 1: Sourcing Metrics**
```python
def test_calculate_sourcing_metrics_by_source():
    """Test sourcing metrics grouped by application source"""
    # Given: 10 auto-apply apps (avg fit 75), 5 manual (avg fit 82)
    # When: calculate_sourcing_metrics(company_id, date_range)
    # Then: Returns correct counts, avg_fit, conversion rates

def test_sourcing_metrics_empty_data():
    """Test graceful handling when no applications exist"""
    # Given: Company with no applications
    # When: calculate_sourcing_metrics()
    # Then: Returns empty dict, does not raise exception

def test_sourcing_metrics_date_filtering():
    """Test date range filtering works correctly"""
    # Given: Apps from Jan 1 - Mar 31
    # When: Filter by Feb 1 - Feb 28
    # Then: Only Feb apps included in metrics
```

**Test Suite 2: Pipeline Metrics**
```python
def test_calculate_pipeline_funnel():
    """Test pipeline stage distribution calculation"""
    # Given: 100 apps (40 new, 30 reviewing, 20 phone_screen, 10 hired)
    # When: calculate_pipeline_funnel(job_id)
    # Then: Returns stage counts and conversion rates

def test_pipeline_drop_off_rates():
    """Test drop-off rate calculation between stages"""
    # Given: 100 apps enter reviewing, 30 move to phone_screen (70% drop)
    # When: calculate_drop_off_rates()
    # Then: Highlights 70% drop-off at reviewing stage

def test_pipeline_avg_days_in_stage():
    """Test average time spent in each stage"""
    # Given: application_stage_history with stage transitions
    # When: calculate_avg_days_per_stage()
    # Then: Returns avg days for each stage
```

**Test Suite 3: Time Metrics**
```python
def test_time_to_first_application():
    """Test time from job posted to first application"""
    # Given: Job posted Jan 1, first app Jan 3 (2 days)
    # When: calculate_time_to_first_application(job_id)
    # Then: Returns 2 days

def test_time_to_hire():
    """Test time from application to hired status"""
    # Given: App submitted Jan 1, hired Jan 30 (29 days)
    # When: calculate_time_to_hire(application_id)
    # Then: Returns 29 days

def test_time_to_offer():
    """Test time from application to offer extended"""
    # Given: App Jan 1, offer Jan 20 (19 days)
    # When: calculate_time_to_offer(application_id)
    # Then: Returns 19 days

def test_avg_time_to_hire_company_wide():
    """Test company-wide average time to hire"""
    # Given: 5 hires with times [20, 25, 30, 35, 40] days
    # When: calculate_avg_time_to_hire(company_id)
    # Then: Returns 30 days average
```

**Test Suite 4: Quality Metrics**
```python
def test_calculate_avg_fit_index():
    """Test average Fit Index calculation"""
    # Given: 10 apps with fit_index [70, 75, 80, 85, 90, 60, 95, 88, 78, 82]
    # When: calculate_avg_fit_index(job_id)
    # Then: Returns 80.3

def test_interview_show_up_rate():
    """Test interview attendance tracking"""
    # Given: 20 interviews scheduled, 18 showed up (90%)
    # When: calculate_interview_show_up_rate(company_id)
    # Then: Returns 0.90

def test_offer_acceptance_rate():
    """Test offer acceptance calculation"""
    # Given: 10 offers extended, 8 accepted (80%)
    # When: calculate_offer_acceptance_rate(company_id)
    # Then: Returns 0.80

def test_six_month_retention_rate():
    """Test 6-month retention for hired candidates"""
    # Given: 10 hired 6+ months ago, 8 still active
    # When: calculate_retention_rate(company_id, months=6)
    # Then: Returns 0.80
```

**Test Suite 5: Cost Metrics**
```python
def test_calculate_cost_per_application():
    """Test cost attribution per application"""
    # Given: $99/month plan, 100 apps in month
    # When: calculate_cost_per_application(company_id, month)
    # Then: Returns $0.99 per app

def test_calculate_cost_per_hire():
    """Test cost per successful hire"""
    # Given: $99 spent, 5 hires
    # When: calculate_cost_per_hire(company_id, month)
    # Then: Returns $19.80 per hire

def test_roi_per_job_posting():
    """Test ROI calculation for job postings"""
    # Given: Job cost $10, 1 hire saving $5000 (50x ROI)
    # When: calculate_roi(job_id)
    # Then: Returns 50.0
```

#### Integration Tests: `tests/integration/test_analytics_api.py` (150+ lines)

```python
def test_get_analytics_overview(client, auth_headers, test_company_with_applications):
    """Test GET /api/v1/companies/{id}/analytics/overview"""
    # Given: Company with 100 applications, 10 hires, 30 day avg time to hire
    # When: GET /analytics/overview?startDate=2025-01-01&endDate=2025-03-31
    # Then: Returns 200, correct metrics

def test_get_pipeline_funnel(client, auth_headers):
    """Test GET /api/v1/companies/{id}/analytics/funnel"""
    # Then: Returns funnel stages with counts and conversion rates

def test_get_sourcing_analytics(client, auth_headers):
    """Test GET /api/v1/companies/{id}/analytics/sources"""
    # Then: Returns source breakdown with performance metrics

def test_analytics_unauthorized_access(client):
    """Test analytics requires company membership"""
    # When: Request analytics without auth
    # Then: Returns 401 Unauthorized

def test_analytics_wrong_company_access(client, auth_headers, other_company):
    """Test cannot access other company's analytics"""
    # When: Request analytics for different company
    # Then: Returns 403 Forbidden
```

---

## 🔧 Backend Implementation Plan

### Phase 1: Database Schema (Day 1)
- [ ] Create Alembic migration for `analytics_snapshots` table
- [ ] Create migration for `application_stage_history` table
- [ ] Create migration for `company_analytics_config` table
- [ ] Add columns to `applications` (source, cost_attribution)
- [ ] Add column to `interview_schedules` (candidate_showed_up)

### Phase 2: Analytics Service (Days 2-5, TDD)
**File**: `backend/app/services/analytics_service.py` (~800 lines)

```python
class AnalyticsService:
    """Comprehensive analytics service for employer metrics"""

    def __init__(self, db: Session):
        self.db = db

    # Sourcing Metrics
    def calculate_sourcing_metrics(
        self, company_id: UUID, start_date: date, end_date: date
    ) -> Dict[str, Any]:
        """Calculate application sources, quality, conversion rates"""
        pass

    # Pipeline Metrics
    def calculate_pipeline_funnel(
        self, company_id: UUID, job_id: Optional[UUID] = None
    ) -> List[Dict[str, Any]]:
        """Calculate pipeline stage distribution and conversion rates"""
        pass

    def calculate_drop_off_rates(
        self, company_id: UUID, job_id: Optional[UUID] = None
    ) -> Dict[str, float]:
        """Identify stages with high drop-off rates"""
        pass

    # Time Metrics
    def calculate_time_to_first_application(self, job_id: UUID) -> Optional[int]:
        """Days from job posted to first application"""
        pass

    def calculate_time_to_hire(self, application_id: UUID) -> Optional[int]:
        """Days from application to hired status"""
        pass

    def calculate_avg_time_to_hire(
        self, company_id: UUID, start_date: date, end_date: date
    ) -> Optional[float]:
        """Average time to hire across all hires"""
        pass

    # Quality Metrics
    def calculate_avg_fit_index(
        self, company_id: UUID, job_id: Optional[UUID] = None
    ) -> Optional[float]:
        """Average Fit Index for applications"""
        pass

    def calculate_interview_show_up_rate(self, company_id: UUID) -> float:
        """Percentage of scheduled interviews attended"""
        pass

    def calculate_offer_acceptance_rate(self, company_id: UUID) -> float:
        """Percentage of offers accepted"""
        pass

    # Cost Metrics
    def calculate_cost_per_application(
        self, company_id: UUID, start_date: date, end_date: date
    ) -> Optional[float]:
        """Subscription cost divided by total applications"""
        pass

    def calculate_cost_per_hire(
        self, company_id: UUID, start_date: date, end_date: date
    ) -> Optional[float]:
        """Total cost divided by successful hires"""
        pass

    # Snapshot Management
    def generate_daily_snapshot(self, company_id: UUID, snapshot_date: date):
        """Generate and cache analytics snapshot"""
        pass

    def get_cached_metrics(
        self, company_id: UUID, metric_type: str, date_range: Tuple[date, date]
    ) -> Optional[Dict[str, Any]]:
        """Retrieve cached analytics snapshots"""
        pass
```

### Phase 3: API Endpoints (Days 6-7)
**File**: `backend/app/api/v1/endpoints/analytics.py` (~300 lines)

```python
router = APIRouter()

@router.get("/companies/{company_id}/analytics/overview")
def get_analytics_overview(
    company_id: UUID,
    start_date: date = Query(...),
    end_date: date = Query(...),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db)
):
    """Get comprehensive analytics overview"""
    pass

@router.get("/companies/{company_id}/analytics/funnel")
def get_pipeline_funnel(
    company_id: UUID,
    job_id: Optional[UUID] = None,
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db)
):
    """Get pipeline funnel visualization data"""
    pass

@router.get("/companies/{company_id}/analytics/sources")
def get_sourcing_analytics(
    company_id: UUID,
    start_date: date = Query(...),
    end_date: date = Query(...),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db)
):
    """Get application source performance"""
    pass

@router.get("/companies/{company_id}/analytics/time-metrics")
def get_time_metrics(
    company_id: UUID,
    start_date: date = Query(...),
    end_date: date = Query(...),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db)
):
    """Get time-to-hire and related metrics"""
    pass

@router.get("/companies/{company_id}/analytics/quality")
def get_quality_metrics(
    company_id: UUID,
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db)
):
    """Get quality of hire metrics"""
    pass

@router.get("/companies/{company_id}/analytics/costs")
def get_cost_metrics(
    company_id: UUID,
    start_date: date = Query(...),
    end_date: date = Query(...),
    company_member: CompanyMember = Depends(get_user_company_member),
    db: Session = Depends(get_db)
):
    """Get cost per application and cost per hire"""
    pass
```

### Phase 4: Background Jobs (Day 8)
**File**: `backend/app/tasks/analytics_tasks.py` (~150 lines)

```python
@celery_app.task
def generate_daily_analytics_snapshots():
    """Cron job: Generate analytics snapshots for all companies (runs at 1 AM UTC)"""
    pass

@celery_app.task
def backfill_application_stage_history():
    """One-time: Backfill stage history from application status updates"""
    pass
```

---

## 🎨 Frontend Implementation Plan

### Phase 5: Analytics Dashboard UI (Days 9-12)

#### Component Structure
```
frontend/app/employer/analytics/
├── page.tsx                          # Main analytics dashboard
├── components/
│   ├── AnalyticsOverview.tsx         # Summary cards
│   ├── SourcingMetricsCard.tsx       # Application sources
│   ├── PipelineFunnelChart.tsx       # Funnel visualization (Recharts)
│   ├── TimeToHireChart.tsx           # Line/bar chart for time metrics
│   ├── QualityMetricsGrid.tsx        # Quality indicators
│   ├── CostMetricsCard.tsx           # Cost tracking
│   ├── DateRangePicker.tsx           # Date filter
│   └── ExportReportButton.tsx        # PDF/CSV export
```

#### Key Features
- **Real-time updates**: WebSocket connection for live pipeline changes
- **Interactive charts**: Click funnel stage to drill down
- **Date filtering**: 7d, 30d, 90d, custom range
- **Export**: PDF reports, CSV data export
- **Responsive**: Mobile-optimized charts

---

## 🧪 E2E Testing with Playwright

### Test File: `frontend/tests/e2e/25-employer-analytics.spec.ts` (~300 lines)

```typescript
import { test, expect } from '@playwright/test';

test.describe('Employer Analytics Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as employer (Growth plan with analytics access)
    await page.goto('/login');
    await page.fill('[name="email"]', 'employer@company.com');
    await page.fill('[name="password"]', 'testpass');
    await page.click('button[type="submit"]');
    await page.waitForURL('/employer/dashboard');

    // Navigate to analytics
    await page.click('nav >> text=Analytics');
    await page.waitForURL('/employer/analytics');
  });

  test('should display analytics overview metrics', async ({ page }) => {
    // Assert: Overview cards visible
    await expect(page.locator('[data-testid="total-applications"]')).toBeVisible();
    await expect(page.locator('[data-testid="total-hires"]')).toBeVisible();
    await expect(page.locator('[data-testid="avg-time-to-hire"]')).toBeVisible();
    await expect(page.locator('[data-testid="cost-per-hire"]')).toBeVisible();
  });

  test('should render pipeline funnel chart', async ({ page }) => {
    const funnel = page.locator('[data-testid="pipeline-funnel-chart"]');
    await expect(funnel).toBeVisible();

    // Assert: All 8 stages present
    for (const stage of ['New', 'Reviewing', 'Phone Screen', 'Technical', 'Final', 'Offer', 'Hired', 'Rejected']) {
      await expect(funnel.locator(`text=${stage}`)).toBeVisible();
    }
  });

  test('should filter by date range', async ({ page }) => {
    // Click date range picker
    await page.click('[data-testid="date-range-picker"]');

    // Select "Last 30 days"
    await page.click('text=Last 30 days');

    // Assert: URL updated with date params
    await expect(page).toHaveURL(/startDate=.*&endDate=.*/);

    // Assert: Charts reload with filtered data
    await page.waitForResponse(resp => resp.url().includes('/api/v1/companies') && resp.status() === 200);
  });

  test('should drill down into funnel stage', async ({ page }) => {
    // Click "Phone Screen" stage in funnel
    await page.click('[data-testid="funnel-stage-phone_screen"]');

    // Assert: Modal opens with stage details
    const modal = page.locator('[data-testid="stage-details-modal"]');
    await expect(modal).toBeVisible();
    await expect(modal.locator('text=Phone Screen')).toBeVisible();

    // Assert: Shows applications in this stage
    await expect(modal.locator('[data-testid="applications-list"]')).toBeVisible();
  });

  test('should display sourcing metrics breakdown', async ({ page }) => {
    const sourcingCard = page.locator('[data-testid="sourcing-metrics-card"]');
    await expect(sourcingCard).toBeVisible();

    // Assert: Sources listed with metrics
    await expect(sourcingCard.locator('text=Auto-Apply')).toBeVisible();
    await expect(sourcingCard.locator('text=Manual')).toBeVisible();
    await expect(sourcingCard.locator('text=Referral')).toBeVisible();
  });

  test('should export analytics report as PDF', async ({ page }) => {
    // Click export button
    await page.click('[data-testid="export-report-button"]');

    // Select PDF format
    await page.click('text=PDF Report');

    // Assert: Download triggered
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('[data-testid="confirm-export"]')
    ]);

    expect(download.suggestedFilename()).toMatch(/analytics-report-.*\.pdf/);
  });

  test('should handle empty state gracefully', async ({ page }) => {
    // Navigate to analytics for new company with no data
    await page.goto('/employer/analytics?companyId=new-company-id');

    // Assert: Empty state message
    await expect(page.locator('text=No analytics data yet')).toBeVisible();
    await expect(page.locator('text=Post your first job to start tracking metrics')).toBeVisible();
  });

  test('should restrict analytics access for Starter plan', async ({ page }) => {
    // Login as Starter plan employer
    await page.goto('/login');
    await page.fill('[name="email"]', 'starter@company.com');
    await page.fill('[name="password"]', 'testpass');
    await page.click('button[type="submit"]');

    // Navigate to analytics
    await page.goto('/employer/analytics');

    // Assert: Upgrade prompt displayed
    await expect(page.locator('text=Upgrade to Growth plan')).toBeVisible();
    await expect(page.locator('[data-testid="pipeline-funnel-chart"]')).not.toBeVisible();
  });
});
```

---

## 📊 Performance Requirements

- **API Response Times**:
  - Overview: <300ms (p95)
  - Funnel: <200ms (p95)
  - Time series: <500ms (p95)

- **Database Optimization**:
  - Use materialized views for 90+ day queries
  - Cache daily snapshots
  - Indexed queries on company_id + date ranges

- **Frontend Performance**:
  - Initial page load: <1.5s (LCP)
  - Chart render: <300ms
  - Date filter change: <500ms

---

## 🚀 Deployment Plan

### Day 13: Testing & QA
- [ ] Run full test suite (unit + integration + E2E)
- [ ] Load testing with 100 concurrent users
- [ ] Verify analytics accuracy with manual calculations

### Day 14: Staging Deployment
- [ ] Deploy to Vercel staging environment
- [ ] Run E2E tests against staging
- [ ] Seed staging DB with realistic data

### Day 15: Production Rollout
- [ ] Feature flag: Enable for Growth/Professional plans only
- [ ] Monitor error rates and API latency
- [ ] Gradual rollout: 10% → 50% → 100%

---

## 📝 Documentation Updates

- [ ] Update IMPLEMENTATION_PROGRESS.md with Sprint 15-16 completion
- [ ] Update ARCHITECTURE_ANALYSIS.md analytics architecture section
- [ ] Create API documentation with OpenAPI spec
- [ ] Write analytics user guide for employers

---

## ✅ Definition of Done

- [ ] All unit tests passing (100% coverage)
- [ ] All integration tests passing
- [ ] All E2E tests passing with Playwright
- [ ] Code reviewed and approved
- [ ] API documentation updated
- [ ] Frontend responsive on mobile/tablet/desktop
- [ ] Performance benchmarks met (<500ms API response)
- [ ] Deployed to production with feature flag
- [ ] User guide published
- [ ] Sprint retrospective completed

---

**Estimated Effort**: 15 developer-days
**Lines of Code**: ~2,500 LOC (800 service + 300 API + 600 frontend + 300 tests + 500 E2E)
**Test Coverage**: 100%
**Deployment Target**: Week 32 (End of Sprint 15-16)
