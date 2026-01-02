/**
 * Keyboard Shortcuts Registry (Issue #155)
 *
 * Centralized system for managing keyboard shortcuts with:
 * - Registry of all shortcuts
 * - Customization support
 * - Conflict detection
 * - Platform-specific handling (Cmd/Ctrl)
 * - Persistence (localStorage)
 */

export type ShortcutKey = string;
export type ShortcutSequence = ShortcutKey[];

export interface ShortcutDefinition {
  id: string;
  category: string;
  description: string;
  defaultKeys: ShortcutSequence;
  action: () => void | Promise<void>;
  enabled?: boolean;
  platformSpecific?: boolean; // Auto-convert Ctrl/Cmd
}

export interface ShortcutCustomization {
  keys: ShortcutSequence;
  enabled: boolean;
}

export interface ShortcutRegistryConfig {
  storageKey?: string;
  sequenceTimeout?: number; // ms
}

/**
 * Keyboard Shortcuts Registry
 *
 * Manages all keyboard shortcuts in a centralized way.
 * Supports customization, conflict detection, and persistence.
 */
export class KeyboardShortcutsRegistry {
  private shortcuts: Map<string, ShortcutDefinition> = new Map();
  private customizations: Map<string, ShortcutCustomization> = new Map();
  private sequenceBuffer: string[] = [];
  private sequenceTimeout: NodeJS.Timeout | null = null;
  private listeners: Set<() => void> = new Set();

  private config: Required<ShortcutRegistryConfig> = {
    storageKey: 'keyboard-shortcuts',
    sequenceTimeout: 1000,
  };

  constructor(config?: ShortcutRegistryConfig) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.loadCustomizations();
  }

  /**
   * Register a new shortcut
   */
  register(shortcut: ShortcutDefinition): void {
    // Check for conflicts
    const existingShortcut = this.findShortcutByKeys(shortcut.defaultKeys);
    if (existingShortcut && existingShortcut.id !== shortcut.id) {
      console.warn(
        `Shortcut conflict: ${shortcut.id} uses same keys as ${existingShortcut.id}`
      );
    }

    this.shortcuts.set(shortcut.id, {
      ...shortcut,
      enabled: shortcut.enabled !== undefined ? shortcut.enabled : true,
    });
    this.notifyListeners();
  }

  /**
   * Unregister a shortcut
   */
  unregister(id: string): void {
    this.shortcuts.delete(id);
    this.customizations.delete(id);
    this.notifyListeners();
  }

  /**
   * Get all registered shortcuts
   */
  getAllShortcuts(): ShortcutDefinition[] {
    return Array.from(this.shortcuts.values());
  }

  /**
   * Get shortcuts by category
   */
  getShortcutsByCategory(category: string): ShortcutDefinition[] {
    return this.getAllShortcuts().filter((s) => s.category === category);
  }

  /**
   * Get effective keys for a shortcut (customized or default)
   */
  getEffectiveKeys(id: string): ShortcutSequence {
    const customization = this.customizations.get(id);
    if (customization) {
      return customization.keys;
    }

    const shortcut = this.shortcuts.get(id);
    return shortcut?.defaultKeys || [];
  }

  /**
   * Check if a shortcut is enabled
   */
  isEnabled(id: string): boolean {
    const customization = this.customizations.get(id);
    if (customization !== undefined) {
      return customization.enabled;
    }

    const shortcut = this.shortcuts.get(id);
    return shortcut?.enabled !== false;
  }

  /**
   * Customize a shortcut
   */
  customize(id: string, keys: ShortcutSequence, enabled: boolean = true): void {
    const shortcut = this.shortcuts.get(id);
    if (!shortcut) {
      throw new Error(`Shortcut ${id} not found`);
    }

    // Check for conflicts
    const conflictingShortcut = this.findShortcutByKeys(keys);
    if (conflictingShortcut && conflictingShortcut.id !== id) {
      throw new Error(
        `Shortcut conflict: ${keys.join(' ')} is already used by ${conflictingShortcut.id}`
      );
    }

    this.customizations.set(id, { keys, enabled });
    this.saveCustomizations();
    this.notifyListeners();
  }

  /**
   * Reset a shortcut to default
   */
  resetToDefault(id: string): void {
    this.customizations.delete(id);
    this.saveCustomizations();
    this.notifyListeners();
  }

  /**
   * Reset all shortcuts to defaults
   */
  resetAllToDefaults(): void {
    this.customizations.clear();
    this.saveCustomizations();
    this.notifyListeners();
  }

  /**
   * Enable/disable a shortcut
   */
  setEnabled(id: string, enabled: boolean): void {
    const existingCustomization = this.customizations.get(id);
    const keys = existingCustomization?.keys || this.getEffectiveKeys(id);

    this.customizations.set(id, { keys, enabled });
    this.saveCustomizations();
    this.notifyListeners();
  }

  /**
   * Find shortcut by keys
   */
  private findShortcutByKeys(keys: ShortcutSequence): ShortcutDefinition | null {
    const keysStr = keys.join(' ');

    for (const [id, shortcut] of this.shortcuts) {
      const effectiveKeys = this.getEffectiveKeys(id);
      if (effectiveKeys.join(' ') === keysStr) {
        return shortcut;
      }
    }

    return null;
  }

  /**
   * Check if keys conflict with existing shortcuts
   */
  checkConflict(keys: ShortcutSequence, excludeId?: string): ShortcutDefinition | null {
    const conflicting = this.findShortcutByKeys(keys);
    if (conflicting && conflicting.id !== excludeId) {
      return conflicting;
    }
    return null;
  }

  /**
   * Handle keyboard event
   */
  handleKeyEvent(event: KeyboardEvent): boolean {
    // Ignore if typing in input
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return false;
    }

    // Ignore if modifier keys (except Shift for sequences)
    if (event.ctrlKey || event.metaKey || event.altKey) {
      // Handle modifier shortcuts separately (e.g., Cmd+K)
      return this.handleModifierShortcut(event);
    }

    // Add key to sequence buffer
    const key = event.key.toLowerCase();
    this.sequenceBuffer.push(key);

    // Clear existing timeout
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
    }

    // Set timeout to clear buffer
    this.sequenceTimeout = setTimeout(() => {
      this.sequenceBuffer = [];
    }, this.config.sequenceTimeout);

    // Check for matching shortcuts
    const matchingShortcut = this.findMatchingShortcut();
    if (matchingShortcut && this.isEnabled(matchingShortcut.id)) {
      event.preventDefault();
      this.sequenceBuffer = [];
      matchingShortcut.action();
      return true;
    }

    return false;
  }

  /**
   * Handle modifier shortcuts (Cmd+K, Ctrl+K, etc.)
   */
  private handleModifierShortcut(event: KeyboardEvent): boolean {
    const key = event.key.toLowerCase();
    const modifiers: string[] = [];

    if (event.ctrlKey || event.metaKey) {
      modifiers.push(this.getPlatformModifier());
    }
    if (event.shiftKey) modifiers.push('shift');
    if (event.altKey) modifiers.push('alt');

    modifiers.push(key);

    const matchingShortcut = this.findShortcutByKeys(modifiers);
    if (matchingShortcut && this.isEnabled(matchingShortcut.id)) {
      event.preventDefault();
      matchingShortcut.action();
      return true;
    }

    return false;
  }

  /**
   * Find matching shortcut from sequence buffer
   */
  private findMatchingShortcut(): ShortcutDefinition | null {
    for (const shortcut of this.shortcuts.values()) {
      const effectiveKeys = this.getEffectiveKeys(shortcut.id);

      // Check if buffer matches shortcut keys
      if (this.sequenceMatches(this.sequenceBuffer, effectiveKeys)) {
        return shortcut;
      }
    }

    return null;
  }

  /**
   * Check if sequence matches keys
   */
  private sequenceMatches(buffer: string[], keys: string[]): boolean {
    if (buffer.length !== keys.length) return false;

    for (let i = 0; i < buffer.length; i++) {
      if (buffer[i].toLowerCase() !== keys[i].toLowerCase()) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get platform-specific modifier key
   */
  getPlatformModifier(): string {
    if (typeof window === 'undefined') return 'ctrl';

    const platform = window.navigator.platform.toLowerCase();
    return platform.includes('mac') ? 'meta' : 'ctrl';
  }

  /**
   * Get platform-specific modifier display
   */
  getPlatformModifierDisplay(): string {
    return this.getPlatformModifier() === 'meta' ? '⌘' : 'Ctrl';
  }

  /**
   * Save customizations to localStorage
   */
  private saveCustomizations(): void {
    if (typeof window === 'undefined') return;

    try {
      const data: Record<string, ShortcutCustomization> = {};
      for (const [id, customization] of this.customizations) {
        data[id] = customization;
      }

      localStorage.setItem(this.config.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save keyboard shortcuts:', error);
      throw new Error('Unable to save shortcuts. Storage quota may be exceeded.');
    }
  }

  /**
   * Load customizations from localStorage
   */
  private loadCustomizations(): void {
    if (typeof window === 'undefined') return;

    try {
      const data = localStorage.getItem(this.config.storageKey);
      if (data) {
        const customizations: Record<string, ShortcutCustomization> = JSON.parse(data);
        for (const [id, customization] of Object.entries(customizations)) {
          this.customizations.set(id, customization);
        }
      }
    } catch (error) {
      console.error('Failed to load keyboard shortcuts:', error);
    }
  }

  /**
   * Export customizations as JSON
   */
  export(): string {
    const data: Record<string, ShortcutCustomization> = {};
    for (const [id, customization] of this.customizations) {
      data[id] = customization;
    }
    return JSON.stringify(data, null, 2);
  }

  /**
   * Import customizations from JSON
   */
  import(json: string): void {
    try {
      const data: Record<string, ShortcutCustomization> = JSON.parse(json);

      // Validate data
      for (const [id, customization] of Object.entries(data)) {
        if (!this.shortcuts.has(id)) {
          throw new Error(`Unknown shortcut: ${id}`);
        }

        // Check for conflicts
        const conflict = this.checkConflict(customization.keys, id);
        if (conflict) {
          throw new Error(
            `Shortcut conflict: ${customization.keys.join(' ')} is already used by ${conflict.id}`
          );
        }
      }

      // Apply customizations
      this.customizations.clear();
      for (const [id, customization] of Object.entries(data)) {
        this.customizations.set(id, customization);
      }

      this.saveCustomizations();
      this.notifyListeners();
    } catch (error) {
      throw new Error(`Failed to import shortcuts: ${error}`);
    }
  }

  /**
   * Listen for changes
   */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Notify listeners of changes
   */
  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.sequenceTimeout) {
      clearTimeout(this.sequenceTimeout);
    }
    this.listeners.clear();
  }
}

// Global singleton instance
let globalRegistry: KeyboardShortcutsRegistry | null = null;

/**
 * Get global registry instance
 */
export function getKeyboardShortcutsRegistry(): KeyboardShortcutsRegistry {
  if (!globalRegistry) {
    globalRegistry = new KeyboardShortcutsRegistry();
  }
  return globalRegistry;
}

/**
 * Reset global registry (useful for testing)
 */
export function resetKeyboardShortcutsRegistry(): void {
  if (globalRegistry) {
    globalRegistry.destroy();
  }
  globalRegistry = null;
}
