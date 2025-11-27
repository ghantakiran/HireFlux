'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from './ThemeProvider';

interface ThemeToggleProps {
  size?: number;
  className?: string;
}

export function ThemeToggle({ size = 20, className }: ThemeToggleProps) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      aria-label="Toggle dark mode"
      onClick={toggleTheme}
      className={`inline-flex items-center justify-center rounded-md border border-border bg-background px-2 py-2 text-foreground hover:bg-muted transition-colors ${className ?? ''}`}
    >
      {isDark ? <Sun size={size} /> : <Moon size={size} />}
    </button>
  );
}


