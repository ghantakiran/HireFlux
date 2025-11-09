/**
 * E2E Tests - API Key Management (Sprint 17-18)
 *
 * Tests for API key management feature for employers.
 *
 * Test Coverage:
 * - List API keys
 * - Create new API key
 * - View API key details
 * - Revoke API key
 * - Permission management
 * - Rate limit tier selection
 * - One-time key display
 */

import { test, expect, Page } from '@playwright/test';
import {
  mockAuthenticatedSession,
  mockCompanyData,
  createMockAPIKey,
  createMockAPIKeyList,
  createMockUsageStats,
} from './mocks/api-key-management.mock';

// Test data
const TEST_COMPANY_ID = '123e4567-e89b-12d3-a456-426614174000';
const TEST_USER_ID = '123e4567-e89b-12d3-a456-426614174001';

test.describe('API Key Management', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await mockAuthenticatedSession(page);
  });

  // ==========================================================================
  // SCENARIO 1: View API Keys List
  // ==========================================================================

  test('should display list of API keys', async ({ page }) => {
    // GIVEN: Mock API returns list of 3 API keys
    const mockKeys = createMockAPIKeyList(3);

    await page.route('**/api/v1/employer/api-keys/*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            keys: mockKeys,
            total: 3,
            page: 1,
            page_size: 20,
          }),
        });
      }
    });

    // WHEN: User navigates to API keys page
    await page.goto('/employer/api-keys');

    // THEN: Page displays API keys table
    await expect(page.locator('h1')).toContainText('API Keys');

    // AND: Table shows all 3 keys
    const rows = page.locator('table tbody tr');
    await expect(rows).toHaveCount(3);

    // AND: First key shows correct details
    const firstRow = rows.nth(0);
    await expect(firstRow).toContainText(mockKeys[0].name);
    await expect(firstRow).toContainText(mockKeys[0].key_prefix);
    await expect(firstRow).toContainText('ACTIVE');
  });

  test('should display empty state when no API keys exist', async ({ page }) => {
    // GIVEN: Mock API returns empty list
    await page.route('**/api/v1/employer/api-keys/*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          keys: [],
          total: 0,
          page: 1,
          page_size: 20,
        }),
      });
    });

    // WHEN: User navigates to API keys page
    await page.goto('/employer/api-keys');

    // THEN: Empty state is displayed
    await expect(page.locator('text=No API Keys Yet')).toBeVisible();
    await expect(page.locator('text=Create your first API key')).toBeVisible();
  });

  // ==========================================================================
  // SCENARIO 2: Create API Key
  // ==========================================================================

  test('should create new API key with default permissions', async ({ page }) => {
    // GIVEN: Mock empty list initially
    await page.route('**/api/v1/employer/api-keys/', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ keys: [], total: 0, page: 1, page_size: 20 }),
        });
      }
    });

    await page.goto('/employer/api-keys');

    // AND: Mock create API key response
    let createdKey: any = null;
    await page.route('**/api/v1/employer/api-keys/', async (route) => {
      if (route.request().method() === 'POST') {
        const postData = route.request().postDataJSON();
        createdKey = createMockAPIKey({
          name: postData.name,
          permissions: postData.permissions,
          rate_limit_tier: postData.rate_limit_tier,
          key: 'hf_live_1234567890abcdef1234567890abcdef1234567890abcd', // Full key only shown once
        });
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(createdKey),
        });
      }
    });

    // WHEN: User clicks "Create API Key" button
    await page.click('button:has-text("Create API Key")');

    // THEN: Create dialog opens
    await expect(page.locator('text=Create a new API key')).toBeVisible();

    // WHEN: User fills in the form
    await page.fill('#name', 'Production API Key');

    // WHEN: User submits the form
    await page.click('button:has-text("Create API Key"):last-child');

    // THEN: Success message is displayed
    await expect(page.locator('text=API Key Created Successfully')).toBeVisible();

    // AND: Full API key is shown (one-time display)
    await expect(page.locator('input[readonly]')).toHaveValue(/^hf_live_/);

    // AND: Copy button is available
    await expect(page.locator('button:has(svg)')).toBeVisible(); // Copy button with icon
  });

  test('should create API key with custom permissions', async ({ page }) => {
    // GIVEN: User is on API keys page
    await page.route('**/api/v1/employer/api-keys/', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ keys: [], total: 0, page: 1, page_size: 20 }),
        });
      }
    });

    await page.goto('/employer/api-keys');

    let requestBody: any = null;
    await page.route('**/api/v1/employer/api-keys/', async (route) => {
      if (route.request().method() === 'POST') {
        requestBody = route.request().postDataJSON();
        const newKey = createMockAPIKey({
          ...requestBody,
          key: 'hf_live_test123456789',
        });
        await route.fulfill({
          status: 201,
          body: JSON.stringify(newKey),
        });
      }
    });

    // WHEN: User opens create dialog
    await page.click('button:has-text("Create API Key")');

    // AND: Fills in name
    await page.fill('#name', 'Custom Permissions API');

    // AND: Selects elevated tier
    await page.click('[role="combobox"]');
    await page.click('text=Elevated (120/min, 6,000/hour)');

    // AND: Enables write permissions for jobs
    await page.check('#jobs-write');

    // AND: Enables write permissions for candidates
    await page.check('#candidates-write');

    // WHEN: User submits
    await page.click('button:has-text("Create API Key"):last-child');

    // THEN: Request includes custom permissions
    expect(requestBody).toMatchObject({
      name: 'Custom Permissions API',
      rate_limit_tier: 'elevated',
      permissions: {
        jobs: expect.arrayContaining(['read', 'write']),
        candidates: expect.arrayContaining(['read', 'write']),
      },
    });
  });

  test('should validate required fields when creating API key', async ({ page }) => {
    // GIVEN: User is on API keys page
    await page.route('**/api/v1/employer/api-keys/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ keys: [], total: 0, page: 1, page_size: 20 }),
      });
    });

    await page.goto('/employer/api-keys');

    // WHEN: User opens create dialog
    await page.click('button:has-text("Create API Key")');

    // AND: Leaves name empty and tries to submit
    const createButton = page.locator('button:has-text("Create API Key"):last-child');

    // THEN: Create button is disabled
    await expect(createButton).toBeDisabled();

    // WHEN: User enters name
    await page.fill('#name', 'Test Key');

    // THEN: Create button is enabled
    await expect(createButton).toBeEnabled();
  });

  // ==========================================================================
  // SCENARIO 3: Revoke API Key
  // ==========================================================================

  test('should revoke API key with confirmation', async ({ page }) => {
    // GIVEN: Mock API with one active key
    const mockKey = createMockAPIKey({
      id: 'key-123',
      name: 'API Key to Revoke',
      status: 'active',
    });

    await page.route('**/api/v1/employer/api-keys/', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            keys: [mockKey],
            total: 1,
            page: 1,
            page_size: 20,
          }),
        });
      }
    });

    let revokedKeyId: string | null = null;
    await page.route('**/api/v1/employer/api-keys/*', async (route) => {
      if (route.request().method() === 'DELETE') {
        revokedKeyId = route.request().url().split('/').pop() || null;
        await route.fulfill({
          status: 200,
          body: JSON.stringify({
            ...mockKey,
            status: 'revoked',
            revoked_at: new Date().toISOString(),
          }),
        });
      }
    });

    await page.goto('/employer/api-keys');

    // WHEN: User clicks revoke button
    await page.click('button:has(svg):has-text("")'); // Trash icon button

    // THEN: Confirmation dialog appears
    await expect(page.locator('text=Revoke API Key?')).toBeVisible();
    await expect(page.locator('text=This action cannot be undone')).toBeVisible();

    // WHEN: User confirms revocation
    await page.click('button:has-text("Revoke Key")');

    // THEN: API key is revoked
    expect(revokedKeyId).toBe('key-123');

    // AND: Success message is shown
    await expect(page.locator('text=API key revoked successfully')).toBeVisible();
  });

  test('should not allow revoking already revoked keys', async ({ page }) => {
    // GIVEN: Mock API with revoked key
    const mockKey = createMockAPIKey({
      status: 'revoked',
      revoked_at: new Date().toISOString(),
    });

    await page.route('**/api/v1/employer/api-keys/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          keys: [mockKey],
          total: 1,
          page: 1,
          page_size: 20,
        }),
      });
    });

    await page.goto('/employer/api-keys');

    // THEN: Revoke button is disabled
    const revokeButton = page.locator('button:has(svg)').first();
    await expect(revokeButton).toBeDisabled();

    // AND: Status shows REVOKED
    await expect(page.locator('text=REVOKED')).toBeVisible();
  });

  // ==========================================================================
  // SCENARIO 4: Copy API Key (One-Time Display)
  // ==========================================================================

  test('should copy newly created API key to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // GIVEN: Mock API for creating key
    await page.route('**/api/v1/employer/api-keys/', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ keys: [], total: 0, page: 1, page_size: 20 }),
        });
      } else if (route.request().method() === 'POST') {
        const newKey = createMockAPIKey({
          key: 'hf_live_test_key_123456789abcdefghijklmnopqrstuvwxyz',
        });
        await route.fulfill({
          status: 201,
          body: JSON.stringify(newKey),
        });
      }
    });

    await page.goto('/employer/api-keys');

    // WHEN: User creates a new API key
    await page.click('button:has-text("Create API Key")');
    await page.fill('#name', 'Test Copy Key');
    await page.click('button:has-text("Create API Key"):last-child');

    // AND: Clicks copy button
    await page.click('button:has(svg)'); // Copy icon

    // THEN: Success toast appears
    await expect(page.locator('text=API key copied to clipboard')).toBeVisible();

    // AND: Clipboard contains the key
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/^hf_live_/);
  });

  // ==========================================================================
  // SCENARIO 5: Rate Limit Tier Display
  // ==========================================================================

  test('should display correct rate limit badges', async ({ page }) => {
    // GIVEN: Mock keys with different tiers
    const mockKeys = [
      createMockAPIKey({ rate_limit_tier: 'standard' }),
      createMockAPIKey({ rate_limit_tier: 'elevated' }),
      createMockAPIKey({ rate_limit_tier: 'enterprise' }),
    ];

    await page.route('**/api/v1/employer/api-keys/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({
          keys: mockKeys,
          total: 3,
          page: 1,
          page_size: 20,
        }),
      });
    });

    await page.goto('/employer/api-keys');

    // THEN: Each tier badge is displayed
    await expect(page.locator('text=STANDARD')).toBeVisible();
    await expect(page.locator('text=ELEVATED')).toBeVisible();
    await expect(page.locator('text=ENTERPRISE')).toBeVisible();
  });

  // ==========================================================================
  // SCENARIO 6: Plan Requirement Alert
  // ==========================================================================

  test('should display plan requirement alert', async ({ page }) => {
    // GIVEN: User is on API keys page
    await page.route('**/api/v1/employer/api-keys/', async (route) => {
      await route.fulfill({
        status: 200,
        body: JSON.stringify({ keys: [], total: 0, page: 1, page_size: 20 }),
      });
    });

    await page.goto('/employer/api-keys');

    // THEN: Alert about Professional plan requirement is shown
    await expect(page.locator('text=Professional Plan Required')).toBeVisible();
    await expect(
      page.locator('text=API access is available on Professional and Enterprise plans')
    ).toBeVisible();
  });

  // ==========================================================================
  // SCENARIO 7: Error Handling
  // ==========================================================================

  test('should handle API errors when creating key', async ({ page }) => {
    // GIVEN: Mock API error response
    await page.route('**/api/v1/employer/api-keys/', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          body: JSON.stringify({ keys: [], total: 0, page: 1, page_size: 20 }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 403,
          body: JSON.stringify({
            detail: 'API access not available on your plan',
          }),
        });
      }
    });

    await page.goto('/employer/api-keys');

    // WHEN: User tries to create API key
    await page.click('button:has-text("Create API Key")');
    await page.fill('#name', 'Test Key');
    await page.click('button:has-text("Create API Key"):last-child');

    // THEN: Error message is displayed
    await expect(
      page.locator('text=API access not available on your plan')
    ).toBeVisible();
  });
});
