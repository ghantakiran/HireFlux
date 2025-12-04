'use client';

/**
 * Keyboard Navigation Provider (Issue #149)
 *
 * Wraps the application and initializes global keyboard navigation.
 * Provides keyboard shortcuts for navigation throughout the app.
 */

import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';

export function KeyboardNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  // Initialize global keyboard navigation
  useKeyboardNavigation();

  return <>{children}</>;
}
