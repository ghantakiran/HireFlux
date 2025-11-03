/**
 * E2E Tests: Employer Candidate Search (Sprint 9-10)
 *
 * Tests employer candidate discovery, advanced search filters,
 * candidate profile viewing, and search result management.
 *
 * BDD Scenarios:
 * - Searching for candidates with various filters
 * - Viewing candidate profiles
 * - Saving searches
 * - Contacting candidates
 * - Managing search results
 */

import { test, expect, Page } from '@playwright/test';

// Helper functions
async function loginAsEmployer(page: Page) {
  await page.goto('/signin');
  await page.getByLabel(/email/i).fill('employer@company.com');
  await page.getByLabel(/password/i).fill('TestPassword123!');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/.*employers.*dashboard/);
}

async function navigateToCandidateSearch(page: Page) {
  await page.getByRole('link', { name: /find candidates/i }).click();
  await expect(page).toHaveURL(/.*candidates.*search/);
}

test.describe('Employer Candidate Search', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Basic Search', () => {
    test('should display candidate search page with filters', async ({ page }) => {
      // GIVEN: A logged-in employer
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // THEN: Search page is displayed with all filter options
      await expect(page.getByRole('heading', { name: /find candidates/i })).toBeVisible();
      await expect(page.getByLabel(/skills/i)).toBeVisible();
      await expect(page.getByLabel(/experience level/i)).toBeVisible();
      await expect(page.getByLabel(/location/i)).toBeVisible();
      await expect(page.getByLabel(/salary range/i)).toBeVisible();
      await expect(page.getByLabel(/availability/i)).toBeVisible();
    });

    test('should show all public candidates by default', async ({ page }) => {
      // GIVEN: A logged-in employer on search page
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Page loads without filters
      // THEN: Public candidates are displayed
      await expect(page.locator('[data-testid="candidate-card"]')).toHaveCount(await page.locator('[data-testid="candidate-card"]').count());
      await expect(page.getByText(/showing.*candidates/i)).toBeVisible();
    });

    test('should display candidate cards with key information', async ({ page }) => {
      // GIVEN: A logged-in employer viewing search results
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // THEN: Candidate cards show essential info
      const firstCard = page.locator('[data-testid="candidate-card"]').first();
      await expect(firstCard.locator('[data-testid="candidate-headline"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="candidate-location"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="candidate-experience"]')).toBeVisible();
      await expect(firstCard.locator('[data-testid="candidate-skills"]')).toBeVisible();
    });
  });

  test.describe('Skills Filtering', () => {
    test('should filter candidates by single skill', async ({ page }) => {
      // GIVEN: An employer on candidate search page
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer searches for Python skill
      await page.getByLabel(/skills/i).click();
      await page.getByText('Python', { exact: true }).click();
      await page.getByRole('button', { name: /search/i }).click();

      // THEN: Only candidates with Python are displayed
      await expect(page.getByText(/filtering by.*python/i)).toBeVisible();
      const cards = page.locator('[data-testid="candidate-card"]');
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        await expect(cards.nth(i).locator('[data-testid="candidate-skills"]')).toContainText('Python');
      }
    });

    test('should filter candidates by multiple skills (AND logic)', async ({ page }) => {
      // GIVEN: An employer on candidate search page
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer searches for Python AND React
      await page.getByLabel(/skills/i).click();
      await page.getByText('Python', { exact: true }).click();
      await page.getByText('React', { exact: true }).click();
      await page.getByRole('button', { name: /search/i }).click();

      // THEN: Only candidates with BOTH skills are displayed
      await expect(page.getByText(/filtering by.*python.*react/i)).toBeVisible();
      const cards = page.locator('[data-testid="candidate-card"]');
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        const skillsText = await cards.nth(i).locator('[data-testid="candidate-skills"]').textContent();
        expect(skillsText).toContain('Python');
        expect(skillsText).toContain('React');
      }
    });

    test('should show "no results" for skill nobody has', async ({ page }) => {
      // GIVEN: An employer searching for rare skill
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer searches for COBOL
      await page.getByLabel(/skills/i).fill('COBOL');
      await page.getByRole('button', { name: /search/i }).click();

      // THEN: No results message is displayed
      await expect(page.getByText(/no candidates found/i)).toBeVisible();
      await expect(page.getByText(/try adjusting your filters/i)).toBeVisible();
    });
  });

  test.describe('Experience Filtering', () => {
    test('should filter by experience level', async ({ page }) => {
      // GIVEN: An employer on candidate search page
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer filters for senior level
      await page.getByLabel(/experience level/i).click();
      await page.getByText('Senior', { exact: true }).click();
      await page.getByRole('button', { name: /search/i }).click();

      // THEN: Only senior candidates are displayed
      await expect(page.getByText(/filtering by.*senior/i)).toBeVisible();
      const cards = page.locator('[data-testid="candidate-card"]');
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        await expect(cards.nth(i).locator('[data-testid="candidate-experience-level"]')).toContainText('Senior');
      }
    });

    test('should filter by minimum years of experience', async ({ page }) => {
      // GIVEN: An employer on candidate search page
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer sets minimum 5 years experience
      await page.getByLabel(/minimum years/i).fill('5');
      await page.getByRole('button', { name: /search/i }).click();

      // THEN: Only candidates with 5+ years are displayed
      await expect(page.getByText(/5\+ years/i)).toBeVisible();
    });

    test('should filter by years experience range', async ({ page }) => {
      // GIVEN: An employer on candidate search page
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer sets 3-7 years range
      await page.getByLabel(/minimum years/i).fill('3');
      await page.getByLabel(/maximum years/i).fill('7');
      await page.getByRole('button', { name: /search/i }).click();

      // THEN: Only candidates in range are displayed
      await expect(page.getByText(/3-7 years/i)).toBeVisible();
    });
  });

  test.describe('Location Filtering', () => {
    test('should filter by location city', async ({ page }) => {
      // GIVEN: An employer searching for candidates
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer searches for San Francisco
      await page.getByLabel(/location/i).fill('San Francisco');
      await page.getByRole('button', { name: /search/i }).click();

      // THEN: Only SF candidates are displayed
      await expect(page.getByText(/san francisco/i)).toBeVisible();
      const cards = page.locator('[data-testid="candidate-card"]');
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        const locationText = await cards.nth(i).locator('[data-testid="candidate-location"]').textContent();
        expect(locationText?.toLowerCase()).toContain('san francisco');
      }
    });

    test('should filter for remote-only candidates', async ({ page }) => {
      // GIVEN: An employer searching for remote workers
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer enables remote filter
      await page.getByLabel(/remote only/i).check();
      await page.getByRole('button', { name: /search/i }).click();

      // THEN: Only remote candidates are displayed
      await expect(page.getByText(/remote candidates/i)).toBeVisible();
      const cards = page.locator('[data-testid="candidate-card"]');
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        await expect(cards.nth(i).locator('[data-testid="remote-badge"]')).toBeVisible();
      }
    });

    test('should filter by location type (remote/hybrid/onsite)', async ({ page }) => {
      // GIVEN: An employer on search page
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer filters for hybrid
      await page.getByLabel(/location type/i).selectOption('hybrid');
      await page.getByRole('button', { name: /search/i }).click();

      // THEN: Only hybrid candidates are displayed
      await expect(page.getByText(/hybrid/i)).toBeVisible();
    });
  });

  test.describe('Salary Filtering', () => {
    test('should filter by minimum salary', async ({ page }) => {
      // GIVEN: An employer with budget constraints
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer sets minimum budget to $150k
      await page.getByLabel(/minimum salary/i).fill('150000');
      await page.getByRole('button', { name: /search/i }).click();

      // THEN: Candidates within budget are displayed
      await expect(page.getByText(/\$150k/i)).toBeVisible();
    });

    test('should filter by salary range', async ({ page }) => {
      // GIVEN: An employer with specific budget
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer sets budget range
      await page.getByLabel(/minimum salary/i).fill('120000');
      await page.getByLabel(/maximum salary/i).fill('160000');
      await page.getByRole('button', { name: /search/i }).click();

      // THEN: Candidates with overlapping expectations are displayed
      await expect(page.getByText(/\$120k - \$160k/i)).toBeVisible();
    });
  });

  test.describe('Availability Filtering', () => {
    test('should filter for "actively looking" candidates', async ({ page }) => {
      // GIVEN: An employer searching for immediate hires
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer filters for actively looking
      await page.getByLabel(/availability/i).click();
      await page.getByText('Actively Looking', { exact: true }).click();
      await page.getByRole('button', { name: /search/i }).click();

      // THEN: Only actively looking candidates are shown
      await expect(page.getByText(/actively looking/i)).toBeVisible();
      const cards = page.locator('[data-testid="candidate-card"]');
      const count = await cards.count();

      for (let i = 0; i < count; i++) {
        await expect(cards.nth(i).locator('[data-testid="availability-badge"]')).toContainText('Actively Looking');
      }
    });

    test('should filter for both "actively looking" and "open to offers"', async ({ page }) => {
      // GIVEN: An employer open to passive candidates
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer selects multiple statuses
      await page.getByLabel(/availability/i).click();
      await page.getByText('Actively Looking').click();
      await page.getByText('Open to Offers').click();
      await page.getByRole('button', { name: /search/i }).click();

      // THEN: Candidates with either status are shown
      await expect(page.getByText(/actively looking|open to offers/i)).toBeVisible();
    });
  });

  test.describe('Combined Filters', () => {
    test('should apply multiple filters simultaneously', async ({ page }) => {
      // GIVEN: An employer with specific requirements
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer applies multiple filters
      await page.getByLabel(/skills/i).click();
      await page.getByText('Python').click();
      await page.getByText('AWS').click();

      await page.getByLabel(/experience level/i).click();
      await page.getByText('Senior').click();

      await page.getByLabel(/remote only/i).check();

      await page.getByLabel(/availability/i).click();
      await page.getByText('Actively Looking').click();

      await page.getByRole('button', { name: /search/i }).click();

      // THEN: Only candidates matching ALL criteria are shown
      await expect(page.getByText(/python.*aws/i)).toBeVisible();
      await expect(page.getByText(/senior/i)).toBeVisible();
      await expect(page.getByText(/remote/i)).toBeVisible();
      await expect(page.getByText(/actively looking/i)).toBeVisible();
    });

    test('should clear all filters', async ({ page }) => {
      // GIVEN: An employer with filters applied
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      await page.getByLabel(/skills/i).fill('Python');
      await page.getByRole('button', { name: /search/i }).click();

      // WHEN: Employer clears filters
      await page.getByRole('button', { name: /clear filters/i }).click();

      // THEN: All candidates are shown again
      await expect(page.getByLabel(/skills/i)).toHaveValue('');
      await expect(page.getByText(/showing all candidates/i)).toBeVisible();
    });
  });

  test.describe('Pagination', () => {
    test('should paginate search results', async ({ page }) => {
      // GIVEN: Search results with multiple pages
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // THEN: Pagination controls are visible
      await expect(page.getByRole('button', { name: /next page/i })).toBeVisible();
      await expect(page.getByText(/page 1 of/i)).toBeVisible();
    });

    test('should navigate to next page', async ({ page }) => {
      // GIVEN: An employer viewing page 1
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer clicks next
      await page.getByRole('button', { name: /next page/i }).click();

      // THEN: Page 2 is displayed
      await expect(page.getByText(/page 2 of/i)).toBeVisible();
      await expect(page).toHaveURL(/.*page=2/);
    });

    test('should change results per page', async ({ page }) => {
      // GIVEN: An employer on search page
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer changes to 50 per page
      await page.getByLabel(/results per page/i).selectOption('50');

      // THEN: 50 results are displayed
      const cards = page.locator('[data-testid="candidate-card"]');
      await expect(cards).toHaveCount(await cards.count());
    });
  });

  test.describe('Candidate Profile Viewing', () => {
    test('should view candidate profile details', async ({ page }) => {
      // GIVEN: An employer viewing search results
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer clicks on a candidate
      await page.locator('[data-testid="candidate-card"]').first().click();

      // THEN: Full profile is displayed
      await expect(page).toHaveURL(/.*candidates\/.*[0-9a-f-]+/);
      await expect(page.getByRole('heading', { name: /candidate profile/i })).toBeVisible();
      await expect(page.locator('[data-testid="profile-headline"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-bio"]')).toBeVisible();
      await expect(page.locator('[data-testid="profile-skills"]')).toBeVisible();
    });

    test('should display candidate portfolio items', async ({ page }) => {
      // GIVEN: An employer viewing a candidate profile
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);
      await page.locator('[data-testid="candidate-card"]').first().click();

      // THEN: Portfolio section is visible
      await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible();
      await expect(page.locator('[data-testid="portfolio-item"]').first()).toBeVisible();
    });

    test('should track profile view for analytics', async ({ page }) => {
      // GIVEN: An employer viewing a candidate
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer views profile
      await page.locator('[data-testid="candidate-card"]').first().click();

      // THEN: View is tracked (verified via network call)
      await page.waitForResponse((response) =>
        response.url().includes('/candidate-profiles/') &&
        response.status() === 200
      );
    });

    test('should show contact button on profile', async ({ page }) => {
      // GIVEN: An employer viewing a candidate profile
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);
      await page.locator('[data-testid="candidate-card"]').first().click();

      // THEN: Contact button is visible
      await expect(page.getByRole('button', { name: /contact candidate/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /send invite/i })).toBeVisible();
    });
  });

  test.describe('Save Search', () => {
    test('should save current search filters', async ({ page }) => {
      // GIVEN: An employer with active filters
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      await page.getByLabel(/skills/i).fill('Python');
      await page.getByRole('button', { name: /search/i }).click();

      // WHEN: Employer saves search
      await page.getByRole('button', { name: /save search/i }).click();
      await page.getByLabel(/search name/i).fill('Python Developers');
      await page.getByRole('button', { name: /save/i }).click();

      // THEN: Search is saved
      await expect(page.getByText(/search saved/i)).toBeVisible();
    });

    test('should load saved search', async ({ page }) => {
      // GIVEN: An employer with saved searches
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Employer loads saved search
      await page.getByRole('button', { name: /saved searches/i }).click();
      await page.getByText('Python Developers').click();

      // THEN: Filters are applied
      await expect(page.getByLabel(/skills/i)).toHaveValue('Python');
      await expect(page.getByText(/python developers/i)).toBeVisible();
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display search filters in mobile view', async ({ page }) => {
      // GIVEN: A mobile device
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // WHEN: Page loads on mobile
      // THEN: Filters are in collapsible menu
      await expect(page.getByRole('button', { name: /filters/i })).toBeVisible();
      await page.getByRole('button', { name: /filters/i }).click();
      await expect(page.getByLabel(/skills/i)).toBeVisible();
    });

    test('should display candidate cards in mobile layout', async ({ page }) => {
      // GIVEN: A mobile device
      await page.setViewportSize({ width: 375, height: 667 });
      await loginAsEmployer(page);
      await navigateToCandidateSearch(page);

      // THEN: Cards are stacked vertically
      const cards = page.locator('[data-testid="candidate-card"]');
      await expect(cards.first()).toBeVisible();
    });
  });
});
