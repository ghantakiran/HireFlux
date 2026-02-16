/**
 * React Hook for Keyboard Shortcuts Registry (Issue #155)
 *
 * Provides React integration for the keyboard shortcuts registry.
 * Handles state updates and lifecycle management.
 */

'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  getKeyboardShortcutsRegistry,
  ShortcutDefinition,
  ShortcutSequence,
} from '@/lib/keyboard-shortcuts-registry';
import { downloadFile } from '@/lib/utils';

/**
 * Hook to use the global keyboard shortcuts registry
 */
export function useKeyboardShortcutsRegistry() {
  const [, setUpdateTrigger] = useState(0);
  const registry = getKeyboardShortcutsRegistry();

  // Force re-render when registry changes
  useEffect(() => {
    const unsubscribe = registry.onChange(() => {
      setUpdateTrigger((prev) => prev + 1);
    });

    return unsubscribe;
  }, [registry]);

  return registry;
}

/**
 * Hook to get all shortcuts
 */
export function useShortcuts() {
  const registry = useKeyboardShortcutsRegistry();
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>([]);

  useEffect(() => {
    const updateShortcuts = () => {
      setShortcuts(registry.getAllShortcuts());
    };

    updateShortcuts();
    const unsubscribe = registry.onChange(updateShortcuts);

    return unsubscribe;
  }, [registry]);

  return shortcuts;
}

/**
 * Hook to get shortcuts by category
 */
export function useShortcutsByCategory(category: string) {
  const registry = useKeyboardShortcutsRegistry();
  const [shortcuts, setShortcuts] = useState<ShortcutDefinition[]>([]);

  useEffect(() => {
    const updateShortcuts = () => {
      setShortcuts(registry.getShortcutsByCategory(category));
    };

    updateShortcuts();
    const unsubscribe = registry.onChange(updateShortcuts);

    return unsubscribe;
  }, [registry, category]);

  return shortcuts;
}

/**
 * Hook to customize shortcuts
 */
export function useShortcutCustomization(id: string) {
  const registry = useKeyboardShortcutsRegistry();
  const [keys, setKeys] = useState<ShortcutSequence>([]);
  const [enabled, setEnabled] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const updateState = () => {
      setKeys(registry.getEffectiveKeys(id));
      setEnabled(registry.isEnabled(id));
    };

    updateState();
    const unsubscribe = registry.onChange(updateState);

    return unsubscribe;
  }, [registry, id]);

  const customize = useCallback(
    (newKeys: ShortcutSequence, newEnabled: boolean = true) => {
      try {
        registry.customize(id, newKeys, newEnabled);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to customize shortcut');
        throw err;
      }
    },
    [registry, id]
  );

  const resetToDefault = useCallback(() => {
    registry.resetToDefault(id);
    setError(null);
  }, [registry, id]);

  const toggleEnabled = useCallback(() => {
    registry.setEnabled(id, !enabled);
  }, [registry, id, enabled]);

  const checkConflict = useCallback(
    (testKeys: ShortcutSequence) => {
      return registry.checkConflict(testKeys, id);
    },
    [registry, id]
  );

  return {
    keys,
    enabled,
    error,
    customize,
    resetToDefault,
    toggleEnabled,
    checkConflict,
  };
}

/**
 * Hook to export/import shortcuts
 */
export function useShortcutImportExport() {
  const registry = useKeyboardShortcutsRegistry();
  const [error, setError] = useState<string | null>(null);

  const exportShortcuts = useCallback(() => {
    try {
      const json = registry.export();
      downloadFile(json, `keyboard-shortcuts-${Date.now()}.json`, 'application/json');
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to export shortcuts';
      setError(message);
      throw new Error(message);
    }
  }, [registry]);

  const importShortcuts = useCallback(
    (file: File) => {
      return new Promise<void>((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
          try {
            const json = e.target?.result as string;
            registry.import(json);
            setError(null);
            resolve();
          } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to import shortcuts';
            setError(message);
            reject(new Error(message));
          }
        };

        reader.onerror = () => {
          const message = 'Failed to read file';
          setError(message);
          reject(new Error(message));
        };

        reader.readAsText(file);
      });
    },
    [registry]
  );

  return {
    error,
    exportShortcuts,
    importShortcuts,
  };
}

/**
 * Hook to handle keyboard events
 */
export function useKeyboardEventHandler() {
  const registry = useKeyboardShortcutsRegistry();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      registry.handleKeyEvent(event);
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [registry]);
}
