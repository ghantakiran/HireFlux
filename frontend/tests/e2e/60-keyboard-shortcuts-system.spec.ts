/**
 * Keyboard Shortcuts System E2E Tests (Issue #155)
 *
 * Test suite for advanced keyboard shortcuts system with:
 * - Shortcut registry
 * - Customization
 * - Conflict detection
 * - Platform-specific shortcuts
 * - Persistence
 *
 * Methodology: TDD/BDD - RED → GREEN → REFACTOR
 */

import { test, expect, Page } from '@playwright/test';

test.describe('Keyboard Shortcuts System - Issue #155', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear only custom shortcuts, preserve auth tokens
    await page.evaluate(() => {
      // Remove only keyboard shortcuts storage
      localStorage.removeItem('keyboard-shortcuts');
      localStorage.removeItem('keyboard-shortcuts-customizations');
    });
  });

  test.describe('1. Shortcut Registry', () => {
    test('1.1 Should have centralized shortcut registry', async ({ page }) => {
      // Open keyboard shortcuts help modal with '?'
      await page.keyboard.press('?');

      // Verify modal is visible
      const modal = page.locator('[data-testid="keyboard-shortcuts-help"]');
      await expect(modal).toBeVisible();

      // Verify all shortcut categories are present
      await expect(page.locator('text=Navigation')).toBeVisible();
      await expect(page.locator('text=Actions')).toBeVisible();
      await expect(page.locator('text=Forms')).toBeVisible();
    });

    test('1.2 Should display platform-specific shortcuts (Mac)', async ({ page, browserName }) => {
      // Simulate Mac platform
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'platform', {
          get: () => 'MacIntel',
          configurable: true,
        });
      });

      await page.keyboard.press('?');
      const modal = page.locator('[data-testid="keyboard-shortcuts-help"]');
      await expect(modal).toBeVisible();

      // Should show ⌘ instead of Ctrl for Mac
      const cmdShortcut = page.locator('kbd:has-text("⌘")').first();
      await expect(cmdShortcut).toBeVisible();
    });

    test('1.3 Should display platform-specific shortcuts (Windows/Linux)', async ({ page }) => {
      // Simulate Windows platform
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'platform', {
          get: () => 'Win32',
          configurable: true,
        });
      });

      await page.keyboard.press('?');
      const modal = page.locator('[data-testid="keyboard-shortcuts-help"]');
      await expect(modal).toBeVisible();

      // Should show Ctrl for Windows
      const ctrlShortcut = page.locator('kbd:has-text("Ctrl")').first();
      await expect(ctrlShortcut).toBeVisible();
    });

    test('1.4 Should have shortcut metadata (category, description, enabled)', async ({ page }) => {
      await page.keyboard.press('?');

      // Check that shortcuts have descriptions
      await expect(page.locator('text=Move to next interactive element')).toBeVisible();
      await expect(page.locator('text=Go to Home')).toBeVisible();
      await expect(page.locator('text=Close modal')).toBeVisible();
    });

    test('1.5 Should support shortcut sequences (g+h, g+d)', async ({ page }) => {
      // Navigate using sequence: g then h
      await page.keyboard.press('g');
      await page.keyboard.press('h');

      // Should navigate to home
      await expect(page).toHaveURL(/\//);
    });

    test('1.6 Should support single-key shortcuts (?)', async ({ page }) => {
      // Press single key
      await page.keyboard.press('?');

      // Should open help modal
      const modal = page.locator('[data-testid="keyboard-shortcuts-help"]');
      await expect(modal).toBeVisible();
    });

    test('1.7 Should support modifier shortcuts (Ctrl+K, Cmd+K)', async ({ page }) => {
      // This will be implemented for search/command palette
      // Placeholder test - will implement in GREEN phase
      await page.keyboard.press('Meta+K');

      // Should open command palette (to be implemented)
      const commandPalette = page.locator('[data-testid="command-palette"]');
      // This will fail in RED phase - expected
    });
  });

  test.describe('2. Customizable Shortcuts', () => {
    test('2.1 Should allow users to customize shortcuts', async ({ page }) => {
      // Open keyboard shortcuts help
      await page.keyboard.press('?');

      // Click customize button
      const customizeButton = page.locator('button:has-text("Customize")');
      await expect(customizeButton).toBeVisible();
      await customizeButton.click();

      // Should show customization UI
      const customizationPanel = page.locator('[data-testid="shortcut-customization"]');
      await expect(customizationPanel).toBeVisible();
    });

    test('2.2 Should allow changing a shortcut', async ({ page }) => {
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();

      // Find "Go to Home" shortcut
      const homeShortcut = page.locator('[data-shortcut-action="navigate-home"]');
      await homeShortcut.click();

      // Click edit button
      const editButton = homeShortcut.locator('button:has-text("Edit")');
      await editButton.click();

      // Press new key combination
      await page.keyboard.press('h');

      // Save
      await page.locator('button:has-text("Save")').click();

      // Verify shortcut changed
      await expect(page.locator('kbd:has-text("h")')).toBeVisible();
    });

    test('2.3 Should persist custom shortcuts', async ({ page, context }) => {
      // Set custom shortcut
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();

      const homeShortcut = page.locator('[data-shortcut-action="navigate-home"]');
      await homeShortcut.click();
      await homeShortcut.locator('button:has-text("Edit")').click();
      await page.keyboard.press('h');
      await page.locator('button:has-text("Save")').click();

      // Close and reopen modal
      await page.keyboard.press('Escape');
      await page.keyboard.press('?');

      // Should still show custom shortcut
      const customShortcut = page.locator('[data-shortcut-action="navigate-home"] kbd:has-text("h")');
      await expect(customShortcut).toBeVisible();

      // Reload page
      await page.reload();
      await page.keyboard.press('?');

      // Should persist after reload
      await expect(customShortcut).toBeVisible();
    });

    test('2.4 Should allow resetting shortcuts to default', async ({ page }) => {
      // Set custom shortcut
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();

      const homeShortcut = page.locator('[data-shortcut-action="navigate-home"]');
      await homeShortcut.click();
      await homeShortcut.locator('button:has-text("Edit")').click();
      await page.keyboard.press('h');
      await page.locator('button:has-text("Save")').click();

      // Reset to default
      await page.locator('button:has-text("Reset to Default")').click();

      // Should show confirmation dialog
      const confirmDialog = page.locator('[role="alertdialog"]');
      await expect(confirmDialog).toBeVisible();
      await page.locator('button:has-text("Reset")').click();

      // Should restore original shortcut
      const originalShortcut = page.locator('[data-shortcut-action="navigate-home"]');
      await expect(originalShortcut.locator('kbd:has-text("g")')).toBeVisible();
      await expect(originalShortcut.locator('kbd:has-text("h")')).toBeVisible();
    });

    test('2.5 Should allow disabling shortcuts', async ({ page }) => {
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();

      const homeShortcut = page.locator('[data-shortcut-action="navigate-home"]');
      await homeShortcut.click();

      // Toggle enabled/disabled
      const toggleSwitch = homeShortcut.locator('[role="switch"]');
      await toggleSwitch.click();

      // Save
      await page.locator('button:has-text("Save")').click();

      // Close modal
      await page.keyboard.press('Escape');

      // Try using disabled shortcut
      await page.keyboard.press('g');
      await page.keyboard.press('h');

      // Should NOT navigate (shortcut disabled)
      // Stay on current page
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\//);
    });
  });

  test.describe('3. Conflict Detection', () => {
    test('3.1 Should detect conflicting shortcuts', async ({ page }) => {
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();

      // Try to set shortcut that conflicts with existing
      const homeShortcut = page.locator('[data-shortcut-action="navigate-home"]');
      await homeShortcut.click();
      await homeShortcut.locator('button:has-text("Edit")').click();

      // Try to use '?' which is already used for help
      await page.keyboard.press('?');

      // Should show conflict warning
      const conflictWarning = page.locator('[data-testid="shortcut-conflict-warning"]');
      await expect(conflictWarning).toBeVisible();
      await expect(conflictWarning).toContainText('already in use');
    });

    test('3.2 Should prevent saving conflicting shortcuts', async ({ page }) => {
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();

      const homeShortcut = page.locator('[data-shortcut-action="navigate-home"]');
      await homeShortcut.click();
      await homeShortcut.locator('button:has-text("Edit")').click();
      await page.keyboard.press('?');

      // Save button should be disabled
      const saveButton = page.locator('button:has-text("Save")');
      await expect(saveButton).toBeDisabled();
    });

    test('3.3 Should allow overriding conflicts with confirmation', async ({ page }) => {
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();

      const homeShortcut = page.locator('[data-shortcut-action="navigate-home"]');
      await homeShortcut.click();
      await homeShortcut.locator('button:has-text("Edit")').click();
      await page.keyboard.press('?');

      // Click "Override" option
      const overrideButton = page.locator('button:has-text("Override")');
      await overrideButton.click();

      // Should show confirmation dialog
      const confirmDialog = page.locator('[role="alertdialog"]');
      await expect(confirmDialog).toBeVisible();
      await expect(confirmDialog).toContainText('This will remove');

      await page.locator('button:has-text("Confirm")').click();

      // Shortcut should be changed
      await expect(page.locator('[data-shortcut-action="navigate-home"] kbd:has-text("?")')).toBeVisible();
    });

    test('3.4 Should detect sequence conflicts (g+h vs g+d)', async ({ page }) => {
      // This tests that g+h and g+d can coexist
      await page.keyboard.press('?');

      // Both should be present
      const ghShortcut = page.locator('text=g').first();
      const gdShortcut = page.locator('text=g').nth(1);

      await expect(ghShortcut).toBeVisible();
      await expect(gdShortcut).toBeVisible();

      // Try to create g+h again
      await page.locator('button:has-text("Customize")').click();
      const dashboardShortcut = page.locator('[data-shortcut-action="navigate-dashboard"]');
      await dashboardShortcut.click();
      await dashboardShortcut.locator('button:has-text("Edit")').click();

      // Try g+h (conflicts with home)
      await page.keyboard.press('g');
      await page.keyboard.press('h');

      const conflictWarning = page.locator('[data-testid="shortcut-conflict-warning"]');
      await expect(conflictWarning).toBeVisible();
    });
  });

  test.describe('4. Platform-Specific Shortcuts', () => {
    test('4.1 Should auto-detect platform (Mac)', async ({ page, browserName }) => {
      // Simulate Mac
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'platform', {
          get: () => 'MacIntel',
        });
      });

      await page.keyboard.press('?');

      // Should show ⌘ symbol
      await expect(page.locator('kbd:has-text("⌘")').first()).toBeVisible();
    });

    test('4.2 Should auto-detect platform (Windows)', async ({ page }) => {
      // Simulate Windows
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'platform', {
          get: () => 'Win32',
        });
      });

      await page.keyboard.press('?');

      // Should show Ctrl
      await expect(page.locator('text=Ctrl').first()).toBeVisible();
    });

    test('4.3 Should execute Meta+K on Mac', async ({ page, browserName }) => {
      if (browserName !== 'webkit') {
        test.skip();
      }

      // Simulate Mac
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'platform', {
          get: () => 'MacIntel',
        });
      });

      // Press Cmd+K
      await page.keyboard.press('Meta+K');

      // Should open command palette
      const commandPalette = page.locator('[data-testid="command-palette"]');
      await expect(commandPalette).toBeVisible();
    });

    test('4.4 Should execute Ctrl+K on Windows/Linux', async ({ page }) => {
      // Simulate Windows
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'platform', {
          get: () => 'Win32',
        });
      });

      // Press Ctrl+K
      await page.keyboard.press('Control+K');

      // Should open command palette
      const commandPalette = page.locator('[data-testid="command-palette"]');
      await expect(commandPalette).toBeVisible();
    });

    test('4.5 Should show correct modifier in help modal', async ({ page }) => {
      const isMac = await page.evaluate(() => navigator.platform.includes('Mac'));

      await page.keyboard.press('?');

      const expectedModifier = isMac ? '⌘' : 'Ctrl';
      await expect(page.locator(`kbd:has-text("${expectedModifier}")`).first()).toBeVisible();
    });
  });

  test.describe('5. Persistence', () => {
    test('5.1 Should save custom shortcuts to localStorage', async ({ page }) => {
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();

      const homeShortcut = page.locator('[data-shortcut-action="navigate-home"]');
      await homeShortcut.click();
      await homeShortcut.locator('button:has-text("Edit")').click();
      await page.keyboard.press('h');
      await page.locator('button:has-text("Save")').click();

      // Check localStorage
      const savedShortcuts = await page.evaluate(() => {
        return localStorage.getItem('keyboard-shortcuts');
      });

      expect(savedShortcuts).toBeTruthy();
      const parsed = JSON.parse(savedShortcuts!);
      expect(parsed).toHaveProperty('navigate-home');
    });

    test('5.2 Should load custom shortcuts from localStorage on init', async ({ page }) => {
      // Set custom shortcuts in localStorage
      await page.evaluate(() => {
        localStorage.setItem('keyboard-shortcuts', JSON.stringify({
          'navigate-home': { keys: ['h'], enabled: true }
        }));
      });

      // Reload page
      await page.reload();

      // Open help modal
      await page.keyboard.press('?');

      // Should show custom shortcut
      const customShortcut = page.locator('[data-shortcut-action="navigate-home"] kbd:has-text("h")');
      await expect(customShortcut).toBeVisible();
    });

    test('5.3 Should sync shortcuts across tabs', async ({ context, page }) => {
      // Set custom shortcut in first tab
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();
      const homeShortcut = page.locator('[data-shortcut-action="navigate-home"]');
      await homeShortcut.click();
      await homeShortcut.locator('button:has-text("Edit")').click();
      await page.keyboard.press('h');
      await page.locator('button:has-text("Save")').click();

      // Open second tab
      const page2 = await context.newPage();
      await page2.goto('/');

      // Wait for storage sync
      await page2.waitForTimeout(1000);

      // Open help modal in second tab
      await page2.keyboard.press('?');

      // Should show same custom shortcut
      const customShortcut = page2.locator('[data-shortcut-action="navigate-home"] kbd:has-text("h")');
      await expect(customShortcut).toBeVisible();

      await page2.close();
    });

    test('5.4 Should handle localStorage quota exceeded gracefully', async ({ page }) => {
      // Fill localStorage to quota
      await page.evaluate(() => {
        try {
          for (let i = 0; i < 10000; i++) {
            localStorage.setItem(`test-${i}`, 'x'.repeat(1000));
          }
        } catch (e) {
          // Quota exceeded
        }
      });

      // Try to save custom shortcut
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();
      const homeShortcut = page.locator('[data-shortcut-action="navigate-home"]');
      await homeShortcut.click();
      await homeShortcut.locator('button:has-text("Edit")').click();
      await page.keyboard.press('h');
      await page.locator('button:has-text("Save")').click();

      // Should show error message
      const errorMessage = page.locator('[data-testid="storage-error"]');
      await expect(errorMessage).toBeVisible();
      await expect(errorMessage).toContainText('Unable to save');
    });

    test('5.5 Should export shortcuts configuration', async ({ page }) => {
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();

      // Click export button
      const exportButton = page.locator('button:has-text("Export")');
      await exportButton.click();

      // Should download JSON file
      const [download] = await Promise.all([
        page.waitForEvent('download'),
        exportButton.click()
      ]);

      const fileName = download.suggestedFilename();
      expect(fileName).toContain('keyboard-shortcuts');
      expect(fileName).toContain('.json');
    });

    test('5.6 Should import shortcuts configuration', async ({ page }) => {
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();

      // Click import button
      const importButton = page.locator('button:has-text("Import")');
      await importButton.click();

      // Upload JSON file
      const fileInput = page.locator('input[type="file"]');
      await fileInput.setInputFiles({
        name: 'shortcuts.json',
        mimeType: 'application/json',
        buffer: Buffer.from(JSON.stringify({
          'navigate-home': { keys: ['h'], enabled: true }
        }))
      });

      // Should show success message
      const successMessage = page.locator('[data-testid="import-success"]');
      await expect(successMessage).toBeVisible();

      // Should apply imported shortcuts
      const customShortcut = page.locator('[data-shortcut-action="navigate-home"] kbd:has-text("h")');
      await expect(customShortcut).toBeVisible();
    });
  });

  test.describe('6. Shortcut Execution', () => {
    test('6.1 Should execute navigation shortcuts', async ({ page }) => {
      // Debug: Check auth state and E2E detection
      const authState = await page.evaluate(() => ({
        accessToken: localStorage.getItem('access_token'),
        refreshToken: localStorage.getItem('refresh_token'),
        authStorage: localStorage.getItem('auth-storage'),
        e2eCookie: document.cookie.includes('e2e_bypass=true'),
        hasPlaywright: typeof (window as any).playwright !== 'undefined',
        hasE2EBypassEnv: process.env.NEXT_PUBLIC_E2E_BYPASS === 'true',
      }));
      console.log('Auth state before navigation:', authState);

      // Listen to console logs from the browser
      page.on('console', msg => {
        if (msg.text().includes('[KeyboardNav]')) {
          console.log('BROWSER LOG:', msg.text());
        }
      });

      // Go to home
      await page.keyboard.press('g');
      await page.keyboard.press('h');
      await page.waitForTimeout(500); // Wait for navigation
      await expect(page).toHaveURL(/\/$/);

      // Go to dashboard
      console.log('Attempting navigation to /dashboard with g+d...');
      await page.keyboard.press('g');
      await page.keyboard.press('d');

      // Wait for navigation to complete and settle
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });

      // Debug: Check final URL
      const finalUrl = page.url();
      console.log('Final URL after g+d:', finalUrl);

      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('6.2 Should not execute shortcuts when typing in inputs', async ({ page }) => {
      await page.goto('/signin');

      // Focus email input
      const emailInput = page.locator('input[type="email"]');
      await emailInput.click();

      // Type 'g' and 'h'
      await page.keyboard.type('gh');

      // Should NOT navigate (still on signin page)
      await expect(page).toHaveURL(/\/signin/);

      // Input should contain 'gh'
      await expect(emailInput).toHaveValue('gh');
    });

    test('6.3 Should execute shortcuts with modifier keys', async ({ page }) => {
      // Ctrl/Cmd + K for command palette
      await page.keyboard.press('Meta+K');

      const commandPalette = page.locator('[data-testid="command-palette"]');
      await expect(commandPalette).toBeVisible();
    });

    test('6.4 Should clear sequence buffer after timeout', async ({ page }) => {
      // Press 'g'
      await page.keyboard.press('g');

      // Wait 2 seconds (buffer timeout is 1 second)
      await page.waitForTimeout(2000);

      // Press 'h'
      await page.keyboard.press('h');

      // Should NOT navigate (sequence timed out)
      await expect(page).toHaveURL(/\/$/);
    });

    test('6.5 Should execute shortcuts in correct order', async ({ page }) => {
      // Test sequence order matters
      await page.keyboard.press('g');
      await page.keyboard.press('d');
      await expect(page).toHaveURL(/\/dashboard/);

      // Pressing in wrong order should not work
      await page.keyboard.press('d');
      await page.keyboard.press('g');
      await expect(page).toHaveURL(/\/dashboard/); // Still on dashboard
    });
  });

  test.describe('7. Acceptance Criteria', () => {
    test('@acceptance All shortcuts work', async ({ page }) => {
      // Test all navigation shortcuts
      const shortcuts = [
        { keys: ['g', 'h'], url: /\/$/ },
        { keys: ['g', 'd'], url: /\/dashboard/ },
        { keys: ['g', 'j'], url: /\/jobs/ },
        { keys: ['g', 'r'], url: /\/resume/ },
        { keys: ['g', 'a'], url: /\/applications/ },
      ];

      for (const shortcut of shortcuts) {
        for (const key of shortcut.keys) {
          await page.keyboard.press(key);
        }
        await expect(page).toHaveURL(shortcut.url);
      }
    });

    test('@acceptance Help modal is complete', async ({ page }) => {
      await page.keyboard.press('?');

      const modal = page.locator('[data-testid="keyboard-shortcuts-help"]');
      await expect(modal).toBeVisible();

      // Verify all categories present
      await expect(page.locator('text=Navigation')).toBeVisible();
      await expect(page.locator('text=Actions')).toBeVisible();
      await expect(page.locator('text=Forms')).toBeVisible();

      // Verify customization button present
      await expect(page.locator('button:has-text("Customize")')).toBeVisible();
    });

    test('@acceptance Customization saves and persists', async ({ page }) => {
      // Customize shortcut
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();
      const homeShortcut = page.locator('[data-shortcut-action="navigate-home"]');
      await homeShortcut.click();
      await homeShortcut.locator('button:has-text("Edit")').click();
      await page.keyboard.press('h');
      await page.locator('button:has-text("Save")').click();

      // Reload page
      await page.reload();

      // Custom shortcut should work
      await page.keyboard.press('h');
      await expect(page).toHaveURL(/\/$/);

      // Original shortcut should NOT work
      await page.keyboard.press('g');
      await page.keyboard.press('h');
      await page.waitForTimeout(500);
      await expect(page).toHaveURL(/\/$/); // Still on home
    });

    test('@acceptance No shortcut conflicts allowed', async ({ page }) => {
      await page.keyboard.press('?');
      await page.locator('button:has-text("Customize")').click();

      const homeShortcut = page.locator('[data-shortcut-action="navigate-home"]');
      await homeShortcut.click();
      await homeShortcut.locator('button:has-text("Edit")').click();

      // Try to use existing shortcut
      await page.keyboard.press('?');

      // Should show conflict warning
      const conflictWarning = page.locator('[data-testid="shortcut-conflict-warning"]');
      await expect(conflictWarning).toBeVisible();

      // Save button should be disabled
      const saveButton = page.locator('button:has-text("Save")');
      await expect(saveButton).toBeDisabled();
    });
  });
});
