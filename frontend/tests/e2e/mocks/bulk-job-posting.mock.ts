/**
 * Mock API Handlers for Bulk Job Posting (Sprint 11-12)
 *
 * Purpose: Enable E2E testing without running backend server
 * Following TDD/BDD: Tests exist (written first), now making them pass with mocks
 *
 * Mock responses match backend API contract from backend/app/api/v1/endpoints/bulk_job_upload.py
 */

import { Page, Route } from '@playwright/test';

export interface MockBulkJobResponse {
  success: boolean;
  data: {
    id: string;
    filename: string;
    total_jobs: number;
    valid_jobs: number;
    invalid_jobs: number;
    duplicate_jobs: number;
    status: string;
    validation_errors?: Array<{
      row_index: number;
      field: string;
      error_message: string;
    }>;
    duplicate_info?: Array<{
      row_index: number;
      duplicate_of: number;
      similarity_score: number;
      matching_fields: string[];
    }>;
    ai_suggestions?: Array<{
      job_index: number;
      normalized_title?: string;
      original_title?: string;
      extracted_skills?: string[];
      suggested_salary_min?: number;
      suggested_salary_max?: number;
    }>;
    raw_jobs_data?: Array<{
      title: string;
      department?: string;
      location?: string;
      location_type?: string;
      employment_type?: string;
      experience_level?: string;
      salary_min?: number;
      salary_max?: number;
      description?: string;
      requirements?: string;
    }>;
  };
}

/**
 * Enable API mocking for bulk job posting endpoints
 */
export async function mockBulkJobPostingAPI(page: Page) {
  // Mock CSV upload endpoint
  await page.route('**/api/v1/bulk-job-posting/upload', async (route: Route) => {
    const request = route.request();

    // Simulate processing delay (3000ms allows tests to verify progress indicator)
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Extract filename from FormData (parse the multipart body)
    const postData = request.postData() || '';
    const filenameMatch = postData.match(/filename="([^"]+)"/);
    const filename = filenameMatch ? filenameMatch[1] : 'uploaded-jobs.csv';

    // Determine mock response based on filename patterns
    let response: MockBulkJobResponse;

    if (filename.includes('invalid') || filename.includes('error')) {
      // Mock validation errors
      response = {
        success: true,
        data: {
          id: 'upload-error-123',
          filename: filename,
          total_jobs: 2,
          valid_jobs: 0,
          invalid_jobs: 2,
          duplicate_jobs: 0,
          status: 'validation_failed',
          validation_errors: [
            {
              row_index: 0,
              field: 'title',
              error_message: 'Title is required',
            },
            {
              row_index: 1,
              field: 'salary_min',
              error_message: 'Salary must be a positive number',
            },
          ],
          raw_jobs_data: [
            { title: '', department: 'Engineering' },
            { title: 'Developer', salary_min: -1000 },
          ],
        },
      };
    } else if (filename.includes('too-many') || filename.includes('large')) {
      // Mock file too large error
      return route.fulfill({
        status: 400,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: 'CSV file contains more than 500 jobs',
            details: [{ field: 'file', message: 'Maximum 500 jobs allowed per upload' }],
          },
        }),
      });
    } else if (filename.includes('normalize') || filename.includes('suggestions')) {
      // Mock AI title normalization
      response = {
        success: true,
        data: {
          id: 'upload-normalize-111',
          filename: filename,
          total_jobs: 1,
          valid_jobs: 1,
          invalid_jobs: 0,
          duplicate_jobs: 0,
          status: 'completed',
          ai_suggestions: [
            {
              job_index: 0,
              normalized_title: 'Senior Software Engineer',
              original_title: 'Sr. SW Eng',
            },
          ],
          raw_jobs_data: [
            {
              title: 'Sr. SW Eng',
              department: 'Engineering',
              location: 'Remote',
              location_type: 'remote',
              employment_type: 'full_time',
              experience_level: 'senior',
              salary_min: 130000,
              salary_max: 170000,
              description: 'Software engineering role',
              requirements: 'React, Node.js',
            },
          ],
        },
      };
    } else if (filename.includes('skills')) {
      // Mock AI skill extraction
      response = {
        success: true,
        data: {
          id: 'upload-skills-222',
          filename: filename,
          total_jobs: 1,
          valid_jobs: 1,
          invalid_jobs: 0,
          duplicate_jobs: 0,
          status: 'completed',
          ai_suggestions: [
            {
              job_index: 0,
              extracted_skills: ['React', 'TypeScript', 'Python', 'AWS'],
            },
          ],
          raw_jobs_data: [
            {
              title: 'Full Stack Developer',
              department: 'Engineering',
              location: 'Remote',
              location_type: 'remote',
              employment_type: 'full_time',
              experience_level: 'mid',
              salary_min: 100000,
              salary_max: 130000,
              description: 'Looking for a developer with React, TypeScript, Python, and AWS experience',
              requirements: 'Strong coding skills',
            },
          ],
        },
      };
    } else if (filename.includes('salary')) {
      // Mock AI salary suggestion
      response = {
        success: true,
        data: {
          id: 'upload-salary-333',
          filename: filename,
          total_jobs: 1,
          valid_jobs: 1,
          invalid_jobs: 0,
          duplicate_jobs: 0,
          status: 'completed',
          ai_suggestions: [
            {
              job_index: 0,
              suggested_salary_min: 130000,
              suggested_salary_max: 170000,
            },
          ],
          raw_jobs_data: [
            {
              title: 'Senior Software Engineer',
              department: 'Engineering',
              location: 'San Francisco, CA',
              location_type: 'hybrid',
              employment_type: 'full_time',
              experience_level: 'senior',
              salary_min: 0,
              salary_max: 0,
              description: 'Software engineering role',
              requirements: 'React, Node.js',
            },
          ],
        },
      };
    } else if (filename.includes('progress')) {
      // Mock progress test with 10 jobs
      const jobs = Array.from({ length: 10 }, (_, i) => ({
        title: `Job ${i + 1}`,
        department: 'Engineering',
        location: 'Remote',
        location_type: 'remote',
        employment_type: 'full_time',
        experience_level: 'mid',
        salary_min: 100000,
        salary_max: 130000,
        description: 'Description',
        requirements: 'Requirements',
      }));

      response = {
        success: true,
        data: {
          id: 'upload-progress-999',
          filename: filename,
          total_jobs: 10,
          valid_jobs: 10,
          invalid_jobs: 0,
          duplicate_jobs: 0,
          status: 'completed',
          raw_jobs_data: jobs,
        },
      };
    } else if (filename.includes('duplicate') || filename.includes('dup-action')) {
      // Mock duplicate detection (2 identical jobs)
      response = {
        success: true,
        data: {
          id: 'upload-dup-456',
          filename: filename,
          total_jobs: 2,
          valid_jobs: 1,
          invalid_jobs: 0,
          duplicate_jobs: 1,
          status: 'completed',
          duplicate_info: [
            {
              row_index: 1,
              duplicate_of: 0,
              similarity_score: 0.95,
              matching_fields: ['title', 'location', 'department'],
            },
          ],
          raw_jobs_data: [
            {
              title: 'Senior Software Engineer',
              department: 'Engineering',
              location: 'San Francisco, CA',
              employment_type: 'full_time',
              salary_min: 130000,
              salary_max: 170000,
            },
            {
              title: 'Senior Software Engineer',
              department: 'Engineering',
              location: 'San Francisco, CA',
              employment_type: 'full_time',
              salary_min: 130000,
              salary_max: 170000,
            },
          ],
        },
      };
    } else if (filename.includes('similar')) {
      // Mock similar jobs detection (fuzzy matching with 85% similarity)
      response = {
        success: true,
        data: {
          id: 'upload-similar-789',
          filename: filename,
          total_jobs: 2,
          valid_jobs: 2,
          invalid_jobs: 0,
          duplicate_jobs: 0,
          status: 'completed',
          duplicate_info: [
            {
              row_index: 1,
              duplicate_of: 0,
              similarity_score: 0.85,
              matching_fields: ['title', 'department'],
            },
          ],
          raw_jobs_data: [
            {
              title: 'Senior Software Engineer',
              department: 'Engineering',
              location: 'San Francisco, CA',
              employment_type: 'full_time',
              salary_min: 130000,
              salary_max: 170000,
            },
            {
              title: 'Sr. Software Engineer',
              department: 'Engineering',
              location: 'San Francisco, California',
              employment_type: 'full_time',
              salary_min: 135000,
              salary_max: 175000,
            },
          ],
        },
      };
    } else {
      // Mock successful upload (default case)
      response = {
        success: true,
        data: {
          id: 'upload-success-789',
          filename: filename,
          total_jobs: 2,
          valid_jobs: 2,
          invalid_jobs: 0,
          duplicate_jobs: 0,
          status: 'completed',
          raw_jobs_data: [
            {
              title: 'Senior Software Engineer',
              department: 'Engineering',
              location: 'San Francisco, CA',
              location_type: 'hybrid',
              employment_type: 'full_time',
              experience_level: 'senior',
              salary_min: 130000,
              salary_max: 170000,
              description: 'We are seeking a Senior Software Engineer...',
              requirements: 'Requires 5+ years experience with Python, React, and Node.js',
            },
            {
              title: 'Product Manager',
              department: 'Product',
              location: 'Remote',
              location_type: 'remote',
              employment_type: 'full_time',
              experience_level: 'mid',
              salary_min: 100000,
              salary_max: 130000,
              description: 'Join our team as a Product Manager...',
              requirements: '3+ years PM experience, Agile methodology',
            },
          ],
        },
      };
    }

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });

  // Mock template download endpoint
  await page.route('**/api/v1/bulk-job-posting/template', async (route: Route) => {
    const csvTemplate = `title,department,location,location_type,employment_type,experience_level,salary_min,salary_max,description,requirements
Senior Software Engineer,Engineering,San Francisco CA,hybrid,full_time,senior,130000,170000,"Build scalable systems","5+ years Python React"
Product Manager,Product,Remote,remote,full_time,mid,100000,130000,"Lead product strategy","3+ years PM experience"`;

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          filename: 'job_upload_template.csv',
          content: csvTemplate,
        },
      }),
    });
  });

  // Mock upload detail endpoint (for progress tracking)
  await page.route('**/api/v1/bulk-job-posting/uploads/*', async (route: Route) => {
    const uploadId = route.request().url().split('/').pop();

    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        success: true,
        data: {
          id: uploadId,
          filename: 'jobs.csv',
          total_jobs: 2,
          valid_jobs: 2,
          invalid_jobs: 0,
          duplicate_jobs: 0,
          status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      }),
    });
  });

  console.log('✓ Bulk Job Posting API mocked for E2E tests');
}

/**
 * Disable API mocking (restore real API calls)
 */
export async function disableBulkJobPostingMocks(page: Page) {
  await page.unroute('**/api/v1/bulk-job-posting/**');
  console.log('✓ Bulk Job Posting API mocks disabled');
}
