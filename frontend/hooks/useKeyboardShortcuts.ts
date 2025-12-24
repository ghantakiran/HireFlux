/**
 * useKeyboardShortcuts Hook (Issue #149)
 *
 * Global keyboard shortcuts for HireFlux application
 * Implements platform-specific modifiers (Cmd on Mac, Ctrl on Windows/Linux)
 *
 * Features:
 * - / : Open global search
 * - ? : Open keyboard shortcuts help
 * - Ctrl+K / Cmd+K : Open command palette
 * - Escape : Close modals/dropdowns
 */

'use client';

import { useEffect, useCallback } from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  description: string;
  action: () => void;
}

export interface UseKeyboardShortcutsOptions {
  shortcuts: KeyboardShortcut[];
  /**
   * Disable shortcuts when user is typing in input fields
   * Default: true
   */
  disableInInputs?: boolean;
  /**
   * Enable shortcuts globally or only when component is mounted
   * Default: true
   */
  enabled?: boolean;
}

/**
 * Detect if user is on Mac (for Cmd vs Ctrl)
 */
export const isMac = () => {
  if (typeof window === 'undefined') return false;
  return navigator.platform.toUpperCase().indexOf('MAC') >= 0;
};

/**
 * Check if active element is an input field
 */
const isInputElement = (element: Element | null): boolean => {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();
  const isContentEditable = element.getAttribute('contenteditable') === 'true';

  return (
    tagName === 'input' ||
    tagName === 'textarea' ||
    tagName === 'select' ||
    isContentEditable
  );
};

/**
 * Hook for managing keyboard shortcuts
 */
export function useKeyboardShortcuts({
  shortcuts,
  disableInInputs = true,
  enabled = true,
}: UseKeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return;

      // Disable shortcuts in input fields if configured
      if (disableInInputs && isInputElement(document.activeElement)) {
        return;
      }

      // Find matching shortcut
      const matchedShortcut = shortcuts.find((shortcut) => {
        const keyMatches = event.key.toLowerCase() === shortcut.key.toLowerCase();
        const ctrlMatches = shortcut.ctrlKey ? event.ctrlKey : !event.ctrlKey;
        const metaMatches = shortcut.metaKey ? event.metaKey : !event.metaKey;
        const shiftMatches = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
        const altMatches = shortcut.altKey ? event.altKey : !event.altKey;

        return keyMatches && ctrlMatches && metaMatches && shiftMatches && altMatches;
      });

      if (matchedShortcut) {
        event.preventDefault();
        event.stopPropagation();
        matchedShortcut.action();
      }
    },
    [shortcuts, disableInInputs, enabled]
  );

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown, enabled]);
}

/**
 * Format shortcut keys for display
 * Converts Meta/Ctrl based on platform
 */
export function formatShortcutKeys(shortcut: Omit<KeyboardShortcut, 'action' | 'description'>): string {
  const parts: string[] = [];
  const useMac = isMac();

  if (shortcut.ctrlKey && !useMac) {
    parts.push('Ctrl');
  }

  if (shortcut.metaKey && useMac) {
    parts.push('Cmd');
  }

  if (shortcut.altKey) {
    parts.push(useMac ? 'Option' : 'Alt');
  }

  if (shortcut.shiftKey) {
    parts.push('Shift');
  }

  // Capitalize the key
  parts.push(shortcut.key.toUpperCase());

  return parts.join('+');
}

/**
 * Pre-defined global shortcuts for HireFlux
 */
export const createGlobalShortcuts = (handlers: {
  onOpenSearch: () => void;
  onOpenCommandPalette: () => void;
  onOpenShortcutsHelp: () => void;
}): KeyboardShortcut[] => [
  {
    key: '/',
    description: 'Open global search',
    action: handlers.onOpenSearch,
  },
  {
    key: 'k',
    ctrlKey: !isMac(),
    metaKey: isMac(),
    description: 'Open command palette',
    action: handlers.onOpenCommandPalette,
  },
  {
    key: '/',
    shiftKey: true, // Shift+/ to show shortcuts help
    description: 'Show keyboard shortcuts',
    action: handlers.onOpenShortcutsHelp,
  },
];
