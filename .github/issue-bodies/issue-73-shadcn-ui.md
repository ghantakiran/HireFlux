## 🎨 Issue #73: Shadcn/ui Component Library Integration

**Phase:** 1 - Foundation
**Priority:** P0 (Must Have - MVP)
**Estimated Effort:** 1 week
**Dependencies:** Issue #72 (Design System)

---

## 📋 Overview

Integrate Shadcn/ui component library into HireFlux frontend, providing a foundation of accessible, customizable UI primitives built on Radix UI. This will accelerate development while maintaining full control over styling and behavior.

## 🎯 Objectives

- Install and configure Shadcn/ui CLI
- Set up component import system (copy-paste approach)
- Integrate with existing Tailwind theme (Issue #72)
- Install 20 essential base components
- Create component documentation structure
- Configure TypeScript paths for @/components
- Set up component testing infrastructure

## 🔧 Technical Requirements

### Installation

```bash
npx shadcn-ui@latest init
```

**Configuration:**
```json
{
  "style": "default",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "tailwind.config.ts",
    "css": "app/globals.css",
    "baseColor": "slate",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils"
  }
}
```

### Base Components to Install

1. **Form Controls**
   - Button
   - Input
   - Select
   - Checkbox
   - Radio Group
   - Switch
   - Slider
   - Label

2. **Feedback & Overlays**
   - Dialog (Modal)
   - Popover
   - Tooltip
   - Toast
   - Alert

3. **Layout & Navigation**
   - Card
   - Tabs
   - Accordion
   - Dropdown Menu

4. **Data Display**
   - Avatar
   - Badge

### Component Customization

**Example: Button variants aligned with HireFlux brand**
```tsx
const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary-600 text-white hover:bg-primary-700",
        secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300",
        ghost: "hover:bg-gray-100 hover:text-gray-900",
        link: "text-primary-600 underline-offset-4 hover:underline",
        danger: "bg-red-600 text-white hover:bg-red-700",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);
```

## 📁 Files to Create/Modify

```
frontend/
├── components/
│   └── ui/                       # Shadcn components (auto-generated)
│       ├── button.tsx
│       ├── input.tsx
│       ├── select.tsx
│       ├── dialog.tsx
│       ├── popover.tsx
│       ├── tooltip.tsx
│       ├── toast.tsx
│       ├── card.tsx
│       ├── tabs.tsx
│       ├── avatar.tsx
│       ├── badge.tsx
│       └── ... (20 total)
├── lib/
│   └── utils.ts                  # cn() utility for class merging
├── hooks/
│   └── use-toast.ts              # Toast hook
└── components.json               # Shadcn config
```

## ✅ Acceptance Criteria

- [ ] Shadcn/ui CLI configured and initialized
- [ ] All 20 base components installed via CLI
- [ ] Components use design tokens from Issue #72
- [ ] Button component has 5 variants (default, secondary, ghost, link, danger)
- [ ] All components fully typed with TypeScript
- [ ] Components work with server components (RSC)
- [ ] cn() utility function working for class merging
- [ ] Toast notification system functional
- [ ] All components accessible (keyboard nav, ARIA)
- [ ] Component import paths use @/components alias
- [ ] No console warnings or errors
- [ ] Components render correctly in Storybook

## 🧪 Testing Requirements

- [ ] Unit tests for each component (basic rendering)
- [ ] Accessibility tests (axe-core)
- [ ] Keyboard navigation tests
- [ ] Visual regression tests in Storybook
- [ ] Dark mode compatibility (preparation)
- [ ] Mobile responsive tests (375px+)

## 📚 References

- [Shadcn/ui Documentation](https://ui.shadcn.com)
- [Radix UI Primitives](https://www.radix-ui.com)
- [Class Variance Authority](https://cva.style/docs)
- UX_UI_IMPLEMENTATION_ROADMAP.md (lines 184-221)

## 🎨 Design Philosophy

**Copy, Don't Install**
- Shadcn/ui copies components into your codebase
- Full control over styling and behavior
- No package dependencies to maintain
- Customize freely without forking

**Accessibility First**
- Built on Radix UI (WCAG 2.1 AA compliant)
- Keyboard navigation out-of-the-box
- Screen reader friendly
- Focus management handled

**Performance**
- Tree-shakeable components
- No runtime overhead
- Server component compatible
- Optimized bundle size

---

**Labels:** `ux`, `component-library`, `p0`, `phase-1`, `foundation`
**Milestone:** Phase 1 - Foundation
