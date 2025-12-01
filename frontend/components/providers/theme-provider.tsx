/**
 * ThemeProvider - Provides theme context to the entire app
 * Issue #73: Design Tokens and Theming
 */

'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useTheme as useThemeHook, Theme, ResolvedTheme } from '@/hooks/use-theme';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: ResolvedTheme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const themeValue = useThemeHook();

  return (
    <ThemeContext.Provider value={themeValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
