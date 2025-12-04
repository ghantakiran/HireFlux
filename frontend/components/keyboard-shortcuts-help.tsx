'use client';

/**
 * Keyboard Shortcuts Help Dialog (Issue #149)
 *
 * Displays available keyboard shortcuts when user presses '?'
 * Provides documentation for all keyboard navigation features.
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Keyboard } from 'lucide-react';

interface KeyboardShortcut {
  category: string;
  shortcuts: Array<{
    keys: string[];
    description: string;
  }>;
}

const SHORTCUTS: KeyboardShortcut[] = [
  {
    category: 'Navigation',
    shortcuts: [
      { keys: ['Tab'], description: 'Move to next interactive element' },
      { keys: ['Shift', 'Tab'], description: 'Move to previous interactive element' },
      { keys: ['g', 'h'], description: 'Go to Home' },
      { keys: ['g', 'd'], description: 'Go to Dashboard' },
      { keys: ['g', 'j'], description: 'Go to Jobs' },
      { keys: ['g', 'r'], description: 'Go to Resumes' },
      { keys: ['g', 'a'], description: 'Go to Applications' },
    ],
  },
  {
    category: 'Actions',
    shortcuts: [
      { keys: ['Escape'], description: 'Close modal/dropdown/popover' },
      { keys: ['Enter'], description: 'Activate button/link' },
      { keys: ['Space'], description: 'Toggle checkbox/button' },
      { keys: ['?'], description: 'Show keyboard shortcuts (this dialog)' },
    ],
  },
  {
    category: 'Forms',
    shortcuts: [
      { keys: ['Tab'], description: 'Move to next field' },
      { keys: ['Shift', 'Tab'], description: 'Move to previous field' },
      { keys: ['Enter'], description: 'Submit form' },
      { keys: ['Escape'], description: 'Cancel/close' },
    ],
  },
  {
    category: 'Accessibility',
    shortcuts: [
      { keys: ['Tab'], description: 'Focus skip link (first Tab)' },
      { keys: ['Enter'], description: 'Activate skip link' },
      { keys: ['Arrow Keys'], description: 'Navigate within components' },
    ],
  },
];

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Show shortcuts help with '?'
      if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        // Don't trigger if user is typing in an input
        const target = e.target as HTMLElement;
        if (
          target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable
        ) {
          return;
        }

        e.preventDefault();
        setIsOpen(true);
      }

      // Close with Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent
        className="max-w-2xl"
        data-testid="keyboard-shortcuts-help"
        aria-label="Keyboard shortcuts reference"
      >
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Keyboard className="h-5 w-5" />
            <DialogTitle>Keyboard Shortcuts</DialogTitle>
          </div>
          <DialogDescription>
            Navigate the application efficiently using your keyboard
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[60vh] overflow-y-auto pr-4">
          <div className="space-y-6">
            {SHORTCUTS.map((category) => (
              <div key={category.category}>
                <h3 className="mb-3 text-sm font-semibold text-foreground">
                  {category.category}
                </h3>
                <div className="space-y-2">
                  {category.shortcuts.map((shortcut, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2"
                    >
                      <span className="text-sm text-muted-foreground">
                        {shortcut.description}
                      </span>
                      <div className="flex items-center gap-1">
                        {shortcut.keys.map((key, keyIndex) => (
                          <span key={keyIndex} className="flex items-center gap-1">
                            {keyIndex > 0 && (
                              <span className="text-xs text-muted-foreground">then</span>
                            )}
                            <kbd className="rounded border border-border bg-background px-2 py-1 text-xs font-mono shadow-sm">
                              {key}
                            </kbd>
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4 rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
          <p>
            <strong>Tip:</strong> Press <kbd className="rounded bg-background px-1 py-0.5">?</kbd>{' '}
            at any time to show this help dialog. Press{' '}
            <kbd className="rounded bg-background px-1 py-0.5">Escape</kbd> to close it.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
