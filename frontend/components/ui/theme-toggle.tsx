/**
 * ThemeToggle - UI component for switching themes
 * Issue #73: Design Tokens and Theming
 *
 * Displays in profile menu dropdown
 * Shows Sun icon for light theme, Moon icon for dark theme
 */

'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/components/providers/theme-provider';

export function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark');
  };

  return (
    <button
      onClick={toggleTheme}
      className="flex w-full items-center gap-3 px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
      data-theme-toggle
      aria-label={`Switch to ${resolvedTheme === 'dark' ? 'light' : 'dark'} mode`}
    >
      {resolvedTheme === 'dark' ? (
        <>
          <Sun className="h-4 w-4" data-icon="sun" />
          <span>Light Mode</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4" data-icon="moon" />
          <span>Dark Mode</span>
        </>
      )}
    </button>
  );
}
