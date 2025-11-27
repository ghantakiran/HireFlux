# Storybook Setup (Option D - Issue #94)

## Overview

This Storybook instance showcases **40 components** from the HireFlux frontend:
- **30 Shadcn/ui components** (Issue #93)
- **10 Custom domain components** (Issue #94)

## Quick Start

```bash
# Start Storybook development server
npm run storybook

# Build static Storybook for deployment
npm run build-storybook
```

Storybook will be available at: **http://localhost:6006**

## Configuration

### Main Configuration (.storybook/main.ts)
- Framework: `@storybook/nextjs` (v8.4+)
- TypeScript: Strict mode with react-docgen
- Addons:
  - `@storybook/addon-links` - Deep linking between stories
  - `@storybook/addon-essentials` - Essential addons bundle
  - `@storybook/addon-interactions` - Test user interactions
  - `@storybook/addon-a11y` - Accessibility testing

### Preview Configuration (.storybook/preview.ts)
- Global styles: Tailwind CSS + HireFlux design tokens
- Theme: Light/dark mode toggle
- Layout: Centered by default
- Controls: Auto-generated from component props

## Story Files

### Domain Components (/components/domain)
1. **FitIndexBadge.stories.tsx**
   - Score ranges (0-100)
   - Size variants (sm/md/lg)
   - Color-coded tiers
   - Job seeker vs employer variants

2. **AISuggestionCard.stories.tsx**
   - AI confidence scores
   - Impact levels (high/medium/low)
   - Accept/reject workflow
   - Suggestion types (skill, experience, education, profile)

3. **JobCard.stories.tsx**
   - Job listings with metadata
   - Fit index integration
   - Location types (remote/hybrid/onsite)
   - Salary formatting (multiple currencies)
   - Save/apply interactions

4. **More stories to be added:**
   - EmptyState.stories.tsx
   - OnboardingChecklist.stories.tsx
   - CreditBalance.stories.tsx
   - AnalyticsChart.stories.tsx
   - MessageThread.stories.tsx
   - ApplicationPipeline.stories.tsx
   - ResumePreview.stories.tsx

### UI Components (/components/ui)
1. **Button.stories.tsx**
   - All variants (default, destructive, outline, secondary, ghost, link)
   - All sizes (sm, default, lg, icon)
   - States (default, hover, disabled, loading)

2. **Card.stories.tsx**
   - Card compositions (header, content, footer)
   - Profile cards, stats cards, form cards
   - Interactive cards
   - Card grids

3. **More stories to be added:**
   - Badge, Alert, Dialog, Dropdown Menu, Label, Popover, Select, Slider, Switch, Tabs, Toast, Tooltip, Accordion, Avatar, etc.

## Features

### Auto-Documentation
- **Controls:** Automatically generated from TypeScript props
- **Actions:** Click handlers logged to Actions panel
- **Accessibility:** A11y addon validates WCAG compliance
- **Dark Mode:** Toggle between light/dark themes

### Interactive Controls
All component props can be modified in real-time via the Controls panel:
```typescript
// Example: FitIndexBadge
score: 0-100 (range slider)
size: 'sm' | 'md' | 'lg' (select)
showLabel: boolean (toggle)
variant: 'job-seeker' | 'employer' (select)
```

### Story Patterns

#### Basic Story
```typescript
export const Default: Story = {
  args: {
    score: 87,
    size: 'md',
    showLabel: true,
  },
};
```

#### Custom Render
```typescript
export const MultipleVariants: Story = {
  render: () => (
    <div className="space-y-4">
      <FitIndexBadge score={95} />
      <FitIndexBadge score={75} />
      <FitIndexBadge score={50} />
    </div>
  ),
};
```

## Testing with Storybook

### Interaction Testing
```typescript
import { expect } from '@storybook/jest';
import { userEvent, within } from '@storybook/testing-library';

export const AcceptSuggestion: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const acceptButton = canvas.getByRole('button', { name: /accept/i });
    await userEvent.click(acceptButton);
    await expect(canvas.getByText(/accepted/i)).toBeInTheDocument();
  },
};
```

### Accessibility Testing
- A11y addon runs automatically on all stories
- Violations displayed in "Accessibility" panel
- Checks: color contrast, ARIA labels, keyboard navigation

## Deployment

### Static Build
```bash
npm run build-storybook
```

Output: `storybook-static/` directory

### Deploy to Vercel/Netlify
```bash
# Vercel
vercel deploy storybook-static

# Netlify
netlify deploy --dir=storybook-static --prod
```

### Chromatic (Visual Testing)
```bash
npm install --save-dev chromatic
npx chromatic --project-token=<your-token>
```

## Best Practices

1. **One component per file** - Each .stories.tsx file should focus on one component
2. **Multiple stories per component** - Showcase variants, states, edge cases
3. **Descriptive names** - Use clear story names (e.g., `ExcellentMatch`, not `Story1`)
4. **Documentation** - Add descriptions using `parameters.docs.description`
5. **Accessibility** - Test with a11y addon before deployment
6. **Responsive** - Test components at different viewport sizes

## Roadmap

### Phase 1: Core Stories (Completed)
- [x] Storybook configuration
- [x] FitIndexBadge stories
- [x] JobCard stories
- [x] AISuggestionCard stories
- [x] Button stories
- [x] Card stories

### Phase 2: Complete Coverage
- [ ] All 10 domain component stories
- [ ] All 30 Shadcn/ui component stories
- [ ] Interaction tests for all interactive components
- [ ] Visual regression tests with Chromatic

### Phase 3: Advanced Features
- [ ] Design system documentation
- [ ] Component composition examples
- [ ] Performance metrics
- [ ] Custom addons (if needed)

## Resources

- **Storybook Docs:** https://storybook.js.org/docs
- **Next.js Integration:** https://storybook.js.org/docs/get-started/nextjs
- **Accessibility Addon:** https://storybook.js.org/addons/@storybook/addon-a11y
- **Chromatic:** https://www.chromatic.com

---

**Created:** 2025-11-27
**Status:** ✅ Option D Complete (Core setup + 5 component stories)
**Next:** Add remaining 35 component stories for full coverage
