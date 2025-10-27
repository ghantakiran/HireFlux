# Team Coordination - Sprint Week 1
## Parallel Work Streams

**Sprint Duration**: November 4-10, 2025 (Week 1 of Phase 2)
**Goal**: Complete foundational infrastructure for MVP
**Methodology**: TDD, Parallel Execution, Daily Sync

---

## 🎨 Frontend Team - Authentication & Infrastructure

### **Lead**: Frontend Engineer
### **Priority**: CRITICAL 🔴
### **Estimated Effort**: 40 hours (1 week)

### Objectives
1. Implement complete authentication flow (sign up, sign in, JWT, OAuth)
2. Set up Zustand state management architecture
3. Create authenticated dashboard layout with navigation
4. Integrate with backend auth API endpoints

### Task Breakdown

#### Task 1.1: Authentication Pages (8 hours)
**File**: `frontend/app/(auth)/signin/page.tsx`

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Link from 'next/link';

export default function SignInPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Sign In to HireFlux</CardTitle>
          <CardDescription>Enter your credentials to access your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <Link href="/signup" className="text-sm text-blue-600 hover:underline">
              Don't have an account? Sign up
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

**Acceptance Criteria**:
- ✅ Form validates email and password
- ✅ Shows loading state during authentication
- ✅ Displays error messages
- ✅ Redirects to dashboard on success
- ✅ Link to sign up page

#### Task 1.2: Zustand Auth Store (4 hours)
**File**: `frontend/lib/stores/useAuthStore.ts`

```typescript
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authApi } from '@/lib/api';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  plan: string;
}

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  refreshAccessToken: () => Promise<void>;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        try {
          const response = await authApi.login({ email, password });
          const { user, access_token, refresh_token } = response.data.data;

          set({
            user,
            accessToken: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Store tokens in localStorage for API client
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      register: async (data: any) => {
        set({ isLoading: true });
        try {
          const response = await authApi.register(data);
          const { user, access_token, refresh_token } = response.data.data;

          set({
            user,
            accessToken: access_token,
            refreshToken: refresh_token,
            isAuthenticated: true,
            isLoading: false,
          });

          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', refresh_token);
        } catch (error) {
          set({ isLoading: false });
          throw error;
        }
      },

      logout: () => {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },

      refreshAccessToken: async () => {
        const refreshToken = get().refreshToken;
        if (!refreshToken) throw new Error('No refresh token');

        try {
          const response = await authApi.refreshToken(refreshToken);
          const { access_token } = response.data.data;

          set({ accessToken: access_token });
          localStorage.setItem('access_token', access_token);
        } catch (error) {
          get().logout();
          throw error;
        }
      },

      setUser: (user: User) => set({ user }),
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
```

**Acceptance Criteria**:
- ✅ Login/register/logout functionality
- ✅ Token management (access + refresh)
- ✅ Persists to localStorage
- ✅ Automatic token refresh
- ✅ Type-safe with TypeScript

#### Task 1.3: Protected Route HOC (3 hours)
**File**: `frontend/components/auth/ProtectedRoute.tsx`

```typescript
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/useAuthStore';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/signin');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
```

#### Task 1.4: Dashboard Layout (12 hours)
**File**: `frontend/app/dashboard/layout.tsx`

```typescript
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  ClipboardList,
  MessageSquare,
  Bell,
  Settings,
  LogOut,
  CreditCard,
} from 'lucide-react';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Resumes', href: '/dashboard/resumes', icon: FileText },
  { name: 'Jobs', href: '/dashboard/jobs', icon: Briefcase },
  { name: 'Applications', href: '/dashboard/applications', icon: ClipboardList },
  { name: 'Cover Letters', href: '/dashboard/cover-letters', icon: MessageSquare },
  { name: 'Interview Buddy', href: '/dashboard/interview-buddy', icon: MessageSquare },
  { name: 'Notifications', href: '/dashboard/notifications', icon: Bell },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <div className="fixed inset-y-0 left-0 w-64 bg-white border-r border-gray-200">
          <div className="flex flex-col h-full">
            {/* Logo */}
            <div className="flex items-center h-16 px-6 border-b border-gray-200">
              <h1 className="text-xl font-bold text-blue-600">HireFlux</h1>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 py-6 space-y-1">
              {navigation.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}
            </nav>

            {/* User Profile */}
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-3 px-4 py-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold">
                  {user?.first_name?.[0]}{user?.last_name?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">
                    {user?.first_name} {user?.last_name}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                </div>
              </div>
              <div className="mt-2 space-y-1">
                <Link
                  href="/dashboard/settings"
                  className="flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-lg"
                >
                  <Settings className="w-4 h-4" />
                  <span>Settings</span>
                </Link>
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="ml-64">
          {/* Top Bar */}
          <header className="bg-white border-b border-gray-200">
            <div className="flex items-center justify-between h-16 px-8">
              <div className="flex items-center gap-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  {navigation.find((item) => item.href === pathname)?.name || 'Dashboard'}
                </h2>
              </div>
              <div className="flex items-center gap-4">
                {/* Credit Balance */}
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-lg">
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">50 Credits</span>
                </div>
                {/* Notification Bell */}
                <button className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg relative">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="p-8">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
```

**Acceptance Criteria**:
- ✅ Sidebar with navigation
- ✅ Active state highlighting
- ✅ User profile section with logout
- ✅ Credit balance widget
- ✅ Notification bell
- ✅ Responsive layout
- ✅ Protected by authentication

#### Task 1.5: useAuth Hook (3 hours)
**File**: `frontend/lib/hooks/useAuth.ts`

```typescript
import { useAuthStore } from '../stores/useAuthStore';

export function useAuth() {
  const { user, isAuthenticated, isLoading, login, register, logout } = useAuthStore();

  return {
    user,
    isAuthenticated,
    isLoading,
    login,
    register,
    logout,
  };
}
```

#### Task 1.6: Sign Up Page (6 hours)
**File**: `frontend/app/(auth)/signup/page.tsx`
- Similar structure to Sign In
- Multi-step form (email/password → profile info)
- Email verification flow
- Terms acceptance checkbox

#### Task 1.7: OAuth Integration (4 hours)
**Files**:
- `frontend/app/api/auth/google/callback/route.ts`
- `frontend/app/api/auth/linkedin/callback/route.ts`
- OAuth buttons on sign in/up pages

### Testing Requirements
- ✅ Unit tests for auth store
- ✅ Integration tests for API calls
- ✅ E2E tests for login/signup flows

### Dependencies
- `zustand` - State management
- `@radix-ui/react-*` - UI primitives
- `lucide-react` - Icons
- `react-hook-form` - Form handling
- `zod` - Validation

### Installation
```bash
npm install zustand react-hook-form zod lucide-react
```

### Acceptance Criteria
- ✅ Users can sign up with email/password
- ✅ Users can log in with email/password
- ✅ OAuth (Google/LinkedIn) works
- ✅ JWT tokens stored securely
- ✅ Automatic token refresh
- ✅ Protected routes redirect to login
- ✅ Dashboard layout fully functional
- ✅ Navigation highlights active page
- ✅ User can log out
- ✅ All tests passing

---

## 🔧 Backend Team - Test Fixes & Optimization

### **Lead**: Backend Engineer
### **Priority**: CRITICAL 🔴
### **Estimated Effort**: 32 hours (1 week)

### Objectives
1. Fix analytics test mocks (12/38 tests failing)
2. Add integration tests for analytics endpoints
3. Optimize database queries
4. Document APIs with OpenAPI

### Task Breakdown

#### Task 2.1: Fix Analytics Test Mocks (8 hours)

**Issue**: Tests failing due to missing `updated_at` and `created_at` attributes in mocks

**File**: `backend/tests/unit/test_analytics_service.py`

**Fix Required**:
```python
@pytest.fixture
def sample_applications():
    """Sample applications for testing"""
    now = datetime.utcnow()
    return [
        Mock(
            id=uuid.uuid4(),
            status="applied",
            applied_at=now - timedelta(days=1),
            updated_at=now - timedelta(days=1),  # ADD THIS
            created_at=now - timedelta(days=2),
        ),
        Mock(
            id=uuid.uuid4(),
            status="in_review",
            applied_at=now - timedelta(days=5),
            updated_at=now - timedelta(days=4),  # ADD THIS
            created_at=now - timedelta(days=6),
        ),
        # ... fix all 6 mocks
    ]
```

**Activity Timeline Fixture Fix**:
```python
@pytest.fixture
def sample_activity_events():
    """Sample activity events for testing"""
    now = datetime.utcnow()
    return [
        Mock(
            id=uuid.uuid4(),
            event_type="application_submitted",  # Use actual enum value
            timestamp=now - timedelta(hours=1),
            metadata={"job_title": "Software Engineer", "company": "Tech Corp"},
        ),
        Mock(
            id=uuid.uuid4(),
            event_type="resume_updated",  # Use actual enum value
            timestamp=now - timedelta(hours=5),
            metadata={"resume_title": "Software Engineer Resume"},
        ),
        # Add more events
    ]
```

**Run Tests**:
```bash
pytest tests/unit/test_analytics_service.py -v
```

**Acceptance Criteria**:
- ✅ All 38 analytics tests passing
- ✅ No mock-related errors
- ✅ Tests use proper datetime objects
- ✅ Tests use proper enum values

#### Task 2.2: Integration Tests for Analytics (12 hours)

**File**: `backend/tests/integration/test_analytics_endpoints.py`

```python
"""Integration tests for Analytics API endpoints"""
import pytest
from fastapi.testclient import TestClient
from datetime import datetime, timedelta

from app.main import app
from app.db.session import get_db
from tests.conftest import override_get_db, create_test_user, create_test_application


@pytest.fixture
def client(test_db):
    """Test client with database override"""
    app.dependency_overrides[get_db] = lambda: test_db
    client = TestClient(app)
    yield client
    app.dependency_overrides.clear()


@pytest.fixture
def auth_headers(client, test_db):
    """Authenticated user headers"""
    user = create_test_user(test_db)
    # Login and get token
    response = client.post(
        "/api/v1/auth/login",
        json={"email": user.email, "password": "password123"},
    )
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


class TestDashboardEndpoints:
    """Test dashboard analytics endpoints"""

    def test_get_dashboard_overview(self, client, auth_headers, test_db):
        """Should return dashboard overview"""
        # Create test data
        user_id = auth_headers["user_id"]  # Extract from token
        create_test_application(test_db, user_id, status="applied")
        create_test_application(test_db, user_id, status="in_review")

        response = client.get("/api/v1/analytics/dashboard", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()["data"]
        assert "health_score" in data
        assert "pipeline_stats" in data
        assert data["pipeline_stats"]["total_applications"] == 2

    def test_get_pipeline_stats(self, client, auth_headers, test_db):
        """Should return pipeline statistics"""
        response = client.get(
            "/api/v1/analytics/pipeline/stats?time_range=last_30_days",
            headers=auth_headers,
        )

        assert response.status_code == 200
        data = response.json()["data"]
        assert "total_applications" in data
        assert "response_rate" in data
        assert "interview_rate" in data

    def test_get_health_score(self, client, auth_headers):
        """Should return health score"""
        response = client.get("/api/v1/analytics/health-score", headers=auth_headers)

        assert response.status_code == 200
        data = response.json()["data"]
        assert 0 <= data["overall_score"] <= 100
        assert data["level"] in ["excellent", "good", "fair", "needs_improvement"]
        assert "recommendations" in data

    def test_unauthorized_access(self, client):
        """Should return 401 without auth"""
        response = client.get("/api/v1/analytics/dashboard")
        assert response.status_code == 401
```

**Run Tests**:
```bash
pytest tests/integration/test_analytics_endpoints.py -v
```

**Acceptance Criteria**:
- ✅ Tests for all 16 analytics endpoints
- ✅ Tests with actual database
- ✅ Tests authentication
- ✅ Tests authorization
- ✅ Tests query parameters
- ✅ Tests error cases

#### Task 2.3: Database Query Optimization (8 hours)

**File**: `backend/app/services/analytics_service.py`

**Optimizations**:

1. **Add indexes** (in new migration):
```python
# backend/alembic/versions/add_analytics_indexes.py
def upgrade():
    op.create_index('idx_applications_user_created', 'applications', ['user_id', 'created_at'])
    op.create_index('idx_applications_user_status', 'applications', ['user_id', 'status'])
    op.create_index('idx_applications_user_applied', 'applications', ['user_id', 'applied_at'])
```

2. **Optimize queries with joins**:
```python
# Instead of multiple queries
applications = db.query(Application).filter(Application.user_id == user_id).all()
jobs = [db.query(Job).filter(Job.id == app.job_id).first() for app in applications]

# Use single query with join
applications = (
    db.query(Application)
    .join(Job)
    .filter(Application.user_id == user_id)
    .options(joinedload(Application.job))
    .all()
)
```

3. **Add select_related** for eager loading
4. **Implement query result caching** (Redis)

**Acceptance Criteria**:
- ✅ Dashboard loads < 500ms
- ✅ No N+1 queries
- ✅ Proper indexes added
- ✅ Query plans analyzed

#### Task 2.4: OpenAPI Documentation (4 hours)

**File**: `backend/app/main.py`

```python
from fastapi import FastAPI
from fastapi.openapi.utils import get_openapi

app = FastAPI(
    title="HireFlux API",
    description="AI-powered Job Application Copilot API",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
)

def custom_openapi():
    if app.openapi_schema:
        return app.openapi_schema

    openapi_schema = get_openapi(
        title="HireFlux API",
        version="1.0.0",
        description="""
        ## HireFlux API Documentation

        AI-powered Job Application Copilot with the following features:

        * **Authentication** - JWT-based auth with OAuth support
        * **Resume Management** - AI-powered resume generation and optimization
        * **Job Matching** - Semantic search with Fit Index
        * **Applications** - Application tracking and auto-apply
        * **Analytics** - Dashboard metrics and insights
        * **Billing** - Stripe integration for subscriptions

        ## Authentication

        Most endpoints require authentication. Include the JWT token in the Authorization header:

        ```
        Authorization: Bearer <your_jwt_token>
        ```
        """,
        routes=app.routes,
    )

    # Add security scheme
    openapi_schema["components"]["securitySchemes"] = {
        "BearerAuth": {
            "type": "http",
            "scheme": "bearer",
            "bearerFormat": "JWT",
        }
    }

    app.openapi_schema = openapi_schema
    return app.openapi_schema

app.openapi = custom_openapi
```

**Generate OpenAPI JSON**:
```bash
python -c "from app.main import app; import json; print(json.dumps(app.openapi(), indent=2))" > openapi.json
```

**Acceptance Criteria**:
- ✅ OpenAPI schema complete
- ✅ All endpoints documented
- ✅ Request/response schemas defined
- ✅ Authentication documented
- ✅ Examples provided
- ✅ Swagger UI accessible at `/api/docs`

### Testing Requirements
- ✅ All unit tests passing (38/38)
- ✅ Integration tests added (16+ tests)
- ✅ Query performance benchmarked

### Acceptance Criteria
- ✅ All analytics tests passing
- ✅ Integration tests cover all endpoints
- ✅ Database queries optimized
- ✅ API documentation complete
- ✅ No performance regressions

---

## 🚀 DevOps Team - CI/CD & Infrastructure

### **Lead**: DevOps Engineer
### **Priority**: HIGH 🟡
### **Estimated Effort**: 32 hours (1 week)

### Objectives
1. Set up GitHub Actions CI/CD pipeline
2. Create staging environment (Vercel + Supabase)
3. Migrate development to PostgreSQL
4. Document deployment process

### Task Breakdown

#### Task 3.1: GitHub Actions CI/CD (10 hours)

**File**: `.github/workflows/ci.yml`

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  PYTHON_VERSION: '3.11'
  NODE_VERSION: '18'

jobs:
  backend-tests:
    name: Backend Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: hireflux_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Set up Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'

      - name: Install dependencies
        working-directory: ./backend
        run: |
          python -m pip install --upgrade pip
          pip install -r requirements.txt

      - name: Run migrations
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/hireflux_test
        run: |
          alembic upgrade head

      - name: Run unit tests
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/hireflux_test
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY_TEST }}
        run: |
          pytest tests/unit/ -v --cov=app --cov-report=xml

      - name: Run integration tests
        working-directory: ./backend
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/hireflux_test
        run: |
          pytest tests/integration/ -v

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          file: ./backend/coverage.xml

  frontend-tests:
    name: Frontend Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: ./frontend/package-lock.json

      - name: Install dependencies
        working-directory: ./frontend
        run: npm ci

      - name: Run linter
        working-directory: ./frontend
        run: npm run lint

      - name: Run type check
        working-directory: ./frontend
        run: npm run type-check

      - name: Run unit tests
        working-directory: ./frontend
        run: npm test -- --coverage

      - name: Build
        working-directory: ./frontend
        run: npm run build

  e2e-tests:
    name: E2E Tests
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]

    steps:
      - uses: actions/checkout@v3

      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}

      - name: Install Playwright
        working-directory: ./frontend
        run: |
          npm ci
          npx playwright install --with-deps

      - name: Run E2E tests
        working-directory: ./frontend
        env:
          NEXT_PUBLIC_API_URL: http://localhost:8000/api/v1
        run: npx playwright test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests, e2e-tests]
    if: github.ref == 'refs/heads/develop'

    steps:
      - uses: actions/checkout@v3

      - name: Deploy frontend to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
          vercel-args: '--prod'
```

**File**: `.github/workflows/deploy-production.yml`

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Deploy frontend
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          working-directory: ./frontend
          vercel-args: '--prod'

      - name: Deploy backend
        # Add your backend deployment step (AWS, GCP, etc.)
        run: echo "Deploy backend to production"
```

**Acceptance Criteria**:
- ✅ CI runs on every PR
- ✅ All tests must pass to merge
- ✅ Code coverage tracked
- ✅ Automatic deployment to staging
- ✅ Manual approval for production

#### Task 3.2: Staging Environment Setup (12 hours)

**Vercel Setup**:
1. Create Vercel project
2. Connect GitHub repository
3. Configure environment variables
4. Set up preview deployments

**Supabase Setup**:
1. Create Supabase project (staging)
2. Configure PostgreSQL database
3. Set up authentication
4. Configure storage buckets
5. Add API keys to Vercel

**Environment Variables** (Vercel):
```env
NEXT_PUBLIC_API_URL=https://api-staging.hireflux.com
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=xxx
```

**Environment Variables** (Backend):
```env
DATABASE_URL=postgresql://postgres:xxx@db.xxx.supabase.co:5432/postgres
OPENAI_API_KEY=sk-xxx
STRIPE_SECRET_KEY=sk_test_xxx
PINECONE_API_KEY=xxx
REDIS_URL=redis://xxx
```

**Acceptance Criteria**:
- ✅ Staging environment accessible
- ✅ Database migrations applied
- ✅ Frontend deployed to Vercel
- ✅ Backend deployed (container/serverless)
- ✅ Environment variables configured
- ✅ HTTPS enabled
- ✅ Monitoring enabled

#### Task 3.3: PostgreSQL Migration for Dev (6 hours)

**Install PostgreSQL** (Mac):
```bash
brew install postgresql@15
brew services start postgresql@15
```

**Create Database**:
```bash
createdb hireflux_dev
```

**Update .env**:
```env
DATABASE_URL=postgresql://localhost:5432/hireflux_dev
```

**Migrate from SQLite**:
```bash
# Export SQLite data
sqlite3 hireflux.db .dump > data.sql

# Import to PostgreSQL (manual SQL conversion may be needed)
psql hireflux_dev < data.sql
```

**Run Migrations**:
```bash
alembic upgrade head
```

**Docker Compose** (alternative):
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: hireflux_dev
      POSTGRES_USER: hireflux
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Acceptance Criteria**:
- ✅ PostgreSQL running locally
- ✅ All migrations applied
- ✅ Dev data migrated
- ✅ Backend connects to PostgreSQL
- ✅ Tests pass with PostgreSQL
- ✅ Docker Compose setup documented

#### Task 3.4: Deployment Documentation (4 hours)

**File**: `DEPLOYMENT.md`

```markdown
# Deployment Guide

## Architecture

- **Frontend**: Vercel (Next.js)
- **Backend**: AWS ECS/Fargate (FastAPI)
- **Database**: Supabase PostgreSQL
- **Cache**: Redis Cloud
- **Storage**: Supabase Storage
- **CDN**: Vercel Edge Network

## Environments

### Development
- Local PostgreSQL
- Local Redis (optional)
- Mock external services

### Staging
- URL: https://staging.hireflux.com
- Deploys: Automatic on `develop` branch
- Database: Supabase staging
- Test mode for Stripe

### Production
- URL: https://hireflux.com
- Deploys: Manual approval required
- Database: Supabase production
- Live mode for Stripe

## Deployment Process

### Frontend (Vercel)
1. Push to `develop` → automatic staging deployment
2. Push to `main` → automatic production deployment
3. Preview deployments for all PRs

### Backend (AWS ECS)
1. Build Docker image
2. Push to ECR
3. Update ECS task definition
4. Deploy with rolling update

## Environment Variables

[List all required environment variables]

## Database Migrations

```bash
# Staging
alembic upgrade head

# Production (with backup)
pg_dump > backup.sql
alembic upgrade head
```

## Rollback Procedure

[Document rollback steps]

## Monitoring

- Errors: Sentry
- Metrics: Datadog
- Logs: CloudWatch
- Uptime: UptimeRobot

## Support

- On-call: PagerDuty
- Runbook: See RUNBOOK.md
```

**Acceptance Criteria**:
- ✅ Complete deployment guide
- ✅ Environment setup documented
- ✅ Rollback procedures documented
- ✅ Monitoring setup documented
- ✅ Troubleshooting guide included

### Testing Requirements
- ✅ CI pipeline runs successfully
- ✅ Staging deployment verified
- ✅ PostgreSQL migration tested
- ✅ Documentation reviewed

### Acceptance Criteria
- ✅ CI/CD pipeline operational
- ✅ Staging environment live
- ✅ PostgreSQL in development
- ✅ Deployment documented
- ✅ All tests passing in CI

---

## 📊 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Authentication Flow | Working | Users can sign up/login |
| Protected Routes | Working | Unauthorized users redirected |
| Dashboard Layout | Complete | Navigation, sidebar, top bar |
| Backend Tests | 100% pass | All 38 analytics tests + new integration tests |
| CI Pipeline | Operational | Tests run on every PR |
| Staging Deploy | Automated | Deploys on `develop` push |
| PostgreSQL | Migrated | Dev environment using PostgreSQL |

## 🔄 Daily Sync

**Time**: 10:00 AM Daily
**Duration**: 15 minutes
**Format**: Stand-up

**Questions**:
1. What did you complete yesterday?
2. What are you working on today?
3. Any blockers?

## 🚧 Blockers & Dependencies

### Frontend → Backend
- Depends on auth API endpoints (already exist)
- Needs user profile endpoint
- Needs credit balance endpoint

### Backend → DevOps
- Needs PostgreSQL for integration tests
- Needs environment variables in CI

### DevOps → All
- CI pipeline blocks merges
- Staging environment needed for E2E tests

## 📝 Definition of Done

**Frontend**:
- ✅ Code merged to `develop`
- ✅ All tests passing
- ✅ Code reviewed
- ✅ UI matches designs
- ✅ Responsive on mobile
- ✅ Accessible (WCAG AA)

**Backend**:
- ✅ Code merged to `develop`
- ✅ All tests passing (unit + integration)
- ✅ Code reviewed
- ✅ API documented
- ✅ Database migrations included

**DevOps**:
- ✅ Configuration merged
- ✅ Documentation updated
- ✅ Tested in staging
- ✅ Runbook created
- ✅ Team trained

---

**Last Updated**: October 27, 2025
**Sprint**: Week 1 of Phase 2
**Review Date**: November 3, 2025
