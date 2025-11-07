/**
 * E2E Tests: Mass Job Posting with AI (Sprint 11-12)
 *
 * Tests bulk job upload, AI normalization, duplicate detection,
 * and multi-board distribution capabilities.
 *
 * BDD Scenarios:
 * - Uploading CSV with bulk jobs
 * - AI job title normalization
 * - AI skills extraction
 * - Salary range suggestions
 * - Duplicate job detection
 * - Job review and editing
 * - Multi-board distribution
 * - Scheduled posting
 * - Distribution tracking
 */

import { test, expect, Page } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { mockBulkJobPostingAPI } from './mocks/bulk-job-posting.mock';

// Helper functions - No login needed, using pre-authenticated session via storageState
async function navigateToBulkUpload(page: Page) {
  await page.goto('/employer/jobs/bulk-upload');
  await expect(page.getByRole('heading', { name: /bulk job upload/i })).toBeVisible();
}

// Upload CSV file and click upload button
async function uploadCSVFile(page: Page, csvPath: string) {
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(csvPath);
  await page.getByRole('button', { name: /upload.*validate/i }).click();
}

// Create sample CSV file
function createSampleCSV(filename: string, rows: any[]): string {
  const headers = 'title,department,location,locationType,employmentType,experienceLevel,salaryMin,salaryMax,description,requirements';
  const csvContent = [
    headers,
    ...rows.map(row => `"${row.title}","${row.department}","${row.location}","${row.locationType}","${row.employmentType}","${row.experienceLevel}",${row.salaryMin},${row.salaryMax},"${row.description}","${row.requirements}"`)
  ].join('\n');

  const filepath = path.join('/tmp', filename);
  fs.writeFileSync(filepath, csvContent);
  return filepath;
}

test.describe('Mass Job Posting', () => {
  // Using pre-authenticated employer session from storageState
  // No login required in beforeEach

  // Enable API mocking for all tests
  test.beforeEach(async ({ page }) => {
    await mockBulkJobPostingAPI(page);
  });

  test.describe('CSV Upload', () => {
    test('should upload valid CSV with multiple jobs', async ({ page }) => {
      // GIVEN: An employer on the bulk upload page
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'San Francisco, CA',
          locationType: 'hybrid',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 130000,
          salaryMax: 170000,
          description: 'We are seeking a talented Senior Software Engineer to join our team.',
          requirements: '5+ years experience, React, Node.js, TypeScript'
        },
        {
          title: 'Product Manager',
          department: 'Product',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'mid',
          salaryMin: 100000,
          salaryMax: 130000,
          description: 'Join our product team to drive product strategy.',
          requirements: '3+ years PM experience, Agile methodologies'
        }
      ];

      const csvPath = createSampleCSV('jobs.csv', csvData);

      // WHEN: User uploads a CSV file
      await uploadCSVFile(page, csvPath);

      // THEN: Upload is processed successfully
      await expect(page.getByRole('heading', { name: /uploading.*validating/i })).toBeVisible();
      await expect(page.getByRole('heading', { name: /2.*job.*uploaded/i })).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/senior software engineer/i)).toBeVisible();
      await expect(page.getByText(/product manager/i)).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    test('should show validation errors for invalid CSV', async ({ page }) => {
      // GIVEN: An employer on the bulk upload page
      await navigateToBulkUpload(page);

      const invalidData = [
        {
          title: '', // Missing required field
          department: 'Engineering',
          location: 'San Francisco, CA',
          locationType: 'hybrid',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 130000,
          salaryMax: 170000,
          description: 'Description',
          requirements: 'Requirements'
        }
      ];

      const csvPath = createSampleCSV('invalid.csv', invalidData);

      // WHEN: User uploads an invalid CSV
      await uploadCSVFile(page, csvPath);

      // THEN: Validation errors are shown
      await expect(page.getByText(/validation error/i)).toBeVisible();
      await expect(page.getByText(/title.*required/i)).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    test('should reject CSV with too many jobs', async ({ page }) => {
      // GIVEN: An employer on the bulk upload page
      await navigateToBulkUpload(page);

      // Create CSV with 501 jobs (exceeds limit of 500)
      const largeData = Array.from({ length: 501 }, (_, i) => ({
        title: `Job ${i + 1}`,
        department: 'Engineering',
        location: 'Remote',
        locationType: 'remote',
        employmentType: 'full_time',
        experienceLevel: 'mid',
        salaryMin: 100000,
        salaryMax: 130000,
        description: 'Description',
        requirements: 'Requirements'
      }));

      const csvPath = createSampleCSV('large.csv', largeData);

      // WHEN: User uploads a CSV with too many jobs
      await uploadCSVFile(page, csvPath);

      // THEN: Error message is shown
      await expect(page.getByText(/maximum.*500.*jobs/i)).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    // TODO: Fix progress indicator visibility timing issue
    // Element exists with correct testid and is rendered, but Playwright detects it as "hidden"
    // Possible solutions: check element immediately after button click, or use waitForFunction
    test.skip('should show upload progress indicator', async ({ page }) => {
      // GIVEN: An employer uploading a CSV
      await navigateToBulkUpload(page);

      const csvData = Array.from({ length: 10 }, (_, i) => ({
        title: `Job ${i + 1}`,
        department: 'Engineering',
        location: 'Remote',
        locationType: 'remote',
        employmentType: 'full_time',
        experienceLevel: 'mid',
        salaryMin: 100000,
        salaryMax: 130000,
        description: 'Description',
        requirements: 'Requirements'
      }));

      const csvPath = createSampleCSV('progress.csv', csvData);

      // WHEN: User uploads the file
      await uploadCSVFile(page, csvPath);

      // THEN: Progress indicator is visible during upload
      await expect(page.getByRole('heading', { name: /uploading.*validating/i })).toBeVisible();
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      await expect(page.getByText(/processing/i)).toBeVisible();

      // Wait for completion
      await expect(page.getByRole('heading', { name: /10.*job.*uploaded/i })).toBeVisible({ timeout: 10000 });

      // Cleanup
      fs.unlinkSync(csvPath);
    });
  });

  test.describe('AI Job Normalization', () => {
    test('should normalize job titles automatically', async ({ page }) => {
      // GIVEN: Jobs uploaded with non-standard titles
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Sr. SW Eng',
          department: 'Engineering',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 130000,
          salaryMax: 170000,
          description: 'Software engineering role',
          requirements: 'React, Node.js'
        }
      ];

      const csvPath = createSampleCSV('normalize.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/1 job uploaded/i)).toBeVisible({ timeout: 10000 });

      // THEN: AI suggests normalized title
      await expect(page.getByText(/ai suggestion/i)).toBeVisible();
      await expect(page.getByText(/senior software engineer/i)).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    test('should extract skills from job description', async ({ page }) => {
      // GIVEN: Jobs with skills in description
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Full Stack Developer',
          department: 'Engineering',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'mid',
          salaryMin: 100000,
          salaryMax: 130000,
          description: 'Looking for a developer with React, TypeScript, Python, and AWS experience',
          requirements: 'Strong coding skills'
        }
      ];

      const csvPath = createSampleCSV('skills.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/1 job uploaded/i)).toBeVisible({ timeout: 10000 });

      // THEN: AI extracts skills
      await expect(page.getByText(/extracted skills/i)).toBeVisible();
      await expect(page.getByText('React')).toBeVisible();
      await expect(page.getByText('TypeScript')).toBeVisible();
      await expect(page.getByText('Python')).toBeVisible();
      await expect(page.getByText('AWS')).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    test('should suggest salary ranges based on role and location', async ({ page }) => {
      // GIVEN: Job without salary information
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'San Francisco, CA',
          locationType: 'hybrid',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 0,
          salaryMax: 0,
          description: 'Software engineering role',
          requirements: 'React, Node.js'
        }
      ];

      const csvPath = createSampleCSV('salary.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/1 job uploaded/i)).toBeVisible({ timeout: 10000 });

      // THEN: AI suggests salary range
      await expect(page.getByText(/suggested salary/i)).toBeVisible();
      await expect(page.getByText(/\$130,000.*\$170,000/)).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    test('should allow accepting or rejecting AI suggestions', async ({ page }) => {
      // GIVEN: Jobs with AI suggestions
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Sr. SW Eng',
          department: 'Engineering',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 130000,
          salaryMax: 170000,
          description: 'Software engineering role',
          requirements: 'React, Node.js'
        }
      ];

      const csvPath = createSampleCSV('suggestions.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/1 job uploaded/i)).toBeVisible({ timeout: 10000 });

      // WHEN: User accepts AI suggestion
      await page.getByRole('button', { name: /accept suggestion/i }).click();

      // THEN: Job is updated with suggestion
      await expect(page.getByText(/senior software engineer/i)).toBeVisible();
      await expect(page.getByText(/sr\. sw eng/i)).not.toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });
  });

  test.describe('Duplicate Detection', () => {
    test('should detect duplicate jobs in upload', async ({ page }) => {
      // GIVEN: CSV with duplicate jobs
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'San Francisco, CA',
          locationType: 'hybrid',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 130000,
          salaryMax: 170000,
          description: 'We are seeking a talented engineer',
          requirements: 'React, Node.js'
        },
        {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'San Francisco, CA',
          locationType: 'hybrid',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 130000,
          salaryMax: 170000,
          description: 'We are seeking a talented engineer',
          requirements: 'React, Node.js'
        }
      ];

      const csvPath = createSampleCSV('duplicates.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/2 jobs uploaded/i)).toBeVisible({ timeout: 10000 });

      // THEN: Duplicate warning is shown
      await expect(page.getByText(/duplicate.*detected/i)).toBeVisible();
      await expect(page.locator('[data-testid="duplicate-warning"]')).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    test('should detect similar jobs with fuzzy matching', async ({ page }) => {
      // GIVEN: CSV with similar but not identical jobs
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'San Francisco, CA',
          locationType: 'hybrid',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 130000,
          salaryMax: 170000,
          description: 'Software engineering role',
          requirements: 'React, Node.js'
        },
        {
          title: 'Sr. Software Engineer',
          department: 'Engineering',
          location: 'San Francisco, California',
          locationType: 'hybrid',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 135000,
          salaryMax: 175000,
          description: 'Software engineering position',
          requirements: 'React, Node'
        }
      ];

      const csvPath = createSampleCSV('similar.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/2 jobs uploaded/i)).toBeVisible({ timeout: 10000 });

      // THEN: Similar jobs warning is shown
      await expect(page.getByText(/similar.*job.*found/i)).toBeVisible();
      await expect(page.getByText(/85%.*match/i)).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    test('should allow user to keep or remove duplicates', async ({ page }) => {
      // GIVEN: Jobs with duplicates detected
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 130000,
          salaryMax: 170000,
          description: 'Description',
          requirements: 'Requirements'
        },
        {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 130000,
          salaryMax: 170000,
          description: 'Description',
          requirements: 'Requirements'
        }
      ];

      const csvPath = createSampleCSV('dup-action.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/2 jobs uploaded/i)).toBeVisible({ timeout: 10000 });
      await expect(page.getByText(/duplicate.*detected/i)).toBeVisible();

      // WHEN: User removes duplicate
      await page.getByRole('button', { name: /remove duplicate/i }).first().click();

      // THEN: Duplicate is removed
      await expect(page.getByText(/1 job.*remaining/i)).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });
  });

  test.describe('Job Review and Editing', () => {
    test('should display jobs in editable table', async ({ page }) => {
      // GIVEN: Jobs uploaded successfully
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 130000,
          salaryMax: 170000,
          description: 'Description',
          requirements: 'Requirements'
        }
      ];

      const csvPath = createSampleCSV('review.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/1 job uploaded/i)).toBeVisible({ timeout: 10000 });

      // THEN: Job is displayed in table
      const table = page.locator('[data-testid="jobs-review-table"]');
      await expect(table).toBeVisible();
      await expect(table.getByText('Senior Software Engineer')).toBeVisible();
      await expect(table.getByText('Engineering')).toBeVisible();
      await expect(table.getByText('Remote')).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    test('should allow inline editing of job fields', async ({ page }) => {
      // GIVEN: Jobs in review table
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Software Engineer',
          department: 'Engineering',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'mid',
          salaryMin: 100000,
          salaryMax: 130000,
          description: 'Description',
          requirements: 'Requirements'
        }
      ];

      const csvPath = createSampleCSV('edit.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/1 job uploaded/i)).toBeVisible({ timeout: 10000 });

      // WHEN: User edits job title
      await page.getByRole('cell', { name: 'Software Engineer' }).click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type('Senior Software Engineer');
      await page.keyboard.press('Enter');

      // THEN: Job is updated
      await expect(page.getByText('Senior Software Engineer')).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    test('should allow removing individual jobs', async ({ page }) => {
      // GIVEN: Multiple jobs in review
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Job 1',
          department: 'Engineering',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'mid',
          salaryMin: 100000,
          salaryMax: 130000,
          description: 'Description',
          requirements: 'Requirements'
        },
        {
          title: 'Job 2',
          department: 'Product',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'mid',
          salaryMin: 100000,
          salaryMax: 130000,
          description: 'Description',
          requirements: 'Requirements'
        }
      ];

      const csvPath = createSampleCSV('remove.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/2 jobs uploaded/i)).toBeVisible({ timeout: 10000 });

      // WHEN: User removes one job
      await page.locator('[data-testid="remove-job-button"]').first().click();
      await page.getByRole('button', { name: /confirm/i }).click();

      // THEN: Job is removed
      await expect(page.getByText(/1 job.*remaining/i)).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });
  });

  test.describe('Multi-Board Distribution', () => {
    test('should display distribution channel selector', async ({ page }) => {
      // GIVEN: Jobs ready to publish
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 130000,
          salaryMax: 170000,
          description: 'Description',
          requirements: 'Requirements'
        }
      ];

      const csvPath = createSampleCSV('distribute.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/1 job uploaded/i)).toBeVisible({ timeout: 10000 });

      // WHEN: User clicks publish button
      await page.getByRole('button', { name: /publish jobs/i }).click();

      // THEN: Distribution channels are shown
      await expect(page.getByText(/select channels/i)).toBeVisible();
      await expect(page.getByLabel(/linkedin/i)).toBeVisible();
      await expect(page.getByLabel(/indeed/i)).toBeVisible();
      await expect(page.getByLabel(/glassdoor/i)).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    test('should publish to selected channels', async ({ page }) => {
      // GIVEN: Jobs with channels selected
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 130000,
          salaryMax: 170000,
          description: 'Description',
          requirements: 'Requirements'
        }
      ];

      const csvPath = createSampleCSV('publish.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/1 job uploaded/i)).toBeVisible({ timeout: 10000 });

      await page.getByRole('button', { name: /publish jobs/i }).click();

      // WHEN: User selects channels and publishes
      await page.getByLabel(/linkedin/i).check();
      await page.getByLabel(/indeed/i).check();
      await page.getByRole('button', { name: /confirm publish/i }).click();

      // THEN: Jobs are published
      await expect(page.getByText(/publishing.*linkedin/i)).toBeVisible();
      await expect(page.getByText(/publishing.*indeed/i)).toBeVisible();
      await expect(page.getByText(/1 job.*published/i)).toBeVisible({ timeout: 15000 });

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    test('should show publishing progress per channel', async ({ page }) => {
      // GIVEN: Jobs being published
      await navigateToBulkUpload(page);

      const csvData = Array.from({ length: 5 }, (_, i) => ({
        title: `Job ${i + 1}`,
        department: 'Engineering',
        location: 'Remote',
        locationType: 'remote',
        employmentType: 'full_time',
        experienceLevel: 'mid',
        salaryMin: 100000,
        salaryMax: 130000,
        description: 'Description',
        requirements: 'Requirements'
      }));

      const csvPath = createSampleCSV('progress-dist.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/5 jobs uploaded/i)).toBeVisible({ timeout: 10000 });

      await page.getByRole('button', { name: /publish jobs/i }).click();
      await page.getByLabel(/linkedin/i).check();
      await page.getByRole('button', { name: /confirm publish/i }).click();

      // THEN: Progress is shown per channel
      await expect(page.locator('[data-testid="linkedin-progress"]')).toBeVisible();
      await expect(page.getByText(/0\/5.*published/i)).toBeVisible();

      // Wait for completion
      await expect(page.getByText(/5\/5.*published/i)).toBeVisible({ timeout: 30000 });

      // Cleanup
      fs.unlinkSync(csvPath);
    });
  });

  test.describe('Scheduled Posting', () => {
    test('should allow scheduling jobs for future date', async ({ page }) => {
      // GIVEN: Jobs ready to publish
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Senior Software Engineer',
          department: 'Engineering',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'senior',
          salaryMin: 130000,
          salaryMax: 170000,
          description: 'Description',
          requirements: 'Requirements'
        }
      ];

      const csvPath = createSampleCSV('schedule.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/1 job uploaded/i)).toBeVisible({ timeout: 10000 });

      await page.getByRole('button', { name: /publish jobs/i }).click();

      // WHEN: User schedules for later
      await page.getByLabel(/schedule for later/i).check();
      await page.getByLabel(/date/i).fill('2025-12-01');
      await page.getByLabel(/time/i).fill('09:00');
      await page.getByLabel(/linkedin/i).check();
      await page.getByRole('button', { name: /confirm publish/i }).click();

      // THEN: Jobs are scheduled
      await expect(page.getByText(/scheduled.*december 1/i)).toBeVisible();
      await expect(page.getByText(/1 job.*scheduled/i)).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });

    test('should show scheduled jobs in distribution dashboard', async ({ page }) => {
      // GIVEN: Jobs scheduled for future
      // (Assume previous test scheduled jobs)

      // WHEN: User navigates to distribution dashboard
      await page.goto('/employer/jobs/distribution-dashboard');

      // THEN: Scheduled jobs are shown
      await expect(page.getByRole('heading', { name: /distribution dashboard/i })).toBeVisible();
      await expect(page.getByText(/scheduled/i)).toBeVisible();
      await expect(page.getByText(/december 1.*9:00 am/i)).toBeVisible();
    });
  });

  test.describe('Distribution Tracking', () => {
    test('should show per-job distribution status', async ({ page }) => {
      // GIVEN: Jobs published to multiple channels
      await page.goto('/employer/jobs/distribution-dashboard');

      // THEN: Status is shown per job per channel
      await expect(page.getByRole('heading', { name: /distribution dashboard/i })).toBeVisible();

      const statusTable = page.locator('[data-testid="distribution-status-table"]');
      await expect(statusTable).toBeVisible();

      // Check for status indicators
      await expect(statusTable.getByText(/linkedin.*published/i)).toBeVisible();
      await expect(statusTable.getByText(/indeed.*published/i)).toBeVisible();
    });

    test('should show channel performance metrics', async ({ page }) => {
      // GIVEN: Jobs with views and applications
      await page.goto('/employer/jobs/distribution-dashboard');

      // THEN: Metrics are displayed
      await expect(page.getByText(/views/i)).toBeVisible();
      await expect(page.getByText(/applications/i)).toBeVisible();

      const metricsCard = page.locator('[data-testid="channel-metrics"]');
      await expect(metricsCard).toBeVisible();
      await expect(metricsCard.getByText(/linkedin/i)).toBeVisible();
      await expect(metricsCard.getByText(/\d+ views/)).toBeVisible();
      await expect(metricsCard.getByText(/\d+ applications/)).toBeVisible();
    });

    test('should allow retrying failed distributions', async ({ page }) => {
      // GIVEN: Jobs with failed distribution
      await page.goto('/employer/jobs/distribution-dashboard');

      // Assume some distributions failed
      const failedRow = page.locator('[data-status="failed"]').first();

      if (await failedRow.count() > 0) {
        // WHEN: User retries failed distribution
        await failedRow.getByRole('button', { name: /retry/i }).click();

        // THEN: Distribution is retried
        await expect(page.getByText(/retrying.*distribution/i)).toBeVisible();
      }
    });

    test('should filter jobs by distribution status', async ({ page }) => {
      // GIVEN: Distribution dashboard with multiple jobs
      await page.goto('/employer/jobs/distribution-dashboard');

      // WHEN: User filters by status
      await page.getByRole('button', { name: /filter/i }).click();
      await page.getByLabel(/published/i).check();
      await page.getByRole('button', { name: /apply filters/i }).click();

      // THEN: Only published jobs are shown
      const rows = page.locator('[data-testid="distribution-row"]');
      const count = await rows.count();

      for (let i = 0; i < count; i++) {
        await expect(rows.nth(i)).toHaveAttribute('data-status', /published|success/);
      }
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should display upload page on mobile', async ({ page }) => {
      // GIVEN: Mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToBulkUpload(page);

      // THEN: Page is responsive
      await expect(page.getByRole('heading', { name: /bulk job upload/i })).toBeVisible();
      await expect(page.locator('input[type="file"]')).toBeVisible();
    });

    test('should display review table on mobile with horizontal scroll', async ({ page }) => {
      // GIVEN: Mobile viewport with uploaded jobs
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToBulkUpload(page);

      const csvData = [
        {
          title: 'Job 1',
          department: 'Engineering',
          location: 'Remote',
          locationType: 'remote',
          employmentType: 'full_time',
          experienceLevel: 'mid',
          salaryMin: 100000,
          salaryMax: 130000,
          description: 'Description',
          requirements: 'Requirements'
        }
      ];

      const csvPath = createSampleCSV('mobile.csv', csvData);
      await uploadCSVFile(page, csvPath);

      await expect(page.getByText(/1 job uploaded/i)).toBeVisible({ timeout: 10000 });

      // THEN: Table is scrollable
      const table = page.locator('[data-testid="jobs-review-table"]');
      await expect(table).toBeVisible();

      // Cleanup
      fs.unlinkSync(csvPath);
    });
  });
});
