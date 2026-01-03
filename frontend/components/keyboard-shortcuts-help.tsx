'use client';

/**
 * Keyboard Shortcuts Help Dialog (Issue #149 + Issue #155)
 *
 * Displays available keyboard shortcuts when user presses '?'
 * Provides documentation for all keyboard navigation features.
 * Enhanced with customization support (Issue #155).
 */

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Keyboard, Settings } from 'lucide-react';
import { KeyboardShortcutsCustomization } from './keyboard-shortcuts-customization';
import { useShortcuts, useKeyboardShortcutsRegistry } from '@/hooks/use-keyboard-shortcuts-registry';

export function KeyboardShortcutsHelp() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCustomization, setShowCustomization] = useState(false);
  const shortcuts = useShortcuts();
  const registry = useKeyboardShortcutsRegistry();

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    if (!acc[shortcut.category]) {
      acc[shortcut.category] = [];
    }
    acc[shortcut.category].push(shortcut);
    return acc;
  }, {} as Record<string, typeof shortcuts>);

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
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent
          className="max-w-2xl"
          data-testid="keyboard-shortcuts-help"
          aria-label="Keyboard shortcuts reference"
        >
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                <DialogTitle>Keyboard Shortcuts</DialogTitle>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setIsOpen(false);
                  setShowCustomization(true);
                }}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Customize
              </Button>
            </div>
            <DialogDescription>
              Navigate the application efficiently using your keyboard
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[60vh] overflow-y-auto pr-4">
            <div className="space-y-6">
              {Object.entries(groupedShortcuts).map(([category, categoryShortcuts]) => (
                <div key={category}>
                  <h3 className="mb-3 text-sm font-semibold text-foreground">
                    {category}
                  </h3>
                  <div className="space-y-2">
                    {categoryShortcuts.map((shortcut) => {
                      const keys = registry.getEffectiveKeys(shortcut.id);
                      const enabled = registry.isEnabled(shortcut.id);

                      return (
                        <div
                          key={shortcut.id}
                          className={`flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 ${
                            !enabled ? 'opacity-50' : ''
                          }`}
                        >
                          <span className="text-sm text-muted-foreground">
                            {shortcut.description}
                          </span>
                          <div className="flex items-center gap-1">
                            {keys.map((key, keyIndex) => {
                              // Display platform-specific modifiers using registry
                              let displayKey = key;
                              if (key === 'meta' || key === 'ctrl') {
                                // Use registry's platform-aware display method
                                displayKey = registry.getPlatformModifierDisplay();
                              }

                              return (
                                <span key={keyIndex} className="flex items-center gap-1">
                                  {keyIndex > 0 && (
                                    <span className="text-xs text-muted-foreground">then</span>
                                  )}
                                  <kbd className="rounded border border-border bg-background px-2 py-1 text-xs font-mono shadow-sm">
                                    {displayKey}
                                  </kbd>
                                </span>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
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
              Click <strong>Customize</strong> to personalize your shortcuts.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <KeyboardShortcutsCustomization
        isOpen={showCustomization}
        onClose={() => setShowCustomization(false)}
      />
    </>
  );
}
