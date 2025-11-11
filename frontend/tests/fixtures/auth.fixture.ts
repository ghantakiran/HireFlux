/**
 * Playwright Authentication Fixture
 * Mocks backend API responses for E2E testing
 */

import { test as base, expect } from '@playwright/test';

export const test = base.extend({
  page: async ({ page }, use) => {
    // Mock authentication API
    await page.route('**/api/v1/employer/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: 'mock-jwt-token-12345',
          refresh_token: 'mock-refresh-token-12345',
          token_type: 'bearer',
          expires_in: 3600,
          user: {
            id: 'user-123',
            email: 'owner@testcompany.com',
            company_id: 'company-123',
            role: 'owner',
          },
        }),
      });
    });

    // Mock assessments list API
    await page.route('**/api/v1/employer/assessments', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            assessments: [
              {
                id: 'assessment-123',
                title: 'Senior Backend Engineer Screening',
                description: 'Technical assessment for backend positions',
                assessment_type: 'technical',
                status: 'published',
                total_attempts: 45,
                avg_score: 76,
                pass_rate: 68,
                time_limit_minutes: 90,
                created_at: new Date().toISOString(),
              },
            ],
            total: 1,
          }),
        });
      } else if (route.request().method() === 'POST') {
        // Mock create assessment
        const requestBody = route.request().postDataJSON();
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'new-assessment-' + Date.now(),
            ...requestBody,
            status: 'draft',
            created_at: new Date().toISOString(),
          }),
        });
      }
    });

    // Mock assessment detail API
    await page.route('**/api/v1/employer/assessments/*', async (route) => {
      const url = route.request().url();
      const assessmentId = url.split('/').pop();

      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: assessmentId,
            title: 'Senior Backend Engineer Screening',
            description: 'Technical assessment for backend positions',
            assessment_type: 'technical',
            status: 'published',
            time_limit_minutes: 90,
            passing_score_percentage: 70,
            randomize_questions: false,
            enable_proctoring: true,
            track_tab_switches: true,
            max_tab_switches: 3,
            track_ip_changes: false,
            created_at: new Date().toISOString(),
            questions: [
              {
                id: 'q1',
                question_text: 'What is the time complexity of binary search?',
                question_type: 'mcq_single',
                options: ['O(n)', 'O(log n)', 'O(n^2)', 'O(1)'],
                correct_answers: ['O(log n)'],
                points: 10,
                difficulty: 'medium',
                category: 'Algorithms',
                display_order: 1,
              },
            ],
          }),
        });
      } else if (route.request().method() === 'PUT') {
        // Mock update assessment
        const requestBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            id: assessmentId,
            ...requestBody,
            updated_at: new Date().toISOString(),
          }),
        });
      }
    });

    // Mock add question API
    await page.route('**/api/v1/employer/assessments/*/questions', async (route) => {
      const requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'q-' + Date.now(),
          ...requestBody,
          created_at: new Date().toISOString(),
        }),
      });
    });

    await use(page);
  },
});

export { expect };
