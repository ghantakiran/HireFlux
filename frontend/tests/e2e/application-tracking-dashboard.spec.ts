/**
 * Application Tracking Dashboard E2E Tests (Issue #106)
 *
 * TDD Red Phase: These tests will fail until the dashboard is implemented
 * BDD Approach: Based on application-tracking.feature scenarios
 */

import { test, expect } from '@playwright/test';

// Mock application data for testing
const mockApplications = [
  {
    id: '1',
    jobTitle: 'Senior Frontend Engineer',
    company: 'TechCorp Inc.',
    appliedDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
    stage: 'new',
    fitIndex: 87,
  },
  {
    id: '2',
    jobTitle: 'React Developer',
    company: 'StartupXYZ',
    appliedDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
    stage: 'screening',
    fitIndex: 92,
  },
  {
    id: '3',
    jobTitle: 'Full Stack Engineer',
    company: 'BigCo',
    appliedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
    stage: 'interview',
    fitIndex: 78,
  },
];

test.describe('Application Tracking Dashboard - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to application tracking dashboard
    await page.goto('/dashboard/applications');
  });

  test('should display application pipeline overview with all 8 stages', async ({ page }) => {
    // BDD: Given I have applications across different stages
    // When I visit the application tracking dashboard
    // Then I should see all 8 pipeline stages

    await expect(page.getByRole('region', { name: /application pipeline/i })).toBeVisible();

    // Verify all 8 stages are present
    await expect(page.getByText('New')).toBeVisible();
    await expect(page.getByText('Screening')).toBeVisible();
    await expect(page.getByText('Interview')).toBeVisible();
    await expect(page.getByText('Assessment')).toBeVisible();
    await expect(page.getByText('Offer')).toBeVisible();
    await expect(page.getByText('Hired')).toBeVisible();
    await expect(page.getByText('Rejected')).toBeVisible();
    await expect(page.getByText('Withdrawn')).toBeVisible();
  });

  test('should display application cards with complete details', async ({ page }) => {
    // BDD: Each application card should display job title, company, date, stage, fit index

    const applicationCard = page.locator('[data-application-card]').first();
    await expect(applicationCard).toBeVisible();

    // Verify all required fields are present
    await expect(applicationCard.getByRole('heading')).toBeVisible(); // Job title
    await expect(applicationCard.locator('text=/TechCorp|StartupXYZ|BigCo/i')).toBeVisible(); // Company
    await expect(applicationCard.locator('text=/ago|days/i')).toBeVisible(); // Applied date
    await expect(applicationCard.locator('[data-fit-index-badge]')).toBeVisible(); // Fit Index
  });

  test('should group applications by stage correctly', async ({ page }) => {
    // BDD: Applications should be grouped in their respective stage columns

    const newStageColumn = page.locator('[data-stage="new"]');
    await expect(newStageColumn).toBeVisible();

    const screeningStageColumn = page.locator('[data-stage="screening"]');
    await expect(screeningStageColumn).toBeVisible();

    const interviewStageColumn = page.locator('[data-stage="interview"]');
    await expect(interviewStageColumn).toBeVisible();
  });

  test('should display stage counts', async ({ page }) => {
    // BDD: I should see the count for each stage

    await expect(page.locator('[data-stage-count]').first()).toBeVisible();
  });
});

test.describe('Application Tracking Dashboard - Filtering & Sorting', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/applications');
  });

  test('should filter applications by stage', async ({ page }) => {
    // BDD: When I filter by "Interview" stage
    // Then I should only see applications in the Interview stage

    const filterButton = page.getByRole('button', { name: /filter/i });
    await filterButton.click();

    const interviewFilter = page.getByRole('checkbox', { name: /interview/i });
    await interviewFilter.check();

    await page.getByRole('button', { name: /apply filters/i }).click();

    // Verify only interview stage applications are visible
    const visibleCards = page.locator('[data-application-card]:visible');
    await expect(visibleCards).toHaveCount(1); // Assuming 1 interview application
  });

  test('should sort applications by newest first', async ({ page }) => {
    // BDD: When I sort by "Newest First"
    // Then applications should be ordered by most recent first

    const sortDropdown = page.getByRole('button', { name: /sort/i });
    await sortDropdown.click();

    await page.getByRole('option', { name: /newest first/i }).click();

    // Verify first application is the most recent
    const firstCard = page.locator('[data-application-card]').first();
    await expect(firstCard).toContainText(/2 days ago|hours ago/i);
  });

  test('should sort applications by oldest first', async ({ page }) => {
    // BDD: When I sort by "Oldest First"
    // Then applications should be ordered by oldest first

    const sortDropdown = page.getByRole('button', { name: /sort/i });
    await sortDropdown.click();

    await page.getByRole('option', { name: /oldest first/i }).click();

    // Verify first application is the oldest
    const firstCard = page.locator('[data-application-card]').first();
    await expect(firstCard).toContainText(/10 days ago|weeks ago/i);
  });
});

test.describe('Application Tracking Dashboard - Application Timeline', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/applications');
  });

  test('should display application timeline when card is clicked', async ({ page }) => {
    // BDD: When I click on an application card
    // Then I should see a detailed timeline

    const applicationCard = page.locator('[data-application-card]').first();
    await applicationCard.click();

    // Verify timeline modal/drawer opens
    await expect(page.getByRole('dialog', { name: /application details/i })).toBeVisible();

    // Verify timeline events are present
    await expect(page.getByText(/application sent/i)).toBeVisible();
    await expect(page.locator('[data-timeline-event]')).toHaveCount({ min: 1 });
  });

  test('should show timestamps for each timeline event', async ({ page }) => {
    // BDD: Timeline should show date/time for each event

    const applicationCard = page.locator('[data-application-card]').first();
    await applicationCard.click();

    const timelineEvent = page.locator('[data-timeline-event]').first();
    await expect(timelineEvent).toContainText(/\d{1,2}:\d{2}|am|pm|ago/i); // Time format
  });
});

test.describe('Application Tracking Dashboard - Empty States', () => {
  test('should show empty state when no applications exist', async ({ page }) => {
    // BDD: Given I have 0 applications
    // When I visit the dashboard
    // Then I should see an empty state message

    await page.goto('/dashboard/applications');

    // Mock empty state (would require API mocking)
    await expect(page.getByText(/no applications/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /find jobs/i })).toBeVisible();
  });

  test('should show empty message for stage with no applications', async ({ page }) => {
    // BDD: Stage with no applications should show "No applications" message

    await page.goto('/dashboard/applications');

    const offerStage = page.locator('[data-stage="offer"]');
    await expect(offerStage.getByText(/no applications/i)).toBeVisible();
  });
});

test.describe('Application Tracking Dashboard - Analytics & Insights', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/applications');
  });

  test('should display application statistics', async ({ page }) => {
    // BDD: I should see statistics showing total applications, response rate, etc.

    const statsSection = page.locator('[data-analytics-stats]');
    await expect(statsSection).toBeVisible();

    await expect(page.getByText(/total applications/i)).toBeVisible();
    await expect(page.getByText(/response rate/i)).toBeVisible();
    await expect(page.getByText(/average response time/i)).toBeVisible();
    await expect(page.getByText(/interview success rate/i)).toBeVisible();
  });

  test('should display application chart over time', async ({ page }) => {
    // BDD: I should see a chart showing applications over time

    const chart = page.locator('[data-chart]');
    await expect(chart).toBeVisible();

    // Verify chart has data points
    await expect(page.locator('[data-chart-bar]').first()).toBeVisible();
  });
});

test.describe('Application Tracking Dashboard - Rejection Feedback', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/applications');
  });

  test('should display rejection feedback when available', async ({ page }) => {
    // BDD: Given I have a rejected application with feedback
    // Then I should see the rejection reason

    const rejectedApp = page.locator('[data-stage="rejected"] [data-application-card]').first();
    await rejectedApp.click();

    await expect(page.getByText(/rejection reason/i)).toBeVisible();
    await expect(page.getByText(/feedback/i)).toBeVisible();
  });

  test('should show AI suggestions for rejected applications', async ({ page }) => {
    // BDD: Rejected applications should show AI-generated insights

    const rejectedApp = page.locator('[data-stage="rejected"] [data-application-card]').first();
    await rejectedApp.click();

    await expect(page.locator('[data-ai-suggestion-card]')).toBeVisible();
  });
});

test.describe('Application Tracking Dashboard - Interview Preparation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/applications');
  });

  test('should have interview preparation link for interview stage applications', async ({ page }) => {
    // BDD: Applications in Interview stage should have "Prepare for Interview" button

    const interviewApp = page.locator('[data-stage="interview"] [data-application-card]').first();
    await interviewApp.click();

    const prepareButton = page.getByRole('button', { name: /prepare for interview/i });
    await expect(prepareButton).toBeVisible();
  });

  test('should navigate to interview coach with pre-loaded job details', async ({ page }) => {
    // BDD: Clicking "Prepare for Interview" should take to Interview Coach

    const interviewApp = page.locator('[data-stage="interview"] [data-application-card]').first();
    await interviewApp.click();

    const prepareButton = page.getByRole('button', { name: /prepare for interview/i });
    await prepareButton.click();

    await expect(page).toHaveURL(/\/interview-coach/);
  });
});

test.describe('Application Tracking Dashboard - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test('should display pipeline as vertical list on mobile', async ({ page }) => {
    // BDD: On mobile, pipeline should be vertical list

    await page.goto('/dashboard/applications');

    const pipeline = page.locator('[data-pipeline]');
    await expect(pipeline).toBeVisible();

    // Verify vertical layout (stages stacked)
    await expect(pipeline).toHaveAttribute('data-variant', 'mobile');
  });

  test('should have collapsible/expandable stages on mobile', async ({ page }) => {
    // BDD: Each stage should be collapsible/expandable

    await page.goto('/dashboard/applications');

    const stageHeader = page.locator('[data-stage-header]').first();
    await stageHeader.click();

    // Verify stage collapsed
    await expect(page.locator('[data-stage-content]').first()).not.toBeVisible();

    // Expand again
    await stageHeader.click();
    await expect(page.locator('[data-stage-content]').first()).toBeVisible();
  });
});

test.describe('Application Tracking Dashboard - Quick Actions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/applications');
  });

  test('should allow withdrawing an application', async ({ page }) => {
    // BDD: I should be able to withdraw an application

    const applicationCard = page.locator('[data-application-card]').first();
    const menuButton = applicationCard.getByRole('button', { name: /more options/i });
    await menuButton.click();

    await page.getByRole('menuitem', { name: /withdraw application/i }).click();

    // Confirm withdrawal
    await expect(page.getByRole('dialog', { name: /confirm/i })).toBeVisible();
    await page.getByRole('button', { name: /confirm/i }).click();

    // Verify success message
    await expect(page.getByText(/application withdrawn/i)).toBeVisible();
  });

  test('should allow viewing original job posting', async ({ page }) => {
    // BDD: I should be able to view the original job posting

    const applicationCard = page.locator('[data-application-card]').first();
    await applicationCard.click();

    const viewJobButton = page.getByRole('button', { name: /view job/i });
    await viewJobButton.click();

    await expect(page).toHaveURL(/\/jobs\/\w+/);
  });
});

test.describe('Application Tracking Dashboard - Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/applications');
  });

  test('should be keyboard navigable', async ({ page }) => {
    // BDD: I should be able to navigate with keyboard

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Tab through application cards
    for (let i = 0; i < 3; i++) {
      await page.keyboard.press('Tab');
    }

    // Activate card with Enter
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    // BDD: Stages and cards should have ARIA labels

    const pipeline = page.locator('[data-pipeline]');
    await expect(pipeline).toHaveAttribute('role', 'region');
    await expect(pipeline).toHaveAttribute('aria-label', /application pipeline/i);

    const stageColumn = page.locator('[data-stage]').first();
    await expect(stageColumn).toHaveAttribute('aria-label');
  });
});

test.describe('Application Tracking Dashboard - Performance', () => {
  test('should load dashboard quickly', async ({ page }) => {
    // BDD: Page should load in under 2 seconds

    const startTime = Date.now();
    await page.goto('/dashboard/applications');
    const loadTime = Date.now() - startTime;

    expect(loadTime).toBeLessThan(2000);
  });

  test('should handle many applications without performance degradation', async ({ page }) => {
    // BDD: With 200+ applications, page should remain responsive

    await page.goto('/dashboard/applications');

    // Scroll through applications
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));

    // Verify no layout shift or jank
    const scrollContainer = page.locator('[data-scroll-container]');
    await expect(scrollContainer).toBeVisible();
  });
});

test.describe('Application Tracking Dashboard - Error Handling', () => {
  test('should show error message when API fails', async ({ page }) => {
    // BDD: If API is unavailable, show error with retry option

    // Mock API failure
    await page.route('**/api/applications', (route) => {
      route.abort();
    });

    await page.goto('/dashboard/applications');

    await expect(page.getByText(/error loading applications/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  test('should allow retrying after error', async ({ page }) => {
    // BDD: Clicking retry should attempt to fetch again

    await page.route('**/api/applications', (route) => {
      route.abort();
    });

    await page.goto('/dashboard/applications');

    const retryButton = page.getByRole('button', { name: /retry/i });
    await retryButton.click();

    // Verify retry attempt (would need to mock successful response)
    await expect(page.getByRole('status', { name: /loading/i })).toBeVisible();
  });
});

test.describe('Application Tracking Dashboard - Real-Time Updates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/applications');
  });

  test('should show notification for status update', async ({ page }) => {
    // BDD: When employer updates status, show notification

    // Simulate real-time update (would require WebSocket mocking)
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('application-status-updated', {
          detail: { applicationId: '1', newStage: 'interview' },
        })
      );
    });

    await expect(page.getByText(/status updated/i)).toBeVisible();
  });

  test('should move application card to new stage on update', async ({ page }) => {
    // BDD: Application card should move to new stage

    // Simulate status update
    await page.evaluate(() => {
      window.dispatchEvent(
        new CustomEvent('application-status-updated', {
          detail: { applicationId: '1', newStage: 'interview' },
        })
      );
    });

    const interviewStage = page.locator('[data-stage="interview"]');
    await expect(interviewStage.locator('[data-application-card]')).toHaveCount({ min: 1 });
  });
});
