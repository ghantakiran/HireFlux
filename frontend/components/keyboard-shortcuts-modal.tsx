/**
 * Keyboard Shortcuts Modal (Issue #149)
 *
 * Displays all available keyboard shortcuts grouped by category
 * Triggered by pressing "?" (Shift+/)
 */

'use client';

import { useEffect, useRef } from 'react';
import { isMac } from '../hooks/useKeyboardShortcuts';

export interface ShortcutGroup {
  category: string;
  shortcuts: Array<{
    keys: string;
    description: string;
  }>;
}

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const useMac = isMac();

  // Platform-specific modifier key
  const modKey = useMac ? 'Cmd' : 'Ctrl';

  const shortcutGroups: ShortcutGroup[] = [
    {
      category: 'Navigation',
      shortcuts: [
        { keys: '/', description: 'Open global search' },
        { keys: `${modKey}+K`, description: 'Open command palette' },
        { keys: 'Tab', description: 'Move to next element' },
        { keys: 'Shift+Tab', description: 'Move to previous element' },
      ],
    },
    {
      category: 'Actions',
      shortcuts: [
        { keys: 'Enter', description: 'Activate button or link' },
        { keys: 'Space', description: 'Activate button or scroll page' },
        { keys: 'Escape', description: 'Close modals and dropdowns' },
        { keys: '?', description: 'Show this help dialog' },
      ],
    },
    {
      category: 'Accessibility',
      shortcuts: [
        { keys: 'Tab (first)', description: 'Skip to main content' },
        { keys: 'Arrow Keys', description: 'Navigate menus and lists' },
        { keys: 'Home', description: 'Jump to beginning' },
        { keys: 'End', description: 'Jump to end' },
      ],
    },
  ];

  // Focus trap and Escape handling
  useEffect(() => {
    if (!isOpen) return;

    // Focus the close button when modal opens
    setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 100);

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Focus trap
    const handleTab = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;

      const focusableElements = modalRef.current?.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );

      if (!focusableElements || focusableElements.length === 0) return;

      const firstElement = focusableElements[0] as HTMLElement;
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

      if (e.shiftKey) {
        // Shift+Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement.focus();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.addEventListener('keydown', handleTab);

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.removeEventListener('keydown', handleTab);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[9999] w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-white dark:bg-gray-900 rounded-lg shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <h2 id="shortcuts-title" className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Keyboard Shortcuts
          </h2>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="rounded-md p-2 text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Close keyboard shortcuts"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-8">
          {shortcutGroups.map((group) => (
            <div key={group.category}>
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                {group.category}
              </h3>
              <div className="space-y-2">
                {group.shortcuts.map((shortcut, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between py-2 px-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-800"
                  >
                    <span className="text-sm text-gray-700 dark:text-gray-300">{shortcut.description}</span>
                    <kbd className="inline-flex items-center gap-1 rounded border border-gray-200 dark:border-gray-700 bg-gray-100 dark:bg-gray-800 px-2 py-1 text-xs font-mono text-gray-600 dark:text-gray-400">
                      {shortcut.keys}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            Press <kbd className="px-1 py-0.5 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded text-gray-600 dark:text-gray-400">Esc</kbd> to close
          </p>
        </div>
      </div>
    </>
  );
}
