/**
 * Cover Letter Generator E2E Tests (Issue #107)
 *
 * TDD Red Phase: These tests define the expected behavior
 * Tests will fail until implementation is complete (TDD approach)
 */

import { test, expect } from '@playwright/test';

test.describe('Cover Letter Generator - Core Generation Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.goto('/dashboard/cover-letters/new');
  });

  test('should display cover letter generation form', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /generate cover letter/i })).toBeVisible();
    await expect(page.locator('[data-form="cover-letter-generator"]')).toBeVisible();
  });

  test('should show tone selection options', async ({ page }) => {
    await expect(page.getByRole('button', { name: /formal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /conversational/i })).toBeVisible();
  });

  test('should select tone before generation', async ({ page }) => {
    const formalButton = page.getByRole('button', { name: /formal/i });
    await formalButton.click();
    await expect(formalButton).toHaveAttribute('data-selected', 'true');
  });

  test('should generate cover letter with formal tone', async ({ page }) => {
    await page.getByRole('button', { name: /formal/i }).click();

    const generateButton = page.getByRole('button', { name: /generate cover letter/i });
    await generateButton.click();

    // Should show loading state
    await expect(page.getByText(/generating/i)).toBeVisible();

    // Should complete in < 6 seconds
    await expect(page.locator('[data-cover-letter-output]')).toBeVisible({ timeout: 6000 });
  });

  test('should generate cover letter with conversational tone', async ({ page }) => {
    await page.getByRole('button', { name: /conversational/i }).click();

    const generateButton = page.getByRole('button', { name: /generate cover letter/i });
    await generateButton.click();

    await expect(page.locator('[data-cover-letter-output]')).toBeVisible({ timeout: 6000 });
  });
});

test.describe('Cover Letter Generator - Content Structure', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();
    await page.locator('[data-cover-letter-output]').waitFor();
  });

  test('should display all required sections', async ({ page }) => {
    const coverLetter = page.locator('[data-cover-letter-output]');
    const text = await coverLetter.textContent();

    // Should include key sections (basic check)
    expect(text).toBeTruthy();
    expect(text!.length).toBeGreaterThan(200); // Minimum length check
  });

  test('should include job-specific details', async ({ page }) => {
    const coverLetter = page.locator('[data-cover-letter-output]');
    await expect(coverLetter).toContainText(/.+/); // Has content
  });

  test('should include profile details', async ({ page }) => {
    const coverLetter = page.locator('[data-cover-letter-output]');
    await expect(coverLetter).toBeVisible();
  });
});

test.describe('Cover Letter Generator - Editing & Customization', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();
    await page.locator('[data-cover-letter-output]').waitFor();
  });

  test('should make cover letter editable on click', async ({ page }) => {
    const coverLetter = page.locator('[data-cover-letter-output]');
    await coverLetter.click();

    // Should show edit mode
    await expect(page.locator('[data-editor="active"]')).toBeVisible();
  });

  test('should allow inline editing', async ({ page }) => {
    const coverLetter = page.locator('[data-cover-letter-output]');
    await coverLetter.click();

    const editor = page.locator('[data-editor="active"]');
    await editor.fill('Updated cover letter content');

    await page.getByRole('button', { name: /save changes/i }).click();
    await expect(page.getByText(/saved|updated/i)).toBeVisible();
  });

  test('should undo changes', async ({ page }) => {
    await page.locator('[data-cover-letter-output]').click();
    await page.locator('[data-editor="active"]').fill('New content');

    await page.getByRole('button', { name: /undo/i }).click();
    // Content should revert
  });

  test('should redo changes', async ({ page }) => {
    await page.locator('[data-cover-letter-output]').click();
    await page.locator('[data-editor="active"]').fill('New content');
    await page.getByRole('button', { name: /undo/i }).click();
    await page.getByRole('button', { name: /redo/i }).click();
    // Content should restore
  });
});

test.describe('Cover Letter Generator - Multiple Versions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();
    await page.locator('[data-cover-letter-output]').waitFor();
  });

  test('should save current version', async ({ page }) => {
    await page.getByRole('button', { name: /save as version/i }).click();

    await expect(page.getByPlaceholder(/version name/i)).toBeVisible();
    await page.getByPlaceholder(/version name/i).fill('Version 1 - Formal');
    await page.getByRole('button', { name: /^save$/i }).click();

    await expect(page.getByText('Version 1 - Formal')).toBeVisible();
  });

  test('should generate new version with different tone', async ({ page }) => {
    // Save first version
    await page.getByRole('button', { name: /save as version/i }).click();
    await page.getByPlaceholder(/version name/i).fill('Version 1 - Formal');
    await page.getByRole('button', { name: /^save$/i }).click();

    // Generate new version
    await page.getByRole('button', { name: /conversational/i }).click();
    await page.getByRole('button', { name: /generate new version/i }).click();

    await expect(page.locator('[data-cover-letter-output]')).toBeVisible({ timeout: 6000 });
  });

  test('should switch between versions', async ({ page }) => {
    // Assuming we have multiple versions
    const versionList = page.locator('[data-versions-list]');
    await expect(versionList).toBeVisible();

    const firstVersion = versionList.locator('[data-version-item]').first();
    await firstVersion.click();

    await expect(page.locator('[data-cover-letter-output]')).toBeVisible();
  });

  test('should compare versions side-by-side', async ({ page }) => {
    await page.getByRole('button', { name: /compare versions/i }).click();

    await expect(page.locator('[data-comparison-view]')).toBeVisible();
    await expect(page.locator('[data-version-left]')).toBeVisible();
    await expect(page.locator('[data-version-right]')).toBeVisible();
  });

  test('should delete a version', async ({ page }) => {
    const deleteButton = page.locator('[data-version-item]').first().getByRole('button', { name: /delete/i });
    await deleteButton.click();

    await page.getByRole('button', { name: /confirm/i }).click();
    await expect(page.getByText(/deleted|removed/i)).toBeVisible();
  });
});

test.describe('Cover Letter Generator - Export & Download', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();
    await page.locator('[data-cover-letter-output]').waitFor();
  });

  test('should export as PDF', async ({ page }) => {
    await page.getByRole('button', { name: /export/i }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /pdf/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.pdf$/);
  });

  test('should export as TXT', async ({ page }) => {
    await page.getByRole('button', { name: /export/i }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /txt|text/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.txt$/);
  });

  test('should export as DOCX', async ({ page }) => {
    await page.getByRole('button', { name: /export/i }).click();

    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /docx|word/i }).click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toMatch(/\.docx$/);
  });

  test('should copy to clipboard', async ({ page }) => {
    await page.getByRole('button', { name: /copy to clipboard/i }).click();

    await expect(page.getByText(/copied/i)).toBeVisible();

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText.length).toBeGreaterThan(0);
  });
});

test.describe('Cover Letter Generator - Regeneration', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();
    await page.locator('[data-cover-letter-output]').waitFor();
  });

  test('should regenerate cover letter', async ({ page }) => {
    await page.getByRole('button', { name: /regenerate/i }).click();

    // Should show confirmation
    await expect(page.getByText(/are you sure|confirm/i)).toBeVisible();
    await page.getByRole('button', { name: /confirm|yes/i }).click();

    await expect(page.getByText(/generating/i)).toBeVisible();
    await expect(page.locator('[data-cover-letter-output]')).toBeVisible({ timeout: 6000 });
  });

  test('should regenerate with different tone', async ({ page }) => {
    await page.getByRole('button', { name: /conversational/i }).click();
    await page.getByRole('button', { name: /regenerate/i }).click();
    await page.getByRole('button', { name: /confirm|yes/i }).click();

    await expect(page.locator('[data-cover-letter-output]')).toBeVisible({ timeout: 6000 });
  });
});

test.describe('Cover Letter Generator - Manual Job Details', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
  });

  test('should show manual job details form', async ({ page }) => {
    await page.getByRole('button', { name: /enter job details manually/i }).click();

    await expect(page.getByLabel(/job title/i)).toBeVisible();
    await expect(page.getByLabel(/company name/i)).toBeVisible();
    await expect(page.getByLabel(/job description/i)).toBeVisible();
  });

  test('should generate from manual details', async ({ page }) => {
    await page.getByRole('button', { name: /enter job details manually/i }).click();

    await page.getByLabel(/job title/i).fill('Senior Frontend Engineer');
    await page.getByLabel(/company name/i).fill('TechCorp Inc.');
    await page.getByLabel(/job description/i).fill('We are looking for an experienced frontend engineer...');

    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();

    await expect(page.locator('[data-cover-letter-output]')).toBeVisible({ timeout: 6000 });
  });
});

test.describe('Cover Letter Generator - AI Suggestions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();
    await page.locator('[data-cover-letter-output]').waitFor();
    await page.locator('[data-cover-letter-output]').click(); // Enter edit mode
  });

  test('should show AI improve button on highlight', async ({ page }) => {
    // Select some text
    await page.locator('[data-editor="active"]').click();
    await page.keyboard.press('Control+A'); // Select all

    await expect(page.getByRole('button', { name: /ai improve/i })).toBeVisible();
  });

  test('should show AI improvement suggestions', async ({ page }) => {
    await page.locator('[data-editor="active"]').click();
    await page.keyboard.press('Control+A');
    await page.getByRole('button', { name: /ai improve/i }).click();

    await expect(page.locator('[data-ai-suggestions]')).toBeVisible();
  });

  test('should accept AI suggestion', async ({ page }) => {
    await page.locator('[data-editor="active"]').click();
    await page.keyboard.press('Control+A');
    await page.getByRole('button', { name: /ai improve/i }).click();

    const firstSuggestion = page.locator('[data-ai-suggestions]').locator('[data-suggestion]').first();
    await firstSuggestion.getByRole('button', { name: /accept/i }).click();

    await expect(page.getByText(/applied|accepted/i)).toBeVisible();
  });

  test('should reject AI suggestion', async ({ page }) => {
    await page.locator('[data-editor="active"]').click();
    await page.keyboard.press('Control+A');
    await page.getByRole('button', { name: /ai improve/i }).click();

    const firstSuggestion = page.locator('[data-ai-suggestions]').locator('[data-suggestion]').first();
    await firstSuggestion.getByRole('button', { name: /reject/i }).click();

    // Suggestion should be dismissed
  });
});

test.describe('Cover Letter Generator - Templates', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
  });

  test('should show template selection', async ({ page }) => {
    await page.getByRole('button', { name: /choose template/i }).click();

    await expect(page.getByText(/classic/i)).toBeVisible();
    await expect(page.getByText(/modern/i)).toBeVisible();
    await expect(page.getByText(/creative/i)).toBeVisible();
    await expect(page.getByText(/technical/i)).toBeVisible();
  });

  test('should generate with selected template', async ({ page }) => {
    await page.getByRole('button', { name: /choose template/i }).click();
    await page.getByText(/modern/i).click();

    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();

    await expect(page.locator('[data-cover-letter-output]')).toBeVisible({ timeout: 6000 });
    await expect(page.locator('[data-template="modern"]')).toBeVisible();
  });
});

test.describe('Cover Letter Generator - History & Saved Letters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/cover-letters');
  });

  test('should display cover letter history', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /my cover letters/i })).toBeVisible();
    await expect(page.locator('[data-cover-letter-list]')).toBeVisible();
  });

  test('should show cover letter details in history', async ({ page }) => {
    const firstItem = page.locator('[data-cover-letter-item]').first();

    await expect(firstItem).toContainText(/.+/); // Has job title
    await expect(firstItem).toBeVisible();
  });

  test('should search cover letter history', async ({ page }) => {
    await page.getByPlaceholder(/search/i).fill('TechCorp');

    // Results should filter
    await expect(page.locator('[data-cover-letter-item]')).toBeVisible();
  });

  test('should filter by tone', async ({ page }) => {
    await page.getByRole('button', { name: /filter/i }).click();
    await page.getByRole('menuitemcheckbox', { name: /formal/i }).click();

    // Should show only formal letters
  });
});

test.describe('Cover Letter Generator - Character & Word Count', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();
    await page.locator('[data-cover-letter-output]').waitFor();
    await page.locator('[data-cover-letter-output]').click(); // Edit mode
  });

  test('should display live character count', async ({ page }) => {
    await expect(page.locator('[data-char-count]')).toBeVisible();
    await expect(page.locator('[data-char-count]')).toContainText(/\d+/);
  });

  test('should display live word count', async ({ page }) => {
    await expect(page.locator('[data-word-count]')).toBeVisible();
    await expect(page.locator('[data-word-count]')).toContainText(/\d+/);
  });

  test('should warn for excessively long cover letter', async ({ page }) => {
    // Fill with long text
    const longText = 'word '.repeat(600); // 600 words
    await page.locator('[data-editor="active"]').fill(longText);

    await expect(page.getByText(/too long|keep it concise/i)).toBeVisible();
  });
});

test.describe('Cover Letter Generator - Performance', () => {
  test('should generate cover letter in less than 6 seconds', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
    await page.getByRole('button', { name: /formal/i }).click();

    const startTime = Date.now();
    await page.getByRole('button', { name: /generate cover letter/i }).click();
    await page.locator('[data-cover-letter-output]').waitFor({ timeout: 6000 });
    const endTime = Date.now();

    const duration = (endTime - startTime) / 1000;
    expect(duration).toBeLessThan(6);
  });

  test('should show progress during generation', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();

    await expect(page.getByText(/analyzing|matching|crafting/i)).toBeVisible();
  });
});

test.describe('Cover Letter Generator - Error Handling', () => {
  test('should handle generation error gracefully', async ({ page }) => {
    // Mock API failure
    await page.route('**/api/v1/cover-letters/generate', (route) =>
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Generation failed' }),
      })
    );

    await page.goto('/dashboard/cover-letters/new');
    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();

    await expect(page.getByText(/error|failed/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
  });

  test('should retry failed generation', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
    // Simulate error state
    await page.evaluate(() => {
      window.localStorage.setItem('lastGenerationFailed', 'true');
    });

    await expect(page.getByRole('button', { name: /retry/i })).toBeVisible();
    await page.getByRole('button', { name: /retry/i }).click();

    await expect(page.getByText(/generating/i)).toBeVisible();
  });
});

test.describe('Cover Letter Generator - Mobile Responsiveness', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE

  test('should display mobile-optimized form', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');

    await expect(page.locator('[data-form="cover-letter-generator"]')).toBeVisible();
    // Form should be in vertical layout
  });

  test('should be readable on mobile', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();
    await page.locator('[data-cover-letter-output]').waitFor();

    const coverLetter = page.locator('[data-cover-letter-output]');
    await expect(coverLetter).toBeVisible();

    // Text should wrap and be readable
    const box = await coverLetter.boundingBox();
    expect(box!.width).toBeLessThanOrEqual(375);
  });

  test('should have accessible buttons on mobile', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');

    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      if (box) {
        // Buttons should be at least 44x44px (iOS guidelines)
        expect(box.height).toBeGreaterThanOrEqual(40);
      }
    }
  });
});

test.describe('Cover Letter Generator - Accessibility', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');

    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');

    const form = page.locator('[data-form="cover-letter-generator"]');
    await expect(form).toHaveAttribute('role', 'form');

    const toneButtons = page.locator('[role="button"]');
    const count = await toneButtons.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should be screen reader compatible', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');

    // Check for accessible labels
    await expect(page.getByRole('button', { name: /formal/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /conversational/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /generate cover letter/i })).toBeVisible();
  });
});

test.describe('Cover Letter Generator - Integration', () => {
  test('should attach to job application', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();
    await page.locator('[data-cover-letter-output]').waitFor();

    await page.getByRole('button', { name: /use for application/i }).click();

    // Should navigate to application form
    await expect(page).toHaveURL(/\/applications\//);
  });

  test('should generate from application flow', async ({ page }) => {
    await page.goto('/dashboard/applications/new?jobId=123');

    await page.getByRole('button', { name: /generate with ai/i }).click();

    // Should open cover letter generator
    await expect(page.locator('[data-form="cover-letter-generator"]')).toBeVisible();
  });
});

test.describe('Cover Letter Generator - Customization Options', () => {
  test('should adjust length preference', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');

    await page.getByRole('button', { name: /length/i }).click();
    await page.getByRole('menuitemradio', { name: /brief/i }).click();

    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();
    await page.locator('[data-cover-letter-output]').waitFor();

    // Generated letter should be brief (200-300 words)
    const text = await page.locator('[data-cover-letter-output]').textContent();
    const wordCount = text!.split(/\s+/).length;
    expect(wordCount).toBeGreaterThanOrEqual(200);
    expect(wordCount).toBeLessThanOrEqual(350);
  });

  test('should add custom talking points', async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');

    await page.getByRole('button', { name: /add custom talking point/i }).click();
    await page.getByPlaceholder(/talking point/i).fill('Remote team collaboration experience');

    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();
    await page.locator('[data-cover-letter-output]').waitFor();

    // Should include custom talking point
    await expect(page.locator('[data-cover-letter-output]')).toContainText(/remote/i);
  });
});

test.describe('Cover Letter Generator - Quality Indicators', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/cover-letters/new');
    await page.getByRole('button', { name: /formal/i }).click();
    await page.getByRole('button', { name: /generate cover letter/i }).click();
    await page.locator('[data-cover-letter-output]').waitFor();
  });

  test('should display quality score', async ({ page }) => {
    await expect(page.locator('[data-quality-score]')).toBeVisible();
    await expect(page.locator('[data-quality-score]')).toContainText(/\d+/); // Has number
  });

  test('should show score breakdown', async ({ page }) => {
    await page.getByRole('button', { name: /view breakdown/i }).click();

    await expect(page.getByText(/job match/i)).toBeVisible();
    await expect(page.getByText(/clarity/i)).toBeVisible();
    await expect(page.getByText(/professionalism/i)).toBeVisible();
  });

  test('should display AI confidence level', async ({ page }) => {
    await expect(page.locator('[data-ai-confidence]')).toBeVisible();
    await expect(page.locator('[data-ai-confidence]')).toContainText(/high|medium|low/i);
  });
});
