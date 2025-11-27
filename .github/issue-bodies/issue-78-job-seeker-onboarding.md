## 🚀 Issue #78: Job Seeker Onboarding Flow (Multi-Step)

**Phase:** 2 - Job Seeker Experience
**Priority:** P0 (Must Have - MVP)
**Estimated Effort:** 2 weeks
**Dependencies:** Issue #73 (Shadcn/ui), Issue #77 (Responsive Layout)

---

## 📋 Overview

Create a delightful, AI-powered onboarding experience for job seekers that guides them from signup to first job discovery in < 3 minutes. The flow should collect essential information, demonstrate HireFlux's AI capabilities, and get users to value quickly.

## 🎯 Objectives

- Multi-step wizard with progress indicator (5 steps)
- Smart defaults and optional fields (minimize user input)
- AI-powered suggestions throughout onboarding
- Resume upload optional (can add later)
- Time to first job match: < 3 minutes
- Mobile-optimized (thumb-friendly)
- Skip/Save for later functionality

## 🔧 Onboarding Flow (5 Steps)

### Step 1: Welcome & Account Setup
**Goal:** Get basic user information

```tsx
<OnboardingStep1>
  <h2>Welcome to HireFlux!</h2>
  <p>Let's find your dream job with AI-powered matching</p>

  <Input name="fullName" label="Full name" required />
  <Input name="email" label="Email" type="email" required disabled={prefilled} />
  <Input name="phone" label="Phone (optional)" type="tel" />
  <Select name="experienceLevel" label="Experience level" required>
    <option>Entry Level (0-2 years)</option>
    <option>Mid Level (3-5 years)</option>
    <option>Senior (6-10 years)</option>
    <option>Lead/Principal (10+ years)</option>
  </Select>

  <Button onClick={nextStep}>Continue</Button>
</OnboardingStep1>
```

### Step 2: Job Preferences
**Goal:** Understand what user is looking for

```tsx
<OnboardingStep2>
  <h2>What are you looking for?</h2>

  <Input name="jobTitle" label="Desired job title" placeholder="e.g. Software Engineer, Product Manager" required />
  <MultiSelect name="skills" label="Your top skills (select 3-5)" options={skillOptions} max={5} />

  <Select name="locationType" label="Work location" required>
    <option>Remote</option>
    <option>Hybrid</option>
    <option>On-site</option>
    <option>Any</option>
  </Select>

  <Select name="location" label="Preferred location" disabled={locationType === 'Remote'}>
    {/* City autocomplete */}
  </Select>

  <RangeSlider name="salaryRange" label="Expected salary (optional)" min={30000} max={500000} />

  <Checkbox name="openToRelocate" label="Open to relocating" />
  <Checkbox name="needsVisaSponsorship" label="Requires visa sponsorship" />

  <Button variant="ghost" onClick={prevStep}>Back</Button>
  <Button onClick={nextStep}>Continue</Button>
</OnboardingStep2>
```

### Step 3: Resume Upload (Optional)
**Goal:** Get resume for AI parsing (skippable)

```tsx
<OnboardingStep3>
  <h2>Upload your resume (optional)</h2>
  <p>Our AI will extract your experience and skills. You can skip this and add it later.</p>

  <FileUpload
    accept=".pdf,.docx,.doc"
    maxSize={5 * 1024 * 1024} // 5MB
    onUpload={handleResumeUpload}
    status={uploadStatus}
  />

  {uploadStatus === 'parsing' && (
    <div className="flex items-center gap-2">
      <Spinner />
      <span>AI is analyzing your resume...</span>
    </div>
  )}

  {uploadStatus === 'success' && (
    <AISuggestionCard
      type="resume-insights"
      title="We found great experience!"
      reasoning="You have 5 years of Python experience, expertise in machine learning, and leadership skills."
      actions={[
        { label: "Looks good", onClick: nextStep }
      ]}
    />
  )}

  <Button variant="ghost" onClick={() => setStep(4)}>Skip for now</Button>
  <Button onClick={nextStep} disabled={uploadStatus === 'parsing'}>Continue</Button>
</OnboardingStep3>
```

### Step 4: AI Profile Generation
**Goal:** Show AI magic, build trust

```tsx
<OnboardingStep4>
  <h2>Your AI profile is ready!</h2>
  <p>Based on your inputs, we've created your HireFlux profile.</p>

  <Card className="p-6">
    <div className="flex items-center gap-4 mb-4">
      <Avatar size="lg" fallback={initials} />
      <div>
        <h3 className="font-semibold">{fullName}</h3>
        <p className="text-sm text-gray-600">{jobTitle} • {location}</p>
      </div>
    </div>

    <div className="space-y-3">
      <div>
        <h4 className="font-medium mb-2">Skills</h4>
        <div className="flex flex-wrap gap-2">
          {skills.map(skill => <Badge key={skill}>{skill}</Badge>)}
        </div>
      </div>

      <div>
        <h4 className="font-medium mb-2">Job Preferences</h4>
        <ul className="text-sm space-y-1">
          <li>💼 {experienceLevel}</li>
          <li>📍 {locationType} • {location}</li>
          <li>💰 ${salaryRange[0].toLocaleString()} - ${salaryRange[1].toLocaleString()}</li>
        </ul>
      </div>
    </div>
  </Card>

  <AISuggestionCard
    type="profile-improvement"
    title="Want to boost your profile?"
    reasoning="Adding 2-3 project examples could increase your match score by ~15%"
    impact="medium"
    actions={[
      { label: "Add projects", onClick: openProjectModal },
      { label: "Maybe later", onClick: nextStep }
    ]}
  />

  <Button onClick={nextStep}>Find jobs for me</Button>
</OnboardingStep4>
```

### Step 5: First Job Matches
**Goal:** Instant gratification, show value

```tsx
<OnboardingStep5>
  <div className="text-center mb-6">
    <h2>We found {matchCount} jobs perfect for you!</h2>
    <p>Here are your top 5 matches</p>
  </div>

  <div className="space-y-4">
    {topMatches.slice(0, 5).map(job => (
      <JobCard
        key={job.id}
        job={job}
        fitScore={job.fitScore}
        variant="job-seeker"
        onApply={handleApply}
        onBookmark={handleBookmark}
        showFitReasoning={true}
      />
    ))}
  </div>

  <Button onClick={finishOnboarding} size="lg" className="w-full">
    Go to my dashboard
  </Button>
</OnboardingStep5>
```

## 🎨 UI Components Needed

1. **ProgressBar** - Shows step progress (1/5, 2/5, etc.)
2. **StepIndicator** - Dots showing current step
3. **SkipButton** - Allow users to skip optional steps
4. **ValidationTooltip** - Inline error messages
5. **LoadingState** - Skeleton screens during AI processing
6. **SuccessAnimation** - Confetti when profile complete
7. **BackButton** - Go to previous step (mobile: top-left)

## 📁 Files to Create

```
frontend/
├── app/
│   └── (onboarding)/
│       ├── layout.tsx            # Minimal layout (no nav)
│       └── welcome/
│           ├── page.tsx          # Onboarding orchestrator
│           └── steps/
│               ├── Step1Welcome.tsx
│               ├── Step2Preferences.tsx
│               ├── Step3Resume.tsx
│               ├── Step4ProfileReview.tsx
│               └── Step5Matches.tsx
├── components/
│   └── onboarding/
│       ├── ProgressBar.tsx
│       ├── StepIndicator.tsx
│       └── OnboardingLayout.tsx
└── __tests__/
    └── onboarding/
        └── onboarding-flow.test.tsx
```

## ✅ Acceptance Criteria

- [ ] 5-step onboarding flow implemented
- [ ] Progress indicator shows current step (1/5 → 5/5)
- [ ] All required fields validated before advancing
- [ ] Resume upload optional (skippable)
- [ ] AI parsing shows loading state (spinner + message)
- [ ] Profile preview shows parsed data
- [ ] First job matches displayed (5 cards)
- [ ] Time to completion < 3 minutes (tested with real users)
- [ ] Mobile-optimized (thumb-friendly buttons, large inputs)
- [ ] Back button works (except Step 1)
- [ ] Skip button on optional steps (Step 3)
- [ ] Data persisted on each step (resume on refresh)
- [ ] Keyboard accessible (Tab navigation, Enter to submit)
- [ ] Error states handled gracefully

## 🧪 Testing Requirements

- [ ] E2E test: Complete onboarding flow (happy path)
- [ ] E2E test: Skip resume upload, still complete
- [ ] E2E test: Go back and change answers
- [ ] E2E test: Refresh page mid-flow (data persisted)
- [ ] Unit tests: Form validation logic
- [ ] Unit tests: Step navigation logic
- [ ] Accessibility: Keyboard navigation works
- [ ] Accessibility: Screen reader announces step changes
- [ ] Performance: Resume parsing < 5 seconds
- [ ] Performance: Job matching < 2 seconds

## 📚 References

- [Linear Onboarding](https://linear.app) - Clean, fast onboarding
- [Loom Onboarding](https://loom.com) - Minimal input, instant value
- [Multi-Step Form Best Practices](https://www.smashingmagazine.com/2017/05/better-form-design-one-thing-per-page/)
- UX_UI_IMPLEMENTATION_ROADMAP.md (lines 237-243)

## 🎨 Design Philosophy

**Speed to Value**
- Ask only what's essential
- Default to smart assumptions
- Show value ASAP (job matches by Step 5)
- Let users refine later

**Progressive Disclosure**
- Don't overwhelm with all fields at once
- One concept per step
- Optional fields clearly marked

**AI Transparency**
- Show AI is working (loading states)
- Explain what AI found (resume insights)
- Build trust early (accurate parsing)

**Mobile-First**
- Large touch targets (48px+)
- Single-column layout on mobile
- Thumb zone for primary buttons (bottom)
- Minimal typing (use selects, sliders)

---

**Labels:** `ux`, `onboarding`, `job-seeker`, `p0`, `phase-2`
**Milestone:** Phase 2 - Job Seeker Experience
