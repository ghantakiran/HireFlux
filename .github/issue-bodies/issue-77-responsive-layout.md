## 📱 Issue #77: Responsive Layout System (Mobile-First)

**Phase:** 1 - Foundation
**Priority:** P0 (Must Have - MVP)
**Estimated Effort:** 2 weeks
**Dependencies:** Issue #72 (Design System), Issue #73 (Shadcn/ui)

---

## 📋 Overview

Build a responsive layout system following mobile-first principles that adapts seamlessly across devices (mobile 375px+ → tablet 768px+ → desktop 1024px+). Implement core layout components (navigation, sidebars, grids) that work for both job seeker and employer experiences.

## 🎯 Objectives

- Define mobile-first breakpoint strategy
- Create responsive navigation (desktop header + mobile bottom tabs)
- Build adaptive sidebar component (drawer on mobile, fixed on desktop)
- Implement responsive grid system (1-col mobile → 2-col tablet → 3-col desktop)
- Create container component with max-width constraints
- Test across 5 viewport sizes (375px, 414px, 768px, 1024px, 1440px)
- Ensure touch-friendly interactions (44px minimum touch targets)

## 🔧 Technical Requirements

### Breakpoint Strategy

**Tailwind Breakpoints (Mobile-First)**
```javascript
// tailwind.config.ts
theme: {
  screens: {
    'xs': '375px',   // Small phones (iPhone SE)
    'sm': '640px',   // Large phones
    'md': '768px',   // Tablets
    'lg': '1024px',  // Small laptops
    'xl': '1280px',  // Desktop
    '2xl': '1536px', // Large desktop
  }
}
```

**Usage Pattern:**
```tsx
// Mobile-first: base styles are for mobile, then scale up
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* 1 column mobile, 2 tablet, 3 desktop */}
</div>
```

### Responsive Navigation Components

#### 1. Desktop Header

**`components/layout/DesktopHeader.tsx`**
```tsx
'use client';

import Link from 'next/link';
import { Logo } from '@/components/ui/logo';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme/ThemeToggle';
import { UserMenu } from '@/components/layout/UserMenu';

export function DesktopHeader() {
  return (
    <header className="hidden lg:flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-dark-surface sticky top-0 z-50">
      <div className="flex items-center gap-8">
        <Logo />
        <nav className="flex items-center gap-6">
          <Link href="/jobs" className="text-sm font-medium hover:text-primary-600">
            Jobs
          </Link>
          <Link href="/applications" className="text-sm font-medium hover:text-primary-600">
            Applications
          </Link>
          <Link href="/messages" className="text-sm font-medium hover:text-primary-600">
            Messages
          </Link>
        </nav>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <Button variant="ghost" size="icon">
          <BellIcon className="h-5 w-5" />
        </Button>
        <UserMenu />
      </div>
    </header>
  );
}
```

#### 2. Mobile Bottom Tab Bar

**`components/layout/MobileTabBar.tsx`**
```tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Briefcase, MessageCircle, User } from 'lucide-react';
import { cn } from '@/lib/utils';

const tabs = [
  { name: 'Home', href: '/dashboard', icon: Home },
  { name: 'Jobs', href: '/jobs', icon: Briefcase },
  { name: 'Messages', href: '/messages', icon: MessageCircle },
  { name: 'Profile', href: '/profile', icon: User },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-dark-surface border-t border-gray-200 dark:border-gray-800 pb-safe">
      <div className="flex justify-around items-center h-16">
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          const Icon = tab.icon;

          return (
            <Link
              key={tab.name}
              href={tab.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[60px]',
                isActive
                  ? 'text-primary-600 dark:text-primary-400'
                  : 'text-gray-600 dark:text-gray-400'
              )}
            >
              <Icon className={cn('h-6 w-6', isActive && 'scale-110')} />
              <span className="text-xs font-medium">{tab.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
```

### Responsive Sidebar Component

**`components/layout/Sidebar.tsx`**
```tsx
'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Menu } from 'lucide-react';

export function Sidebar({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Mobile: Sheet (drawer) */}
      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            {children}
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop: Fixed sidebar */}
      <aside className="hidden lg:block w-64 border-r border-gray-200 dark:border-gray-800 h-screen sticky top-16 overflow-y-auto">
        {children}
      </aside>
    </>
  );
}
```

### Responsive Grid System

**`components/layout/ResponsiveGrid.tsx`**
```tsx
import { cn } from '@/lib/utils';

type GridProps = {
  children: React.ReactNode;
  cols?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: number;
  className?: string;
};

export function ResponsiveGrid({
  children,
  cols = { xs: 1, sm: 1, md: 2, lg: 3 },
  gap = 4,
  className,
}: GridProps) {
  const gridClasses = cn(
    'grid',
    `gap-${gap}`,
    cols.xs && `grid-cols-${cols.xs}`,
    cols.sm && `sm:grid-cols-${cols.sm}`,
    cols.md && `md:grid-cols-${cols.md}`,
    cols.lg && `lg:grid-cols-${cols.lg}`,
    cols.xl && `xl:grid-cols-${cols.xl}`,
    className
  );

  return <div className={gridClasses}>{children}</div>;
}

// Usage:
// <ResponsiveGrid cols={{ xs: 1, md: 2, lg: 3 }}>
//   <JobCard />
//   <JobCard />
//   <JobCard />
// </ResponsiveGrid>
```

### Container Component

**`components/layout/Container.tsx`**
```tsx
import { cn } from '@/lib/utils';

type ContainerProps = {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
};

const sizeClasses = {
  sm: 'max-w-screen-sm',   // 640px
  md: 'max-w-screen-md',   // 768px
  lg: 'max-w-screen-lg',   // 1024px
  xl: 'max-w-screen-xl',   // 1280px
  full: 'max-w-full',
};

export function Container({ children, size = 'xl', className }: ContainerProps) {
  return (
    <div className={cn('mx-auto px-4 sm:px-6 lg:px-8', sizeClasses[size], className)}>
      {children}
    </div>
  );
}
```

### Main Layout Component

**`components/layout/DashboardLayout.tsx`**
```tsx
import { DesktopHeader } from './DesktopHeader';
import { MobileTabBar } from './MobileTabBar';
import { Sidebar } from './Sidebar';
import { SidebarNav } from './SidebarNav';

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-dark-background">
      <DesktopHeader />

      <div className="flex">
        <Sidebar>
          <SidebarNav />
        </Sidebar>

        <main className="flex-1 pb-16 lg:pb-0">
          {children}
        </main>
      </div>

      <MobileTabBar />
    </div>
  );
}
```

## 📁 Files to Create/Modify

```
frontend/
├── components/
│   └── layout/
│       ├── DesktopHeader.tsx     # Desktop navigation bar
│       ├── MobileTabBar.tsx      # Mobile bottom tabs
│       ├── Sidebar.tsx           # Adaptive sidebar (drawer/fixed)
│       ├── SidebarNav.tsx        # Sidebar navigation items
│       ├── Container.tsx         # Max-width container
│       ├── ResponsiveGrid.tsx    # Responsive grid utility
│       ├── DashboardLayout.tsx   # Main layout wrapper
│       └── UserMenu.tsx          # User dropdown menu
├── app/
│   ├── layout.tsx                # Root layout with providers
│   └── (dashboard)/
│       └── layout.tsx            # Dashboard layout wrapper
└── __tests__/
    └── components/
        └── layout/
            ├── DesktopHeader.test.tsx
            ├── MobileTabBar.test.tsx
            └── Sidebar.test.tsx
```

## ✅ Acceptance Criteria

- [ ] Mobile-first breakpoint strategy implemented
- [ ] Desktop header working (hidden on mobile)
- [ ] Mobile bottom tabs working (hidden on desktop)
- [ ] Sidebar drawer on mobile, fixed on desktop
- [ ] Responsive grid system working (1/2/3 columns)
- [ ] Container component with size variants
- [ ] All touch targets ≥ 44px (mobile)
- [ ] Navigation keyboard accessible
- [ ] Active route highlighted in navigation
- [ ] Safe area insets handled (iOS notch)
- [ ] No horizontal scroll on any viewport
- [ ] Text readable on all screen sizes (min 16px on mobile)
- [ ] Images responsive (max-width: 100%)
- [ ] Layout tested on 5 viewport sizes

## 🧪 Testing Requirements

### Viewport Testing Matrix

| Device          | Width  | Test Scenarios                              |
|-----------------|--------|---------------------------------------------|
| iPhone SE       | 375px  | Bottom tabs, drawer nav, 1-col grid         |
| iPhone 14 Pro   | 414px  | Touch targets, text readability             |
| iPad            | 768px  | 2-col grid, header appears                  |
| Laptop          | 1024px | Fixed sidebar, 3-col grid, desktop header   |
| Desktop         | 1440px | Full layout, max-width containers           |

### Test Checklist

- [ ] Navigation toggles at correct breakpoint (1024px)
- [ ] Bottom tabs hidden on desktop (≥1024px)
- [ ] Desktop header hidden on mobile (<1024px)
- [ ] Sidebar drawer opens/closes on mobile
- [ ] Grid columns change at breakpoints
- [ ] Container max-width enforced
- [ ] Horizontal scroll never appears
- [ ] Images don't overflow on small screens
- [ ] Touch targets ≥ 44px on mobile
- [ ] Text scales appropriately (16px base on mobile)

## 📚 References

- [Mobile-First CSS](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Responsive/Mobile_first)
- [Tailwind Responsive Design](https://tailwindcss.com/docs/responsive-design)
- [iOS Safe Area](https://webkit.org/blog/7929/designing-websites-for-iphone-x/)
- [Touch Target Sizes (WCAG)](https://www.w3.org/WAI/WCAG21/Understanding/target-size.html)
- UX_UI_IMPLEMENTATION_ROADMAP.md (lines 317-324)

## 🎨 Design Philosophy

**Mobile-First Approach**
- Start with mobile constraints (smallest screen)
- Add complexity as screen size increases
- Default styles are mobile styles
- Use `lg:` prefix for desktop-specific styles

**Touch-Friendly Interactions**
- Minimum 44px × 44px touch targets (WCAG AAA)
- Adequate spacing between interactive elements (8px+)
- Larger text on mobile (16px base)
- Bigger buttons on mobile (h-12 vs h-10 desktop)

**Progressive Enhancement**
- Core functionality works on mobile
- Desktop adds convenience (sidebar, larger grid)
- No mobile-specific features missing on desktop
- Navigation accessible via keyboard (both layouts)

**Performance Optimization**
- Hide desktop header on mobile (display: none)
- Lazy load sidebar content
- Optimize images with next/image
- Reduce layout shifts (reserve space for images)

---

**Labels:** `ux`, `responsive`, `mobile`, `p0`, `phase-1`, `foundation`
**Milestone:** Phase 1 - Foundation
