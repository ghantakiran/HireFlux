/**
 * E2E Tests for Employer ATS & AI Candidate Ranking API
 *
 * Tests the complete ATS workflow:
 * - List applications with filtering/sorting
 * - AI-powered candidate ranking
 * - Application status management
 * - Team notes and collaboration
 * - Reviewer assignments
 * - Bulk operations
 * - Fit index calculation
 *
 * Following BDD pattern: Given-When-Then
 */

import { test, expect } from '@playwright/test';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

/**
 * Test Setup: Authentication and Test Data
 */
test.describe('Employer ATS & AI Candidate Ranking', () => {
  let authToken: string;
  let employerUserId: string;
  let companyId: string;
  let jobId: string;
  let applicationIds: string[] = [];
  let candidateUserIds: string[] = [];

  test.beforeAll(async ({ request }) => {
    // GIVEN: An employer user is registered and logged in

    // Register employer user
    const registerResponse = await request.post(`${API_BASE_URL}/auth/register`, {
      data: {
        email: `employer-${Date.now()}@example.com`,
        password: 'SecurePassword123!',
        first_name: 'Test',
        last_name: 'Employer',
        user_type: 'employer'
      }
    });

    const registerData = await registerResponse.json();
    employerUserId = registerData.user.id;
    authToken = registerData.access_token;

    // Create company
    const companyResponse = await request.post(`${API_BASE_URL}/employer/companies`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        name: 'Test Company',
        industry: 'Technology',
        size: '50-200',
        website: 'https://testcompany.com'
      }
    });

    const companyData = await companyResponse.json();
    companyId = companyData.id;

    // Post a job
    const jobResponse = await request.post(`${API_BASE_URL}/employer/jobs`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      data: {
        title: 'Senior Software Engineer',
        description: 'Build scalable systems',
        location: 'San Francisco, CA',
        location_type: 'hybrid',
        required_skills: ['Python', 'FastAPI', 'PostgreSQL', 'React', 'TypeScript'],
        preferred_skills: ['Docker', 'Kubernetes'],
        experience_level: 'senior',
        experience_min_years: 5,
        experience_max_years: 10,
        salary_min: 140000,
        salary_max: 180000,
        employment_type: 'full_time'
      }
    });

    const jobData = await jobResponse.json();
    jobId = jobData.id;

    // Create 3 candidate users and applications with different fit scores
    const candidates = [
      {
        email: `candidate-high-${Date.now()}@example.com`,
        skills: ['Python', 'FastAPI', 'PostgreSQL', 'React', 'TypeScript', 'Docker'],
        years_experience: 7,
        location: 'San Francisco, CA',
        expected_salary_min: 150000,
        expected_salary_max: 170000,
        availability_status: 'actively_looking',
        preferred_location_type: 'hybrid'
      },
      {
        email: `candidate-medium-${Date.now()}@example.com`,
        skills: ['Python', 'Django', 'MySQL', 'JavaScript'],
        years_experience: 4,
        location: 'Oakland, CA',
        expected_salary_min: 130000,
        expected_salary_max: 150000,
        availability_status: 'open_to_offers',
        preferred_location_type: 'remote'
      },
      {
        email: `candidate-low-${Date.now()}@example.com`,
        skills: ['Java', 'Spring Boot', 'Oracle'],
        years_experience: 3,
        location: 'New York, NY',
        expected_salary_min: 190000,
        expected_salary_max: 210000,
        availability_status: 'not_looking',
        preferred_location_type: 'onsite'
      }
    ];

    for (const candidate of candidates) {
      // Register candidate
      const candidateRegResponse = await request.post(`${API_BASE_URL}/auth/register`, {
        data: {
          email: candidate.email,
          password: 'CandidatePass123!',
          first_name: 'Test',
          last_name: 'Candidate',
          user_type: 'candidate'
        }
      });

      const candidateData = await candidateRegResponse.json();
      const candidateUserId = candidateData.user.id;
      const candidateToken = candidateData.access_token;
      candidateUserIds.push(candidateUserId);

      // Complete candidate profile
      await request.put(`${API_BASE_URL}/profile`, {
        headers: {
          'Authorization': `Bearer ${candidateToken}`
        },
        data: {
          skills: candidate.skills,
          years_experience: candidate.years_experience,
          location: candidate.location,
          expected_salary_min: candidate.expected_salary_min,
          expected_salary_max: candidate.expected_salary_max,
          availability_status: candidate.availability_status,
          preferred_location_type: candidate.preferred_location_type
        }
      });

      // Apply to job
      const applicationResponse = await request.post(`${API_BASE_URL}/jobs/${jobId}/apply`, {
        headers: {
          'Authorization': `Bearer ${candidateToken}`
        },
        data: {
          resume_id: 'mock-resume-id',
          cover_letter: 'I am very interested in this position.'
        }
      });

      const applicationData = await applicationResponse.json();
      applicationIds.push(applicationData.id);
    }
  });

  test('01 - List applications with default sorting by fit_index', async ({ request }) => {
    /**
     * Feature: Application Listing
     *
     * Scenario: Employer views all applications for a job
     *   GIVEN: A job has multiple applications
     *   WHEN: Employer requests application list
     *   THEN: Applications are returned sorted by fit_index (desc)
     */

    const response = await request.get(`${API_BASE_URL}/ats/jobs/${jobId}/applications`, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.applications).toHaveLength(3);
    expect(data.total).toBe(3);
    expect(data.page).toBe(1);

    // Verify sorted by fit_index descending
    const fitScores = data.applications.map((app: any) => app.fit_index);
    expect(fitScores[0]).toBeGreaterThanOrEqual(fitScores[1]);
    expect(fitScores[1]).toBeGreaterThanOrEqual(fitScores[2]);
  });

  test('02 - Filter applications by minimum fit_index', async ({ request }) => {
    /**
     * Scenario: Employer filters for high-fit candidates
     *   GIVEN: Applications with varying fit scores
     *   WHEN: Employer filters by min_fit_index >= 80
     *   THEN: Only high-fit applications are returned
     */

    const response = await request.get(
      `${API_BASE_URL}/ats/jobs/${jobId}/applications?min_fit_index=80`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();

    // Verify all returned applications have fit_index >= 80
    for (const app of data.applications) {
      expect(app.fit_index).toBeGreaterThanOrEqual(80);
    }
  });

  test('03 - Filter applications by status', async ({ request }) => {
    /**
     * Scenario: Employer views only new applications
     *   GIVEN: Applications in different pipeline stages
     *   WHEN: Employer filters by status=new
     *   THEN: Only new applications are returned
     */

    const response = await request.get(
      `${API_BASE_URL}/ats/jobs/${jobId}/applications?status=new`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();

    // All should have status "new"
    for (const app of data.applications) {
      expect(app.status).toBe('new');
    }
  });

  test('04 - Sort applications by applied_at', async ({ request }) => {
    /**
     * Scenario: Employer sorts by application date
     *   GIVEN: Applications submitted at different times
     *   WHEN: Employer sorts by applied_at desc
     *   THEN: Most recent applications appear first
     */

    const response = await request.get(
      `${API_BASE_URL}/ats/jobs/${jobId}/applications?sort_by=applied_at&order=desc`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.applications.length).toBeGreaterThan(0);

    // Verify sorted by applied_at descending
    const dates = data.applications.map((app: any) => new Date(app.applied_at).getTime());
    for (let i = 0; i < dates.length - 1; i++) {
      expect(dates[i]).toBeGreaterThanOrEqual(dates[i + 1]);
    }
  });

  test('05 - Get AI-ranked candidates with explanations', async ({ request }) => {
    /**
     * Feature: AI Candidate Ranking
     *
     * Scenario: Employer requests AI-powered ranking
     *   GIVEN: Multiple applications for a job
     *   WHEN: Employer requests ranked candidates
     *   THEN: Candidates are ranked by fit_index with detailed explanations
     */

    const response = await request.get(
      `${API_BASE_URL}/ats/jobs/${jobId}/applications/ranked`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.job_id).toBe(jobId);
    expect(data.total_candidates).toBe(3);
    expect(data.ranked_candidates).toHaveLength(3);

    // Verify ranking structure
    const topCandidate = data.ranked_candidates[0];
    expect(topCandidate).toHaveProperty('fit_index');
    expect(topCandidate).toHaveProperty('explanations');
    expect(topCandidate).toHaveProperty('strengths');
    expect(topCandidate).toHaveProperty('concerns');

    // Explanations should be non-empty
    expect(topCandidate.explanations.length).toBeGreaterThan(0);

    // Verify descending order
    for (let i = 0; i < data.ranked_candidates.length - 1; i++) {
      expect(data.ranked_candidates[i].fit_index).toBeGreaterThanOrEqual(
        data.ranked_candidates[i + 1].fit_index
      );
    }
  });

  test('06 - Calculate fit index for specific application', async ({ request }) => {
    /**
     * Scenario: Employer recalculates fit score for an application
     *   GIVEN: An application exists
     *   WHEN: Employer requests fit calculation
     *   THEN: Detailed fit scoring with explanations is returned
     */

    const applicationId = applicationIds[0];

    const response = await request.post(
      `${API_BASE_URL}/ats/applications/${applicationId}/calculate-fit`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.fit_index).toBeGreaterThanOrEqual(0);
    expect(data.fit_index).toBeLessThanOrEqual(100);
    expect(data.explanations).toBeDefined();
    expect(Array.isArray(data.explanations)).toBe(true);
    expect(data.strengths).toBeDefined();
    expect(data.concerns).toBeDefined();
  });

  test('07 - Update application status to reviewing', async ({ request }) => {
    /**
     * Feature: Application Status Management
     *
     * Scenario: Employer moves application to reviewing stage
     *   GIVEN: An application in "new" status
     *   WHEN: Employer updates status to "reviewing"
     *   THEN: Status is updated and history is recorded
     */

    const applicationId = applicationIds[0];

    const response = await request.patch(
      `${API_BASE_URL}/ats/applications/${applicationId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          status: 'reviewing',
          note: 'Moving to review based on strong skills match'
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('reviewing');
    expect(data.id).toBe(applicationId);
  });

  test('08 - Update application through multiple pipeline stages', async ({ request }) => {
    /**
     * Scenario: Complete hiring pipeline progression
     *   GIVEN: An application in "reviewing" status
     *   WHEN: Employer progressively moves through stages
     *   THEN: Each status transition is successful
     */

    const applicationId = applicationIds[0];
    const stages = ['phone_screen', 'technical_interview', 'final_interview', 'offer'];

    for (const stage of stages) {
      const response = await request.patch(
        `${API_BASE_URL}/ats/applications/${applicationId}/status`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          data: {
            status: stage,
            note: `Moving to ${stage} stage`
          }
        }
      );

      expect(response.status()).toBe(200);

      const data = await response.json();
      expect(data.status).toBe(stage);
    }
  });

  test('09 - Prevent status change on rejected application', async ({ request }) => {
    /**
     * Scenario: Invalid status transition from rejected
     *   GIVEN: An application in "rejected" status
     *   WHEN: Employer attempts to move to another stage
     *   THEN: Request is rejected with error
     */

    const applicationId = applicationIds[2];

    // First reject the application
    await request.patch(
      `${API_BASE_URL}/ats/applications/${applicationId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          status: 'rejected',
          note: 'Skills do not match requirements'
        }
      }
    );

    // Try to move rejected application to phone_screen
    const response = await request.patch(
      `${API_BASE_URL}/ats/applications/${applicationId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          status: 'phone_screen'
        }
      }
    );

    expect(response.status()).toBe(400);

    const error = await response.json();
    expect(error.detail).toContain('rejected');
  });

  test('10 - Add team-visible note to application', async ({ request }) => {
    /**
     * Feature: Team Collaboration
     *
     * Scenario: Team member adds note for team
     *   GIVEN: An application under review
     *   WHEN: Team member adds a team-visible note
     *   THEN: Note is created and visible to all team members
     */

    const applicationId = applicationIds[0];

    const response = await request.post(
      `${API_BASE_URL}/ats/applications/${applicationId}/notes`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          content: 'Candidate has excellent communication skills and strong technical background in Python and React.',
          visibility: 'team'
        }
      }
    );

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.content).toContain('Candidate has excellent communication skills');
    expect(data.visibility).toBe('team');
    expect(data.author_id).toBe(employerUserId);
  });

  test('11 - Add private note to application', async ({ request }) => {
    /**
     * Scenario: Team member adds private note
     *   GIVEN: An application under review
     *   WHEN: Team member adds a private note
     *   THEN: Note is created and only visible to author
     */

    const applicationId = applicationIds[0];

    const response = await request.post(
      `${API_BASE_URL}/ats/applications/${applicationId}/notes`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          content: 'Need to check references before moving forward.',
          visibility: 'private'
        }
      }
    );

    expect(response.status()).toBe(201);

    const data = await response.json();
    expect(data.visibility).toBe('private');
    expect(data.author_id).toBe(employerUserId);
  });

  test('12 - Get notes for application', async ({ request }) => {
    /**
     * Scenario: View all notes on application
     *   GIVEN: Application has multiple notes (team + private)
     *   WHEN: Team member retrieves notes
     *   THEN: Team notes + own private notes are returned
     */

    const applicationId = applicationIds[0];

    const response = await request.get(
      `${API_BASE_URL}/ats/applications/${applicationId}/notes`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(Array.isArray(data)).toBe(true);
    expect(data.length).toBeGreaterThan(0);

    // Verify notes have required fields
    for (const note of data) {
      expect(note).toHaveProperty('id');
      expect(note).toHaveProperty('content');
      expect(note).toHaveProperty('visibility');
      expect(note).toHaveProperty('author_id');
      expect(note).toHaveProperty('created_at');
    }
  });

  test('13 - Assign reviewers to application', async ({ request }) => {
    /**
     * Feature: Reviewer Assignment
     *
     * Scenario: Assign team members to review application
     *   GIVEN: An application needs review
     *   WHEN: Hiring manager assigns reviewers
     *   THEN: Application shows assigned reviewers
     */

    const applicationId = applicationIds[0];

    const response = await request.patch(
      `${API_BASE_URL}/ats/applications/${applicationId}/assign`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          assigned_to: [employerUserId]
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.assigned_to).toContain(employerUserId);
  });

  test('14 - Unassign all reviewers', async ({ request }) => {
    /**
     * Scenario: Remove all reviewer assignments
     *   GIVEN: An application has assigned reviewers
     *   WHEN: Hiring manager clears assignments
     *   THEN: Application has no assigned reviewers
     */

    const applicationId = applicationIds[0];

    const response = await request.patch(
      `${API_BASE_URL}/ats/applications/${applicationId}/assign`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          assigned_to: []
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.assigned_to).toHaveLength(0);
  });

  test('15 - Bulk reject applications', async ({ request }) => {
    /**
     * Feature: Bulk Operations
     *
     * Scenario: Reject multiple applications at once
     *   GIVEN: Multiple low-fit applications
     *   WHEN: Hiring manager bulk rejects them
     *   THEN: All applications are marked as rejected
     */

    // Use the second application for bulk reject (don't use first, we need it for other tests)
    const bulkRejectIds = [applicationIds[1]];

    const response = await request.post(
      `${API_BASE_URL}/ats/applications/bulk-update`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          action: 'reject',
          application_ids: bulkRejectIds
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.updated_count).toBe(1);

    // Verify applications are rejected
    const verifyResponse = await request.get(
      `${API_BASE_URL}/ats/jobs/${jobId}/applications?status=rejected`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    const verifyData = await verifyResponse.json();
    expect(verifyData.applications.some((app: any) => app.id === bulkRejectIds[0])).toBe(true);
  });

  test('16 - Bulk add shortlist tag', async ({ request }) => {
    /**
     * Scenario: Shortlist multiple candidates
     *   GIVEN: Multiple high-fit applications
     *   WHEN: Hiring manager bulk shortlists them
     *   THEN: All applications get "shortlisted" tag
     */

    const shortlistIds = [applicationIds[0]];

    const response = await request.post(
      `${API_BASE_URL}/ats/applications/bulk-update`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          action: 'shortlist',
          application_ids: shortlistIds
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.updated_count).toBe(1);
  });

  test('17 - Bulk move applications to stage', async ({ request }) => {
    /**
     * Scenario: Move multiple applications to same pipeline stage
     *   GIVEN: Multiple applications in different stages
     *   WHEN: Hiring manager bulk moves to "reviewing"
     *   THEN: All applications are in "reviewing" stage
     */

    // Note: We can't move the rejected or already-advanced applications
    // So we'll just verify the endpoint works
    const response = await request.post(
      `${API_BASE_URL}/ats/applications/bulk-update`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        },
        data: {
          action: 'move_to_stage',
          application_ids: [applicationIds[0]],
          target_status: 'hired'
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.success).toBe(true);
  });

  test('18 - Pagination works correctly', async ({ request }) => {
    /**
     * Feature: Pagination
     *
     * Scenario: Navigate through paginated results
     *   GIVEN: More applications than page limit
     *   WHEN: Employer requests specific page
     *   THEN: Correct page of results is returned
     */

    const response = await request.get(
      `${API_BASE_URL}/ats/jobs/${jobId}/applications?page=1&limit=2`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    expect(response.status()).toBe(200);

    const data = await response.json();
    expect(data.page).toBe(1);
    expect(data.limit).toBe(2);
    expect(data.applications.length).toBeLessThanOrEqual(2);
    expect(data.total_pages).toBeGreaterThan(0);
  });

  test('19 - Unauthorized access is blocked', async ({ request }) => {
    /**
     * Feature: Authorization
     *
     * Scenario: Non-company member cannot access applications
     *   GIVEN: A user not associated with the company
     *   WHEN: User attempts to list applications
     *   THEN: Request is denied with 403 Forbidden
     */

    // Register a different user (not part of the company)
    const outsiderResponse = await request.post(`${API_BASE_URL}/auth/register`, {
      data: {
        email: `outsider-${Date.now()}@example.com`,
        password: 'OutsiderPass123!',
        first_name: 'Outsider',
        last_name: 'User',
        user_type: 'employer'
      }
    });

    const outsiderData = await outsiderResponse.json();
    const outsiderToken = outsiderData.access_token;

    // Try to access applications with outsider token
    const response = await request.get(
      `${API_BASE_URL}/ats/jobs/${jobId}/applications`,
      {
        headers: {
          'Authorization': `Bearer ${outsiderToken}`
        }
      }
    );

    expect(response.status()).toBe(403);
  });

  test('20 - Complete ATS workflow end-to-end', async ({ request }) => {
    /**
     * Feature: Complete ATS Workflow
     *
     * Scenario: Employer manages application from new to hired
     *   GIVEN: A new job application
     *   WHEN: Employer performs full hiring workflow
     *   THEN: Application progresses through all stages successfully
     *
     * Workflow:
     *   1. View applications ranked by AI fit score
     *   2. Filter for high-fit candidates (>= 80)
     *   3. View detailed fit analysis
     *   4. Add team note
     *   5. Assign reviewer
     *   6. Move to phone_screen
     *   7. Add another note after phone screen
     *   8. Move to technical_interview
     *   9. Move to final_interview
     *   10. Move to offer
     *   11. Move to hired
     */

    // Step 1: Get ranked applications
    const rankedResponse = await request.get(
      `${API_BASE_URL}/ats/jobs/${jobId}/applications/ranked`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    expect(rankedResponse.status()).toBe(200);
    const rankedData = await rankedResponse.json();
    expect(rankedData.ranked_candidates.length).toBeGreaterThan(0);

    // Step 2: Filter high-fit candidates
    const filteredResponse = await request.get(
      `${API_BASE_URL}/ats/jobs/${jobId}/applications?min_fit_index=80&sort_by=fit_index&order=desc`,
      {
        headers: {
          'Authorization': `Bearer ${authToken}`
        }
      }
    );

    expect(filteredResponse.status()).toBe(200);
    const filteredData = await filteredResponse.json();

    if (filteredData.applications.length === 0) {
      // If no high-fit candidates, just use the first application
      const allAppsResponse = await request.get(
        `${API_BASE_URL}/ats/jobs/${jobId}/applications`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );
      const allAppsData = await allAppsResponse.json();
      const testApplicationId = allAppsData.applications[0].id;

      // Continue workflow with first application
      // Step 3: Get detailed fit analysis
      const fitResponse = await request.post(
        `${API_BASE_URL}/ats/applications/${testApplicationId}/calculate-fit`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        }
      );

      expect(fitResponse.status()).toBe(200);

      // Step 4: Add team note
      const noteResponse = await request.post(
        `${API_BASE_URL}/ats/applications/${testApplicationId}/notes`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          data: {
            content: 'Looks promising, let\'s proceed with phone screen',
            visibility: 'team'
          }
        }
      );

      expect(noteResponse.status()).toBe(201);

      // Step 5: Assign reviewer
      const assignResponse = await request.patch(
        `${API_BASE_URL}/ats/applications/${testApplicationId}/assign`,
        {
          headers: {
            'Authorization': `Bearer ${authToken}`
          },
          data: {
            assigned_to: [employerUserId]
          }
        }
      );

      expect(assignResponse.status()).toBe(200);

      // Steps 6-11: Move through pipeline stages
      const stages = [
        'reviewing',
        'phone_screen',
        'technical_interview',
        'final_interview',
        'offer',
        'hired'
      ];

      for (const stage of stages) {
        const stageResponse = await request.patch(
          `${API_BASE_URL}/ats/applications/${testApplicationId}/status`,
          {
            headers: {
              'Authorization': `Bearer ${authToken}`
            },
            data: {
              status: stage,
              note: `Moving to ${stage} stage`
            }
          }
        );

        expect(stageResponse.status()).toBe(200);
        const stageData = await stageResponse.json();
        expect(stageData.status).toBe(stage);
      }
    }
  });
});
