# TDD/BDD Implementation Plan - UX/UI Engineering
**Date:** December 27, 2025
**Engineer:** Senior UX/UI Engineer with TDD/BDD Methodology
**Issues:** #148 (WCAG 2.1 AA Compliance), #149 (Keyboard Shortcuts), #150-155 (Advanced Features)

---

## 📊 Current Status Analysis

### WCAG 2.1 AA Compliance Progress (Issue #148)

#### ✅ Completed Criteria (60% Compliance)
- **1.1.1 Non-text Content** - All images have alt text
- **1.3.1 Info and Relationships** - Proper heading hierarchy
- **2.1.2 No Keyboard Trap** - No focus traps detected
- **2.4.1 Bypass Blocks** - Skip links implemented
- **2.4.2 Page Titled** - 11 pages have descriptive titles
- **2.4.7 Focus Visible** - Focus indicators present
- **3.1.1 Language of Page** - `lang="en"` in HTML
- **3.3.2 Error Identification** - 100% compliance (Dec 25)
- **1.4.3 Color Contrast** - 100% compliance (Dec 24)
- **2.5.5 Touch Targets** - Implemented (Dec 26)

#### 🚧 In-Progress Criteria
- **2.1.1 Keyboard** - Partial implementation (Issue #149)
- **Document Title** - Some pages still failing tests

#### ⏳ Pending Criteria
- **1.3.4 Orientation** - Mobile responsive issues
- **2.4.4 Link Purpose** - Context clarity needed
- **4.1.3 Status Messages** - ARIA live regions

---

## 🎯 Priority Matrix (Feature Engineering Approach)

### P0 - Critical (This Session)
1. **Fix Remaining Document Title Issues**
   - Current: Some pages failing `document-title` test
   - Impact: SERIOUS violation
   - Effort: 15 minutes
   - **TDD Approach:**
     - RED: Test shows document-title missing
     - GREEN: Add/fix useEffect for document.title
     - REFACTOR: Extract to custom hook

2. **Keyboard Navigation Enhancement (Issue #149)**
   - Current: Partial implementation
   - Impact: Core accessibility requirement
   - Effort: 2-3 hours
   - **TDD Approach:**
     - RED: Write tests for keyboard shortcuts (/search, Ctrl+K, Escape, Tab order)
     - GREEN: Implement command palette + focus management
     - REFACTOR: Extract reusable keyboard hook

### P1 - High (Next Session)
3. **Screen Reader Optimization (Issue #150)**
   - ARIA live regions for dynamic content
   - Screen reader announcements
   - Landmark navigation

4. **Focus Management & Skip Links (Issue #151)**
   - Enhanced skip navigation
   - Focus restoration after modals
   - Tab order optimization

### P2 - Medium (Week 2)
5. **Micro-Interactions & Animations (Issue #152)**
   - Reduced motion support
   - Loading states
   - Transition polish

6. **Drag-and-Drop Enhancements (Issue #153)**
   - Keyboard-accessible drag-drop
   - ARIA announcements
   - Touch support

---

## 🔬 TDD/BDD Workflow (This Session)

### Phase 1: Document Title Fixes (15 minutes)

#### RED Phase - Write Failing Tests
```typescript
// tests/e2e/20-wcag-compliance.spec.ts
test('All pages must have non-empty document.title', async ({ page }) => {
  const pages = [
    { url: '/dashboard/jobs', expected: 'Job Matches | HireFlux' },
    { url: '/dashboard/resumes', expected: 'Resume Builder | HireFlux' },
    // ... all other pages
  ];

  for (const { url, expected } of pages) {
    await page.goto(url);
    await page.waitForLoadState('networkidle');
    const title = await page.title();
    expect(title).toBe(expected);
  }
});
```

#### GREEN Phase - Implementation
```typescript
// Pattern to apply to all pages
export default function JobsPage() {
  useEffect(() => {
    document.title = 'Job Matches | HireFlux';
  }, []);

  return (/* ... */);
}
```

#### REFACTOR Phase - Custom Hook
```typescript
// hooks/useDocumentTitle.ts
export function useDocumentTitle(title: string) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = `${title} | HireFlux`;
    return () => { document.title = prevTitle; };
  }, [title]);
}
```

---

### Phase 2: Keyboard Navigation (2-3 hours)

#### RED Phase - BDD Feature Specs
```gherkin
# tests/features/keyboard-navigation.feature
Feature: Keyboard Navigation and Shortcuts
  As a keyboard user
  I want to navigate the app with keyboard shortcuts
  So that I can access all features without a mouse

  Scenario: Command Palette (Ctrl+K / Cmd+K)
    Given I am on any page
    When I press "Ctrl+K" or "Cmd+K"
    Then the command palette should open
    And focus should be on the search input

  Scenario: Search Shortcut (/)
    Given I am on the dashboard
    When I press "/" key
    Then the search input should receive focus
    And existing text should not be affected

  Scenario: Escape Key Behavior
    Given the command palette is open
    When I press "Escape"
    Then the palette should close
    And focus should return to the trigger element

  Scenario: Tab Order
    Given I am on any form
    When I press "Tab" repeatedly
    Then focus should move in logical order
    And all interactive elements should be reachable
```

#### RED Phase - E2E Tests
```typescript
// tests/e2e/13-keyboard-navigation.spec.ts
test.describe('Keyboard Shortcuts', () => {
  test('Ctrl+K opens command palette', async ({ page }) => {
    await page.goto('/dashboard');
    await page.keyboard.press('Control+K');

    const palette = page.locator('[role="dialog"][aria-label*="command"]');
    await expect(palette).toBeVisible();
    await expect(palette.locator('input')).toBeFocused();
  });

  test('/ focuses search input', async ({ page }) => {
    await page.goto('/dashboard/jobs');
    await page.keyboard.press('/');

    const search = page.locator('input[type="search"]');
    await expect(search).toBeFocused();
  });

  test('Escape closes modals and restores focus', async ({ page }) => {
    await page.goto('/dashboard');
    const trigger = page.locator('button:has-text("Open Settings")');
    await trigger.click();

    const modal = page.locator('[role="dialog"]');
    await expect(modal).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).not.toBeVisible();
    await expect(trigger).toBeFocused();
  });
});
```

#### GREEN Phase - Implementation
```typescript
// components/CommandPalette.tsx
export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+K or Cmd+K
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }

      // Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger ref={triggerRef}>
        <kbd>Ctrl+K</kbd>
      </DialogTrigger>
      <DialogContent role="dialog" aria-label="Command palette">
        <input
          type="search"
          placeholder="Search commands..."
          autoFocus
        />
      </DialogContent>
    </Dialog>
  );
}

// hooks/useSearchShortcut.ts
export function useSearchShortcut(inputRef: RefObject<HTMLInputElement>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputRef]);
}
```

#### REFACTOR Phase - Extract Reusable Hooks
```typescript
// hooks/useKeyboardShortcut.ts
export function useKeyboardShortcut(
  keys: string | string[],
  callback: () => void,
  options: { ctrl?: boolean; shift?: boolean; alt?: boolean } = {}
) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const matchesModifiers =
        (!options.ctrl || e.ctrlKey || e.metaKey) &&
        (!options.shift || e.shiftKey) &&
        (!options.alt || e.altKey);

      const keyArray = Array.isArray(keys) ? keys : [keys];
      if (matchesModifiers && keyArray.includes(e.key)) {
        e.preventDefault();
        callback();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keys, callback, options]);
}

// hooks/useFocusTrap.ts
export function useFocusTrap(containerRef: RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusable = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };

    container.addEventListener('keydown', handleTab);
    return () => container.removeEventListener('keydown', handleTab);
  }, [containerRef, isActive]);
}
```

---

## 🚀 Continuous Integration & Deployment

### CI/CD Pipeline
```yaml
# .github/workflows/tdd-bdd-testing.yml
name: TDD/BDD - WCAG Testing

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  wcag-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: |
          cd frontend
          npm ci
          npx playwright install --with-deps

      - name: Run WCAG Compliance Tests
        run: |
          cd frontend
          npx playwright test tests/e2e/20-wcag-compliance.spec.ts

      - name: Run Keyboard Navigation Tests
        run: |
          cd frontend
          npx playwright test tests/e2e/13-keyboard-navigation.spec.ts

      - name: Upload Test Results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: frontend/playwright-report/
```

### Vercel Deployment Strategy
1. **Push to GitHub** → Triggers Vercel build
2. **Auto-deployment** to preview URL
3. **Run E2E tests** against deployment
4. **Merge to main** → Production deployment

---

## 📝 Documentation Updates

### Files to Update
1. **WCAG_IMPLEMENTATION_PROGRESS.md**
   - Add document title fix results
   - Update keyboard navigation status
   - New compliance percentage

2. **TDD_BDD_SESSION_SUMMARY.md**
   - Session work log
   - Test results
   - Commits and deployments

3. **CLAUDE.md** (if needed)
   - Update accessibility guidelines
   - Document new keyboard shortcuts

---

## ✅ Definition of Done

### Document Title Fixes
- [ ] All 11+ pages have non-empty `document.title`
- [ ] Tests pass: `npx playwright test --grep "document-title"`
- [ ] Custom `useDocumentTitle` hook created
- [ ] Committed and pushed to GitHub
- [ ] Deployed to Vercel
- [ ] E2E tests pass on production URL

### Keyboard Navigation
- [ ] Command palette opens with Ctrl+K / Cmd+K
- [ ] Search input focuses with `/` key
- [ ] Escape closes modals and restores focus
- [ ] Tab order is logical on all pages
- [ ] All tests pass: `npx playwright test tests/e2e/13-keyboard-navigation.spec.ts`
- [ ] Custom hooks extracted (useKeyboardShortcut, useFocusTrap)
- [ ] Committed and pushed to GitHub
- [ ] Deployed to Vercel
- [ ] GitHub issue #149 commented with progress

---

## 🎯 Success Metrics

### WCAG Compliance
- **Current:** ~60% WCAG 2.1 AA
- **Target (This Session):** 70% WCAG 2.1 AA
- **Target (Week 1):** 80% WCAG 2.1 AA
- **Target (Week 2):** 95% WCAG 2.1 AA

### Test Coverage
- **Current:** 175 E2E tests
- **Target (This Session):** 190 E2E tests (+15 keyboard tests)
- **Passing Rate:** 95%+

### Performance
- **Page Load:** p95 < 300ms
- **Keyboard Response:** < 100ms
- **Build Time:** < 60 seconds

---

## 📅 Timeline

### Today (Session 1) - 3 hours
- 00:15 - Document title fixes (RED → GREEN → REFACTOR)
- 00:30 - Test execution and validation
- 02:00 - Keyboard navigation (RED → GREEN → REFACTOR)
- 00:15 - Deployment and E2E testing

### Tomorrow (Session 2) - 3 hours
- Screen reader optimization
- Focus management enhancements
- ARIA live regions

### This Week (Remaining)
- Micro-interactions and animations
- Mobile accessibility improvements
- Comprehensive documentation

---

## 🔄 Next Steps (Immediate)

1. **Fix Document Titles** - Start with RED phase
2. **Run Tests** - Validate failures
3. **Implement Fixes** - GREEN phase
4. **Refactor** - Extract hooks
5. **Commit** - With descriptive message
6. **Push** - Trigger CI/CD
7. **Deploy** - Vercel auto-deploy
8. **E2E Test** - Against production URL
9. **Update Documentation** - Progress report
10. **Move to Keyboard Navigation** - Repeat cycle

---

**Status:** ✅ READY TO IMPLEMENT
**Confidence:** HIGH - Clear TDD/BDD path with measurable outcomes
**Risk:** LOW - Proven methodology with continuous testing

---

*Generated: December 27, 2025*
*Methodology: TDD/BDD with Feature Engineering Principles*
*Tools: Playwright, GitHub Actions, Vercel, axe-core*
