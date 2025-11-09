/**
 * E2E Tests: White-Label Branding (Sprint 17-18 Phase 3)
 *
 * BDD-style tests for white-label branding customization.
 *
 * Test Coverage:
 * - Enable white-label features (Enterprise requirement)
 * - Brand identity configuration
 * - Logo uploads and management
 * - Color scheme customization with WCAG validation
 * - Custom domain setup and DNS verification
 * - Email branding configuration
 * - Career page customization
 * - Live preview functionality
 * - Configuration persistence
 */

import { test, expect, Page } from '@playwright/test';
import { mockWhiteLabelApi } from './mocks/white-label.mock';

const EMPLOYER_EMAIL = 'enterprise@example.com';
const EMPLOYER_PASSWORD = 'SecurePass123!';

test.describe('White-Label Branding', () => {
  let page: Page;

  test.beforeEach(async ({ page: p }) => {
    page = p;

    // Setup API mocks
    await mockWhiteLabelApi(page);

    // Login as employer (Enterprise plan)
    await page.goto('/login');
    await page.fill('input[name="email"]', EMPLOYER_EMAIL);
    await page.fill('input[name="password"]', EMPLOYER_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/employer\/dashboard/);

    // Navigate to white-label settings
    await page.goto('/employer/settings/white-label');
  });

  test.describe('Feature Enablement', () => {
    test('should display Enterprise plan requirement when white-label is disabled', async () => {
      /**
       * GIVEN: White-label branding is not yet enabled
       * WHEN: User visits the white-label settings page
       * THEN: Enterprise plan requirement banner is displayed
       * AND: Enable button is available
       */
      await expect(page.locator('text=Enterprise Feature')).toBeVisible();
      await expect(
        page.locator('text=White-label branding is available on Enterprise plans')
      ).toBeVisible();
      await expect(page.locator('button:has-text("Enable White-Label")')).toBeVisible();
    });

    test('should enable white-label branding', async () => {
      /**
       * GIVEN: User has Enterprise plan
       * AND: White-label branding is disabled
       * WHEN: User clicks "Enable White-Label" button
       * THEN: White-label features are enabled
       * AND: Success message is displayed
       * AND: Configuration options become available
       */
      await page.click('button:has-text("Enable White-Label")');

      // Wait for API call and success toast
      await expect(page.locator('text=White-label branding enabled')).toBeVisible({
        timeout: 5000,
      });

      // Verify enabled status
      await expect(
        page.locator('text=White-label branding is enabled')
      ).toBeVisible();
    });

    test('should prevent enabling on non-Enterprise plans', async () => {
      /**
       * GIVEN: User does NOT have Enterprise plan
       * WHEN: User attempts to enable white-label
       * THEN: Error message is displayed
       * AND: Feature remains disabled
       */
      // Mock API to return 403 Forbidden
      await page.route('**/api/v1/employer/white-label/enable', (route) =>
        route.fulfill({
          status: 403,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Enterprise plan required',
          }),
        })
      );

      await page.click('button:has-text("Enable White-Label")');

      // Verify error message
      await expect(page.locator('text=Enterprise plan required')).toBeVisible();
    });
  });

  test.describe('Brand Identity Configuration', () => {
    test.beforeEach(async () => {
      // Enable white-label first
      await page.route('**/api/v1/employer/white-label/config', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'wl-1',
              company_id: 'comp-1',
              is_enabled: true,
              enabled_at: '2025-01-09T10:00:00Z',
              company_display_name: 'Acme Inc.',
              primary_color: '#3B82F6',
              secondary_color: '#10B981',
              accent_color: '#F59E0B',
              text_color: '#1F2937',
              background_color: '#FFFFFF',
              button_color: '#3B82F6',
              link_color: '#3B82F6',
              hide_hireflux_branding: false,
              custom_domain_verified: false,
              created_at: '2025-01-09T10:00:00Z',
              updated_at: '2025-01-09T10:00:00Z',
            },
          }),
        })
      );
      await page.reload();
    });

    test('should update company display name', async () => {
      /**
       * GIVEN: White-label is enabled
       * WHEN: User enters a new company display name
       * AND: Clicks "Save Changes"
       * THEN: Configuration is updated
       * AND: Success message is displayed
       */
      await page.click('text=Brand');
      await page.fill('input#company_name', 'Acme Corporation');

      await page.click('button:has-text("Save Changes")');

      await expect(page.locator('text=Branding configuration updated')).toBeVisible();
    });

    test('should upload primary logo', async () => {
      /**
       * GIVEN: White-label is enabled
       * WHEN: User uploads a primary logo file
       * THEN: Logo is uploaded successfully
       * AND: Preview is displayed
       * AND: Success message is shown
       */
      await page.click('text=Brand');

      // Set up file chooser
      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('input[type="file"]').first().click(),
      ]);

      // Create a mock file
      await fileChooser.setFiles({
        name: 'logo.png',
        mimeType: 'image/png',
        buffer: Buffer.from('mock-image-data'),
      });

      // Verify success
      await expect(page.locator('text=primary logo uploaded successfully')).toBeVisible();
    });

    test('should enforce logo file size limit', async () => {
      /**
       * GIVEN: White-label is enabled
       * WHEN: User attempts to upload a logo larger than 2MB
       * THEN: Error message is displayed
       * AND: Upload is rejected
       */
      await page.route('**/api/v1/employer/white-label/logos/primary', (route) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'File size exceeds 2MB limit',
          }),
        })
      );

      await page.click('text=Brand');

      const [fileChooser] = await Promise.all([
        page.waitForEvent('filechooser'),
        page.locator('input[type="file"]').first().click(),
      ]);

      await fileChooser.setFiles({
        name: 'large-logo.png',
        mimeType: 'image/png',
        buffer: Buffer.alloc(3 * 1024 * 1024), // 3MB
      });

      await expect(page.locator('text=File size exceeds 2MB limit')).toBeVisible();
    });

    test('should toggle "Hide HireFlux Branding" option', async () => {
      /**
       * GIVEN: White-label is enabled
       * WHEN: User toggles "Hide HireFlux Branding" switch
       * AND: Saves changes
       * THEN: Configuration is updated
       */
      await page.click('text=Brand');

      const switchButton = page.locator('button[role="switch"]').filter({
        has: page.locator('text=Hide HireFlux Branding'),
      });

      await switchButton.click();
      await page.click('button:has-text("Save Changes")');

      await expect(page.locator('text=Branding configuration updated')).toBeVisible();
    });
  });

  test.describe('Color Scheme Customization', () => {
    test.beforeEach(async () => {
      // Mock enabled state
      await page.route('**/api/v1/employer/white-label/config', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'wl-1',
              company_id: 'comp-1',
              is_enabled: true,
              primary_color: '#3B82F6',
              secondary_color: '#10B981',
              accent_color: '#F59E0B',
              text_color: '#1F2937',
              background_color: '#FFFFFF',
              button_color: '#3B82F6',
              link_color: '#3B82F6',
              created_at: '2025-01-09T10:00:00Z',
              updated_at: '2025-01-09T10:00:00Z',
            },
          }),
        })
      );
      await page.reload();
    });

    test('should customize primary color', async () => {
      /**
       * GIVEN: White-label is enabled
       * WHEN: User selects a new primary color
       * THEN: Color picker updates
       * AND: Preview updates in real-time
       */
      await page.click('text=Colors');

      // Change primary color
      await page.fill('input#primary_color', '#FF0000');

      // Verify the input updates
      await expect(page.locator('input#primary_color')).toHaveValue('#FF0000');
    });

    test('should display WCAG contrast ratio', async () => {
      /**
       * GIVEN: White-label is enabled
       * AND: Color scheme is configured
       * WHEN: User views the color settings
       * THEN: WCAG AA contrast ratio is displayed
       * AND: Pass/Fail badge is shown
       */
      await page.click('text=Colors');

      await expect(page.locator('text=Accessibility (WCAG AA)')).toBeVisible();
      await expect(page.locator('text=Text on Background Contrast')).toBeVisible();
      await expect(page.locator('text=:1')).toBeVisible(); // Contrast ratio
    });

    test('should warn on insufficient contrast (WCAG AA)', async () => {
      /**
       * GIVEN: White-label is enabled
       * WHEN: User selects colors with insufficient contrast
       * THEN: WCAG AA Fail badge is displayed
       * AND: Warning message is shown
       */
      await page.click('text=Colors');

      // Set low contrast colors (yellow on white)
      await page.fill('input[placeholder="#1F2937"]', '#FFFF00'); // Text: yellow
      await page.fill('input[placeholder="#FFFFFF"]', '#FFFFFF'); // Background: white

      // Mock API to reject low contrast
      await page.route('**/api/v1/employer/white-label/config', (route) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Insufficient contrast ratio: 1.2:1. WCAG AA requires minimum 4.5:1',
          }),
        })
      );

      await page.click('button:has-text("Save Changes")');

      await expect(
        page.locator('text=Insufficient contrast ratio')
      ).toBeVisible();
    });

    test('should update all color scheme fields', async () => {
      /**
       * GIVEN: White-label is enabled
       * WHEN: User updates multiple color fields
       * AND: Saves changes
       * THEN: All colors are updated successfully
       */
      await page.click('text=Colors');

      await page.fill('input[placeholder="#3B82F6"]', '#1E40AF'); // Primary
      await page.fill('input[placeholder="#10B981"]', '#059669'); // Secondary
      await page.fill('input[placeholder="#F59E0B"]', '#D97706'); // Accent

      await page.click('button:has-text("Save Changes")');

      await expect(page.locator('text=Branding configuration updated')).toBeVisible();
    });

    test('should set custom font family', async () => {
      /**
       * GIVEN: White-label is enabled
       * WHEN: User enters a custom font family
       * THEN: Font family is saved
       */
      await page.click('text=Colors');

      await page.fill('input#font_family', 'Inter, system-ui, sans-serif');

      await page.click('button:has-text("Save Changes")');

      await expect(page.locator('text=Branding configuration updated')).toBeVisible();
    });
  });

  test.describe('Custom Domain Configuration', () => {
    test.beforeEach(async () => {
      // Mock enabled state
      await page.route('**/api/v1/employer/white-label/config', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'wl-1',
              company_id: 'comp-1',
              is_enabled: true,
              primary_color: '#3B82F6',
              created_at: '2025-01-09T10:00:00Z',
              updated_at: '2025-01-09T10:00:00Z',
            },
          }),
        })
      );
      await page.reload();
    });

    test('should set custom domain', async () => {
      /**
       * GIVEN: White-label is enabled
       * WHEN: User enters a custom domain
       * AND: Clicks "Set Domain"
       * THEN: Domain is configured
       * AND: DNS instructions are displayed
       */
      await page.click('text=Domain');

      await page.fill('input#custom_domain', 'careers.acme.com');

      await page.route('**/api/v1/employer/white-label/domain', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              domain: 'careers.acme.com',
              verification_token: 'hf-verify-abc123',
              is_verified: false,
              cname_record: 'hireflux-careers.vercel.app',
              txt_record: 'hireflux-verify=abc123',
            },
          }),
        })
      );

      await page.click('button:has-text("Set Domain")');

      await expect(
        page.locator('text=Custom domain configured')
      ).toBeVisible();

      // Verify DNS instructions are shown
      await expect(page.locator('text=DNS Configuration')).toBeVisible();
      await expect(page.locator('text=CNAME Record')).toBeVisible();
      await expect(page.locator('text=TXT Record')).toBeVisible();
    });

    test('should display DNS verification instructions', async () => {
      /**
       * GIVEN: Custom domain is set but not verified
       * WHEN: User views the domain settings
       * THEN: DNS configuration instructions are displayed
       * AND: CNAME and TXT record details are shown
       */
      await page.route('**/api/v1/employer/white-label/domain/verification', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              domain: 'careers.acme.com',
              verification_token: 'hf-verify-abc123',
              is_verified: false,
              cname_record: 'hireflux-careers.vercel.app',
              txt_record: 'hireflux-verify=abc123',
            },
          }),
        })
      );

      await page.click('text=Domain');

      await expect(page.locator('text=hireflux-careers.vercel.app')).toBeVisible();
      await expect(page.locator('text=hireflux-verify=abc123')).toBeVisible();
      await expect(page.locator('text=Pending Verification')).toBeVisible();
    });

    test('should verify custom domain', async () => {
      /**
       * GIVEN: Custom domain is set with DNS records configured
       * WHEN: User clicks "Verify DNS Configuration"
       * THEN: Domain verification is successful
       * AND: Verified badge is displayed
       */
      await page.route('**/api/v1/employer/white-label/domain/verification', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              domain: 'careers.acme.com',
              verification_token: 'hf-verify-abc123',
              is_verified: false,
              cname_record: 'hireflux-careers.vercel.app',
              txt_record: 'hireflux-verify=abc123',
            },
          }),
        })
      );

      await page.click('text=Domain');

      await page.route('**/api/v1/employer/white-label/domain/verify', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
          }),
        })
      );

      await page.click('button:has-text("Verify DNS Configuration")');

      await expect(page.locator('text=Domain verified successfully')).toBeVisible();
    });

    test('should handle domain verification failure', async () => {
      /**
       * GIVEN: Custom domain is set but DNS not configured correctly
       * WHEN: User attempts to verify domain
       * THEN: Verification fails
       * AND: Error message explains the issue
       */
      await page.route('**/api/v1/employer/white-label/domain/verification', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              domain: 'careers.acme.com',
              is_verified: false,
              cname_record: 'hireflux-careers.vercel.app',
              txt_record: 'hireflux-verify=abc123',
            },
          }),
        })
      );

      await page.click('text=Domain');

      await page.route('**/api/v1/employer/white-label/domain/verify', (route) =>
        route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'DNS records not found. Please ensure CNAME and TXT records are configured.',
          }),
        })
      );

      await page.click('button:has-text("Verify DNS Configuration")');

      await expect(page.locator('text=DNS records not found')).toBeVisible();
    });

    test('should copy TXT record to clipboard', async () => {
      /**
       * GIVEN: Custom domain verification instructions are displayed
       * WHEN: User clicks copy button on TXT record
       * THEN: TXT record is copied to clipboard
       * AND: Success toast is shown
       */
      await page.route('**/api/v1/employer/white-label/domain/verification', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              domain: 'careers.acme.com',
              is_verified: false,
              txt_record: 'hireflux-verify=abc123xyz',
            },
          }),
        })
      );

      await page.click('text=Domain');

      // Grant clipboard permissions
      await page.context().grantPermissions(['clipboard-read', 'clipboard-write']);

      // Find and click the copy button next to TXT record
      await page.locator('button:has(svg):near(text=hireflux-verify=abc123xyz)').click();

      await expect(page.locator('text=Copied to clipboard')).toBeVisible();

      // Verify clipboard content
      const clipboardContent = await page.evaluate(() => navigator.clipboard.readText());
      expect(clipboardContent).toBe('hireflux-verify=abc123xyz');
    });
  });

  test.describe('Email and Career Page Content', () => {
    test.beforeEach(async () => {
      await page.route('**/api/v1/employer/white-label/config', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'wl-1',
              is_enabled: true,
              created_at: '2025-01-09T10:00:00Z',
              updated_at: '2025-01-09T10:00:00Z',
            },
          }),
        })
      );
      await page.reload();
    });

    test('should customize email branding', async () => {
      /**
       * GIVEN: White-label is enabled
       * WHEN: User configures email branding settings
       * THEN: Email settings are saved
       */
      await page.click('text=Content');

      await page.fill('input#email_from_name', 'Acme Recruiting Team');
      await page.fill('input#email_reply_to', 'recruiting@acme.com');
      await page.fill('textarea#email_header_text', 'Thank you for your interest!');
      await page.fill('textarea#email_footer_text', 'Questions? Reply to this email.');

      await page.click('button:has-text("Save Changes")');

      await expect(page.locator('text=Branding configuration updated')).toBeVisible();
    });

    test('should customize career page content', async () => {
      /**
       * GIVEN: White-label is enabled
       * WHEN: User configures career page settings
       * THEN: Career page settings are saved
       */
      await page.click('text=Content');

      await page.fill('input#career_page_title', 'Join Our Team');
      await page.fill(
        'textarea#career_page_description',
        'Build the future with us at Acme.'
      );
      await page.fill('input#career_page_banner_text', "We're hiring!");

      await page.click('button:has-text("Save Changes")');

      await expect(page.locator('text=Branding configuration updated')).toBeVisible();
    });
  });

  test.describe('Live Preview', () => {
    test.beforeEach(async () => {
      await page.route('**/api/v1/employer/white-label/config', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'wl-1',
              is_enabled: true,
              company_display_name: 'Acme Inc.',
              logo_url: 'https://example.com/logo.png',
              primary_color: '#3B82F6',
              background_color: '#FFFFFF',
              text_color: '#1F2937',
              button_color: '#3B82F6',
              career_page_description: 'Join our amazing team!',
              created_at: '2025-01-09T10:00:00Z',
              updated_at: '2025-01-09T10:00:00Z',
            },
          }),
        })
      );
      await page.reload();
    });

    test('should toggle live preview panel', async () => {
      /**
       * GIVEN: User is on white-label settings page
       * WHEN: User clicks "Show Preview"
       * THEN: Live preview panel is displayed
       * WHEN: User clicks "Hide Preview"
       * THEN: Preview panel is hidden
       */
      await page.click('button:has-text("Show Preview")');

      await expect(page.locator('text=Live Preview')).toBeVisible();
      await expect(page.locator('text=See how your branding looks')).toBeVisible();

      await page.click('button:has-text("Hide Preview")');

      await expect(page.locator('text=Live Preview')).not.toBeVisible();
    });

    test('should display brand preview with current settings', async () => {
      /**
       * GIVEN: White-label configuration is set
       * WHEN: User opens live preview
       * THEN: Preview reflects current branding settings
       */
      await page.click('button:has-text("Show Preview")');

      // Verify preview elements
      await expect(page.locator('img[alt="Logo preview"]')).toBeVisible();
      await expect(page.locator('text=Acme Inc.')).toBeVisible();
      await expect(page.locator('text=Join our amazing team!')).toBeVisible();
      await expect(page.locator('button:has-text("Apply Now")')).toBeVisible();
    });

    test('should update preview in real-time when colors change', async () => {
      /**
       * GIVEN: Live preview is open
       * WHEN: User changes color settings
       * THEN: Preview updates immediately without saving
       */
      await page.click('button:has-text("Show Preview")');
      await page.click('text=Colors');

      // Change primary color
      await page.fill('input[placeholder="#3B82F6"]', '#FF0000');

      // Verify preview updates (check if button color changed)
      const button = page.locator('button:has-text("Apply Now")');
      const bgColor = await button.evaluate((el) =>
        window.getComputedStyle(el).backgroundColor
      );

      // RGB of #FF0000
      expect(bgColor).toBe('rgb(255, 0, 0)');
    });
  });

  test.describe('Configuration Persistence', () => {
    test('should persist configuration across page reloads', async () => {
      /**
       * GIVEN: User has saved white-label configuration
       * WHEN: User reloads the page
       * THEN: All settings are preserved
       */
      await page.route('**/api/v1/employer/white-label/config', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              id: 'wl-1',
              is_enabled: true,
              company_display_name: 'Acme Corporation',
              primary_color: '#1E40AF',
              custom_domain: 'careers.acme.com',
              email_from_name: 'Acme Recruiting',
              career_page_title: 'Join Us',
              created_at: '2025-01-09T10:00:00Z',
              updated_at: '2025-01-09T10:15:00Z',
            },
          }),
        })
      );

      await page.reload();

      // Verify all settings are loaded
      await expect(page.locator('input#company_name')).toHaveValue('Acme Corporation');

      await page.click('text=Colors');
      await expect(page.locator('input[placeholder="#3B82F6"]')).toHaveValue('#1E40AF');

      await page.click('text=Domain');
      await expect(page.locator('input#custom_domain')).toHaveValue('careers.acme.com');

      await page.click('text=Content');
      await expect(page.locator('input#email_from_name')).toHaveValue('Acme Recruiting');
      await expect(page.locator('input#career_page_title')).toHaveValue('Join Us');
    });

    test('should show unsaved changes warning', async () => {
      /**
       * GIVEN: User has made changes to configuration
       * WHEN: User attempts to navigate away without saving
       * THEN: Warning dialog is displayed
       * (Note: This would require beforeunload event handling in the component)
       */
      // This test would be implemented if beforeunload warning is added
      test.skip();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle API errors gracefully', async () => {
      /**
       * GIVEN: White-label API is unavailable
       * WHEN: User attempts to save changes
       * THEN: Error message is displayed
       * AND: User can retry
       */
      await page.route('**/api/v1/employer/white-label/config', (route) => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 500,
            contentType: 'application/json',
            body: JSON.stringify({
              detail: 'Internal server error',
            }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                id: 'wl-1',
                is_enabled: true,
                created_at: '2025-01-09T10:00:00Z',
                updated_at: '2025-01-09T10:00:00Z',
              },
            }),
          });
        }
      });

      await page.reload();
      await page.fill('input#company_name', 'Test Company');
      await page.click('button:has-text("Save Changes")');

      await expect(page.locator('text=Failed to update configuration')).toBeVisible();
    });

    test('should validate hex color format', async () => {
      /**
       * GIVEN: User is editing color scheme
       * WHEN: User enters invalid hex color
       * THEN: Validation error is displayed
       */
      await page.route('**/api/v1/employer/white-label/config', (route) => {
        if (route.request().method() === 'PUT') {
          route.fulfill({
            status: 400,
            contentType: 'application/json',
            body: JSON.stringify({
              detail: 'Invalid hex color format',
            }),
          });
        } else {
          route.fulfill({
            status: 200,
            contentType: 'application/json',
            body: JSON.stringify({
              data: {
                id: 'wl-1',
                is_enabled: true,
                created_at: '2025-01-09T10:00:00Z',
                updated_at: '2025-01-09T10:00:00Z',
              },
            }),
          });
        }
      });

      await page.reload();
      await page.click('text=Colors');

      // Try to enter invalid color
      await page.fill('input[placeholder="#3B82F6"]', 'not-a-color');
      await page.click('button:has-text("Save Changes")');

      await expect(page.locator('text=Invalid hex color format')).toBeVisible();
    });
  });
});
