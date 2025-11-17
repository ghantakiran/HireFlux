# Issue #24: Job Templates Library - Implementation Plan
## P0-CRITICAL Feature | Story Points: 5 | Effort: 1 week

**Status**: Backend 60% Complete, Frontend 0%, Ready for Implementation
**Priority**: Next in queue after Issue #27
**Created**: Session Nov 16, 2025

---

## ✅ ALREADY COMPLETED

### Backend (60% Complete)
1. ✅ **Database Model**: `backend/app/db/models/job_template.py` (67 lines)
   - JobTemplate model with all fields
   - Public/private visibility
   - Category support
   - Usage tracking

2. ✅ **Service Layer**: `backend/app/services/job_template_service.py` (254 lines)
   - `create_template()` - Create template
   - `get_template()` - Get by ID with authorization
   - `list_templates()` - List with filters (visibility, category, pagination)
   - `update_template()` - Update with authorization
   - `delete_template()` - Delete with authorization
   - `increment_usage_count()` - Track usage

3. ✅ **Schemas**: `backend/app/schemas/job_template.py`
   - JobTemplateCreate, JobTemplateUpdate, JobTemplateResponse
   - TemplateVisibility enum (PUBLIC, PRIVATE)
   - TemplateCategory enum (ENGINEERING, SALES, etc.)

4. ✅ **Unit Tests**: `backend/tests/unit/test_job_template_service.py`
   - 20+ tests covering all service methods
   - Authorization tests
   - Filtering tests

---

## ❌ REMAINING WORK

### 1. Backend API Endpoints (NOT IMPLEMENTED)
**File to create**: `backend/app/api/v1/endpoints/job_templates.py`

**Required Endpoints** (per Issue #24):
- `GET /api/v1/employer/job-templates` - List templates with filters
- `POST /api/v1/employer/job-templates` - Create template
- `GET /api/v1/employer/job-templates/{id}` - Get template
- `PUT /api/v1/employer/job-templates/{id}` - Update template
- `DELETE /api/v1/employer/job-templates/{id}` - Delete template
- `POST /api/v1/employer/jobs/from-template/{template_id}` - Create job from template

**Estimated Time**: 2-3 hours

### 2. Router Registration
**File to modify**: `backend/app/api/v1/router.py`
- Add job_templates router
- Register under /employer prefix

**Estimated Time**: 15 minutes

### 3. Public Template Seeding
**File to create**: `backend/app/db/seeds/job_templates_seed.py`

**Default Templates** (per Issue #24):
- Software Engineer (Entry, Mid, Senior, Lead)
- Product Manager
- UX Designer
- Sales Representative
- Marketing Manager
- Data Scientist
- DevOps Engineer
- Customer Support

**Estimated Time**: 2 hours

### 4. Frontend Template Library Page (NOT IMPLEMENTED)
**Files to create**:
- `frontend/app/employer/templates/page.tsx` - Main template library page
- `frontend/components/employer/TemplateLibrary.tsx` - Template grid/list
- `frontend/components/employer/TemplateCard.tsx` - Individual template card
- `frontend/components/employer/TemplatePreviewModal.tsx` - Preview modal
- `frontend/components/employer/CreateTemplateForm.tsx` - Create/edit form

**Features**:
- Grid/list view toggle
- Filter by category
- Filter by visibility (public/private)
- Search templates
- Preview modal
- Create from scratch
- Save job as template
- Delete template (owner only)

**Estimated Time**: 4-6 hours

### 5. Template Selector in Job Creation
**File to modify**: `frontend/app/employer/jobs/new/page.tsx`
- Add "Start from template" button
- Template selector modal
- Pre-fill job form from template

**Estimated Time**: 2 hours

### 6. Frontend API Client
**File to create**: `frontend/lib/api/jobTemplates.ts`
- `getJobTemplates()` - List templates
- `getJobTemplate()` - Get by ID
- `createJobTemplate()` - Create
- `updateJobTemplate()` - Update
- `deleteJobTemplate()` - Delete
- `createJobFromTemplate()` - Create job from template

**Estimated Time**: 1 hour

### 7. E2E Tests (NOT IMPLEMENTED)
**File to create**: `frontend/__tests__/e2e/24-job-templates.spec.ts`

**Test Scenarios** (10+ required):
1. View public template library
2. Filter templates by category
3. Search templates
4. Preview template
5. Create template from scratch
6. Save job as template
7. Create job from template
8. Edit own template
9. Delete own template
10. Cannot edit/delete public template
11. Cannot edit other company's template
12. Usage count increments

**Estimated Time**: 3-4 hours

### 8. BDD Scenarios
**File to create**: `frontend/tests/features/job-templates.feature`
- Gherkin scenarios for all user flows

**Estimated Time**: 1 hour

---

## 📋 IMPLEMENTATION CHECKLIST

### Phase 1: Backend API (3-4 hours)
- [ ] Create `backend/app/api/v1/endpoints/job_templates.py`
- [ ] Implement 6 API endpoints
- [ ] Add authentication/authorization
- [ ] Register router in `backend/app/api/v1/router.py`
- [ ] Test endpoints with Postman/curl
- [ ] Write API integration tests

### Phase 2: Public Template Seeding (2 hours)
- [ ] Create seed file with 8+ default templates
- [ ] Write seeding script
- [ ] Run seed script
- [ ] Verify templates in database

### Phase 3: Frontend API Client (1 hour)
- [ ] Create `frontend/lib/api/jobTemplates.ts`
- [ ] Implement 6 API functions
- [ ] Add TypeScript interfaces
- [ ] Error handling

### Phase 4: Frontend Components (6-8 hours)
- [ ] Create template library page
- [ ] Implement TemplateLibrary component (grid/list)
- [ ] Implement TemplateCard component
- [ ] Implement TemplatePreviewModal
- [ ] Implement CreateTemplateForm
- [ ] Add template selector to job creation
- [ ] Add "Save as template" to job edit

### Phase 5: Testing (4-5 hours)
- [ ] Write BDD scenarios (10+)
- [ ] Write E2E tests (10+ scenarios)
- [ ] Run tests locally
- [ ] Fix failing tests
- [ ] Verify all acceptance criteria

### Phase 6: Documentation & Deployment (1-2 hours)
- [ ] Update documentation
- [ ] Deploy to Vercel
- [ ] Run E2E tests on deployment
- [ ] Close Issue #24

**Total Estimated Time**: 17-22 hours (2-3 focused sessions)

---

## 🎯 ACCEPTANCE CRITERIA (From Issue #24)

### Backend ✅ (Mostly Complete)
- [x] Template CRUD in JobTemplateService ✅
- [x] Public templates seeded in database ❌ (Need seeding script)
- [x] Template usage tracking ✅
- [x] Category filtering ✅
- [x] Unit tests (20+ tests) ✅

### Backend API ❌ (Not Started)
- [ ] 6 API endpoints implemented
- [ ] Router registered
- [ ] Authentication/authorization

### Frontend ❌ (Not Started)
- [ ] Template library page (/employer/templates)
- [ ] Template selector in job creation
- [ ] Save job as template action
- [ ] Template preview modal
- [ ] E2E tests (10+ scenarios)

---

## 💡 IMPLEMENTATION STRATEGY

### TDD/BDD Approach
1. **Write BDD scenarios** first (Given-When-Then)
2. **Write E2E tests** based on BDD scenarios
3. **Implement API endpoints** to make tests pass
4. **Implement frontend** to make E2E tests pass
5. **Refactor** and optimize

### Quick Wins
1. Start with API endpoints (leverage existing service)
2. Seed public templates (provides instant value)
3. Build template library page (visible progress)
4. Add template selector to job creation (completes flow)

---

## 📊 PRIORITY RATIONALE

**Why Issue #24 is Next Priority**:
1. **P0-CRITICAL**: Blocks employer MVP
2. **5 Story Points**: Manageable scope
3. **60% Complete**: Backend mostly done, just needs endpoints
4. **High ROI**: Enables faster job posting (key employer pain point)
5. **Foundation**: Required for Issue #23 (Job Posting with AI)

**Dependencies**:
- **Depends on**: Issue #23 (Job Posting CRUD) - But can be done in parallel
- **Blocks**: Issue #23 completion, Issue #29 (Mass Posting)

---

## 🔑 KEY FEATURES TO IMPLEMENT

### Public Template Library
- 8+ default templates (Software Engineer, PM, UX, Sales, etc.)
- Category-based organization
- Usage tracking (most popular templates)
- Search functionality

### Template Management
- Create template from scratch
- Save job as template
- Edit/delete own templates
- Cannot edit public templates

### Template Usage
- Browse template library
- Preview template before use
- Create job from template (one-click)
- Pre-fill job form with template data

---

## 📝 NEXT STEPS (For Next Session)

1. **Create API endpoints** (`job_templates.py`)
2. **Register router** in `router.py`
3. **Seed public templates** (8 default templates)
4. **Test backend** with curl/Postman
5. **Create frontend API client**
6. **Build template library page**
7. **Add template selector to job creation**
8. **Write E2E tests** (10+ scenarios)
9. **Test locally and on Vercel**
10. **Close Issue #24**

---

## 📚 RELATED DOCUMENTATION

- **Issue**: ghantakiran/HireFlux#24
- **Model**: `backend/app/db/models/job_template.py`
- **Service**: `backend/app/services/job_template_service.py`
- **Tests**: `backend/tests/unit/test_job_template_service.py`
- **CLAUDE.md**: Section on Job Templates

---

**Status**: Ready for implementation
**Next Session**: Start with Phase 1 (Backend API endpoints)

*Document created November 16, 2025*
*By Claude Code following TDD/BDD practices*
