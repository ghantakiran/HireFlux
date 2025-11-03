/**
 * E2E Tests: Candidate Profile Management (Sprint 9-10)
 *
 * Tests job seeker profile creation, editing, visibility controls,
 * portfolio management, and availability tracking.
 *
 * BDD Scenarios:
 * - Creating a candidate profile
 * - Editing profile information
 * - Managing visibility (public/private)
 * - Adding/removing portfolio items
 * - Updating availability status
 * - Viewing profile analytics
 */

import { test, expect, Page } from '@playwright/test';

// Helper functions
async function loginAsJobSeeker(page: Page) {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('jobseeker@example.com');
  await page.getByLabel(/password/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/.*dashboard/);
}

async function navigateToProfileSettings(page: Page) {
  // Navigate to profile settings from dashboard
  await page.getByRole('link', { name: /profile settings/i }).click();
  await expect(page).toHaveURL(/.*settings.*profile/);
}

test.describe('Candidate Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Profile Creation', () => {
    test('should create a new candidate profile with required fields', async ({ page }) => {
      // GIVEN: A logged-in job seeker without a profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User fills in profile information
      await page.getByLabel(/headline/i).fill('Senior Full-Stack Engineer');
      await page.getByLabel(/bio/i).fill('Experienced engineer with 8 years in web development');
      await page.getByLabel(/location/i).fill('San Francisco, CA');

      // Select skills
      await page.getByLabel(/skills/i).click();
      await page.getByText('Python').click();
      await page.getByText('React').click();
      await page.getByText('PostgreSQL').click();

      // Set experience
      await page.getByLabel(/years of experience/i).fill('8');
      await page.getByLabel(/experience level/i).selectOption('senior');

      // Set salary expectations
      await page.getByLabel(/minimum salary/i).fill('150000');
      await page.getByLabel(/maximum salary/i).fill('180000');

      // Set preferences
      await page.getByLabel(/preferred location type/i).selectOption('remote');
      await page.getByLabel(/open to remote/i).check();

      // Set availability
      await page.getByLabel(/availability status/i).selectOption('open_to_offers');

      // Submit form
      await page.getByRole('button', { name: /create profile/i }).click();

      // THEN: Profile is created successfully
      await expect(page.getByText(/profile created successfully/i)).toBeVisible();
      await expect(page.getByText(/senior full-stack engineer/i)).toBeVisible();
    });

    test('should show validation errors for missing required fields', async ({ page }) => {
      // GIVEN: A logged-in job seeker on profile creation page
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User tries to submit empty form
      await page.getByRole('button', { name: /create profile/i }).click();

      // THEN: Validation errors are displayed
      await expect(page.getByText(/headline.*required/i)).toBeVisible();
      await expect(page.getByText(/visibility.*required/i)).toBeVisible();
    });

    test('should set profile visibility to private by default', async ({ page }) => {
      // GIVEN: A new profile creation form
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // THEN: Visibility is set to private by default
      const visibilitySelect = page.getByLabel(/visibility/i);
      await expect(visibilitySelect).toHaveValue('private');
    });
  });

  test.describe('Profile Editing', () => {
    test('should update profile headline and bio', async ({ page }) => {
      // GIVEN: A job seeker with an existing profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User updates headline and bio
      await page.getByLabel(/headline/i).clear();
      await page.getByLabel(/headline/i).fill('Lead Data Scientist | ML Expert');

      await page.getByLabel(/bio/i).clear();
      await page.getByLabel(/bio/i).fill('PhD in Computer Science with 10 years ML/AI experience');

      await page.getByRole('button', { name: /save changes/i }).click();

      // THEN: Profile is updated successfully
      await expect(page.getByText(/profile updated successfully/i)).toBeVisible();
      await expect(page.getByText(/lead data scientist/i)).toBeVisible();
    });

    test('should update salary expectations', async ({ page }) => {
      // GIVEN: A job seeker with an existing profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User updates salary range
      await page.getByLabel(/minimum salary/i).clear();
      await page.getByLabel(/minimum salary/i).fill('180000');

      await page.getByLabel(/maximum salary/i).clear();
      await page.getByLabel(/maximum salary/i).fill('220000');

      await page.getByRole('button', { name: /save changes/i }).click();

      // THEN: Salary is updated
      await expect(page.getByText(/profile updated successfully/i)).toBeVisible();
      await expect(page.getByLabel(/minimum salary/i)).toHaveValue('180000');
    });

    test('should update skills list', async ({ page }) => {
      // GIVEN: A job seeker with an existing profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User adds new skills
      await page.getByLabel(/skills/i).click();
      await page.getByText('TensorFlow').click();
      await page.getByText('PyTorch').click();

      await page.getByRole('button', { name: /save changes/i }).click();

      // THEN: Skills are updated
      await expect(page.getByText(/profile updated successfully/i)).toBeVisible();
      await expect(page.getByText('TensorFlow')).toBeVisible();
      await expect(page.getByText('PyTorch')).toBeVisible();
    });
  });

  test.describe('Visibility Controls', () => {
    test('should toggle profile visibility from private to public', async ({ page }) => {
      // GIVEN: A job seeker with a private profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // Verify current state is private
      await expect(page.getByText(/profile is private/i)).toBeVisible();
      await expect(page.getByText(/not visible to employers/i)).toBeVisible();

      // WHEN: User toggles visibility to public
      await page.getByLabel(/make profile public/i).click();
      await page.getByRole('button', { name: /confirm/i }).click();

      // THEN: Profile becomes public
      await expect(page.getByText(/profile is now public/i)).toBeVisible();
      await expect(page.getByText(/visible to employers/i)).toBeVisible();
    });

    test('should toggle profile visibility from public to private', async ({ page }) => {
      // GIVEN: A job seeker with a public profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // Assume profile is already public
      await page.getByLabel(/make profile public/i).check();

      // WHEN: User toggles visibility to private
      await page.getByLabel(/make profile public/i).uncheck();
      await page.getByRole('button', { name: /confirm/i }).click();

      // THEN: Profile becomes private
      await expect(page.getByText(/profile is now private/i)).toBeVisible();
      await expect(page.getByText(/hidden from employers/i)).toBeVisible();
    });

    test('should show warning when making profile public', async ({ page }) => {
      // GIVEN: A job seeker with a private profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User attempts to make profile public
      await page.getByLabel(/make profile public/i).click();

      // THEN: Warning modal is displayed
      await expect(page.getByText(/make profile public/i)).toBeVisible();
      await expect(page.getByText(/visible to all employers/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /confirm/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    });
  });

  test.describe('Portfolio Management', () => {
    test('should add a GitHub repository to portfolio', async ({ page }) => {
      // GIVEN: A job seeker with an existing profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User adds a GitHub portfolio item
      await page.getByRole('button', { name: /add portfolio item/i }).click();

      await page.getByLabel(/type/i).selectOption('github');
      await page.getByLabel(/title/i).fill('FastAPI Microservices');
      await page.getByLabel(/description/i).fill('Production-ready microservices architecture');
      await page.getByLabel(/url/i).fill('https://github.com/user/fastapi-microservices');

      await page.getByRole('button', { name: /add item/i }).click();

      // THEN: Portfolio item is added
      await expect(page.getByText(/portfolio item added/i)).toBeVisible();
      await expect(page.getByText('FastAPI Microservices')).toBeVisible();
    });

    test('should add a personal website to portfolio', async ({ page }) => {
      // GIVEN: A job seeker with an existing profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User adds a website portfolio item
      await page.getByRole('button', { name: /add portfolio item/i }).click();

      await page.getByLabel(/type/i).selectOption('website');
      await page.getByLabel(/title/i).fill('Personal Portfolio');
      await page.getByLabel(/description/i).fill('My professional portfolio and blog');
      await page.getByLabel(/url/i).fill('https://johndoe.dev');

      await page.getByRole('button', { name: /add item/i }).click();

      // THEN: Portfolio item is added
      await expect(page.getByText(/portfolio item added/i)).toBeVisible();
      await expect(page.getByText('Personal Portfolio')).toBeVisible();
    });

    test('should remove portfolio item', async ({ page }) => {
      // GIVEN: A job seeker with portfolio items
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // Verify portfolio item exists
      await expect(page.getByText('FastAPI Microservices')).toBeVisible();

      // WHEN: User removes portfolio item
      await page.getByRole('button', { name: /remove.*fastapi/i }).click();
      await page.getByRole('button', { name: /confirm/i }).click();

      // THEN: Portfolio item is removed
      await expect(page.getByText(/portfolio item removed/i)).toBeVisible();
      await expect(page.getByText('FastAPI Microservices')).not.toBeVisible();
    });

    test('should validate portfolio URL format', async ({ page }) => {
      // GIVEN: A job seeker adding a portfolio item
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User enters invalid URL
      await page.getByRole('button', { name: /add portfolio item/i }).click();

      await page.getByLabel(/type/i).selectOption('github');
      await page.getByLabel(/title/i).fill('My Project');
      await page.getByLabel(/url/i).fill('not-a-valid-url');

      await page.getByRole('button', { name: /add item/i }).click();

      // THEN: Validation error is shown
      await expect(page.getByText(/valid url/i)).toBeVisible();
    });
  });

  test.describe('Availability Management', () => {
    test('should update availability to "actively looking"', async ({ page }) => {
      // GIVEN: A job seeker with existing profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User updates availability
      await page.getByLabel(/availability status/i).selectOption('actively_looking');
      await page.getByLabel(/available from/i).fill('2025-12-01');

      await page.getByRole('button', { name: /save changes/i }).click();

      // THEN: Availability is updated
      await expect(page.getByText(/availability updated/i)).toBeVisible();
      await expect(page.getByText(/actively looking/i)).toBeVisible();
    });

    test('should update availability to "not looking"', async ({ page }) => {
      // GIVEN: A job seeker with existing profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User sets status to not looking
      await page.getByLabel(/availability status/i).selectOption('not_looking');
      await page.getByRole('button', { name: /save changes/i }).click();

      // THEN: Status is updated
      await expect(page.getByText(/availability updated/i)).toBeVisible();
      await expect(page.getByText(/not looking/i)).toBeVisible();
    });

    test('should show badge for "open to offers" status', async ({ page }) => {
      // GIVEN: A job seeker with existing profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User sets status to open to offers
      await page.getByLabel(/availability status/i).selectOption('open_to_offers');
      await page.getByRole('button', { name: /save changes/i }).click();

      // THEN: Badge is displayed
      await expect(page.getByText(/open to offers/i)).toBeVisible();
      await expect(page.locator('[data-testid="availability-badge"]')).toBeVisible();
    });
  });

  test.describe('Profile Analytics', () => {
    test('should display profile view count', async ({ page }) => {
      // GIVEN: A job seeker with a public profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // THEN: Profile views are displayed
      await expect(page.getByText(/profile views/i)).toBeVisible();
      await expect(page.locator('[data-testid="profile-views-count"]')).toBeVisible();
    });

    test('should display invites received count', async ({ page }) => {
      // GIVEN: A job seeker with a public profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // THEN: Invites count is displayed
      await expect(page.getByText(/invites received/i)).toBeVisible();
      await expect(page.locator('[data-testid="invites-count"]')).toBeVisible();
    });

    test('should show "0 views" for new profiles', async ({ page }) => {
      // GIVEN: A newly created profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // THEN: View count shows zero
      await expect(page.locator('[data-testid="profile-views-count"]')).toHaveText('0');
    });
  });

  test.describe('Profile Deletion', () => {
    test('should show confirmation modal when deleting profile', async ({ page }) => {
      // GIVEN: A job seeker with existing profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User attempts to delete profile
      await page.getByRole('button', { name: /delete profile/i }).click();

      // THEN: Confirmation modal appears
      await expect(page.getByText(/are you sure/i)).toBeVisible();
      await expect(page.getByText(/cannot be undone/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /confirm delete/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
    });

    test('should delete profile after confirmation', async ({ page }) => {
      // GIVEN: A job seeker with existing profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User deletes profile
      await page.getByRole('button', { name: /delete profile/i }).click();
      await page.getByRole('button', { name: /confirm delete/i }).click();

      // THEN: Profile is deleted
      await expect(page.getByText(/profile deleted/i)).toBeVisible();
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should cancel profile deletion', async ({ page }) => {
      // GIVEN: A job seeker with existing profile
      await loginAsJobSeeker(page);
      await navigateToProfileSettings(page);

      // WHEN: User cancels deletion
      await page.getByRole('button', { name: /delete profile/i }).click();
      await page.getByRole('button', { name: /cancel/i }).click();

      // THEN: Profile is not deleted
      await expect(page.getByText(/senior full-stack engineer/i)).toBeVisible();
    });
  });
});
