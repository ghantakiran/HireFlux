/**
 * E2E Tests for Job Posting
 *
 * Tests the employer job posting functionality including:
 * - Creating jobs with all fields
 * - Listing and filtering jobs
 * - Updating job details
 * - Status management (active/paused/closed)
 * - Subscription limit enforcement
 * - Authorization checks
 *
 * Test Approach: BDD-style with Given-When-Then pattern
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

// Helper function to create a Growth plan company (10 jobs limit)
async function loginAsGrowthCompany(page: Page): Promise<{accessToken: string, companyId: string}> {
  const uniqueEmail = `growth_${Date.now()}@test.com`;

  const registerResponse = await page.request.post(`${BASE_URL}/api/v1/employers/register`, {
    data: {
      name: `Growth Company ${Date.now()}`,
      email: uniqueEmail,
      password: 'TestPass123!',
      industry: 'Technology',
      size: '11-50',
      location: 'San Francisco, CA',
      website: 'https://growthcompany.com'
    }
  });

  expect(registerResponse.ok()).toBeTruthy();

  const registerData = await registerResponse.json();
  const accessToken = registerData.data.access_token;
  const companyId = registerData.data.company.id;

  // Upgrade to Growth plan (10 jobs)
  await page.request.patch(`${BASE_URL}/api/v1/companies/${companyId}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    data: {
      subscription_tier: 'growth',
      max_active_jobs: 10
    }
  });

  await page.evaluate((token) => {
    localStorage.setItem('access_token', token);
  }, accessToken);

  return { accessToken, companyId };
}

test.describe('Job Posting - Create Job', () => {
  test('should create a new job successfully with all fields', async ({ page }) => {
    // GIVEN: An authenticated employer
    const { accessToken } = await loginAsEmployer(page);

    // WHEN: Creating a new job with complete data
    const jobResponse = await page.request.post(`${BASE_URL}/api/v1/jobs`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Senior Software Engineer',
        company_name: 'Test Company',
        department: 'Engineering',
        location: 'San Francisco, CA',
        location_type: 'hybrid',
        employment_type: 'full_time',
        experience_level: 'senior',
        experience_min_years: 5,
        experience_max_years: 10,
        salary_min: 130000,
        salary_max: 170000,
        description: 'We are seeking a talented Senior Software Engineer...',
        required_skills: ['Python', 'FastAPI', 'PostgreSQL', 'React'],
        preferred_skills: ['AWS', 'Docker', 'Kubernetes'],
        requirements: [
          '5+ years of software development experience',
          'Strong Python and JavaScript skills'
        ],
        responsibilities: [
          'Design and implement scalable backend services',
          'Collaborate with cross-functional teams'
        ],
        benefits: [
          'Competitive salary',
          'Health insurance',
          '401(k) matching'
        ]
      }
    });

    // THEN: Job is created successfully
    expect(jobResponse.status()).toBe(201);
    const jobData = await jobResponse.json();

    expect(jobData.id).toBeDefined();
    expect(jobData.title).toBe('Senior Software Engineer');
    expect(jobData.location).toBe('San Francisco, CA');
    expect(jobData.location_type).toBe('hybrid');
    expect(jobData.salary_min).toBe(130000);
    expect(jobData.required_skills).toContain('Python');
    expect(jobData.source).toBe('employer');
    expect(jobData.is_active).toBe(true);
  });

  test('should create job with minimal required fields', async ({ page }) => {
    // GIVEN: An authenticated employer
    const { accessToken } = await loginAsEmployer(page);

    // WHEN: Creating a job with only required fields
    const jobResponse = await page.request.post(`${BASE_URL}/api/v1/jobs`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Junior Developer',
        company_name: 'Test Company',
        location: 'Remote',
        location_type: 'remote',
        employment_type: 'full_time',
        description: 'Entry level position'
      }
    });

    // THEN: Job is created with defaults
    expect(jobResponse.status()).toBe(201);
    const jobData = await jobResponse.json();

    expect(jobData.title).toBe('Junior Developer');
    expect(jobData.required_skills).toEqual([]);
    expect(jobData.is_active).toBe(true);
  });

  test('should enforce subscription limit (Starter plan)', async ({ page }) => {
    // GIVEN: A Starter plan employer with 1 active job (at limit)
    const { accessToken } = await loginAsEmployer(page);

    // Create first job (uses the 1 job limit)
    const firstJobResponse = await page.request.post(`${BASE_URL}/api/v1/jobs`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'First Job',
        company_name: 'Test Company',
        location: 'Remote',
        location_type: 'remote',
        employment_type: 'full_time',
        description: 'First position'
      }
    });

    expect(firstJobResponse.status()).toBe(201);

    // WHEN: Attempting to create a second job
    const secondJobResponse = await page.request.post(`${BASE_URL}/api/v1/jobs`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Second Job',
        company_name: 'Test Company',
        location: 'Remote',
        location_type: 'remote',
        employment_type: 'full_time',
        description: 'Second position'
      }
    });

    // THEN: Request fails with payment required error
    expect(secondJobResponse.status()).toBe(402);
    const errorData = await secondJobResponse.json();
    expect(errorData.detail.toLowerCase()).toContain('subscription limit');
  });

  test('should allow Growth plan to create multiple jobs', async ({ page }) => {
    // GIVEN: A Growth plan employer (10 jobs limit)
    const { accessToken } = await loginAsGrowthCompany(page);

    // WHEN: Creating 3 jobs
    const jobPromises = [];
    for (let i = 0; i < 3; i++) {
      jobPromises.push(
        page.request.post(`${BASE_URL}/api/v1/jobs`, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          data: {
            title: `Software Engineer ${i + 1}`,
            company_name: 'Growth Company',
            location: 'Remote',
            location_type: 'remote',
            employment_type: 'full_time',
            description: `Position ${i + 1}`
          }
        })
      );
    }

    const responses = await Promise.all(jobPromises);

    // THEN: All jobs are created successfully
    responses.forEach(response => {
      expect(response.status()).toBe(201);
    });
  });
});

test.describe('Job Posting - List Jobs', () => {
  test('should list all jobs for company with pagination', async ({ page }) => {
    // GIVEN: A company with 3 jobs
    const { accessToken } = await loginAsGrowthCompany(page);

    // Create 3 jobs
    for (let i = 0; i < 3; i++) {
      await page.request.post(`${BASE_URL}/api/v1/jobs`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: `Position ${i + 1}`,
          company_name: 'Growth Company',
          location: 'Remote',
          location_type: 'remote',
          employment_type: 'full_time',
          description: `Description ${i + 1}`
        }
      });
    }

    // WHEN: Listing jobs
    const listResponse = await page.request.get(`${BASE_URL}/api/v1/jobs?page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // THEN: Returns all jobs with pagination info
    expect(listResponse.status()).toBe(200);
    const listData = await listResponse.json();

    expect(listData.total).toBe(3);
    expect(listData.jobs.length).toBe(3);
    expect(listData.page).toBe(1);
    expect(listData.limit).toBe(10);
  });

  test('should filter jobs by active status', async ({ page }) => {
    // GIVEN: A company with 2 active and 1 closed job
    const { accessToken } = await loginAsGrowthCompany(page);

    // Create 3 jobs
    const jobIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const jobResponse = await page.request.post(`${BASE_URL}/api/v1/jobs`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        data: {
          title: `Job ${i + 1}`,
          company_name: 'Growth Company',
          location: 'Remote',
          location_type: 'remote',
          employment_type: 'full_time',
          description: `Description ${i + 1}`
        }
      });
      const jobData = await jobResponse.json();
      jobIds.push(jobData.id);
    }

    // Close one job
    await page.request.patch(`${BASE_URL}/api/v1/jobs/${jobIds[0]}/status`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        status: 'closed'
      }
    });

    // WHEN: Filtering by active status
    const activeResponse = await page.request.get(`${BASE_URL}/api/v1/jobs?status=active&page=1&limit=10`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // THEN: Returns only active jobs
    expect(activeResponse.status()).toBe(200);
    const activeData = await activeResponse.json();

    expect(activeData.total).toBe(2);
    expect(activeData.jobs.length).toBe(2);
    expect(activeData.jobs.every((job: any) => job.is_active)).toBe(true);
  });
});

test.describe('Job Posting - Update Job', () => {
  test('should update job details', async ({ page }) => {
    // GIVEN: An existing job
    const { accessToken } = await loginAsEmployer(page);

    const createResponse = await page.request.post(`${BASE_URL}/api/v1/jobs`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Software Engineer',
        company_name: 'Test Company',
        location: 'San Francisco, CA',
        location_type: 'hybrid',
        employment_type: 'full_time',
        salary_min: 100000,
        salary_max: 140000,
        description: 'Original description'
      }
    });

    const jobData = await createResponse.json();
    const jobId = jobData.id;

    // WHEN: Updating job details
    const updateResponse = await page.request.put(`${BASE_URL}/api/v1/jobs/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Lead Software Engineer',
        salary_min: 150000,
        salary_max: 200000,
        description: 'Updated description with new requirements'
      }
    });

    // THEN: Job is updated
    expect(updateResponse.status()).toBe(200);
    const updatedData = await updateResponse.json();

    expect(updatedData.title).toBe('Lead Software Engineer');
    expect(updatedData.salary_min).toBe(150000);
    expect(updatedData.salary_max).toBe(200000);
    expect(updatedData.description).toBe('Updated description with new requirements');
    // Unchanged fields remain the same
    expect(updatedData.location).toBe('San Francisco, CA');
    expect(updatedData.employment_type).toBe('full_time');
  });

  test('should perform partial update', async ({ page }) => {
    // GIVEN: An existing job
    const { accessToken } = await loginAsEmployer(page);

    const createResponse = await page.request.post(`${BASE_URL}/api/v1/jobs`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Software Engineer',
        company_name: 'Test Company',
        location: 'Remote',
        location_type: 'remote',
        employment_type: 'full_time',
        salary_min: 100000,
        salary_max: 140000,
        description: 'Description'
      }
    });

    const jobData = await createResponse.json();

    // WHEN: Updating only salary
    const updateResponse = await page.request.put(`${BASE_URL}/api/v1/jobs/${jobData.id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        salary_min: 120000,
        salary_max: 160000
      }
    });

    // THEN: Only salary is updated
    expect(updateResponse.status()).toBe(200);
    const updatedData = await updateResponse.json();

    expect(updatedData.salary_min).toBe(120000);
    expect(updatedData.salary_max).toBe(160000);
    expect(updatedData.title).toBe('Software Engineer'); // Unchanged
    expect(updatedData.location).toBe('Remote'); // Unchanged
  });
});

test.describe('Job Posting - Status Management', () => {
  test('should change job status to paused', async ({ page }) => {
    // GIVEN: An active job
    const { accessToken } = await loginAsEmployer(page);

    const createResponse = await page.request.post(`${BASE_URL}/api/v1/jobs`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Software Engineer',
        company_name: 'Test Company',
        location: 'Remote',
        location_type: 'remote',
        employment_type: 'full_time',
        description: 'Description'
      }
    });

    const jobData = await createResponse.json();

    // WHEN: Changing status to paused
    const statusResponse = await page.request.patch(`${BASE_URL}/api/v1/jobs/${jobData.id}/status`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        status: 'paused'
      }
    });

    // THEN: Job is paused (still active in terms of limit)
    expect(statusResponse.status()).toBe(200);
    const updatedData = await statusResponse.json();
    expect(updatedData.is_active).toBe(true); // Paused jobs still count toward limit
  });

  test('should change job status to closed and free subscription slot', async ({ page }) => {
    // GIVEN: A Starter plan employer with 1 active job
    const { accessToken } = await loginAsEmployer(page);

    const createResponse = await page.request.post(`${BASE_URL}/api/v1/jobs`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'First Job',
        company_name: 'Test Company',
        location: 'Remote',
        location_type: 'remote',
        employment_type: 'full_time',
        description: 'First position'
      }
    });

    const firstJobData = await createResponse.json();

    // WHEN: Closing the job
    const closeResponse = await page.request.patch(`${BASE_URL}/api/v1/jobs/${firstJobData.id}/status`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        status: 'closed'
      }
    });

    expect(closeResponse.status()).toBe(200);
    const closedData = await closeResponse.json();
    expect(closedData.is_active).toBe(false);

    // AND: Can create a new job now (slot is freed)
    const newJobResponse = await page.request.post(`${BASE_URL}/api/v1/jobs`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'New Job',
        company_name: 'Test Company',
        location: 'Remote',
        location_type: 'remote',
        employment_type: 'full_time',
        description: 'New position'
      }
    });

    expect(newJobResponse.status()).toBe(201);
  });
});

test.describe('Job Posting - Delete Job', () => {
  test('should soft delete a job', async ({ page }) => {
    // GIVEN: An existing job
    const { accessToken } = await loginAsEmployer(page);

    const createResponse = await page.request.post(`${BASE_URL}/api/v1/jobs`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Software Engineer',
        company_name: 'Test Company',
        location: 'Remote',
        location_type: 'remote',
        employment_type: 'full_time',
        description: 'Description'
      }
    });

    const jobData = await createResponse.json();

    // WHEN: Deleting the job
    const deleteResponse = await page.request.delete(`${BASE_URL}/api/v1/jobs/${jobData.id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    // THEN: Job is soft deleted (204 No Content)
    expect(deleteResponse.status()).toBe(204);

    // AND: Job is not listed in active jobs
    const listResponse = await page.request.get(`${BASE_URL}/api/v1/jobs?status=active`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const listData = await listResponse.json();
    expect(listData.total).toBe(0);
  });
});

test.describe('Job Posting - BDD Complete Workflow', () => {
  test('Complete job posting lifecycle', async ({ page }) => {
    /**
     * Feature: Job Posting Management
     *
     * Scenario: Employer creates, updates, pauses, and closes a job
     *   Given an employer with Growth plan subscription
     *   When they create a new job posting
     *   Then the job is active and visible
     *   And when they update the job details
     *   Then the changes are saved
     *   And when they pause the job
     *   Then applications stop but job remains in dashboard
     *   And when they reactivate the job
     *   Then applications resume
     *   And when they close the job
     *   Then the job is removed from active listings
     *   And the job slot is freed for new postings
     */

    // GIVEN: An employer with Growth plan
    const { accessToken } = await loginAsGrowthCompany(page);

    // WHEN: They create a new job posting
    const createResponse = await page.request.post(`${BASE_URL}/api/v1/jobs`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Full Stack Engineer',
        company_name: 'Growth Company',
        location: 'San Francisco, CA',
        location_type: 'hybrid',
        employment_type: 'full_time',
        experience_level: 'mid',
        salary_min: 100000,
        salary_max: 140000,
        description: 'Join our growing team...',
        required_skills: ['JavaScript', 'Python', 'PostgreSQL']
      }
    });

    // THEN: The job is active and visible
    expect(createResponse.status()).toBe(201);
    const jobData = await createResponse.json();
    expect(jobData.is_active).toBe(true);
    expect(jobData.title).toBe('Full Stack Engineer');

    // AND: When they update the job details
    const updateResponse = await page.request.put(`${BASE_URL}/api/v1/jobs/${jobData.id}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Senior Full Stack Engineer',
        salary_min: 120000,
        salary_max: 160000
      }
    });

    // THEN: The changes are saved
    expect(updateResponse.status()).toBe(200);
    const updatedData = await updateResponse.json();
    expect(updatedData.title).toBe('Senior Full Stack Engineer');
    expect(updatedData.salary_min).toBe(120000);

    // AND: When they pause the job
    const pauseResponse = await page.request.patch(`${BASE_URL}/api/v1/jobs/${jobData.id}/status`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        status: 'paused'
      }
    });

    // THEN: Job remains in dashboard (still counts toward limit)
    expect(pauseResponse.status()).toBe(200);
    const pausedData = await pauseResponse.json();
    expect(pausedData.is_active).toBe(true);

    // AND: When they reactivate the job
    const reactivateResponse = await page.request.patch(`${BASE_URL}/api/v1/jobs/${jobData.id}/status`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        status: 'active'
      }
    });

    expect(reactivateResponse.status()).toBe(200);
    const reactivatedData = await reactivateResponse.json();
    expect(reactivatedData.is_active).toBe(true);

    // AND: When they close the job
    const closeResponse = await page.request.patch(`${BASE_URL}/api/v1/jobs/${jobData.id}/status`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        status: 'closed'
      }
    });

    // THEN: The job is removed from active listings
    expect(closeResponse.status()).toBe(200);
    const closedData = await closeResponse.json();
    expect(closedData.is_active).toBe(false);

    // AND: The job slot is freed for new postings
    const activeListResponse = await page.request.get(`${BASE_URL}/api/v1/jobs?status=active`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    const activeListData = await activeListResponse.json();
    expect(activeListData.total).toBe(0);

    // Can create a new job now
    const newJobResponse = await page.request.post(`${BASE_URL}/api/v1/jobs`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      data: {
        title: 'Backend Engineer',
        company_name: 'Growth Company',
        location: 'Remote',
        location_type: 'remote',
        employment_type: 'full_time',
        description: 'Backend position'
      }
    });

    expect(newJobResponse.status()).toBe(201);
  });
});
