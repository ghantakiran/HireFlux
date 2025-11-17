/**
 * E2E Tests for Job Template Management
 *
 * Tests the employer job template functionality including:
 * - Creating private and public templates
 * - Browsing and filtering templates
 * - Applying templates to job postings
 * - Editing and deleting templates
 * - Usage tracking
 * - Authorization checks
 *
 * Test Approach: BDD-style with Given-When-Then pattern
 * Related Feature File: tests/features/job-templates.feature
 */
import { test, expect, Page } from '@playwright/test';

// Test configuration
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const FRONTEND_URL = process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000';

// Helper function to create a mock employer account and login
async function loginAsEmployer(page: Page): Promise<{accessToken: string, companyId: string}> {
  const uniqueEmail = `employer_${Date.now()}@test.com`;

  const registerResponse = await page.request.post(`${BASE_URL}/api/v1/employers/register`, {
    data: {
      name: `Test Company ${Date.now()}`,
      email: uniqueEmail,
      password: 'TestPass123!',
      industry: 'Technology',
      size: '1-10',
      location: 'San Francisco, CA',
      website: 'https://testcompany.com'
    }
  });

  expect(registerResponse.ok()).toBeTruthy();

  const registerData = await registerResponse.json();
  const accessToken = registerData.data.access_token;
  const companyId = registerData.data.company.id;

  await page.evaluate((token) => {
    localStorage.setItem('access_token', token);
  }, accessToken);

  return { accessToken, companyId };
}

// Helper function to create a Growth plan company
async function loginAsGrowthCompany(page: Page): Promise<{accessToken: string, companyId: string}> {
  const { accessToken, companyId } = await loginAsEmployer(page);

  // Upgrade to Growth plan
  await page.request.patch(`${BASE_URL}/api/v1/companies/${companyId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    data: {
      subscription_tier: 'growth',
      max_active_jobs: 10,
      max_candidate_views: 100
    }
  });

  return { accessToken, companyId };
}

// Helper function to create a template via API
async function createTemplate(
  accessToken: string,
  companyId: string,
  templateData: any
): Promise<string> {
  const response = await fetch(`${BASE_URL}/api/v1/employer/job-templates`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(templateData)
  });

  const data = await response.json();
  return data.data.id;
}

test.describe('Job Template Management', () => {

  test.beforeEach(async ({ page }) => {
    // Start with a clean slate
    await page.goto(FRONTEND_URL);
  });

  test('Create a private job template @job-templates @creation', async ({ page }) => {
    // Given: I am logged in as an employer with Growth plan
    const { accessToken, companyId } = await loginAsGrowthCompany(page);

    // And: I am on the Job Templates page
    await page.goto(`${FRONTEND_URL}/employer/templates`);

    // When: I click the "Create Template" button
    await page.click('button:has-text("Create Template")');

    // And: I fill in the template form
    await page.fill('input[name="name"]', 'Senior Software Engineer Template');
    await page.selectOption('select[name="category"]', 'engineering');
    await page.selectOption('select[name="visibility"]', 'private');
    await page.fill('input[name="title"]', 'Senior Software Engineer');
    await page.fill('input[name="department"]', 'Engineering');
    await page.selectOption('select[name="employmentType"]', 'full_time');
    await page.selectOption('select[name="experienceLevel"]', 'senior');

    // And: I add requirements
    await page.click('button:has-text("Add Requirement")');
    await page.fill('textarea[name="requirements[0]"]', '5+ years of professional software development');
    await page.click('button:has-text("Add Requirement")');
    await page.fill('textarea[name="requirements[1]"]', 'Strong proficiency in Python, JavaScript, or similar');
    await page.click('button:has-text("Add Requirement")');
    await page.fill('textarea[name="requirements[2]"]', 'Experience with cloud platforms (AWS, GCP, Azure)');

    // And: I add responsibilities
    await page.click('button:has-text("Add Responsibility")');
    await page.fill('textarea[name="responsibilities[0]"]', 'Design and build scalable systems');
    await page.click('button:has-text("Add Responsibility")');
    await page.fill('textarea[name="responsibilities[1]"]', 'Lead technical design discussions');
    await page.click('button:has-text("Add Responsibility")');
    await page.fill('textarea[name="responsibilities[2]"]', 'Mentor junior engineers');

    // And: I add skills
    const skills = ['Python', 'React', 'AWS', 'Docker', 'PostgreSQL'];
    for (const skill of skills) {
      await page.fill('input[name="skillInput"]', skill);
      await page.press('input[name="skillInput"]', 'Enter');
    }

    // And: I click "Save Template"
    await page.click('button:has-text("Save Template")');

    // Then: I should see a success message
    await expect(page.locator('text=Template created successfully')).toBeVisible({ timeout: 5000 });

    // And: The template should appear in my templates list
    await expect(page.locator('text=Senior Software Engineer Template')).toBeVisible();

    // And: The template should have visibility "Private"
    await expect(page.locator('[data-testid="template-visibility"]:has-text("Private")')).toBeVisible();

    // And: The usage count should be 0
    await expect(page.locator('[data-testid="template-usage-count"]:has-text("0")')).toBeVisible();
  });

  test('Browse public templates @job-templates @public-templates', async ({ page }) => {
    // Given: I am logged in as an employer
    const { accessToken, companyId } = await loginAsEmployer(page);

    // And: There are 5 public templates in the system
    const publicTemplates = [
      { name: 'Product Manager Template', category: 'product' },
      { name: 'UX Designer Template', category: 'design' },
      { name: 'Sales Rep Template', category: 'sales' },
      { name: 'Marketing Manager Template', category: 'marketing' },
      { name: 'Data Scientist Template', category: 'data' }
    ];

    for (const template of publicTemplates) {
      await createTemplate(accessToken, null, {
        ...template,
        visibility: 'public',
        title: template.name.replace(' Template', ''),
        description: `Standard ${template.name}`,
        requirements: ['Experience required'],
        responsibilities: ['Key responsibilities'],
        skills: ['Skill 1', 'Skill 2']
      });
    }

    // When: I navigate to the Job Templates page
    await page.goto(`${FRONTEND_URL}/employer/templates`);

    // And: I click the "Public Templates" tab
    await page.click('button[role="tab"]:has-text("Public Templates")');

    // Then: I should see 5 public templates
    const templateCards = page.locator('[data-testid="template-card"]');
    await expect(templateCards).toHaveCount(5, { timeout: 5000 });

    // And: Each template should have a "Use Template" button
    for (let i = 0; i < 5; i++) {
      await expect(templateCards.nth(i).locator('button:has-text("Use Template")')).toBeVisible();
    }

    // And: I should not see any "Edit" or "Delete" buttons
    await expect(page.locator('button:has-text("Edit")')).toHaveCount(0);
    await expect(page.locator('button:has-text("Delete")')).toHaveCount(0);
  });

  test('Filter templates by category @job-templates @filtering', async ({ page }) => {
    // Given: I am logged in with Growth plan
    const { accessToken, companyId } = await loginAsGrowthCompany(page);

    // And: I have created multiple templates in different categories
    const templates = [
      { name: 'Software Engineer', category: 'engineering' },
      { name: 'Product Manager', category: 'product' },
      { name: 'UX Designer', category: 'design' },
      { name: 'Sales Representative', category: 'sales' }
    ];

    for (const template of templates) {
      await createTemplate(accessToken, companyId, {
        ...template,
        visibility: 'private',
        title: template.name,
        description: `${template.name} role`,
        requirements: ['Experience required'],
        responsibilities: ['Key responsibilities'],
        skills: ['Skill 1']
      });
    }

    // When: I am on the Job Templates page
    await page.goto(`${FRONTEND_URL}/employer/templates`);
    await page.waitForLoadState('networkidle');

    // And: I select "Engineering" from the category filter
    await page.selectOption('select[name="categoryFilter"]', 'engineering');
    await page.waitForTimeout(500); // Wait for filter to apply

    // Then: I should see only 1 template
    const visibleTemplates = page.locator('[data-testid="template-card"]:visible');
    await expect(visibleTemplates).toHaveCount(1);

    // And: The template "Software Engineer" should be visible
    await expect(page.locator('text=Software Engineer')).toBeVisible();

    // And: Other templates should not be visible
    await expect(page.locator('text=Product Manager')).not.toBeVisible();
    await expect(page.locator('text=UX Designer')).not.toBeVisible();
    await expect(page.locator('text=Sales Representative')).not.toBeVisible();
  });

  test('Apply template to new job posting @job-templates @apply-template', async ({ page }) => {
    // Given: I am logged in with Growth plan
    const { accessToken, companyId } = await loginAsGrowthCompany(page);

    // And: I have a template
    const templateId = await createTemplate(accessToken, companyId, {
      name: 'Senior Software Engineer Template',
      category: 'engineering',
      visibility: 'private',
      title: 'Senior Software Engineer',
      department: 'Engineering',
      employment_type: 'full_time',
      experience_level: 'senior',
      description: 'We are seeking a senior engineer...',
      requirements: [
        '5+ years experience',
        'Python proficiency',
        'Cloud experience'
      ],
      responsibilities: [
        'Build scalable systems',
        'Lead technical discussions',
        'Mentor juniors'
      ],
      skills: ['Python', 'React', 'AWS', 'Docker', 'PostgreSQL']
    });

    // When: I navigate to the "Create Job" page
    await page.goto(`${FRONTEND_URL}/employer/jobs/new`);

    // And: I click "Use Template"
    await page.click('button:has-text("Use Template")');

    // And: I select the template from the dropdown
    await page.selectOption('select[name="templateSelect"]', templateId);
    await page.waitForTimeout(500); // Wait for form to populate

    // Then: The job form should be pre-filled
    await expect(page.locator('input[name="title"]')).toHaveValue('Senior Software Engineer');
    await expect(page.locator('input[name="department"]')).toHaveValue('Engineering');
    await expect(page.locator('select[name="employmentType"]')).toHaveValue('full_time');
    await expect(page.locator('select[name="experienceLevel"]')).toHaveValue('senior');

    // And: Requirements should be pre-filled with 3 items
    const requirements = page.locator('textarea[name^="requirements"]');
    await expect(requirements).toHaveCount(3);

    // And: Responsibilities should be pre-filled with 3 items
    const responsibilities = page.locator('textarea[name^="responsibilities"]');
    await expect(responsibilities).toHaveCount(3);

    // And: Skills should be pre-filled with 5 items
    const skills = page.locator('[data-testid="skill-tag"]');
    await expect(skills).toHaveCount(5);

    // When: I can edit and post the job
    await page.fill('input[name="location"]', 'San Francisco, CA');
    await page.selectOption('select[name="locationType"]', 'hybrid');
    await page.fill('input[name="salaryMin"]', '130000');
    await page.fill('input[name="salaryMax"]', '170000');
    await page.click('button:has-text("Post Job")');

    // Then: The job should be created successfully
    await expect(page.locator('text=Job posted successfully')).toBeVisible({ timeout: 5000 });

    // And: The template usage count should increment
    // Verify via API call
    const templateResponse = await page.request.get(
      `${BASE_URL}/api/v1/employer/job-templates/${templateId}`,
      {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      }
    );
    const templateData = await templateResponse.json();
    expect(templateData.data.usage_count).toBe(1);
  });

  test('Edit an existing template @job-templates @edit', async ({ page }) => {
    // Given: I am logged in with a template
    const { accessToken, companyId } = await loginAsGrowthCompany(page);

    const templateId = await createTemplate(accessToken, companyId, {
      name: 'Software Engineer Template',
      category: 'engineering',
      visibility: 'private',
      title: 'Software Engineer',
      description: 'Engineer role',
      requirements: ['Experience required'],
      responsibilities: ['Build features'],
      skills: ['JavaScript']
    });

    // When: I am on the Job Templates page
    await page.goto(`${FRONTEND_URL}/employer/templates`);

    // And: I click the "Edit" button
    await page.click(`[data-template-id="${templateId}"] button:has-text("Edit")`);

    // And: I change the template name
    await page.fill('input[name="name"]', 'Updated Software Engineer Template');

    // And: I add a new requirement
    await page.click('button:has-text("Add Requirement")');
    const requirementInputs = page.locator('textarea[name^="requirements"]');
    const lastIndex = await requirementInputs.count() - 1;
    await requirementInputs.nth(lastIndex).fill('Knowledge of TypeScript');

    // And: I click "Save Changes"
    await page.click('button:has-text("Save Changes")');

    // Then: I should see a success message
    await expect(page.locator('text=Template updated successfully')).toBeVisible({ timeout: 5000 });

    // And: The template name should be updated
    await expect(page.locator('text=Updated Software Engineer Template')).toBeVisible();

    // And: The requirements should include the new item
    await page.click(`[data-template-id="${templateId}"]`); // Expand details
    await expect(page.locator('text=Knowledge of TypeScript')).toBeVisible();
  });

  test('Delete a template @job-templates @delete', async ({ page }) => {
    // Given: I am logged in with a template
    const { accessToken, companyId } = await loginAsGrowthCompany(page);

    const templateId = await createTemplate(accessToken, companyId, {
      name: 'Old Template',
      category: 'engineering',
      visibility: 'private',
      title: 'Old Job',
      description: 'Old description',
      requirements: ['Requirement'],
      responsibilities: ['Responsibility'],
      skills: ['Skill']
    });

    // When: I am on the Job Templates page
    await page.goto(`${FRONTEND_URL}/employer/templates`);
    await page.waitForLoadState('networkidle');

    // And: I click the "Delete" button
    await page.click(`[data-template-id="${templateId}"] button:has-text("Delete")`);

    // And: I confirm the deletion
    await page.click('button[data-testid="confirm-delete"]:has-text("Delete")');

    // Then: I should see a success message
    await expect(page.locator('text=Template deleted successfully')).toBeVisible({ timeout: 5000 });

    // And: The template should not appear in the list
    await expect(page.locator(`[data-template-id="${templateId}"]`)).not.toBeVisible();
  });

  test('Cannot edit another company\'s private template @job-templates @authorization', async ({ page }) => {
    // Given: Company A creates a private template
    const { accessToken: tokenA, companyId: companyA } = await loginAsGrowthCompany(page);

    const templateId = await createTemplate(tokenA, companyA, {
      name: 'Private Template',
      category: 'engineering',
      visibility: 'private',
      title: 'Private Job',
      description: 'Private description',
      requirements: ['Requirement'],
      responsibilities: ['Responsibility'],
      skills: ['Skill']
    });

    // And: I log out and log in as Company B
    await page.goto(`${FRONTEND_URL}/logout`);
    const { accessToken: tokenB } = await loginAsGrowthCompany(page);

    // When: I try to access the edit page directly via URL
    await page.goto(`${FRONTEND_URL}/employer/templates/${templateId}/edit`);

    // Then: I should see an authorization error
    await expect(page.locator('text=Not authorized')).toBeVisible({ timeout: 5000 });

    // And: I should be redirected to my templates page
    await expect(page).toHaveURL(`${FRONTEND_URL}/employer/templates`);
  });

  test('Template usage count increments @job-templates @usage-tracking', async ({ page }) => {
    // Given: I am logged in with a template
    const { accessToken, companyId } = await loginAsGrowthCompany(page);

    const templateId = await createTemplate(accessToken, companyId, {
      name: 'Popular Template',
      category: 'engineering',
      visibility: 'private',
      title: 'Engineer',
      description: 'Description',
      requirements: ['Requirement'],
      responsibilities: ['Responsibility'],
      skills: ['Skill']
    });

    // When: I create a job using the template
    await page.goto(`${FRONTEND_URL}/employer/jobs/new`);
    await page.click('button:has-text("Use Template")');
    await page.selectOption('select[name="templateSelect"]', templateId);
    await page.fill('input[name="location"]', 'San Francisco, CA');
    await page.selectOption('select[name="locationType"]', 'remote');
    await page.click('button:has-text("Post Job")');

    await expect(page.locator('text=Job posted successfully')).toBeVisible({ timeout: 5000 });

    // Then: The usage count should increment
    await page.goto(`${FRONTEND_URL}/employer/templates`);
    await expect(
      page.locator(`[data-template-id="${templateId}"] [data-testid="template-usage-count"]:has-text("1")`)
    ).toBeVisible();
  });

  test('Validate required fields @job-templates @validation', async ({ page }) => {
    // Given: I am logged in
    const { accessToken, companyId } = await loginAsGrowthCompany(page);

    // When: I navigate to Create Template page
    await page.goto(`${FRONTEND_URL}/employer/templates/new`);

    // And: I leave required fields empty and submit
    await page.click('button:has-text("Save Template")');

    // Then: I should see validation errors
    await expect(page.locator('text=Template name is required')).toBeVisible();
    await expect(page.locator('text=Job title is required')).toBeVisible();

    // And: The template should not be created
    const response = await page.request.get(`${BASE_URL}/api/v1/employer/job-templates`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    const templates = await response.json();
    expect(templates.data.templates.length).toBe(0);
  });

  test('Search templates by name @job-templates @search', async ({ page }) => {
    // Given: I have created multiple templates
    const { accessToken, companyId } = await loginAsGrowthCompany(page);

    await createTemplate(accessToken, companyId, {
      name: 'React Developer Template',
      category: 'engineering',
      visibility: 'private',
      title: 'React Developer',
      description: 'React role',
      requirements: ['React experience'],
      responsibilities: ['Build UI'],
      skills: ['React']
    });

    await createTemplate(accessToken, companyId, {
      name: 'Backend Engineer Template',
      category: 'engineering',
      visibility: 'private',
      title: 'Backend Engineer',
      description: 'Backend role',
      requirements: ['Backend experience'],
      responsibilities: ['Build APIs'],
      skills: ['Python']
    });

    // When: I search for "React"
    await page.goto(`${FRONTEND_URL}/employer/templates`);
    await page.fill('input[name="search"]', 'React');
    await page.waitForTimeout(500); // Debounce

    // Then: I should see only the React template
    await expect(page.locator('text=React Developer Template')).toBeVisible();
    await expect(page.locator('text=Backend Engineer Template')).not.toBeVisible();
  });
});
