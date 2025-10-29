/**
 * API helper functions for E2E tests
 * Direct backend API interactions for test setup/teardown
 */
import { request, APIRequestContext } from '@playwright/test';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

/**
 * Create an API context for making requests
 */
export async function createAPIContext(): Promise<APIRequestContext> {
  return await request.newContext({
    baseURL: `${API_BASE_URL}/api/v1`,
    extraHTTPHeaders: {
      'Content-Type': 'application/json',
    },
  });
}

/**
 * Create a test user via API
 */
export async function createTestUserAPI(email: string, password: string) {
  const context = await createAPIContext();

  const response = await context.post('/auth/register', {
    data: {
      email,
      password,
      terms_accepted: true,
    },
  });

  await context.dispose();

  if (!response.ok()) {
    throw new Error(`Failed to create test user: ${response.status()} ${await response.text()}`);
  }

  return await response.json();
}

/**
 * Delete a test user via API (cleanup)
 */
export async function deleteTestUserAPI(userId: string, authToken: string) {
  const context = await createAPIContext();

  const response = await context.delete(`/users/${userId}`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  await context.dispose();

  return response.ok();
}

/**
 * Get auth token via API
 */
export async function getAuthTokenAPI(email: string, password: string): Promise<string> {
  const context = await createAPIContext();

  const response = await context.post('/auth/login', {
    data: {
      username: email, // FastAPI OAuth2PasswordRequestForm uses 'username'
      password,
    },
  });

  await context.dispose();

  if (!response.ok()) {
    throw new Error(`Failed to get auth token: ${response.status()} ${await response.text()}`);
  }

  const data = await response.json();
  return data.data.tokens.access_token;
}

/**
 * Create a test resume via API
 */
export async function createTestResumeAPI(
  authToken: string,
  resumeData: {
    title: string;
    content: string;
  }
) {
  const context = await createAPIContext();

  const response = await context.post('/resumes', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    data: resumeData,
  });

  await context.dispose();

  if (!response.ok()) {
    throw new Error(`Failed to create resume: ${response.status()} ${await response.text()}`);
  }

  return await response.json();
}

/**
 * Get user profile via API
 */
export async function getUserProfileAPI(authToken: string) {
  const context = await createAPIContext();

  const response = await context.get('/auth/me', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  await context.dispose();

  if (!response.ok()) {
    throw new Error(`Failed to get user profile: ${response.status()}`);
  }

  return await response.json();
}

/**
 * Wait for API to be ready (health check)
 */
export async function waitForAPI(maxRetries: number = 30, delayMs: number = 1000): Promise<boolean> {
  const context = await createAPIContext();

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await context.get('/health', {
        timeout: 5000,
      });

      if (response.ok()) {
        await context.dispose();
        return true;
      }
    } catch (error) {
      // API not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  await context.dispose();
  return false;
}

/**
 * Seed database with test data
 */
export async function seedTestData(authToken: string) {
  const context = await createAPIContext();

  // Create test jobs
  await context.post('/admin/seed-jobs', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
    data: {
      count: 50,
    },
  });

  await context.dispose();
}

/**
 * Clean up test data
 */
export async function cleanupTestData(authToken: string) {
  const context = await createAPIContext();

  await context.delete('/admin/test-data', {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  await context.dispose();
}
