import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('Resume Generation Flow', () => {
  test.use({ storageState: 'tests/e2e/.auth/user.json' });

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/resumes');
  });

  test('should display resumes page', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /My Resumes/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Create New Resume/i })).toBeVisible();
  });

  test('should create new resume from scratch', async ({ page }) => {
    await page.getByRole('button', { name: /Create New Resume/i }).click();

    // Choose "Start from Scratch"
    await page.getByRole('button', { name: /Start from Scratch/i }).click();

    // Fill resume details
    await page.getByLabel(/Resume Title/i).fill('Software Engineer Resume');
    await page.getByLabel(/Target Role/i).fill('Senior Software Engineer');

    // Select tone
    await page.getByLabel(/Tone/i).click();
    await page.getByRole('option', { name: /Professional/i }).click();

    // Submit
    await page.getByRole('button', { name: /Generate Resume/i }).click();

    // Should show generating state
    await expect(page.getByText(/Generating.*resume/i)).toBeVisible();

    // Wait for generation to complete (mock with timeout)
    await expect(page.getByRole('heading', { name: /Software Engineer Resume/i })).toBeVisible({
      timeout: 15000,
    });

    // Should show preview
    await expect(page.getByText(/Work Experience/i)).toBeVisible();
    await expect(page.getByText(/Education/i)).toBeVisible();
    await expect(page.getByText(/Skills/i)).toBeVisible();
  });

  test('should upload existing resume for optimization', async ({ page }) => {
    await page.getByRole('button', { name: /Create New Resume/i }).click();

    // Choose "Upload Existing"
    await page.getByRole('button', { name: /Upload Existing/i }).click();

    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(path.join(__dirname, '../fixtures/sample-resume.pdf'));

    // Should show file name
    await expect(page.getByText(/sample-resume\.pdf/i)).toBeVisible();

    // Continue
    await page.getByRole('button', { name: /Continue/i }).click();

    // Should parse and show optimization options
    await expect(page.getByText(/We've analyzed your resume/i)).toBeVisible();
  });

  test('should customize resume content', async ({ page }) => {
    // Assume we're on a generated resume page
    await page.goto('/dashboard/resumes/123');

    // Click edit button
    await page.getByRole('button', { name: /Edit/i }).click();

    // Edit work experience
    const workExpSection = page.locator('[data-section="work-experience"]');
    await workExpSection.getByRole('button', { name: /Edit/i }).click();

    await page.getByLabel(/Job Title/i).fill('Senior Full Stack Developer');
    await page.getByLabel(/Company/i).fill('Tech Corp');

    // Save changes
    await page.getByRole('button', { name: /Save Changes/i }).click();

    // Should show updated content
    await expect(page.getByText(/Senior Full Stack Developer/i)).toBeVisible();
    await expect(page.getByText(/Tech Corp/i)).toBeVisible();
  });

  test('should regenerate resume section', async ({ page }) => {
    await page.goto('/dashboard/resumes/123');

    // Click regenerate on work experience section
    const workExpSection = page.locator('[data-section="work-experience"]');
    await workExpSection.getByRole('button', { name: /Regenerate/i }).click();

    // Confirm regeneration
    await page.getByRole('button', { name: /Confirm/i }).click();

    // Should show regenerating state
    await expect(page.getByText(/Regenerating/i)).toBeVisible();

    // Wait for completion
    await expect(page.getByText(/Section updated/i)).toBeVisible({ timeout: 10000 });
  });

  test('should download resume in different formats', async ({ page }) => {
    await page.goto('/dashboard/resumes/123');

    // Click download button
    await page.getByRole('button', { name: /Download/i }).click();

    // Should show format options
    await expect(page.getByRole('menuitem', { name: /PDF/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /DOCX/i })).toBeVisible();
    await expect(page.getByRole('menuitem', { name: /Plain Text/i })).toBeVisible();

    // Download as PDF
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('menuitem', { name: /PDF/i }).click();
    const download = await downloadPromise;

    // Verify download
    expect(download.suggestedFilename()).toContain('.pdf');
  });

  test('should create multiple resume versions', async ({ page }) => {
    await page.goto('/dashboard/resumes/123');

    // Click "Save as Version"
    await page.getByRole('button', { name: /Save as Version/i }).click();

    await page.getByLabel(/Version Name/i).fill('Tech Company Version');
    await page.getByRole('button', { name: /Save/i }).click();

    // Should show success message
    await expect(page.getByText(/Version saved/i)).toBeVisible();

    // Should appear in versions list
    await page.getByRole('button', { name: /Versions/i }).click();
    await expect(page.getByText(/Tech Company Version/i)).toBeVisible();
  });

  test('should show ATS score and recommendations', async ({ page }) => {
    await page.goto('/dashboard/resumes/123');

    // Should display ATS score
    const atsScore = page.locator('[data-testid="ats-score"]');
    await expect(atsScore).toBeVisible();
    await expect(atsScore).toContainText(/\d+/); // Contains a number

    // Should show recommendations
    await expect(page.getByText(/Recommendations/i)).toBeVisible();
    await expect(page.getByText(/Add.*keywords/i)).toBeVisible();
  });

  test('should tailor resume to specific job posting', async ({ page }) => {
    await page.goto('/dashboard/resumes/123');

    // Click "Tailor to Job"
    await page.getByRole('button', { name: /Tailor to Job/i }).click();

    // Paste job description
    await page.getByLabel(/Job Description/i).fill(`
      We're looking for a Senior Software Engineer with expertise in React, Node.js, and AWS.
      5+ years of experience required.
    `);

    // Generate tailored version
    await page.getByRole('button', { name: /Generate Tailored Resume/i }).click();

    // Should show generating state
    await expect(page.getByText(/Tailoring resume/i)).toBeVisible();

    // Wait for completion
    await expect(page.getByText(/Resume tailored successfully/i)).toBeVisible({ timeout: 15000 });

    // Should highlight matched skills
    await expect(page.getByText(/React.*matched/i)).toBeVisible();
    await expect(page.getByText(/Node\.js.*matched/i)).toBeVisible();
  });

  test('should delete resume with confirmation', async ({ page }) => {
    await page.goto('/dashboard/resumes');

    // Find resume and click delete
    const resumeCard = page.locator('[data-testid="resume-card"]').first();
    await resumeCard.getByRole('button', { name: /Delete/i }).click();

    // Should show confirmation dialog
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/Are you sure/i)).toBeVisible();

    // Confirm deletion
    await page.getByRole('button', { name: /Delete/i }).click();

    // Should show success message
    await expect(page.getByText(/Resume deleted/i)).toBeVisible();
  });
});
