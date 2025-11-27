## 🎨 Issue #74: Custom Component Development (Domain-Specific)

**Phase:** 1 - Foundation
**Priority:** P0 (Must Have - MVP)
**Estimated Effort:** 2 weeks
**Dependencies:** Issue #72 (Design System), Issue #73 (Shadcn/ui)

---

## 📋 Overview

Build custom, domain-specific components unique to HireFlux that leverage Shadcn/ui primitives. These components encapsulate business logic and provide reusable UI patterns for both job seeker and employer experiences.

## 🎯 Objectives

- Create 10 domain-specific components
- Build on top of Shadcn/ui base components
- Implement AI-specific UI patterns (Fit Index, suggestions, reasoning)
- Ensure components work for both job seekers AND employers
- Full TypeScript typing with strict mode
- Storybook stories for all components

## 🔧 Custom Components to Build

### 1. **FitIndexBadge** (0-100 AI Score)

**Purpose:** Display AI-generated fit scores with color-coded visual feedback

```tsx
<FitIndexBadge
  score={87}
  size="lg"
  showLabel={true}
  variant="job-seeker" // or "employer"
/>
```

**Visual Design:**
- 90-100: Dark green (#15803D) - "Excellent Fit"
- 75-89: Green (#22C55E) - "Great Fit"
- 60-74: Amber (#F59E0B) - "Good Fit"
- 40-59: Orange (#F97316) - "Moderate Fit"
- 0-39: Red (#EF4444) - "Low Fit"

**Features:**
- Animated percentage ring (Framer Motion)
- Tooltip with detailed breakdown
- Compact and expanded variants
- Accessible (ARIA label with score)

### 2. **AISuggestionCard** (AI Recommendation)

**Purpose:** Display AI-generated suggestions with reasoning and actions

```tsx
<AISuggestionCard
  type="resume-improvement"
  title="Strengthen your project descriptions"
  reasoning="Your current descriptions lack quantifiable metrics..."
  impact="high" // high, medium, low
  actions={[
    { label: "Apply suggestion", onClick: acceptSuggestion },
    { label: "Dismiss", onClick: rejectSuggestion }
  ]}
  confidence={0.92}
/>
```

**Features:**
- Collapsible reasoning section
- AI confidence score display
- Accept/Reject actions
- Undo functionality
- Impact indicator (high/medium/low)

### 3. **JobCard** (Job Listing)

**Purpose:** Unified job card for discovery and saved jobs

```tsx
<JobCard
  job={jobData}
  fitScore={87}
  bookmarked={false}
  onBookmark={handleBookmark}
  onApply={handleApply}
  variant="job-seeker" // or "employer-preview"
  showApplications={false} // employer view
/>
```

**Features:**
- Fit Index badge integration
- Bookmark/Save functionality
- Quick apply button
- Salary range display (if available)
- Remote/hybrid/onsite badge
- Posted time (relative: "2 days ago")
- Company logo with fallback
- Hover state shows more details

### 4. **ApplicationPipeline** (ATS Kanban Board)

**Purpose:** Drag-and-drop applicant tracking system for employers

```tsx
<ApplicationPipeline
  stages={pipelineStages}
  applications={applicationsData}
  onStageChange={handleStageChange}
  onCardClick={viewCandidate}
  view="kanban" // or "list"
/>
```

**Features:**
- 8 default stages (New, Screening, Interview, Offer, Hired, Rejected, Withdrawn, On Hold)
- Drag-and-drop between stages
- Candidate card with Fit Index
- Bulk actions (move, reject, email)
- Stage metrics (count, average time)
- Filters (by fit score, date, source)

### 5. **MessageThread** (Chat Interface)

**Purpose:** Two-way messaging between employers and candidates

```tsx
<MessageThread
  threadId={threadId}
  currentUserId={userId}
  userRole="candidate" // or "employer"
  onSendMessage={handleSend}
  onAttach={handleAttachment}
/>
```

**Features:**
- Real-time message updates (Socket.io)
- Message grouping by date
- Read receipts
- Typing indicators
- Attachment support (resume, cover letter)
- Block/Report functionality
- Archived thread restoration

### 6. **CreditBalance** (Usage Visualization)

**Purpose:** Display credit balance with usage history for job seekers

```tsx
<CreditBalance
  balance={47}
  monthlyAllocation={50}
  usageHistory={usageData}
  subscriptionTier="pro"
  onUpgrade={handleUpgrade}
/>
```

**Features:**
- Visual progress bar
- Usage breakdown chart
- Refund transactions shown separately
- Upgrade CTA when low
- Next renewal date
- Transaction history modal

### 7. **AnalyticsChart** (Metrics Visualization)

**Purpose:** Reusable chart component for job seeker and employer analytics

```tsx
<AnalyticsChart
  type="line" // or "bar", "pie", "area"
  data={chartData}
  metric="applications"
  timeRange="30d"
  onTimeRangeChange={handleRangeChange}
  comparison={true} // show previous period
/>
```

**Features:**
- Recharts integration
- Time range selector (7d, 30d, 90d, 1y)
- Comparison mode (vs. previous period)
- Tooltip with detailed breakdown
- Export to CSV/PNG
- Responsive (mobile stacks vertically)

### 8. **OnboardingChecklist** (Progress Tracking)

**Purpose:** Guide new users through initial setup

```tsx
<OnboardingChecklist
  userType="job-seeker" // or "employer"
  steps={onboardingSteps}
  onStepComplete={handleStepComplete}
  dismissible={true}
/>
```

**Features:**
- Step-by-step checklist
- Progress bar (X of Y completed)
- Deep links to incomplete steps
- Collapsible/expandable
- Confetti animation on 100% (optional)
- Dismissible (saves to user preferences)

### 9. **EmptyState** (No Data Placeholder)

**Purpose:** Friendly empty states with clear next actions

```tsx
<EmptyState
  context="no-applications"
  illustration="search"
  title="No applications yet"
  description="Start applying to jobs that match your profile..."
  action={{
    label: "Explore jobs",
    href: "/jobs"
  }}
/>
```

**Features:**
- Context-aware messaging
- Lucide icon or custom SVG
- Primary and secondary actions
- Different states: no-data, error, loading, permission-denied
- Responsive (illustration hides on mobile)

### 10. **ResumePreview** (PDF/DOCX Viewer)

**Purpose:** Resume preview with annotation capabilities (employer view)

```tsx
<ResumePreview
  resumeUrl={resumeUrl}
  candidateName="Jane Doe"
  onDownload={handleDownload}
  annotations={employerNotes}
  onAddNote={handleAddNote}
  highlightSkills={matchedSkills}
/>
```

**Features:**
- PDF.js integration
- Zoom controls (+/-/fit)
- Page navigation
- Highlight matched skills (yellow)
- Annotation tools (employer only)
- Download button
- Print functionality
- Mobile: scroll view, desktop: paginated

## 📁 Files to Create

```
frontend/
├── components/
│   ├── domain/
│   │   ├── FitIndexBadge.tsx
│   │   ├── AISuggestionCard.tsx
│   │   ├── JobCard.tsx
│   │   ├── ApplicationPipeline.tsx
│   │   ├── MessageThread.tsx
│   │   ├── CreditBalance.tsx
│   │   ├── AnalyticsChart.tsx
│   │   ├── OnboardingChecklist.tsx
│   │   ├── EmptyState.tsx
│   │   └── ResumePreview.tsx
│   └── ui/
│       └── ... (Shadcn components from #73)
└── __tests__/
    └── components/
        └── domain/
            ├── FitIndexBadge.test.tsx
            ├── AISuggestionCard.test.tsx
            └── ... (10 test files)
```

## ✅ Acceptance Criteria

- [ ] All 10 domain components implemented
- [ ] Full TypeScript typing (no `any` types)
- [ ] Storybook stories for each component (with variants)
- [ ] Unit tests (>80% coverage)
- [ ] Accessibility tests pass (axe-core)
- [ ] Mobile responsive (375px+)
- [ ] Dark mode compatible (uses CSS variables)
- [ ] Components use design tokens from Issue #72
- [ ] Built on Shadcn/ui primitives from Issue #73
- [ ] Animations use Framer Motion
- [ ] All components documented in Storybook
- [ ] No console warnings or errors

## 🧪 Testing Requirements

- [ ] Unit tests for each component (Jest + React Testing Library)
- [ ] Snapshot tests for visual regression
- [ ] Accessibility tests (keyboard nav, ARIA labels, contrast)
- [ ] Interaction tests (click, drag, input)
- [ ] Edge case tests (empty data, long text, network errors)
- [ ] Performance tests (render time < 100ms)

## 📚 References

- [React Aria Components](https://react-spectrum.adobe.com/react-aria/)
- [Framer Motion Docs](https://www.framer.com/motion/)
- [PDF.js Documentation](https://mozilla.github.io/pdf.js/)
- [Recharts Examples](https://recharts.org/en-US/examples)
- UX_UI_IMPLEMENTATION_ROADMAP.md (lines 210-221)

## 🎨 Design Philosophy

**Reusability First**
- Components work across job seeker AND employer contexts
- Props control behavior differences (variant, userType)
- No hardcoded business logic

**AI Transparency**
- Always show AI confidence when relevant
- Explain reasoning in simple language
- Allow users to override AI decisions

**Performance**
- Lazy load heavy components (ResumePreview, AnalyticsChart)
- Virtualize long lists (ApplicationPipeline)
- Optimize re-renders (React.memo, useMemo)

---

**Labels:** `ux`, `component-library`, `p0`, `phase-1`, `foundation`
**Milestone:** Phase 1 - Foundation
