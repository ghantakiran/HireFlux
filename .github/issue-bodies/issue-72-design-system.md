## 🎨 Issue #72: Design System Setup & Theming

**Phase:** 1 - Foundation
**Priority:** P0 (Must Have - MVP)
**Estimated Effort:** 1 week
**Dependencies:** None

---

## 📋 Overview

Establish the foundational design system for HireFlux, including color palette, typography, spacing system, shadows, border radius, and animation timing. This will serve as the single source of truth for all UI components.

## 🎯 Objectives

- Define complete color system (primary, secondary, accent, neutral, semantic)
- Establish typography scale with Inter font family
- Create spacing system (4px base grid)
- Define shadow elevation system
- Configure Tailwind CSS theme extensions
- Set up CSS variables for runtime theming
- Implement theme provider (light mode foundation, dark mode preparation)

## 🔧 Technical Requirements

### Color Palette

**Primary (AI/Tech)**
```css
--primary-50: #F0F9FF
--primary-100: #E0F2FE
--primary-500: #0EA5E9 (brand blue)
--primary-600: #0284C7 (hover)
--primary-700: #0369A1 (active)
--primary-900: #0C4A6E (darkest)
```

**Secondary (Success/Growth)**
```css
--success-50: #F0FDF4
--success-500: #22C55E (green)
--success-700: #15803D
```

**Accent (Highlight/CTA)**
```css
--accent-50: #FEF3C7
--accent-500: #F59E0B (amber)
--accent-700: #B45309
```

**Neutral (Text/Backgrounds)**
```css
--gray-50: #F9FAFB (backgrounds)
--gray-200: #E5E7EB (borders)
--gray-600: #4B5563 (secondary text)
--gray-900: #111827 (primary text)
```

**Semantic Colors**
```css
--error: #EF4444 (red)
--warning: #F59E0B (amber)
--info: #3B82F6 (blue)
```

### Typography

**Font Families**
- Headings: Inter (700/800)
- Body: Inter (400/500/600)
- Monospace: JetBrains Mono (code/data)

**Scale**
- xs: 12px, sm: 14px, base: 16px, lg: 18px, xl: 20px
- 2xl: 24px, 3xl: 30px, 4xl: 36px

### Spacing System
- 1: 4px, 2: 8px, 3: 12px, 4: 16px
- 6: 24px, 8: 32px, 12: 48px, 16: 64px

### Border Radius
- sm: 4px (inputs)
- DEFAULT: 8px (cards)
- md: 12px (modals)
- lg: 16px (panels)
- full: 9999px (pills/avatars)

### Shadows (Elevation)
- sm: hover states
- DEFAULT: cards
- md: dropdowns
- lg: modals

### Animation Timing
- Fast: 150ms (hover)
- Default: 300ms (transitions)
- Slow: 500ms (page transitions)
- Ease: cubic-bezier(0.4, 0, 0.2, 1)
- Bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)

## 📁 Files to Create/Modify

```
frontend/
├── styles/
│   ├── design-tokens.css         # CSS variables
│   └── globals.css               # Global styles with theme
├── lib/
│   └── theme-provider.tsx        # Theme context provider
├── tailwind.config.ts            # Extended Tailwind theme
└── docs/
    └── design-system.md          # Design system documentation
```

## ✅ Acceptance Criteria

- [ ] All color variables defined in CSS and Tailwind config
- [ ] Inter font family loaded and configured
- [ ] Typography scale implemented with Tailwind classes
- [ ] Spacing system following 4px grid
- [ ] Shadow system working across components
- [ ] Border radius system applied consistently
- [ ] Animation timing configured
- [ ] Theme provider component created
- [ ] CSS variables change based on theme (light mode working)
- [ ] Documentation includes visual examples
- [ ] All design tokens accessible via Tailwind utilities
- [ ] Dark mode preparation (CSS variables structure)

## 🧪 Testing Requirements

- [ ] Visual regression tests for color swatches
- [ ] Typography renders correctly at all scales
- [ ] Spacing system consistent across breakpoints
- [ ] Theme provider switches variables correctly
- [ ] No FOUC (Flash of Unstyled Content)

## 📚 References

- [Tailwind CSS Theme Configuration](https://tailwindcss.com/docs/theme)
- [CSS Custom Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/--*)
- [Inter Font Family](https://fonts.google.com/specimen/Inter)
- UX_UI_IMPLEMENTATION_ROADMAP.md (lines 104-181)

## 🎨 Design Philosophy

**AI-First, Human-Centered**
- Use colors that inspire trust and intelligence
- Primary blue conveys tech professionalism
- Success green for positive actions
- Accent amber for highlights without aggression

**Accessibility**
- All color combinations meet WCAG 2.1 AA (4.5:1 contrast)
- Typography scales for readability
- Spacing follows touch target guidelines (44px minimum)

---

**Labels:** `ux`, `design-system`, `p0`, `phase-1`, `foundation`
**Milestone:** Phase 1 - Foundation
