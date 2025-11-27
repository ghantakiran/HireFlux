## 🌙 Issue #76: Dark Mode Implementation

**Phase:** 1 - Foundation
**Priority:** P1 (Should Have - Beta)
**Estimated Effort:** 1 week
**Dependencies:** Issue #72 (Design System), Issue #73 (Shadcn/ui)

---

## 📋 Overview

Implement a comprehensive dark mode theme for HireFlux that provides a comfortable viewing experience in low-light environments while maintaining brand identity and accessibility standards. Users can toggle between light and dark modes with system preference detection.

## 🎯 Objectives

- Implement dark mode color palette with WCAG AA compliance
- Create theme toggle component (light/dark/system)
- Persist user theme preference (localStorage + DB)
- Support system preference detection (prefers-color-scheme)
- Update all components to support dark mode
- Ensure smooth theme transitions (no flash)
- Test accessibility in dark mode (contrast ratios)

## 🔧 Technical Requirements

### Dark Mode Color Palette

**Primary (AI/Tech - Dark)**
```css
--dark-primary-50: #1E293B
--dark-primary-100: #334155
--dark-primary-500: #38BDF8 (lighter blue for dark bg)
--dark-primary-600: #0EA5E9
--dark-primary-700: #0284C7
--dark-primary-900: #E0F2FE
```

**Background & Text (Dark)**
```css
--dark-background: #0F172A (primary bg)
--dark-surface: #1E293B (cards, modals)
--dark-surface-elevated: #334155 (dropdowns, tooltips)
--dark-border: #334155 (borders)
--dark-text-primary: #F1F5F9 (main text)
--dark-text-secondary: #94A3B8 (secondary text)
--dark-text-tertiary: #64748B (disabled text)
```

**Semantic Colors (Dark)**
```css
--dark-success: #34D399 (lighter green)
--dark-error: #F87171 (lighter red)
--dark-warning: #FBBF24 (lighter amber)
--dark-info: #60A5FA (lighter blue)
```

### Theme Provider Implementation

**`lib/theme-provider.tsx`**
```tsx
'use client';

import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'system';

type ThemeProviderProps = {
  children: React.ReactNode;
  defaultTheme?: Theme;
  storageKey?: string;
};

const ThemeContext = createContext<{
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}>({
  theme: 'system',
  setTheme: () => null,
  resolvedTheme: 'light',
});

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'hireflux-theme',
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(defaultTheme);
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const stored = localStorage.getItem(storageKey) as Theme;
    if (stored) setTheme(stored);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        setResolvedTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    handleChange();

    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme, storageKey]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(resolvedTheme);
  }, [resolvedTheme]);

  const value = {
    theme,
    setTheme: (newTheme: Theme) => {
      localStorage.setItem(storageKey, newTheme);
      setTheme(newTheme);

      if (newTheme === 'system') {
        const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        setResolvedTheme(isDark ? 'dark' : 'light');
      } else {
        setResolvedTheme(newTheme);
      }
    },
    resolvedTheme,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
```

### Theme Toggle Component

**`components/theme/ThemeToggle.tsx`**
```tsx
'use client';

import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from '@/lib/theme-provider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => setTheme('light')}>
          <Sun className="mr-2 h-4 w-4" />
          <span>Light</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')}>
          <Moon className="mr-2 h-4 w-4" />
          <span>Dark</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')}>
          <Monitor className="mr-2 h-4 w-4" />
          <span>System</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### CSS Variables (globals.css)

```css
@layer base {
  :root {
    /* Light mode variables (from Issue #72) */
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    /* ... all light mode variables ... */
  }

  .dark {
    /* Dark mode overrides */
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --card: 222.2 84% 11%;
    --card-foreground: 210 40% 98%;
    --popover: 222.2 84% 11%;
    --popover-foreground: 210 40% 98%;
    --primary: 199.1 100% 49%;
    --primary-foreground: 210 40% 98%;
    --secondary: 217.2 32.6% 17.5%;
    --secondary-foreground: 210 40% 98%;
    --muted: 217.2 32.6% 17.5%;
    --muted-foreground: 215 20.2% 65.1%;
    --accent: 217.2 32.6% 17.5%;
    --accent-foreground: 210 40% 98%;
    --destructive: 0 62.8% 30.6%;
    --destructive-foreground: 210 40% 98%;
    --border: 217.2 32.6% 17.5%;
    --input: 217.2 32.6% 17.5%;
    --ring: 199.1 100% 49%;
  }
}
```

### Tailwind Configuration

**`tailwind.config.ts`**
```typescript
import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'], // Enable class-based dark mode
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        // ... all CSS variables as Tailwind colors
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
};

export default config;
```

## 📁 Files to Create/Modify

```
frontend/
├── lib/
│   └── theme-provider.tsx        # Theme context + system detection
├── components/
│   └── theme/
│       └── ThemeToggle.tsx       # Theme switcher component
├── app/
│   ├── layout.tsx                # Wrap app with ThemeProvider
│   └── globals.css               # Add .dark CSS variables
├── tailwind.config.ts            # Enable dark mode class strategy
└── __tests__/
    └── components/
        └── theme/
            └── ThemeToggle.test.tsx
```

## ✅ Acceptance Criteria

- [ ] Dark mode color palette defined (WCAG AA compliant)
- [ ] ThemeProvider component implemented
- [ ] Theme toggle component in navigation
- [ ] System preference detection working (prefers-color-scheme)
- [ ] Theme persisted to localStorage
- [ ] Theme synced to user profile (DB) when logged in
- [ ] All base components (Shadcn/ui) work in dark mode
- [ ] All domain components work in dark mode
- [ ] No flash of unstyled content (FOUC)
- [ ] Smooth transition between themes (200ms)
- [ ] All text meets contrast ratio requirements (4.5:1)
- [ ] Images have appropriate filters/overlays in dark mode
- [ ] Charts/graphs readable in dark mode
- [ ] Code blocks styled for dark mode

## 🧪 Testing Requirements

- [ ] Theme toggle switches between light/dark/system
- [ ] System preference detection working (test with OS settings)
- [ ] localStorage persistence working
- [ ] No FOUC on page load
- [ ] All components render correctly in dark mode
- [ ] Accessibility tests pass (contrast ratios)
- [ ] Theme toggle keyboard accessible
- [ ] Theme state syncs across tabs (storage events)
- [ ] Server-side rendering works (no hydration errors)

## 📚 References

- [Next.js Dark Mode](https://nextjs.org/docs/app/building-your-application/styling/css-variables#dark-mode)
- [next-themes Package](https://github.com/pacocoursey/next-themes)
- [Tailwind CSS Dark Mode](https://tailwindcss.com/docs/dark-mode)
- [Shadcn/ui Theming](https://ui.shadcn.com/docs/theming)
- UX_UI_IMPLEMENTATION_ROADMAP.md (lines 471-474)

## 🎨 Design Philosophy

**User Control**
- Default to system preference (respect OS setting)
- Easy toggle in navigation (1 click)
- Persist preference across sessions

**Accessibility**
- Dark mode is NOT just inverted colors
- Maintain contrast ratios (WCAG AA: 4.5:1 for text)
- Adjust colors for dark backgrounds (lighter blues, greens)
- Reduce saturation slightly for eye comfort

**Performance**
- No FOUC (flash of wrong theme on load)
- Preload theme from localStorage before render
- CSS variables change instantly (no re-render)
- Smooth transitions (200ms ease)

**Brand Consistency**
- Primary blue adjusted for dark backgrounds
- Accent colors remain recognizable
- Success/error colors maintain meaning
- Logo variant for dark mode (optional)

---

**Labels:** `ux`, `design-system`, `accessibility`, `p1`, `phase-1`, `foundation`
**Milestone:** Phase 1 - Foundation
