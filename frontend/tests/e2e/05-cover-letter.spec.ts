import { test, expect } from '@playwright/test';

test.describe('Cover Letter Generation Flow', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/cover-letters');
  });

  test('should display cover letters page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /Cover Letters/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Generate New/i })).toBeVisible();
  });

  test('should generate cover letter for specific job', async ({ page }) => {
    await page.getByRole('button', { name: /Generate New/i }).click();

    // Select job
    await page.getByLabel(/Select Job/i).click();
    await page.getByRole('option').first().click();

    // Select resume
    await page.getByLabel(/Select Resume/i).click();
    await page.getByRole('option').first().click();

    // Select tone
    await page.getByLabel(/Tone/i).click();
    await page.getByRole('option', { name: /Professional/i }).click();

    // Generate
    await page.getByRole('button', { name: /Generate/i }).click();

    // Should show generating state
    await expect(page.getByText(/Generating.*cover letter/i)).toBeVisible();

    // Wait for generation
    await expect(page.getByRole('heading', { name: /Cover Letter/i })).toBeVisible({
      timeout: 15000,
    });

    // Should show content preview
    await expect(page.getByText(/Dear Hiring Manager/i)).toBeVisible();
    await expect(page.getByText(/Sincerely/i)).toBeVisible();
  });

  test('should generate cover letter with custom achievements', async ({ page }) => {
    await page.getByRole('button', { name: /Generate New/i }).click();

    // Fill basic info
    await page.getByLabel(/Select Job/i).click();
    await page.getByRole('option').first().click();

    // Add custom achievements
    await page.getByRole('button', { name: /Add Achievement/i }).click();
    await page
      .getByLabel(/Achievement/i)
      .fill('Led migration to microservices, improving system reliability by 40%');

    await page.getByRole('button', { name: /Add Achievement/i }).click();
    await page
      .getByLabel(/Achievement/i)
      .nth(1)
      .fill('Reduced API response time by 60% through optimization');

    await page.getByRole('button', { name: /Generate/i }).click();

    // Should include achievements in generated letter
    await expect(page.getByText(/microservices/i)).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/API response time/i)).toBeVisible();
  });

  test('should edit generated cover letter', async ({ page }) => {
    // Assume we're on a generated cover letter page
    await page.goto('/dashboard/cover-letters/123');

    // Click edit button
    await page.getByRole('button', { name: /Edit/i }).click();

    // Edit content
    const editor = page.locator('[contenteditable="true"]');
    await editor.click();
    await editor.fill('Updated cover letter content with my customizations.');

    // Save changes
    await page.getByRole('button', { name: /Save/i }).click();

    // Should show success message
    await expect(page.getByText(/Saved/i)).toBeVisible();

    // Content should be updated
    await expect(page.getByText(/Updated cover letter content/i)).toBeVisible();
  });

  test('should regenerate cover letter with different tone', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/123');

    // Click regenerate
    await page.getByRole('button', { name: /Regenerate/i }).click();

    // Select different tone
    await page.getByLabel(/Tone/i).click();
    await page.getByRole('option', { name: /Conversational/i }).click();

    // Confirm
    await page.getByRole('button', { name: /Confirm/i }).click();

    // Should show regenerating state
    await expect(page.getByText(/Regenerating/i)).toBeVisible();

    // Wait for completion
    await expect(page.getByText(/Cover letter updated/i)).toBeVisible({ timeout: 15000 });
  });

  test('should download cover letter as PDF', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/123');

    // Click download
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download/i }).click();
    await page.getByRole('menuitem', { name: /PDF/i }).click();

    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('should download cover letter as DOCX', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/123');

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: /Download/i }).click();
    await page.getByRole('menuitem', { name: /DOCX/i }).click();

    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.docx');
  });

  test('should copy cover letter to clipboard', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/123');

    // Click copy button
    await page.getByRole('button', { name: /Copy/i }).click();

    // Should show success message
    await expect(page.getByText(/Copied to clipboard/i)).toBeVisible();
  });

  test('should delete cover letter with confirmation', async ({ page }) => {
    await page.goto('/dashboard/cover-letters');

    // Find cover letter and click delete
    const letterCard = page.locator('[data-testid="cover-letter-card"]').first();
    await letterCard.getByRole('button', { name: /Delete/i }).click();

    // Should show confirmation dialog
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Are you sure/i)).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: /Delete/i }).click();

    // Should show success message
    await expect(page.getByText(/Cover letter deleted/i)).toBeVisible();
  });

  test('should list all cover letters with filters', async ({ page }) => {
    // Should show cover letter grid
    const letterCards = page.locator('[data-testid="cover-letter-card"]');
    await expect(letterCards.first()).toBeVisible();

    // Apply filters
    await page.getByRole('button', { name: /Filter/i }).click();
    await page.getByLabel(/Tone/i).click();
    await page.getByRole('option', { name: /Professional/i }).click();
    await page.getByRole('button', { name: /Apply/i }).click();

    // Should filter results
    await expect(page.locator('[data-testid="cover-letter-card"]')).toBeVisible();
  });

  test('should search cover letters', async ({ page }) => {
    // Enter search query
    await page.getByPlaceholder(/Search cover letters/i).fill('Software Engineer');
    await page.keyboard.press('Enter');

    // Should show search results
    await expect(page.getByText(/results for.*Software Engineer/i)).toBeVisible();
  });

  test('should show character count and recommendations', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/123');

    // Should display character count
    const charCount = page.locator('[data-testid="char-count"]');
    await expect(charCount).toBeVisible();
    await expect(charCount).toContainText(/\d+ characters/i);

    // Should show recommendations if too long
    if (await page.getByText(/Cover letter is too long/i).isVisible()) {
      await expect(page.getByText(/Recommended: 300-400 words/i)).toBeVisible();
    }
  });

  test('should highlight matched keywords from job description', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/123');

    // Should show matched keywords section
    await expect(page.getByText(/Matched Keywords/i)).toBeVisible();

    // Should highlight keywords in content
    const highlightedKeywords = page.locator('[data-highlighted="true"]');
    await expect(highlightedKeywords.first()).toBeVisible();
  });

  test('should create multiple versions for A/B testing', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/123');

    // Create version 2
    await page.getByRole('button', { name: /Create Version/i }).click();
    await page.getByLabel(/Tone/i).click();
    await page.getByRole('option', { name: /Concise/i }).click();
    await page.getByRole('button', { name: /Generate/i }).click();

    // Should create new version
    await expect(page.getByText(/Version 2 created/i)).toBeVisible({ timeout: 15000 });

    // Should appear in versions list
    await page.getByRole('button', { name: /Versions/i }).click();
    await expect(page.getByText(/Version 2/i)).toBeVisible();
  });

  test('should show generation cost in credits', async ({ page }) => {
    await page.getByRole('button', { name: /Generate New/i }).click();

    // Should show cost info
    await expect(page.getByText(/This will use \d+ credit/i)).toBeVisible();

    // Check remaining credits
    const creditsDisplay = page.locator('[data-testid="credits-remaining"]');
    await expect(creditsDisplay).toBeVisible();
  });
});
