# Week 40 Day 2: ATS Kanban Board Implementation Plan

**Date**: 2025-01-15
**Sprint**: 19-20 (Employer Platform MVP)
**Week**: 40 (ATS Enhancements)
**Day**: 2
**Methodology**: TDD/BDD

---

## Strategic Context

### Current Position (from ARCHITECTURE_ANALYSIS.md)
- **Sprint 7-8**: Basic ATS + Ranking (Weeks 13-16)
- **Week 13**: ✅ Applicant list view (ApplicantList component - 79% tests)
- **Week 14**: ⏳ AI candidate ranking engine + detail view
  - ✅ Day 1: CandidateDetailModal (100% unit tests, 60+ E2E tests)
  - ⏳ Day 2: **Kanban Board** (next priority)
  - ⏳ Day 3: Backend API integration
- **Week 15**: Basic ATS pipeline (8 stages) - **Kanban Board fulfills this**
- **Week 16**: Application notes & assignment

###Priority Features (from EMPLOYER_FEATURES_SPEC.md - lines 459-467)

**UI Components Status**:
- ✅ `<ApplicationsListView>` (ApplicantList - Week 39 Day 5)
- ✅ `<ApplicationDetailsSidebar>` (CandidateDetailModal - Week 40 Day 1)
- ✅ `<BulkActionsToolbar>` (in ApplicantList)
- ✅ `<StatusChangeModal>` (in CandidateDetailModal Overview tab)
- ❌ **`<ApplicationsKanbanBoard>` - TODAY'S PRIORITY**
- ❌ `<ApplicationNotes>` (partially done in CandidateDetailModal Notes tab)
- ❌ `<InterviewScheduler>` (Week 27 priority)

---

## Objective

Implement a **drag-and-drop Kanban board** for ATS pipeline management, allowing recruiters to visually manage candidates through 8 hiring stages.

---

## Requirements

### Functional Requirements

1. **8 Pipeline Stages** (columns):
   - New (auto-assigned)
   - Reviewing
   - Phone Screen
   - Technical Interview
   - Final Interview
   - Offer
   - Hired
   - Rejected

2. **Candidate Cards** (draggable items):
   - Candidate name + photo
   - Fit index badge (color-coded: >80 green, 60-80 yellow, <60 red)
   - Applied date (relative time)
   - Tags (skills, referral source)
   - Quick actions (view details, notes icon)

3. **Drag-and-Drop**:
   - Drag candidate cards between columns
   - Visual feedback (drag ghost, drop zones)
   - Optimistic UI updates
   - Undo action (optional v1)

4. **Column Features**:
   - Candidate count badge
   - Collapse/expand column
   - Sort candidates (by fit index, date)
   - Filter candidates (by assignee, tags)

5. **Quick Actions on Cards**:
   - Click card → open CandidateDetailModal
   - Hover → show quick actions (view, add note, assign)
   - Right-click → context menu (move to stage, reject, etc.)

### Non-Functional Requirements

1. **Performance**:
   - Smooth drag animations (60 FPS)
   - Lazy load cards (virtualization for 100+ candidates)
   - Optimistic updates (no waiting for API)

2. **Accessibility**:
   - Keyboard navigation (Tab, Arrow keys, Enter)
   - Screen reader announcements
   - Focus management during drag

3. **Responsive**:
   - Desktop: Horizontal scroll for 8 columns
   - Tablet: 4 columns visible, horizontal scroll
   - Mobile: Accordion view (stack columns)

---

## Technical Stack

### Libraries
```json
{
  "@dnd-kit/core": "^6.0.0",       // Drag-and-drop core
  "@dnd-kit/sortable": "^7.0.0",   // Sortable lists
  "@dnd-kit/utilities": "^3.2.0",  // Utilities
  "react-virtual": "^2.10.4"       // Virtualization (optional)
}
```

### Why @dnd-kit?
- ✅ Accessibility-first (keyboard, screen reader support)
- ✅ Touch support (mobile-friendly)
- ✅ Performant (uses transform instead of position)
- ✅ TypeScript support
- ✅ Active maintenance
- ❌ Alternatives: react-beautiful-dnd (deprecated), react-dnd (complex API)

---

## Component Architecture

### File Structure
```
frontend/
├── components/
│   └── employer/
│       ├── ApplicantKanbanBoard.tsx     # Main Kanban component
│       ├── KanbanColumn.tsx             # Column component
│       ├── KanbanCard.tsx               # Candidate card
│       └── KanbanCard.test.tsx          # Unit tests (optional)
├── __tests__/
│   └── components/
│       └── employer/
│           └── ApplicantKanbanBoard.test.tsx  # Main unit tests
├── app/
│   └── test/
│       └── applicant-kanban/
│           └── page.tsx                 # Interactive test page
└── tests/
    └── e2e/
        └── 14-applicant-kanban.spec.ts  # E2E tests
```

### Component Hierarchy
```
<ApplicantKanbanBoard>
  ├── <DndContext>                 # @dnd-kit context
  │   └── <SortableContext>        # Sortable wrapper
  │       └── {stages.map(stage =>
  │           <KanbanColumn key={stage}>
  │             ├── Column Header
  │             │   ├── Stage name + count badge
  │             │   ├── Collapse/expand toggle
  │             │   └── Sort/filter controls
  │             └── <SortableContext>  # Sortable cards
  │                 └── {candidates.map(candidate =>
  │                     <KanbanCard
  │                       key={candidate.id}
  │                       candidate={candidate}
  │                       onDragEnd={handleDragEnd}
  │                       onClick={openDetailModal}
  │                     />
  │                 )}
  │           </KanbanColumn>
  │       )}
```

### Data Structures

```typescript
// Kanban-specific types
interface KanbanStage {
  id: ApplicationStatus;
  label: string;
  color: string;  // Tailwind color class
  candidates: Applicant[];
}

// Reuse Applicant type from ApplicantList
interface Applicant {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  fitIndex: number;
  stage: ApplicationStatus;
  appliedAt: string;
  resumeUrl?: string;
  coverLetterText?: string;
  tags: string[];
  assignedTo?: string;
}

type ApplicationStatus = 
  | 'new'
  | 'reviewing'
  | 'phone_screen'
  | 'technical_interview'
  | 'final_interview'
  | 'offer'
  | 'hired'
  | 'rejected';
```

---

## TDD Implementation Plan

### Phase 1: RED (Write Tests First) - 2 hours

**Unit Tests** (`ApplicantKanbanBoard.test.tsx`):
1. Rendering (10 tests)
   - Should render all 8 stage columns
   - Should display candidate count per column
   - Should render candidate cards in correct columns
   - Should show empty state when no candidates
   - Should display fit index badges with colors
   - Should show applied date (relative time)
   - Should display tags
   - Should show assigned recruiter
   - Should render quick action buttons
   - Should collapse/expand columns

2. Drag-and-Drop (12 tests)
   - Should allow dragging candidate card
   - Should show drag ghost during drag
   - Should highlight drop zones
   - Should update stage on drop
   - Should call onStageChange callback
   - Should show optimistic update
   - Should handle drag cancel (Esc key)
   - Should prevent dragging to same column
   - Should update candidate count after drag
   - Should preserve card order within column
   - Should handle multiple rapid drags
   - Should show loading state during API call

3. Card Interactions (8 tests)
   - Should open detail modal on card click
   - Should show hover state with quick actions
   - Should allow adding note from card
   - Should allow assigning recruiter from card
   - Should show context menu on right-click
   - Should navigate with keyboard (Tab, Enter)
   - Should announce actions to screen reader
   - Should focus next card after drag

4. Filtering & Sorting (6 tests)
   - Should filter by assignee
   - Should filter by tags
   - Should filter by fit index range
   - Should sort by fit index (high to low)
   - Should sort by applied date (newest first)
   - Should persist sort/filter across columns

5. Accessibility (8 tests)
   - Should have accessible column headers
   - Should announce drag start to screen reader
   - Should announce drag end to screen reader
   - Should support keyboard drag (Space/Enter)
   - Should trap focus during drag
   - Should have ARIA labels on cards
   - Should support arrow key navigation
   - Should announce candidate count changes

6. Edge Cases (6 tests)
   - Should handle 0 candidates
   - Should handle 100+ candidates per column
   - Should handle API errors gracefully
   - Should handle network offline state
   - Should prevent concurrent drag operations
   - Should handle stage with single candidate

**Total**: 50 unit tests

**E2E Tests** (`14-applicant-kanban.spec.ts`):
1. Basic Display (5 tests)
2. Drag-and-Drop Flow (8 tests)
3. Card Interactions (6 tests)
4. Modal Integration (4 tests)
5. Filtering & Sorting (6 tests)
6. Responsive Design (3 tests)
7. Accessibility (5 tests)
8. Performance (3 tests)

**Total**: 40 E2E tests

### Phase 2: GREEN (Implement Component) - 4 hours

1. Install dependencies (`@dnd-kit/*`)
2. Create `KanbanCard.tsx` (150 lines)
   - Fit index badge
   - Tags display
   - Quick actions
   - Drag handle

3. Create `KanbanColumn.tsx` (200 lines)
   - Column header
   - Candidate list
   - Empty state
   - Collapse/expand

4. Create `ApplicantKanbanBoard.tsx` (400 lines)
   - DndContext setup
   - Drag handlers
   - Stage management
   - API integration

5. Add styles (Tailwind classes)
   - Drag ghost styling
   - Drop zone highlights
   - Smooth transitions

### Phase 3: REFACTOR - 1 hour

1. Extract reusable components
2. Optimize performance (memoization)
3. Add error boundaries
4. Improve accessibility

### Phase 4: Test Page - 1 hour

Create `app/test/applicant-kanban/page.tsx`:
- Mock 30 candidates across 8 stages
- Mode toggles (normal, loading, error)
- Drag simulation controls
- Activity log

### Phase 5: E2E Testing - 1 hour

Run Playwright tests:
- Local dev server
- Vercel deployment
- Cross-browser (Chromium, Firefox, WebKit)

### Phase 6: Documentation & Commit - 30 mins

- Create `SPRINT_19-20_WEEK_40_DAY_2_SUMMARY.md`
- Update `ARCHITECTURE_ANALYSIS.md`
- Git commit with detailed message

---

## Success Criteria

✅ **50 unit tests passing (100%)**
✅ **40 E2E tests passing**
✅ **Smooth 60 FPS drag animations**
✅ **Keyboard accessible (Tab, Arrow, Space/Enter for drag)**
✅ **Screen reader announcements working**
✅ **Responsive on mobile, tablet, desktop**
✅ **< 300ms API response optimistic updates**
✅ **Interactive test page functional**
✅ **Documentation complete**
✅ **Git commit with summary**

---

## Risks & Mitigation

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| @dnd-kit learning curve | Medium | Medium | Follow official examples, allocate extra time |
| Performance with 100+ cards | High | Low | Implement virtualization (react-virtual) |
| Touch drag on mobile | Medium | Medium | Use @dnd-kit/modifiers for touch |
| API latency during drag | High | Medium | Optimistic updates + rollback on error |
| Accessibility complexity | Medium | Medium | Follow @dnd-kit a11y guide, test with screen reader |

---

## Timeline

**Total Estimated Time**: 9.5 hours (1 full day)

| Phase | Duration | Status |
|-------|----------|--------|
| Planning & Research | 30 mins | ✅ DONE |
| TDD RED (Write Tests) | 2 hours | ⏳ NEXT |
| TDD GREEN (Implement) | 4 hours | ⏳ |
| TDD REFACTOR | 1 hour | ⏳ |
| Test Page | 1 hour | ⏳ |
| E2E Testing | 1 hour | ⏳ |
| Documentation & Commit | 30 mins | ⏳ |

---

## Dependencies

### Package Installation
```bash
cd frontend
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

### API Endpoints (Backend)
```typescript
// Already implemented (from Week 40 Day 1):
GET /api/v1/jobs/{jobId}/applications  // Get all applicants
PUT /api/v1/applications/{id}/status    // Update stage
POST /api/v1/applications/bulk-update   // Bulk operations

// TODO (Week 40 Day 3):
GET /api/v1/applications/{id}/details   // Full candidate details
```

---

## Next Steps After Kanban Board

1. **Week 40 Day 3**: Backend API integration
   - Implement full application details endpoint
   - Connect Kanban to real APIs
   - Add WebSocket for real-time updates

2. **Week 40 Day 4-5**: Application Notes enhancement
   - Rich text editor
   - @mentions
   - File attachments
   - Note templates

3. **Week 41+**: Interview scheduling
   - Calendar integration
   - Availability matching
   - Email notifications

---

**Ready to start TDD implementation!** ✅
