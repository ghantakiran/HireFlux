'use client';

/**
 * Keyboard Navigation Provider (Issue #149 + Issue #155)
 *
 * Wraps the application and initializes global keyboard navigation.
 * Provides keyboard shortcuts for navigation throughout the app.
 * Enhanced with centralized registry system (Issue #155).
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getKeyboardShortcutsRegistry } from '@/lib/keyboard-shortcuts-registry';
import { useKeyboardEventHandler } from '@/hooks/use-keyboard-shortcuts-registry';

export function KeyboardNavigationProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  // Initialize shortcuts registry
  useEffect(() => {
    const registry = getKeyboardShortcutsRegistry();

    // Register navigation shortcuts
    registry.register({
      id: 'navigate-home',
      category: 'Navigation',
      description: 'Go to Home',
      defaultKeys: ['g', 'h'],
      action: () => router.push('/'),
    });

    registry.register({
      id: 'navigate-dashboard',
      category: 'Navigation',
      description: 'Go to Dashboard',
      defaultKeys: ['g', 'd'],
      action: () => router.push('/dashboard'),
    });

    registry.register({
      id: 'navigate-jobs',
      category: 'Navigation',
      description: 'Go to Jobs',
      defaultKeys: ['g', 'j'],
      action: () => router.push('/jobs'),
    });

    registry.register({
      id: 'navigate-resume',
      category: 'Navigation',
      description: 'Go to Resumes',
      defaultKeys: ['g', 'r'],
      action: () => router.push('/resume'),
    });

    registry.register({
      id: 'navigate-applications',
      category: 'Navigation',
      description: 'Go to Applications',
      defaultKeys: ['g', 'a'],
      action: () => router.push('/applications'),
    });

    registry.register({
      id: 'navigate-cover-letter',
      category: 'Navigation',
      description: 'Go to Cover Letters',
      defaultKeys: ['g', 'c'],
      action: () => router.push('/cover-letter'),
    });

    registry.register({
      id: 'navigate-settings',
      category: 'Navigation',
      description: 'Go to Settings',
      defaultKeys: ['g', 's'],
      action: () => router.push('/settings'),
    });

    // Register action shortcuts
    registry.register({
      id: 'help',
      category: 'Actions',
      description: 'Show keyboard shortcuts help',
      defaultKeys: ['?'],
      action: () => {
        // Handled by KeyboardShortcutsHelp component
      },
    });

    // Register form shortcuts
    registry.register({
      id: 'form-next',
      category: 'Forms',
      description: 'Move to next interactive element',
      defaultKeys: ['Tab'],
      action: () => {
        // Native browser behavior
      },
    });

    registry.register({
      id: 'form-previous',
      category: 'Forms',
      description: 'Move to previous field',
      defaultKeys: ['Shift', 'Tab'],
      action: () => {
        // Native browser behavior
      },
    });

    registry.register({
      id: 'form-submit',
      category: 'Forms',
      description: 'Submit form',
      defaultKeys: ['Enter'],
      action: () => {
        // Native browser behavior
      },
    });

    registry.register({
      id: 'cancel',
      category: 'Forms',
      description: 'Close modal',
      defaultKeys: ['Escape'],
      action: () => {
        // Handled by individual components
      },
    });

    // Register accessibility shortcuts
    registry.register({
      id: 'skip-link',
      category: 'Accessibility',
      description: 'Focus skip link (first Tab)',
      defaultKeys: ['Tab'],
      action: () => {
        // Native browser behavior
      },
    });

    registry.register({
      id: 'activate-skip',
      category: 'Accessibility',
      description: 'Activate skip link',
      defaultKeys: ['Enter'],
      action: () => {
        // Native browser behavior
      },
    });

    return () => {
      // Cleanup shortcuts on unmount
      registry.unregister('navigate-home');
      registry.unregister('navigate-dashboard');
      registry.unregister('navigate-jobs');
      registry.unregister('navigate-resume');
      registry.unregister('navigate-applications');
      registry.unregister('navigate-cover-letter');
      registry.unregister('navigate-settings');
      registry.unregister('help');
      registry.unregister('form-next');
      registry.unregister('form-previous');
      registry.unregister('form-submit');
      registry.unregister('cancel');
      registry.unregister('skip-link');
      registry.unregister('activate-skip');
    };
  }, [router]);

  // Handle keyboard events via registry
  useKeyboardEventHandler();

  return <>{children}</>;
}
