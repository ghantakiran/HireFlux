/**
 * Unit Tests for KeyboardShortcutsRegistry (Issue #155)
 *
 * Testing strategy: Unit tests are more reliable than E2E for core logic
 * Following TDD/BDD principles with clear Given/When/Then structure
 */

import {
  KeyboardShortcutsRegistry,
  getKeyboardShortcutsRegistry,
  resetKeyboardShortcutsRegistry,
} from '../keyboard-shortcuts-registry';

describe('KeyboardShortcutsRegistry', () => {
  let registry: KeyboardShortcutsRegistry;

  beforeEach(() => {
    // Reset global registry before each test
    resetKeyboardShortcutsRegistry();
    registry = new KeyboardShortcutsRegistry();

    // Clear localStorage
    localStorage.clear();
  });

  afterEach(() => {
    registry.destroy();
  });

  describe('1. Shortcut Registration', () => {
    it('should register a new shortcut', () => {
      // Given
      const shortcut = {
        id: 'test-shortcut',
        category: 'Test',
        description: 'Test shortcut',
        defaultKeys: ['t', 'e', 's', 't'],
        action: jest.fn(),
      };

      // When
      registry.register(shortcut);

      // Then
      const shortcuts = registry.getAllShortcuts();
      expect(shortcuts).toHaveLength(1);
      expect(shortcuts[0].id).toBe('test-shortcut');
      expect(shortcuts[0].category).toBe('Test');
    });

    it('should enable shortcut by default', () => {
      // Given
      const shortcut = {
        id: 'enabled-shortcut',
        category: 'Test',
        description: 'Enabled by default',
        defaultKeys: ['e'],
        action: jest.fn(),
      };

      // When
      registry.register(shortcut);

      // Then
      expect(registry.isEnabled('enabled-shortcut')).toBe(true);
    });

    it('should allow disabling shortcut during registration', () => {
      // Given
      const shortcut = {
        id: 'disabled-shortcut',
        category: 'Test',
        description: 'Disabled shortcut',
        defaultKeys: ['d'],
        action: jest.fn(),
        enabled: false,
      };

      // When
      registry.register(shortcut);

      // Then
      expect(registry.isEnabled('disabled-shortcut')).toBe(false);
    });

    it('should warn on duplicate shortcut keys', () => {
      // Given
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
      const shortcut1 = {
        id: 'shortcut-1',
        category: 'Test',
        description: 'First',
        defaultKeys: ['g', 'h'],
        action: jest.fn(),
      };
      const shortcut2 = {
        id: 'shortcut-2',
        category: 'Test',
        description: 'Second',
        defaultKeys: ['g', 'h'], // Same keys!
        action: jest.fn(),
      };

      // When
      registry.register(shortcut1);
      registry.register(shortcut2);

      // Then
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Shortcut conflict')
      );
      consoleWarnSpy.mockRestore();
    });
  });

  describe('2. Shortcut Unregistration', () => {
    it('should unregister a shortcut', () => {
      // Given
      registry.register({
        id: 'remove-me',
        category: 'Test',
        description: 'To be removed',
        defaultKeys: ['r'],
        action: jest.fn(),
      });

      // When
      registry.unregister('remove-me');

      // Then
      const shortcuts = registry.getAllShortcuts();
      expect(shortcuts).toHaveLength(0);
    });

    it('should remove customizations when unregistering', () => {
      // Given
      registry.register({
        id: 'custom-shortcut',
        category: 'Test',
        description: 'Customized',
        defaultKeys: ['c'],
        action: jest.fn(),
      });
      registry.customize('custom-shortcut', ['x'], true);

      // When
      registry.unregister('custom-shortcut');

      // Then
      const shortcuts = registry.getAllShortcuts();
      expect(shortcuts).toHaveLength(0);
    });
  });

  describe('3. Shortcut Customization', () => {
    beforeEach(() => {
      registry.register({
        id: 'customizable',
        category: 'Test',
        description: 'Can be customized',
        defaultKeys: ['c', 's', 't'],
        action: jest.fn(),
      });
    });

    it('should allow customizing shortcut keys', () => {
      // Given
      const newKeys = ['n', 'e', 'w'];

      // When
      registry.customize('customizable', newKeys);

      // Then
      expect(registry.getEffectiveKeys('customizable')).toEqual(newKeys);
    });

    it('should persist customizations to localStorage', () => {
      // Given
      const newKeys = ['p', 'e', 'r'];

      // When
      registry.customize('customizable', newKeys);

      // Then
      const stored = localStorage.getItem('keyboard-shortcuts');
      expect(stored).toBeTruthy();
      const data = JSON.parse(stored!);
      expect(data['customizable'].keys).toEqual(newKeys);
    });

    it('should throw error if customizing non-existent shortcut', () => {
      // When/Then
      expect(() => {
        registry.customize('non-existent', ['x']);
      }).toThrow('Shortcut non-existent not found');
    });

    it('should throw error on conflicting customization', () => {
      // Given
      registry.register({
        id: 'existing',
        category: 'Test',
        description: 'Already uses these keys',
        defaultKeys: ['e', 'x'],
        action: jest.fn(),
      });

      // When/Then
      expect(() => {
        registry.customize('customizable', ['e', 'x']);
      }).toThrow('Shortcut conflict');
    });
  });

  describe('4. Reset to Defaults', () => {
    beforeEach(() => {
      registry.register({
        id: 'resettable',
        category: 'Test',
        description: 'Can be reset',
        defaultKeys: ['r', 's', 't'],
        action: jest.fn(),
      });
    });

    it('should reset single shortcut to default', () => {
      // Given
      registry.customize('resettable', ['c', 'u', 's']);

      // When
      registry.resetToDefault('resettable');

      // Then
      expect(registry.getEffectiveKeys('resettable')).toEqual(['r', 's', 't']);
    });

    it('should reset all shortcuts to defaults', () => {
      // Given
      registry.register({
        id: 'another',
        category: 'Test',
        description: 'Another',
        defaultKeys: ['a'],
        action: jest.fn(),
      });
      registry.customize('resettable', ['x']);
      registry.customize('another', ['y']);

      // When
      registry.resetAllToDefaults();

      // Then
      expect(registry.getEffectiveKeys('resettable')).toEqual(['r', 's', 't']);
      expect(registry.getEffectiveKeys('another')).toEqual(['a']);
    });
  });

  describe('5. Platform Detection', () => {
    it('should detect Mac platform', () => {
      // Given
      Object.defineProperty(window.navigator, 'platform', {
        get: () => 'MacIntel',
        configurable: true,
      });

      // When
      const modifier = registry.getPlatformModifier();

      // Then
      expect(modifier).toBe('meta');
    });

    it('should detect Windows platform', () => {
      // Given
      Object.defineProperty(window.navigator, 'platform', {
        get: () => 'Win32',
        configurable: true,
      });

      // When
      const modifier = registry.getPlatformModifier();

      // Then
      expect(modifier).toBe('ctrl');
    });

    it('should detect Linux platform', () => {
      // Given
      Object.defineProperty(window.navigator, 'platform', {
        get: () => 'Linux x86_64',
        configurable: true,
      });

      // When
      const modifier = registry.getPlatformModifier();

      // Then
      expect(modifier).toBe('ctrl');
    });

    it('should display ⌘ for Mac', () => {
      // Given
      Object.defineProperty(window.navigator, 'platform', {
        get: () => 'MacIntel',
        configurable: true,
      });

      // When
      const display = registry.getPlatformModifierDisplay();

      // Then
      expect(display).toBe('⌘');
    });

    it('should display Ctrl for Windows/Linux', () => {
      // Given
      Object.defineProperty(window.navigator, 'platform', {
        get: () => 'Win32',
        configurable: true,
      });

      // When
      const display = registry.getPlatformModifierDisplay();

      // Then
      expect(display).toBe('Ctrl');
    });
  });

  describe('6. Conflict Detection', () => {
    beforeEach(() => {
      registry.register({
        id: 'existing',
        category: 'Test',
        description: 'Existing shortcut',
        defaultKeys: ['e', 'x'],
        action: jest.fn(),
      });
    });

    it('should detect conflicting keys', () => {
      // When
      const conflict = registry.checkConflict(['e', 'x']);

      // Then
      expect(conflict).toBeTruthy();
      expect(conflict?.id).toBe('existing');
    });

    it('should not detect conflict with own shortcut', () => {
      // When
      const conflict = registry.checkConflict(['e', 'x'], 'existing');

      // Then
      expect(conflict).toBeNull();
    });

    it('should not detect conflict with different keys', () => {
      // When
      const conflict = registry.checkConflict(['n', 'e', 'w']);

      // Then
      expect(conflict).toBeNull();
    });
  });

  describe('7. Enable/Disable Shortcuts', () => {
    beforeEach(() => {
      registry.register({
        id: 'toggleable',
        category: 'Test',
        description: 'Can be toggled',
        defaultKeys: ['t'],
        action: jest.fn(),
      });
    });

    it('should disable a shortcut', () => {
      // When
      registry.setEnabled('toggleable', false);

      // Then
      expect(registry.isEnabled('toggleable')).toBe(false);
    });

    it('should enable a disabled shortcut', () => {
      // Given
      registry.setEnabled('toggleable', false);

      // When
      registry.setEnabled('toggleable', true);

      // Then
      expect(registry.isEnabled('toggleable')).toBe(true);
    });

    it('should persist enabled state', () => {
      // When
      registry.setEnabled('toggleable', false);

      // Then
      const stored = localStorage.getItem('keyboard-shortcuts');
      const data = JSON.parse(stored!);
      expect(data['toggleable'].enabled).toBe(false);
    });
  });

  describe('8. Import/Export', () => {
    beforeEach(() => {
      registry.register({
        id: 'exportable',
        category: 'Test',
        description: 'Can be exported',
        defaultKeys: ['e'],
        action: jest.fn(),
      });
    });

    it('should export customizations as JSON', () => {
      // Given
      registry.customize('exportable', ['c', 'u', 's']);

      // When
      const exported = registry.export();

      // Then
      const data = JSON.parse(exported);
      expect(data['exportable'].keys).toEqual(['c', 'u', 's']);
    });

    it('should import customizations from JSON', () => {
      // Given
      const json = JSON.stringify({
        exportable: {
          keys: ['i', 'm', 'p'],
          enabled: true,
        },
      });

      // When
      registry.import(json);

      // Then
      expect(registry.getEffectiveKeys('exportable')).toEqual(['i', 'm', 'p']);
    });

    it('should reject invalid import JSON', () => {
      // When/Then
      expect(() => {
        registry.import('invalid json');
      }).toThrow('Failed to import shortcuts');
    });

    it('should reject import with unknown shortcuts', () => {
      // Given
      const json = JSON.stringify({
        'unknown-shortcut': {
          keys: ['u'],
          enabled: true,
        },
      });

      // When/Then
      expect(() => {
        registry.import(json);
      }).toThrow('Unknown shortcut: unknown-shortcut');
    });
  });

  describe('9. Global Singleton', () => {
    it('should return same instance from getKeyboardShortcutsRegistry', () => {
      // When
      const instance1 = getKeyboardShortcutsRegistry();
      const instance2 = getKeyboardShortcutsRegistry();

      // Then
      expect(instance1).toBe(instance2);
    });

    it('should create new instance after reset', () => {
      // Given
      const instance1 = getKeyboardShortcutsRegistry();

      // When
      resetKeyboardShortcutsRegistry();
      const instance2 = getKeyboardShortcutsRegistry();

      // Then
      expect(instance1).not.toBe(instance2);
    });
  });

  describe('10. Change Listeners', () => {
    it('should notify listeners on registration', () => {
      // Given
      const listener = jest.fn();
      registry.onChange(listener);

      // When
      registry.register({
        id: 'notify',
        category: 'Test',
        description: 'Notifies',
        defaultKeys: ['n'],
        action: jest.fn(),
      });

      // Then
      expect(listener).toHaveBeenCalled();
    });

    it('should notify listeners on customization', () => {
      // Given
      registry.register({
        id: 'customize-notify',
        category: 'Test',
        description: 'Notifies on customize',
        defaultKeys: ['c'],
        action: jest.fn(),
      });
      const listener = jest.fn();
      registry.onChange(listener);

      // When
      registry.customize('customize-notify', ['x']);

      // Then
      expect(listener).toHaveBeenCalled();
    });

    it('should allow removing listeners', () => {
      // Given
      const listener = jest.fn();
      const unsubscribe = registry.onChange(listener);

      // When
      unsubscribe();
      registry.register({
        id: 'no-notify',
        category: 'Test',
        description: 'Should not notify',
        defaultKeys: ['n'],
        action: jest.fn(),
      });

      // Then
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('11. Category Filtering', () => {
    beforeEach(() => {
      registry.register({
        id: 'nav-1',
        category: 'Navigation',
        description: 'First nav',
        defaultKeys: ['n', '1'],
        action: jest.fn(),
      });
      registry.register({
        id: 'nav-2',
        category: 'Navigation',
        description: 'Second nav',
        defaultKeys: ['n', '2'],
        action: jest.fn(),
      });
      registry.register({
        id: 'action-1',
        category: 'Actions',
        description: 'First action',
        defaultKeys: ['a', '1'],
        action: jest.fn(),
      });
    });

    it('should get shortcuts by category', () => {
      // When
      const navShortcuts = registry.getShortcutsByCategory('Navigation');

      // Then
      expect(navShortcuts).toHaveLength(2);
      expect(navShortcuts[0].id).toBe('nav-1');
      expect(navShortcuts[1].id).toBe('nav-2');
    });

    it('should return empty array for non-existent category', () => {
      // When
      const shortcuts = registry.getShortcutsByCategory('NonExistent');

      // Then
      expect(shortcuts).toHaveLength(0);
    });
  });
});
