## 🔍 Issue #82: Job Discovery Dashboard (Personalized Feed)

**Phase:** 2 - Job Seeker Experience
**Priority:** P0 (Must Have - MVP)
**Estimated Effort:** 2 weeks
**Dependencies:** Issue #74 (JobCard), Issue #77 (Responsive Layout)

---

## 📋 Overview

Create an intelligent, personalized job discovery dashboard that uses AI to surface high-fit roles. The feed should feel like a social media experience but optimized for job hunting with clear calls-to-action and transparent AI reasoning.

## 🎯 Objectives

- Personalized AI-powered job feed (ranked by Fit Index)
- Infinite scroll with lazy loading
- Quick filters (remote, salary, posted date)
- Save/bookmark functionality
- One-click apply
- "Why this matches" AI reasoning tooltips
- Real-time updates (new jobs notification)

## 🔧 Key Features

### 1. Personalized Job Feed

**Feed Algorithm:**
```
Ranking Score = (
  Fit Index (0-100) × 40% +
  Recency (days ago) × 20% +
  Application likelihood × 20% +
  Salary match × 10% +
  Location preference × 10%
)
```

**Visual Layout:**
```tsx
<JobDiscoveryDashboard>
  {/* Hero Section */}
  <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-8">
    <h1 className="text-3xl font-bold">Hi {firstName}, here are your top matches</h1>
    <p className="text-lg mt-2">{newJobCount} new jobs since yesterday</p>
  </div>

  {/* Quick Filters */}
  <div className="flex gap-4 p-4 overflow-x-auto">
    <FilterChip active={filters.remote} onClick={() => toggleFilter('remote')}>
      🏠 Remote only
    </FilterChip>
    <FilterChip active={filters.highFit} onClick={() => toggleFilter('highFit')}>
      ⭐ High fit (70+)
    </FilterChip>
    <FilterChip active={filters.newToday} onClick={() => toggleFilter('newToday')}>
      🆕 Posted today
    </FilterChip>
    <FilterChip active={filters.salaryMatch} onClick={() => toggleFilter('salaryMatch')}>
      💰 Matches salary
    </FilterChip>
  </div>

  {/* Job Feed */}
  <div className="space-y-4 p-4">
    {jobs.map(job => (
      <JobCard
        key={job.id}
        job={job}
        fitScore={job.fitScore}
        bookmarked={bookmarkedJobs.includes(job.id)}
        onBookmark={() => handleBookmark(job.id)}
        onApply={() => handleApply(job.id)}
        showFitReasoning={true}
      />
    ))}

    {/* Infinite Scroll Trigger */}
    <InfiniteScrollTrigger onVisible={loadMore} />

    {loading && <SkeletonJobCard count={3} />}
  </div>
</JobDiscoveryDashboard>
```

### 2. JobCard Component (Enhanced)

```tsx
<JobCard variant="discovery">
  {/* Header */}
  <div className="flex justify-between items-start">
    <div className="flex gap-3">
      <CompanyLogo src={job.company.logo} fallback={job.company.name[0]} />
      <div>
        <h3 className="font-semibold text-lg">{job.title}</h3>
        <p className="text-sm text-gray-600">{job.company.name}</p>
        <p className="text-xs text-gray-500">
          📍 {job.location} • 💰 ${job.salaryMin}-${job.salaryMax}k • ⏰ {job.postedAt}
        </p>
      </div>
    </div>

    <div className="flex items-center gap-2">
      <FitIndexBadge score={job.fitScore} size="lg" showLabel />
      <Button variant="ghost" size="icon" onClick={handleBookmark}>
        <BookmarkIcon filled={bookmarked} />
      </Button>
    </div>
  </div>

  {/* Fit Reasoning (Collapsible) */}
  <Accordion type="single" collapsible>
    <AccordionItem value="reasoning">
      <AccordionTrigger>
        <span className="text-sm text-primary-600">Why is this a {job.fitScore}% match?</span>
      </AccordionTrigger>
      <AccordionContent>
        <ul className="text-sm space-y-1">
          <li>✅ Matches 8/10 of your top skills</li>
          <li>✅ Salary range aligns with your expectations</li>
          <li>✅ Remote-friendly (your preference)</li>
          <li>⚠️ Requires 5+ years (you have 3 years)</li>
        </ul>
      </AccordionContent>
    </AccordionItem>
  </Accordion>

  {/* Tags */}
  <div className="flex flex-wrap gap-2 mt-3">
    {job.isRemote && <Badge variant="success">🏠 Remote</Badge>}
    {job.isUrgent && <Badge variant="warning">🔥 Urgent hire</Badge>}
    {job.matchesSkills > 80% && <Badge variant="primary">⭐ Top match</Badge>}
  </div>

  {/* Actions */}
  <div className="flex gap-3 mt-4">
    <Button onClick={handleApply} className="flex-1">
      Apply now
    </Button>
    <Button variant="secondary" onClick={viewDetails}>
      View details
    </Button>
  </div>
</JobCard>
```

### 3. Quick Filters

```tsx
const filters = [
  {
    id: 'remote',
    label: 'Remote only',
    icon: '🏠',
    query: { locationType: 'remote' }
  },
  {
    id: 'highFit',
    label: 'High fit (70+)',
    icon: '⭐',
    query: { minFitScore: 70 }
  },
  {
    id: 'newToday',
    label: 'Posted today',
    icon: '🆕',
    query: { postedSince: new Date().toISOString().split('T')[0] }
  },
  {
    id: 'salaryMatch',
    label: 'Matches salary',
    icon: '💰',
    query: { salaryMin: userPreferences.salaryMin }
  },
  {
    id: 'visaSponsor',
    label: 'Visa sponsor',
    icon: '🛂',
    query: { visaSponsorship: true }
  }
];
```

### 4. Empty States

```tsx
{jobs.length === 0 && (
  <EmptyState
    context="no-matches"
    illustration="search"
    title="No jobs match your filters"
    description="Try adjusting your filters or updating your preferences to see more results."
    action={{
      label: "Clear filters",
      onClick: clearFilters
    }}
    secondaryAction={{
      label: "Update preferences",
      href: "/profile/preferences"
    }}
  />
)}
```

## 📁 Files to Create

```
frontend/
├── app/
│   └── (dashboard)/
│       └── jobs/
│           ├── page.tsx          # Main discovery page
│           └── loading.tsx       # Skeleton loading state
├── components/
│   ├── domain/
│   │   ├── JobCard.tsx           # Enhanced job card
│   │   ├── FitReasoningCard.tsx  # Expandable reasoning
│   │   └── FilterChip.tsx        # Quick filter button
│   └── ui/
│       └── infinite-scroll.tsx   # Infinite scroll trigger
└── hooks/
    ├── useJobFeed.ts             # Job feed hook
    ├── useBookmarks.ts           # Bookmark management
    └── useInfiniteScroll.ts      # Infinite scroll logic
```

## ✅ Acceptance Criteria

- [ ] Personalized job feed showing top 20 jobs initially
- [ ] Jobs ranked by Fit Index (highest first)
- [ ] Infinite scroll loads 20 more jobs on scroll
- [ ] Quick filters working (5 filter chips)
- [ ] Bookmark/save functionality (heart icon)
- [ ] One-click apply opens modal
- [ ] "Why this matches" reasoning expandable
- [ ] Real-time notification when new jobs added
- [ ] Loading states (skeleton cards)
- [ ] Empty state when no matches
- [ ] Mobile responsive (single column)
- [ ] Desktop: 2-column grid (1024px+)
- [ ] Page load time < 2 seconds
- [ ] Smooth scroll performance (60fps)

## 🧪 Testing Requirements

- [ ] E2E: Load job feed, scroll to load more
- [ ] E2E: Apply quick filter, verify results
- [ ] E2E: Bookmark job, verify saved
- [ ] E2E: Click apply, modal opens
- [ ] E2E: Expand fit reasoning, see details
- [ ] Unit: Ranking algorithm correct
- [ ] Unit: Filter logic works
- [ ] Performance: Feed renders in < 2s
- [ ] Performance: Infinite scroll smooth (no jank)
- [ ] Accessibility: Keyboard navigation works

## 📚 References

- [LinkedIn Job Feed](https://www.linkedin.com/jobs/)
- [Indeed Job Search](https://www.indeed.com)
- [Wellfound (AngelList)](https://wellfound.com/jobs)
- UX_UI_IMPLEMENTATION_ROADMAP.md (lines 244-250)

---

**Labels:** `ux`, `job-discovery`, `job-seeker`, `p0`, `phase-2`
**Milestone:** Phase 2 - Job Seeker Experience
