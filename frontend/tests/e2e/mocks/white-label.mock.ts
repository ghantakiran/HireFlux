/**
 * Mock API responses for White-Label Branding E2E Tests
 *
 * Provides realistic mock data for white-label branding API endpoints.
 */

import { Page } from '@playwright/test';

export interface MockWhiteLabelConfig {
  id: string;
  company_id: string;
  is_enabled: boolean;
  enabled_at?: string;
  company_display_name?: string;
  logo_url?: string;
  logo_dark_url?: string;
  logo_icon_url?: string;
  logo_email_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  text_color: string;
  background_color: string;
  button_color: string;
  link_color: string;
  font_family?: string;
  hide_hireflux_branding: boolean;
  custom_css?: string;
  custom_domain?: string;
  custom_domain_verified: boolean;
  email_from_name?: string;
  email_reply_to?: string;
  email_header_text?: string;
  email_footer_text?: string;
  career_page_title?: string;
  career_page_description?: string;
  career_page_banner_text?: string;
  created_at: string;
  updated_at: string;
}

export interface MockDomainVerification {
  domain: string;
  verification_token: string;
  is_verified: boolean;
  verified_at?: string;
  cname_record: string;
  txt_record: string;
  created_at: string;
}

export const mockWhiteLabelConfig: MockWhiteLabelConfig = {
  id: 'wl-123e4567-e89b-12d3-a456-426614174000',
  company_id: 'comp-123e4567-e89b-12d3-a456-426614174000',
  is_enabled: false,
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
};

export const mockEnabledWhiteLabelConfig: MockWhiteLabelConfig = {
  ...mockWhiteLabelConfig,
  is_enabled: true,
  enabled_at: '2025-01-09T10:00:00Z',
  company_display_name: 'Acme Corporation',
  logo_url: 'https://example.com/logos/acme-primary.png',
  logo_dark_url: 'https://example.com/logos/acme-dark.png',
  logo_icon_url: 'https://example.com/logos/acme-icon.png',
  logo_email_url: 'https://example.com/logos/acme-email.png',
  primary_color: '#1E40AF',
  secondary_color: '#059669',
  accent_color: '#D97706',
  font_family: 'Inter, system-ui, sans-serif',
  hide_hireflux_branding: true,
  email_from_name: 'Acme Recruiting Team',
  email_reply_to: 'recruiting@acme.com',
  email_header_text: 'Thank you for your interest in joining Acme!',
  email_footer_text: 'Questions? Reply to this email or visit careers.acme.com',
  career_page_title: 'Join Our Team',
  career_page_description: 'Build the future with us. Explore opportunities at Acme.',
  career_page_banner_text: "We're hiring talented engineers!",
};

export const mockDomainVerification: MockDomainVerification = {
  domain: 'careers.acme.com',
  verification_token: 'hf-verify-abc123xyz456',
  is_verified: false,
  cname_record: 'hireflux-careers.vercel.app',
  txt_record: 'hireflux-verify=abc123xyz456',
  created_at: '2025-01-09T10:05:00Z',
};

export const mockVerifiedDomainVerification: MockDomainVerification = {
  ...mockDomainVerification,
  is_verified: true,
  verified_at: '2025-01-09T10:10:00Z',
};

export const mockCustomFields = [
  {
    id: 'cf-1',
    branding_id: 'wl-123e4567-e89b-12d3-a456-426614174000',
    field_name: 'linkedin_url',
    field_label: 'LinkedIn Profile URL',
    field_type: 'text',
    field_options: null,
    is_required: false,
    help_text: 'Please provide your LinkedIn profile URL',
    display_order: 1,
    created_at: '2025-01-09T10:00:00Z',
    updated_at: '2025-01-09T10:00:00Z',
  },
  {
    id: 'cf-2',
    branding_id: 'wl-123e4567-e89b-12d3-a456-426614174000',
    field_name: 'portfolio_url',
    field_label: 'Portfolio Website',
    field_type: 'text',
    field_options: null,
    is_required: false,
    help_text: 'Link to your online portfolio',
    display_order: 2,
    created_at: '2025-01-09T10:00:00Z',
    updated_at: '2025-01-09T10:00:00Z',
  },
  {
    id: 'cf-3',
    branding_id: 'wl-123e4567-e89b-12d3-a456-426614174000',
    field_name: 'referral_source',
    field_label: 'How did you hear about us?',
    field_type: 'select',
    field_options: ['Job board', 'Referral', 'Company website', 'LinkedIn', 'Other'],
    is_required: true,
    help_text: null,
    display_order: 3,
    created_at: '2025-01-09T10:00:00Z',
    updated_at: '2025-01-09T10:00:00Z',
  },
];

/**
 * Setup mock API responses for white-label branding endpoints
 */
export async function mockWhiteLabelApi(page: Page, options?: {
  isEnabled?: boolean;
  hasCustomDomain?: boolean;
  domainVerified?: boolean;
}) {
  const isEnabled = options?.isEnabled ?? false;
  const hasCustomDomain = options?.hasCustomDomain ?? false;
  const domainVerified = options?.domainVerified ?? false;

  const config = isEnabled ? mockEnabledWhiteLabelConfig : mockWhiteLabelConfig;

  if (hasCustomDomain) {
    config.custom_domain = 'careers.acme.com';
    config.custom_domain_verified = domainVerified;
  }

  // GET /employer/white-label/config
  await page.route('**/api/v1/employer/white-label/config', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: config,
        }),
      });
    } else {
      // Handle other methods in specific tests
      await route.continue();
    }
  });

  // PUT /employer/white-label/config
  await page.route('**/api/v1/employer/white-label/config', async (route) => {
    if (route.request().method() === 'PUT') {
      const requestBody = route.request().postDataJSON();
      const updatedConfig = {
        ...config,
        ...requestBody,
        updated_at: new Date().toISOString(),
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: updatedConfig,
        }),
      });
    }
  });

  // POST /employer/white-label/enable
  await page.route('**/api/v1/employer/white-label/enable', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          ...config,
          is_enabled: true,
          enabled_at: new Date().toISOString(),
        },
      }),
    });
  });

  // POST /employer/white-label/disable
  await page.route('**/api/v1/employer/white-label/disable', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          ...config,
          is_enabled: false,
          enabled_at: null,
        },
      }),
    });
  });

  // POST /employer/white-label/logos/:type
  await page.route('**/api/v1/employer/white-label/logos/*', async (route) => {
    const logoType = route.request().url().split('/').pop();
    const logoUrlKey = `logo_${logoType === 'primary' ? '' : logoType + '_'}url`;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          url: `https://example.com/logos/acme-${logoType}.png`,
          type: logoType,
        },
      }),
    });
  });

  // DELETE /employer/white-label/logos/:type
  await page.route('**/api/v1/employer/white-label/logos/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { message: 'Logo deleted successfully' },
        }),
      });
    }
  });

  // POST /employer/white-label/domain
  await page.route('**/api/v1/employer/white-label/domain', async (route) => {
    if (route.request().method() === 'POST') {
      const { domain } = route.request().postDataJSON();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ...mockDomainVerification,
            domain,
          },
        }),
      });
    }
  });

  // GET /employer/white-label/domain/verification
  await page.route('**/api/v1/employer/white-label/domain/verification', async (route) => {
    const verification = domainVerified
      ? mockVerifiedDomainVerification
      : mockDomainVerification;

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: verification,
      }),
    });
  });

  // POST /employer/white-label/domain/verify
  await page.route('**/api/v1/employer/white-label/domain/verify', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: mockVerifiedDomainVerification,
      }),
    });
  });

  // DELETE /employer/white-label/domain
  await page.route('**/api/v1/employer/white-label/domain', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { message: 'Custom domain removed' },
        }),
      });
    }
  });

  // GET /employer/white-label/custom-fields
  await page.route('**/api/v1/employer/white-label/custom-fields', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            fields: mockCustomFields,
            total: mockCustomFields.length,
          },
        }),
      });
    }
  });

  // POST /employer/white-label/custom-fields
  await page.route('**/api/v1/employer/white-label/custom-fields', async (route) => {
    if (route.request().method() === 'POST') {
      const fieldData = route.request().postDataJSON();

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: `cf-${Date.now()}`,
            branding_id: config.id,
            ...fieldData,
            display_order: mockCustomFields.length + 1,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        }),
      });
    }
  });

  // PATCH /employer/white-label/custom-fields/:id
  await page.route('**/api/v1/employer/white-label/custom-fields/*', async (route) => {
    if (route.request().method() === 'PATCH') {
      const fieldId = route.request().url().split('/').pop();
      const updates = route.request().postDataJSON();

      const existingField = mockCustomFields.find((f) => f.id === fieldId);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            ...existingField,
            ...updates,
            updated_at: new Date().toISOString(),
          },
        }),
      });
    }
  });

  // DELETE /employer/white-label/custom-fields/:id
  await page.route('**/api/v1/employer/white-label/custom-fields/*', async (route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { message: 'Custom field deleted successfully' },
        }),
      });
    }
  });

  // GET /employer/white-label/preview/career-page
  await page.route('**/api/v1/employer/white-label/preview/career-page', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          html: '<div>Career page preview</div>',
          config: config,
        },
      }),
    });
  });

  // GET /employer/white-label/preview/email/:type
  await page.route('**/api/v1/employer/white-label/preview/email/*', async (route) => {
    const emailType = route.request().url().split('/').pop();

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          html: `<div>Email preview: ${emailType}</div>`,
          subject: `Preview: ${emailType}`,
          config: config,
        },
      }),
    });
  });
}
