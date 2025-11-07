/**
 * Mock API Handlers for Interview Scheduling (Sprint 13-14)
 *
 * Purpose: Enable E2E testing without running backend server
 * Following TDD/BDD: Tests exist (written first), now making them pass with mocks
 *
 * Mock responses match backend API contract from backend/app/api/v1/endpoints/interviews.py
 */

import { Page, Route } from '@playwright/test';

export interface Interview {
  id: string;
  application_id: string;
  user_id: string;
  interview_type: string;
  interview_round: number;
  scheduled_at: string;
  duration_minutes: number;
  timezone: string;
  meeting_platform: string | null;
  meeting_link: string | null;
  location: string | null;
  interviewer_ids: string[];
  status: 'scheduled' | 'confirmed' | 'rescheduled' | 'completed' | 'cancelled' | 'no_show';
  confirmation_status: 'pending' | 'confirmed' | 'declined';
  reminder_sent: boolean;
  calendar_event_id: string | null;
  calendar_invite_sent: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  candidate_name: string;
  candidate_email: string;
  job_title: string;
}

export interface InterviewFeedback {
  id: string;
  interview_id: string;
  interviewer_id: string;
  application_id: string;
  overall_rating: number | null;
  technical_rating: number | null;
  communication_rating: number | null;
  culture_fit_rating: number | null;
  strengths: string[];
  concerns: string[];
  notes: string | null;
  recommendation: string | null;
  next_steps: string | null;
  is_submitted: boolean;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  interviewer_name: string;
  interviewer_email: string;
}

export interface CandidateAvailability {
  id: string;
  application_id: string;
  candidate_id: string;
  available_slots: Array<{ start: string; end: string }>;
  timezone: string;
  preferred_platform: string | null;
  notes: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

// Mock data
const mockInterviews: Interview[] = [
  {
    id: 'interview-1',
    application_id: 'app-123',
    user_id: 'user-123',
    interview_type: 'phone_screen',
    interview_round: 1,
    scheduled_at: '2025-11-15T14:00:00Z',
    duration_minutes: 30,
    timezone: 'America/New_York',
    meeting_platform: 'zoom',
    meeting_link: 'https://zoom.us/j/1234567890',
    location: null,
    interviewer_ids: ['member-3'],
    status: 'scheduled',
    confirmation_status: 'pending',
    reminder_sent: false,
    calendar_event_id: null,
    calendar_invite_sent: false,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    candidate_name: 'John Doe',
    candidate_email: 'john@example.com',
    job_title: 'Senior Software Engineer',
  },
  {
    id: 'interview-2',
    application_id: 'app-456',
    user_id: 'user-456',
    interview_type: 'technical',
    interview_round: 2,
    scheduled_at: '2025-11-20T10:00:00Z',
    duration_minutes: 90,
    timezone: 'America/New_York',
    meeting_platform: 'google_meet',
    meeting_link: 'https://meet.google.com/abc-defg-hij',
    location: null,
    interviewer_ids: ['member-3', 'member-4'],
    status: 'scheduled',
    confirmation_status: 'confirmed',
    reminder_sent: false,
    calendar_event_id: 'gcal-event-123',
    calendar_invite_sent: true,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    candidate_name: 'Jane Smith',
    candidate_email: 'jane@example.com',
    job_title: 'Product Manager',
  },
  {
    id: 'interview-3',
    application_id: 'app-789',
    user_id: 'user-789',
    interview_type: 'behavioral',
    interview_round: 1,
    scheduled_at: '2025-11-18T15:00:00Z',
    duration_minutes: 45,
    timezone: 'America/New_York',
    meeting_platform: 'zoom',
    meeting_link: 'https://zoom.us/j/9876543210',
    location: null,
    interviewer_ids: ['member-3'],
    status: 'completed',
    confirmation_status: 'confirmed',
    reminder_sent: true,
    calendar_event_id: null,
    calendar_invite_sent: false,
    completed_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 172800000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    candidate_name: 'John Doe',
    candidate_email: 'john@example.com',
    job_title: 'Senior Software Engineer',
  },
];

const mockFeedback: InterviewFeedback[] = [
  {
    id: 'feedback-1',
    interview_id: 'interview-3',
    interviewer_id: 'member-3',
    application_id: 'app-789',
    overall_rating: 4,
    technical_rating: 5,
    communication_rating: 4,
    culture_fit_rating: 3,
    strengths: ['Strong Python skills', 'Excellent problem-solving'],
    concerns: ['Limited distributed systems experience'],
    notes: 'Candidate showed great potential.',
    recommendation: 'yes',
    next_steps: 'Move to technical round',
    is_submitted: true,
    submitted_at: new Date(Date.now() - 86400000).toISOString(),
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
    interviewer_name: 'Carol Manager',
    interviewer_email: 'manager@company.com',
  },
];

const mockAvailability: CandidateAvailability = {
  id: 'avail-1',
  application_id: 'app-789',
  candidate_id: 'user-789',
  available_slots: [
    { start: '2025-11-10T14:00:00Z', end: '2025-11-10T15:00:00Z' },
    { start: '2025-11-11T18:00:00Z', end: '2025-11-11T19:00:00Z' },
    { start: '2025-11-12T13:00:00Z', end: '2025-11-12T14:00:00Z' },
  ],
  timezone: 'America/New_York',
  preferred_platform: 'zoom',
  notes: 'Prefer morning slots if possible',
  expires_at: new Date(Date.now() + 604800000).toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

/**
 * Enable API mocking for interview scheduling endpoints
 */
export async function mockInterviewSchedulingAPI(page: Page) {
  // Mock POST /api/v1/employer/interviews - Schedule interview
  await page.route('**/api/v1/employer/interviews', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');

      // Check for scheduling conflicts
      const conflictingInterview = mockInterviews.find(
        i =>
          i.scheduled_at === body.scheduled_at &&
          i.interviewer_ids.some(id => body.interviewer_ids.includes(id))
      );

      if (conflictingInterview) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: `Scheduling conflict: ${conflictingInterview.candidate_name} already has an interview at ${body.scheduled_at}`,
            conflict: conflictingInterview,
          }),
        });
        return;
      }

      // Create new interview
      const newInterview: Interview = {
        id: `interview-${Date.now()}`,
        application_id: body.application_id,
        user_id: 'user-current',
        interview_type: body.interview_type,
        interview_round: body.interview_round || 1,
        scheduled_at: body.scheduled_at,
        duration_minutes: body.duration_minutes || 30,
        timezone: body.timezone || 'UTC',
        meeting_platform: body.meeting_platform || null,
        meeting_link: body.meeting_link || null,
        location: body.location || null,
        interviewer_ids: body.interviewer_ids || [],
        status: 'scheduled',
        confirmation_status: 'pending',
        reminder_sent: false,
        calendar_event_id: null,
        calendar_invite_sent: false,
        completed_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        candidate_name: 'John Doe',
        candidate_email: 'john@example.com',
        job_title: 'Senior Software Engineer',
      };

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newInterview),
      });
    }
    // GET request - list interviews
    else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          interviews: mockInterviews,
          total: mockInterviews.length,
          filtered_total: mockInterviews.length,
        }),
      });
    }
  });

  // Mock GET /api/v1/employer/interviews/upcoming - Get upcoming interviews
  await page.route('**/api/v1/employer/interviews/upcoming*', async (route: Route) => {
    if (route.request().method() === 'GET') {
      const upcomingInterviews = mockInterviews.filter(
        i => new Date(i.scheduled_at) > new Date() && i.status === 'scheduled'
      );

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(upcomingInterviews),
      });
    }
  });

  // Mock GET /api/v1/employer/interviews/{id} - Get interview details
  await page.route('**/api/v1/employer/interviews/*', async (route: Route) => {
    const url = route.request().url();
    const interviewId = url.split('/').pop()?.split('?')[0];

    if (route.request().method() === 'GET' && !url.includes('/feedback') && !url.includes('/assign')) {
      const interview = mockInterviews.find(i => i.id === interviewId);

      if (!interview) {
        await route.fulfill({
          status: 404,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Interview not found' }),
        });
        return;
      }

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(interview),
      });
    }
  });

  // Mock POST /api/v1/employer/interviews/{id}/reschedule - Reschedule interview
  await page.route('**/api/v1/employer/interviews/*/reschedule', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const interview = { ...mockInterviews[0] };
      interview.scheduled_at = body.new_time;
      interview.status = 'rescheduled';
      interview.updated_at = new Date().toISOString();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(interview),
      });
    }
  });

  // Mock DELETE /api/v1/employer/interviews/{id} - Cancel interview
  await page.route('**/api/v1/employer/interviews/*', async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 204,
        body: '',
      });
    }
  });

  // Mock POST /api/v1/employer/interviews/{id}/assign - Assign interviewers
  await page.route('**/api/v1/employer/interviews/*/assign', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const interview = { ...mockInterviews[1] };
      interview.interviewer_ids = [...interview.interviewer_ids, ...body.interviewer_ids];
      interview.updated_at = new Date().toISOString();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(interview),
      });
    }
  });

  // Mock POST /api/v1/employer/interviews/{id}/feedback - Submit feedback
  await page.route('**/api/v1/employer/interviews/*/feedback', async (route: Route) => {
    const url = route.request().url();

    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');
      const interviewId = url.split('/').slice(-2)[0];

      const newFeedback: InterviewFeedback = {
        id: `feedback-${Date.now()}`,
        interview_id: interviewId,
        interviewer_id: 'member-current',
        application_id: body.interview_id,
        overall_rating: body.overall_rating || null,
        technical_rating: body.technical_rating || null,
        communication_rating: body.communication_rating || null,
        culture_fit_rating: body.culture_fit_rating || null,
        strengths: body.strengths || [],
        concerns: body.concerns || [],
        notes: body.notes || null,
        recommendation: body.recommendation || null,
        next_steps: body.next_steps || null,
        is_submitted: true,
        submitted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        interviewer_name: 'Current User',
        interviewer_email: 'current@company.com',
      };

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newFeedback),
      });
    }
    // GET request - get feedback
    else if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockFeedback),
      });
    }
  });

  // Mock POST /api/v1/employer/applications/{id}/request-availability - Request availability
  await page.route('**/api/v1/employer/applications/*/request-availability', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Availability request sent to candidate',
        }),
      });
    }
  });

  // Mock GET /api/v1/employer/applications/{id}/availability - Get availability
  await page.route('**/api/v1/employer/applications/*/availability', async (route: Route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockAvailability),
      });
    }
  });

  // Mock GET /api/v1/employer/interviews/applications/{id}/feedback/aggregated - Get aggregated feedback
  await page.route('**/api/v1/employer/interviews/applications/*/feedback/aggregated', async (route: Route) => {
    if (route.request().method() === 'GET') {
      const aggregated = {
        application_id: 'app-with-feedback',
        total_feedbacks: 3,
        average_overall_rating: 4.3,
        average_technical_rating: 4.7,
        average_communication_rating: 4.0,
        average_culture_fit_rating: 3.7,
        recommendations: {
          yes: 2,
          maybe: 1,
        },
        common_strengths: ['Strong technical skills', 'Good problem-solving'],
        common_concerns: ['Limited experience in some areas'],
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(aggregated),
      });
    }
  });

  // Mock POST /api/v1/employer/interviews/{id}/calendar/sync - Sync to calendar
  await page.route('**/api/v1/employer/interviews/*/calendar/sync', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          interview_id: 'interview-1',
          calendar_event_id: 'gcal-event-new-123',
          platform: 'google',
          synced_at: new Date().toISOString(),
        }),
      });
    }
  });

  // Mock POST /api/v1/employer/interviews/{id}/calendar/invite - Send calendar invite
  await page.route('**/api/v1/employer/interviews/*/calendar/invite', async (route: Route) => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Calendar invites sent successfully',
          recipients: ['candidate', 'interviewer1', 'interviewer2'],
        }),
      });
    }
  });
}
