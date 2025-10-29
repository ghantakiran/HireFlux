/**
 * Authentication helper functions for E2E tests
 */
import { Page } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

/**
 * Sign in with email and password
 */
export async function signIn(page: Page, user: TestUser) {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/password/i).fill(user.password);
  await page.getByRole('button', { name: /sign in/i }).click();

  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard/**', { timeout: 10000 });
}

/**
 * Sign up a new user
 */
export async function signUp(page: Page, user: TestUser) {
  await page.goto('/signup');

  if (user.firstName) {
    await page.getByLabel(/first name/i).fill(user.firstName);
  }
  if (user.lastName) {
    await page.getByLabel(/last name/i).fill(user.lastName);
  }

  await page.getByLabel(/email/i).fill(user.email);
  await page.getByLabel(/^password/i).fill(user.password);

  // Accept terms if checkbox exists
  const termsCheckbox = page.getByRole('checkbox', { name: /terms/i });
  if (await termsCheckbox.isVisible({ timeout: 1000 }).catch(() => false)) {
    await termsCheckbox.check();
  }

  await page.getByRole('button', { name: /sign up/i }).click();

  // Wait for redirect
  await page.waitForURL('**/dashboard/**', { timeout: 10000 });
}

/**
 * Sign out current user
 */
export async function signOut(page: Page) {
  // Click user menu
  await page.getByRole('button', { name: /user menu|account/i }).click();

  // Click sign out
  await page.getByRole('menuitem', { name: /sign out|log out/i }).click();

  // Wait for redirect to landing page
  await page.waitForURL('/', { timeout: 5000 });
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  try {
    // Check for dashboard navigation or user menu
    const userMenu = page.getByRole('button', { name: /user menu|account/i });
    return await userMenu.isVisible({ timeout: 2000 });
  } catch {
    return false;
  }
}

/**
 * Generate random test user credentials
 */
export function generateTestUser(): TestUser {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);

  return {
    email: `test.user.${timestamp}.${random}@example.com`,
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User',
  };
}

/**
 * Use saved authentication state
 */
export async function useAuthState(page: Page, authFile: string = '.auth/user.json') {
  const path = require('path');
  const authPath = path.join(__dirname, '..', authFile);

  try {
    await page.context().addCookies(require(authPath).cookies);
    await page.context().addInitScript(() => {
      const storage = require(authPath).origins[0].localStorage;
      for (const item of storage) {
        window.localStorage.setItem(item.name, item.value);
      }
    });
  } catch (error) {
    console.warn('Could not load auth state:', error);
  }
}
