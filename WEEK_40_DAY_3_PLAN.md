# Week 40 Day 3: ATS Integration & View Toggle Implementation Plan

**Date**: 2025-01-16
**Sprint**: 19-20 (Employer Platform MVP)
**Week**: 40 (ATS Enhancements)
**Day**: 3
**Methodology**: TDD/BDD

---

## Strategic Context

### Completed Components (Week 40 Days 1-2)
- ✅ **ApplicantList** (Week 39 Day 5) - Table view with 79% test coverage
- ✅ **CandidateDetailModal** (Week 40 Day 1) - Detail view with 100% unit tests (56/56), 60+ E2E tests
- ✅ **ApplicantKanbanBoard** (Week 40 Day 2) - Pipeline view with 50% unit tests (25/50), 40 E2E tests

### Current Gap
All three components work **independently** with separate test pages:
- `/test/applicant-list`
- `/test/candidate-detail-modal`
- `/test/applicant-kanban`

**Problem**: No unified ATS experience. Recruiters can't switch between List and Kanban views of the same data.

**Solution**: Create integrated ATS page with view toggle, shared state, and seamless modal interactions.

---

## Objective

Build a **unified ATS page** that:
1. Combines List and Kanban views with toggle button
2. Shares application state between views
3. Opens CandidateDetailModal from both views
4. Persists view preference (localStorage)
5. Maintains filter/sort state across views
6. Provides seamless user experience

---

## Requirements

### Functional Requirements

1. **View Toggle**:
   - Toggle button (List ↔ Kanban icons)
   - Smooth transition between views
   - Persist preference to localStorage
   - Keyboard shortcut (Alt+V to toggle)

2. **Shared State**:
   - Single source of truth for applications
   - Filters apply to both views
   - Sorts apply to both views
   - Selection state preserved when switching views

3. **Modal Integration**:
   - Click applicant in List → opens CandidateDetailModal
   - Click candidate card in Kanban → opens same modal
   - Modal updates reflect in both views
   - Stage changes in modal update Kanban immediately

4. **URL State**:
   - URL includes jobId: `/employer/jobs/{jobId}/applications`
   - Query params for view: `?view=list|kanban`
   - Query params for filters: `?stage=new&minFit=80`
   - Shareable URLs with filters

5. **Loading & Error States**:
   - Skeleton loaders for both views
   - Error messages with retry button
   - Empty states (no applications)
   - Offline mode detection

### Non-Functional Requirements

1. **Performance**:
   - View switch < 100ms
   - No data refetch when toggling views
   - Efficient state management (Zustand or Context)

2. **Accessibility**:
   - View toggle button has ARIA label
   - Keyboard shortcut announced to screen reader
   - Focus management when switching views

3. **Responsive**:
   - Desktop: Side-by-side toggle + breadcrumbs
   - Mobile: Full-screen views, bottom nav toggle

---

## Technical Stack

### State Management
- **Zustand** (if not already using) or **React Context**
- Benefits: Simple API, TypeScript support, DevTools

```typescript
interface ATSStore {
  applications: Applicant[];
  loading: boolean;
  error: string | null;
  view: 'list' | 'kanban';
  filters: Filters;
  sortBy: SortOption;
  selectedIds: string[];

  setView: (view: 'list' | 'kanban') => void;
  setFilters: (filters: Filters) => void;
  setSortBy: (sortBy: SortOption) => void;
  toggleSelection: (id: string) => void;
  fetchApplications: (jobId: string) => Promise<void>;
}
```

### URL State
- **Next.js useSearchParams** + **usePathname**
- Sync URL with state bidirectionally

---

## Component Architecture

### File Structure
```
frontend/
├── app/
│   └── employer/
│       └── jobs/
│           └── [jobId]/
│               └── applications/
│                   └── page.tsx           # Main ATS page
├── components/
│   └── employer/
│       ├── ATSViewToggle.tsx             # Toggle button
│       ├── ATSFilters.tsx                # Shared filters
│       ├── ATSEmptyState.tsx             # Empty state
│       ├── ATSLoadingState.tsx           # Skeleton loader
│       ├── ApplicantList.tsx             # Existing (refactor)
│       ├── ApplicantKanbanBoard.tsx      # Existing (refactor)
│       └── CandidateDetailModal.tsx      # Existing (already done)
├── hooks/
│   └── useATSStore.ts                    # Zustand store
├── __tests__/
│   └── components/
│       └── employer/
│           ├── ATSViewToggle.test.tsx
│           └── ATSIntegration.test.tsx   # Integration tests
└── tests/
    └── e2e/
        └── 15-ats-integration.spec.ts    # E2E tests
```

### Component Hierarchy
```
<ATSPage jobId={jobId}>
  ├── <ATSHeader>
  │   ├── Breadcrumbs (Jobs → {jobTitle} → Applications)
  │   ├── <ATSViewToggle view={view} onToggle={setView} />
  │   └── <ATSFilters filters={filters} onFilterChange={setFilters} />
  │
  ├── {view === 'list' ? (
  │     <ApplicantList
  │       applicants={applications}
  │       onViewApplicant={openModal}
  │       onUpdateStage={updateStage}
  │       onBulkUpdate={bulkUpdate}
  │       filters={filters}
  │       sortBy={sortBy}
  │     />
  │   ) : (
  │     <ApplicantKanbanBoard
  │       jobId={jobId}
  │       onCardClick={openModal}
  │       onStageChange={updateStage}
  │     />
  │   )}
  │
  └── <CandidateDetailModal
        applicationId={selectedId}
        isOpen={modalOpen}
        onClose={closeModal}
        onUpdate={refreshData}
      />
</ATSPage>
```

---

## TDD Implementation Plan

### Phase 1: RED (Write Tests First) - 1.5 hours

**Unit Tests** (`ATSIntegration.test.tsx`):
1. View Toggle (8 tests)
   - Should render toggle button
   - Should switch from List to Kanban
   - Should switch from Kanban to List
   - Should persist view to localStorage
   - Should load view from localStorage
   - Should update URL query param
   - Should announce view change to screen reader
   - Should support keyboard shortcut (Alt+V)

2. Shared State (10 tests)
   - Should fetch applications on mount
   - Should share applications between views
   - Should apply filters to both views
   - Should apply sort to both views
   - Should preserve selection when switching views
   - Should update both views when data changes
   - Should handle loading state in both views
   - Should handle error state in both views
   - Should show empty state when no applications
   - Should refresh data after modal update

3. Modal Integration (6 tests)
   - Should open modal from List view
   - Should open modal from Kanban view
   - Should close modal with backdrop click
   - Should close modal with Esc key
   - Should update List view after modal change
   - Should update Kanban view after modal change

4. URL State (6 tests)
   - Should initialize view from URL
   - Should update URL when view changes
   - Should initialize filters from URL
   - Should update URL when filters change
   - Should support shareable URLs
   - Should handle invalid URL params

**Total**: 30 unit tests

**E2E Tests** (`15-ats-integration.spec.ts`):
1. View Switching (8 tests)
2. Shared Filtering (6 tests)
3. Modal Integration (8 tests)
4. URL State (4 tests)
5. Keyboard Navigation (4 tests)
6. Responsive Design (3 tests)
7. Performance (2 tests)

**Total**: 35 E2E tests

### Phase 2: GREEN (Implement Components) - 3 hours

1. Create Zustand store (`hooks/useATSStore.ts`)
2. Create ATSViewToggle component
3. Create ATSFilters component (extract from ApplicantList)
4. Create ATSPage (`app/employer/jobs/[jobId]/applications/page.tsx`)
5. Refactor ApplicantList to use shared store
6. Refactor ApplicantKanbanBoard to use shared store
7. Add URL state synchronization
8. Add localStorage persistence

### Phase 3: REFACTOR - 1 hour

1. Extract common components (EmptyState, LoadingState)
2. Optimize re-renders (React.memo)
3. Add error boundaries
4. Improve TypeScript types

### Phase 4: Test Page - 30 mins

Create `app/test/ats-integration/page.tsx`:
- Test all views with toggle
- Test modal integration
- Test filter/sort persistence
- Activity log

### Phase 5: E2E Testing - 1 hour

Run Playwright tests:
- Local dev server
- Vercel deployment
- Cross-browser

### Phase 6: Documentation & Commit - 30 mins

- Create `SPRINT_19-20_WEEK_40_DAY_3_SUMMARY.md`
- Update `ARCHITECTURE_ANALYSIS.md`
- Git commit

---

## Success Criteria

✅ **30 unit tests passing (100%)**
✅ **35 E2E tests passing**
✅ **View toggle < 100ms**
✅ **No data refetch when toggling**
✅ **localStorage persistence working**
✅ **URL state synchronization working**
✅ **Modal integration seamless**
✅ **Keyboard shortcut (Alt+V) working**
✅ **Responsive on mobile/desktop**
✅ **Documentation complete**
✅ **Git commit with summary**

---

## Timeline

**Total Estimated Time**: 7.5 hours

| Phase | Duration | Status |
|-------|----------|--------|
| Planning & Research | 30 mins | ✅ DONE |
| TDD RED (Write Tests) | 1.5 hours | ⏳ NEXT |
| TDD GREEN (Implement) | 3 hours | ⏳ |
| TDD REFACTOR | 1 hour | ⏳ |
| Test Page | 30 mins | ⏳ |
| E2E Testing | 1 hour | ⏳ |
| Documentation & Commit | 30 mins | ⏳ |

---

## Dependencies

### Package Installation (if using Zustand)
```bash
cd frontend
npm install zustand
```

### API Endpoints (Already Implemented)
```typescript
GET /api/v1/jobs/{jobId}/applications  // ✅ Ready
PUT /api/v1/applications/{id}/status    // ✅ Ready
POST /api/v1/applications/bulk-update   // ✅ Ready
```

---

## Integration Points

### ApplicantList (Week 39 Day 5)
- **Refactor**: Remove internal state, use shared store
- **Props**: Simplify to only callbacks
- **Benefits**: Single source of truth

### ApplicantKanbanBoard (Week 40 Day 2)
- **Refactor**: Remove internal fetch, use shared store
- **Props**: Remove jobId prop (get from URL)
- **Benefits**: Instant updates from modal changes

### CandidateDetailModal (Week 40 Day 1)
- **No changes needed**: Already has onUpdate callback
- **Integration**: Call store.refreshData() on update

---

## Next Steps After Integration

1. **Week 40 Day 4**: Enhanced Application Notes
   - Rich text editor (TipTap or Quill)
   - @mentions with autocomplete
   - File attachments
   - Note templates

2. **Week 40 Day 5**: Interview Scheduler UI
   - Calendar component
   - Time slot selection
   - Interview type selector
   - Email invitations

3. **Week 41**: Performance Optimizations
   - Virtualization for 100+ candidates
   - Code splitting
   - Bundle size optimization

---

**Ready to start TDD implementation!** ✅
