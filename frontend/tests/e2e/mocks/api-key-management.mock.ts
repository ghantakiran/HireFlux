/**
 * Mock Data for API Key Management E2E Tests
 *
 * Provides mock data and helper functions for testing API key management.
 */

import { Page } from '@playwright/test';

// Mock authenticated session
export async function mockAuthenticatedSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem(
      'access_token',
      'mock_jwt_token_for_testing_api_keys'
    );
    localStorage.setItem('user', JSON.stringify({
      id: '123e4567-e89b-12d3-a456-426614174001',
      email: 'admin@techcorp.com',
      role: 'employer',
    }));
  });
}

// Mock company data
export function mockCompanyData() {
  return {
    id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'TechCorp Inc',
    subscription_tier: 'professional',
    subscription_status: 'active',
  };
}

// Create mock API key
export function createMockAPIKey(overrides: any = {}) {
  const baseKey = {
    id: `key-${Math.random().toString(36).substring(7)}`,
    company_id: '123e4567-e89b-12d3-a456-426614174000',
    name: 'Production API Key',
    key_prefix: 'hf_live_abc12345',
    permissions: {
      jobs: ['read'],
      candidates: ['read'],
      applications: ['read'],
      webhooks: [],
      analytics: [],
    },
    rate_limit_tier: 'standard',
    rate_limit_requests_per_minute: 60,
    rate_limit_requests_per_hour: 3000,
    last_used_at: null,
    last_used_ip: null,
    expires_at: null,
    created_by: '123e4567-e89b-12d3-a456-426614174001',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    revoked_at: null,
    revoked_by: null,
    status: 'active',
  };

  return {
    ...baseKey,
    ...overrides,
  };
}

// Create list of mock API keys
export function createMockAPIKeyList(count: number) {
  const tiers = ['standard', 'elevated', 'enterprise'];
  const names = [
    'Production API',
    'Development API',
    'Integration API',
    'Testing API',
    'Legacy API',
  ];

  return Array.from({ length: count }, (_, i) => {
    const tier = tiers[i % tiers.length] as 'standard' | 'elevated' | 'enterprise';
    const rateLimits: Record<'standard' | 'elevated' | 'enterprise', { per_minute: number; per_hour: number }> = {
      standard: { per_minute: 60, per_hour: 3000 },
      elevated: { per_minute: 120, per_hour: 6000 },
      enterprise: { per_minute: 300, per_hour: 15000 },
    };

    return createMockAPIKey({
      id: `key-${i + 1}`,
      name: names[i % names.length],
      key_prefix: `hf_live_${Math.random().toString(36).substring(2, 10)}`,
      rate_limit_tier: tier,
      rate_limit_requests_per_minute: rateLimits[tier].per_minute,
      rate_limit_requests_per_hour: rateLimits[tier].per_hour,
      last_used_at: i % 2 === 0 ? new Date(Date.now() - 86400000 * (i + 1)).toISOString() : null,
      status: i % 4 === 0 ? 'revoked' : 'active',
      revoked_at: i % 4 === 0 ? new Date().toISOString() : null,
    });
  });
}

// Create mock usage stats
export function createMockUsageStats() {
  return {
    total_requests: 1250,
    requests_by_endpoint: {
      '/api/v1/jobs': 450,
      '/api/v1/candidates': 350,
      '/api/v1/applications': 300,
      '/api/v1/analytics': 150,
    },
    requests_by_status: {
      '200': 1100,
      '400': 80,
      '401': 40,
      '404': 20,
      '500': 10,
    },
    avg_response_time_ms: 245.5,
    error_rate: 12.0,
    period_start: new Date(Date.now() - 30 * 86400000).toISOString(),
    period_end: new Date().toISOString(),
  };
}

// Mock API routes
export async function mockAPIKeyRoutes(page: Page) {
  // List API keys
  await page.route('**/api/v1/employer/api-keys/', async (route) => {
    if (route.request().method() === 'GET') {
      const mockKeys = createMockAPIKeyList(3);
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
    } else if (route.request().method() === 'POST') {
      const postData = route.request().postDataJSON();
      const newKey = createMockAPIKey({
        ...postData,
        key: `hf_live_${Math.random().toString(36).substring(2, 50)}`,
      });
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newKey),
      });
    }
  });

  // Get specific API key
  await page.route('**/api/v1/employer/api-keys/*', async (route) => {
    const keyId = route.request().url().split('/').pop();

    if (route.request().method() === 'GET') {
      const mockKey = createMockAPIKey({ id: keyId });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockKey),
      });
    } else if (route.request().method() === 'DELETE') {
      const revokedKey = createMockAPIKey({
        id: keyId,
        status: 'revoked',
        revoked_at: new Date().toISOString(),
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(revokedKey),
      });
    } else if (route.request().method() === 'PATCH') {
      const patchData = route.request().postDataJSON();
      const updatedKey = createMockAPIKey({
        id: keyId,
        ...patchData,
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(updatedKey),
      });
    }
  });

  // Get usage stats
  await page.route('**/api/v1/employer/api-keys/*/usage', async (route) => {
    const stats = createMockUsageStats();
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(stats),
    });
  });
}

// Mock error scenarios
export async function mockAPIKeyError(page: Page, errorType: 'forbidden' | 'not_found' | 'server_error') {
  const errors = {
    forbidden: {
      status: 403,
      body: {
        detail: 'API access not available on your plan. Upgrade to Professional or Enterprise.',
      },
    },
    not_found: {
      status: 404,
      body: {
        detail: 'API key not found',
      },
    },
    server_error: {
      status: 500,
      body: {
        detail: 'Internal server error',
      },
    },
  };

  const error = errors[errorType];

  await page.route('**/api/v1/employer/api-keys/**', async (route) => {
    await route.fulfill({
      status: error.status,
      contentType: 'application/json',
      body: JSON.stringify(error.body),
    });
  });
}

// Mock rate limit scenarios
export function createMockRateLimitedKey() {
  return createMockAPIKey({
    rate_limit_tier: 'standard',
    rate_limit_requests_per_minute: 60,
    rate_limit_requests_per_hour: 3000,
    // Simulate high usage
    last_used_at: new Date().toISOString(),
  });
}

// Mock expired key
export function createMockExpiredKey() {
  return createMockAPIKey({
    status: 'expired',
    expires_at: new Date(Date.now() - 86400000).toISOString(), // Expired yesterday
  });
}

// Mock permissions scenarios
export function createMockKeyWithFullPermissions() {
  return createMockAPIKey({
    permissions: {
      jobs: ['read', 'write', 'delete'],
      candidates: ['read', 'write'],
      applications: ['read', 'write'],
      webhooks: ['read', 'write', 'delete'],
      analytics: ['read'],
    },
    rate_limit_tier: 'enterprise',
    rate_limit_requests_per_minute: 300,
    rate_limit_requests_per_hour: 15000,
  });
}

export function createMockReadOnlyKey() {
  return createMockAPIKey({
    permissions: {
      jobs: ['read'],
      candidates: ['read'],
      applications: ['read'],
      webhooks: [],
      analytics: [],
    },
    rate_limit_tier: 'standard',
  });
}
