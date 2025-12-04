'use client';

/**
 * Keyboard Navigation Hook (Issue #149)
 *
 * Provides global keyboard shortcuts for navigation.
 * Implements common shortcuts like 'g + h' for home, 'g + d' for dashboard, etc.
 */

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface KeyboardShortcut {
  keys: string[];
  action: () => void;
  description: string;
}

/**
 * Hook to register global keyboard shortcuts
 */
export function useKeyboardNavigation() {
  const router = useRouter();

  useEffect(() => {
    let sequenceBuffer: string[] = [];
    let sequenceTimeout: NodeJS.Timeout | null = null;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable
      ) {
        return;
      }

      // Ignore if modifier keys are pressed (except Shift for Shift+Tab)
      if (e.ctrlKey || e.metaKey || e.altKey) {
        return;
      }

      // Add key to sequence buffer
      const key = e.key.toLowerCase();
      sequenceBuffer.push(key);

      // Clear existing timeout
      if (sequenceTimeout) {
        clearTimeout(sequenceTimeout);
      }

      // Set timeout to clear buffer after 1 second
      sequenceTimeout = setTimeout(() => {
        sequenceBuffer = [];
      }, 1000);

      // Check for matching shortcuts
      const sequence = sequenceBuffer.join(' ');

      // Navigation shortcuts (g + letter)
      if (sequenceBuffer.length === 2 && sequenceBuffer[0] === 'g') {
        const secondKey = sequenceBuffer[1];

        switch (secondKey) {
          case 'h':
            e.preventDefault();
            router.push('/');
            sequenceBuffer = [];
            break;

          case 'd':
            e.preventDefault();
            router.push('/dashboard');
            sequenceBuffer = [];
            break;

          case 'j':
            e.preventDefault();
            router.push('/jobs');
            sequenceBuffer = [];
            break;

          case 'r':
            e.preventDefault();
            router.push('/resume');
            sequenceBuffer = [];
            break;

          case 'a':
            e.preventDefault();
            router.push('/applications');
            sequenceBuffer = [];
            break;

          case 'c':
            e.preventDefault();
            router.push('/cover-letter');
            sequenceBuffer = [];
            break;

          case 's':
            e.preventDefault();
            router.push('/settings');
            sequenceBuffer = [];
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      if (sequenceTimeout) {
        clearTimeout(sequenceTimeout);
      }
    };
  }, [router]);
}

/**
 * Hook to handle focus trap in modals
 */
export function useFocusTrap(containerRef: React.RefObject<HTMLElement>, isActive: boolean) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    // Focus first element when trap activates
    firstElement?.focus();

    container.addEventListener('keydown', handleKeyDown);

    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, isActive]);
}

/**
 * Hook to restore focus when component unmounts
 */
export function useFocusRestore() {
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement;

    return () => {
      // Restore focus when component unmounts
      if (previouslyFocused && typeof previouslyFocused.focus === 'function') {
        previouslyFocused.focus();
      }
    };
  }, []);
}
