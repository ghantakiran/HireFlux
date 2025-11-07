/**
 * E2E Tests: Interview Scheduling (Sprint 13-14)
 *
 * Tests interview scheduling, interviewer assignment, availability requests,
 * feedback collection, and calendar integration.
 *
 * BDD Scenarios:
 * - Scheduling interviews
 * - Assigning interviewers
 * - Rescheduling interviews
 * - Canceling interviews
 * - Requesting candidate availability
 * - Submitting interview feedback
 * - Viewing aggregated feedback
 * - Calendar integration
 */

import { test, expect, Page } from '@playwright/test';
import { mockInterviewSchedulingAPI } from './mocks/interview-scheduling.mock';

// Helper functions - Using pre-authenticated session via storageState
async function navigateToInterviewsPage(page: Page) {
  await page.goto('/employer/interviews');
  await expect(page.getByRole('heading', { name: /interview schedule/i })).toBeVisible();
}

async function navigateToApplicationPage(page: Page, applicationId: string = 'app-123') {
  await page.goto(`/employer/applications/${applicationId}`);
  await expect(page.getByRole('heading', { name: /application/i })).toBeVisible();
}

async function openScheduleInterviewModal(page: Page) {
  await page.getByRole('button', { name: /schedule interview/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: /schedule interview/i })).toBeVisible();
}

async function fillInterviewScheduleForm(page: Page, data: {
  type: string;
  date?: string;
  time?: string;
  duration?: string;
  platform?: string;
}) {
  // Select interview type
  await page.getByLabel(/interview type/i).click();
  await page.getByRole('option', { name: new RegExp(data.type, 'i') }).click();

  // Set date and time (if provided)
  if (data.date) {
    await page.getByLabel(/date/i).fill(data.date);
  }
  if (data.time) {
    await page.getByLabel(/time/i).fill(data.time);
  }

  // Set duration (if provided, default is 30 minutes)
  if (data.duration) {
    await page.getByLabel(/duration/i).fill(data.duration);
  }

  // Select meeting platform (if provided)
  if (data.platform) {
    await page.getByLabel(/meeting platform/i).click();
    await page.getByRole('option', { name: new RegExp(data.platform, 'i') }).click();
  }
}

async function selectInterviewers(page: Page, interviewers: string[]) {
  await page.getByLabel(/interviewers/i).click();

  for (const interviewer of interviewers) {
    await page.getByRole('option', { name: new RegExp(interviewer, 'i') }).click();
  }

  // Click outside to close dropdown
  await page.getByRole('dialog').click();
}

test.describe('Interview Scheduling', () => {
  // Enable API mocking for all tests
  test.beforeEach(async ({ page }) => {
    await mockInterviewSchedulingAPI(page);
  });

  test.describe('Scheduling Interviews', () => {
    test('should schedule a phone screen interview', async ({ page }) => {
      // GIVEN: A hiring manager views an application
      await navigateToApplicationPage(page);

      // WHEN: They click "Schedule Interview"
      await openScheduleInterviewModal(page);

      // AND: Fill in interview details
      await fillInterviewScheduleForm(page, {
        type: 'Phone Screen',
        date: '2025-11-15',
        time: '14:00',
        duration: '30',
        platform: 'Zoom',
      });

      // AND: Select interviewer
      await selectInterviewers(page, ['Carol Manager']);

      // AND: Submit the form
      await page.getByRole('button', { name: /schedule/i }).click();

      // THEN: Interview is created successfully
      await expect(page.getByText(/interview scheduled successfully/i)).toBeVisible();

      // AND: Interview appears in upcoming interviews
      await navigateToInterviewsPage(page);
      await expect(page.getByText(/phone screen.*john doe/i)).toBeVisible();
      await expect(page.getByText(/nov 15.*2:00 pm/i)).toBeVisible();
    });

    test('should schedule technical interview with multiple interviewers', async ({ page }) => {
      // GIVEN: A hiring manager views an application
      await navigateToApplicationPage(page);

      // WHEN: They schedule a technical interview
      await openScheduleInterviewModal(page);

      await fillInterviewScheduleForm(page, {
        type: 'Technical',
        date: '2025-11-20',
        time: '10:00',
        duration: '90',
        platform: 'Google Meet',
      });

      // AND: Select multiple interviewers
      await selectInterviewers(page, ['Carol Manager', 'Dave Recruiter']);

      await page.getByRole('button', { name: /schedule/i }).click();

      // THEN: Interview is created with all interviewers
      await expect(page.getByText(/interview scheduled successfully/i)).toBeVisible();

      // AND: All interviewers are shown
      await navigateToInterviewsPage(page);
      const interviewRow = page.getByRole('row', { name: /technical.*john doe/i });
      await expect(interviewRow.getByText(/carol manager/i)).toBeVisible();
      await expect(interviewRow.getByText(/dave recruiter/i)).toBeVisible();
    });

    test('should prevent scheduling conflicts', async ({ page }) => {
      // GIVEN: An interview already exists at 2:00 PM
      await navigateToApplicationPage(page);

      // WHEN: They try to schedule another interview at the same time
      await openScheduleInterviewModal(page);

      await fillInterviewScheduleForm(page, {
        type: 'Behavioral',
        date: '2025-11-15', // Same date as existing interview
        time: '14:00', // Same time
      });

      await selectInterviewers(page, ['Carol Manager']); // Same interviewer

      await page.getByRole('button', { name: /schedule/i }).click();

      // THEN: Conflict warning is shown
      await expect(page.getByText(/scheduling conflict/i)).toBeVisible();
      await expect(page.getByText(/carol manager.*already has.*interview.*2:00 pm/i)).toBeVisible();

      // AND: Option to proceed anyway or change time
      await expect(page.getByRole('button', { name: /change time/i })).toBeVisible();
      await expect(page.getByRole('button', { name: /proceed anyway/i })).toBeVisible();
    });
  });

  test.describe('Interview Management', () => {
    test('should view interview details', async ({ page }) => {
      // GIVEN: An interview exists
      await navigateToInterviewsPage(page);

      // WHEN: User clicks on an interview
      await page.getByRole('row', { name: /phone screen.*john doe/i }).click();

      // THEN: Interview details are shown
      await expect(page.getByRole('heading', { name: /phone screen.*john doe/i })).toBeVisible();
      await expect(page.getByText(/nov 15.*2:00 pm/i)).toBeVisible();
      await expect(page.getByText(/duration.*30 minutes/i)).toBeVisible();
      await expect(page.getByText(/zoom meeting/i)).toBeVisible();

      // AND: Interviewers are listed
      await expect(page.getByText(/interviewers:/i)).toBeVisible();
      await expect(page.getByText(/carol manager/i)).toBeVisible();

      // AND: Meeting link is shown
      await expect(page.getByText(/https:\/\/zoom\.us\/j\//i)).toBeVisible();
    });

    test('should reschedule an interview', async ({ page }) => {
      // GIVEN: An existing interview
      await navigateToInterviewsPage(page);

      // WHEN: User clicks "Reschedule"
      await page.getByRole('row', { name: /phone screen.*john doe/i })
        .getByRole('button', { name: /actions/i })
        .click();

      await page.getByRole('menuitem', { name: /reschedule/i }).click();

      // AND: Select new date/time
      await expect(page.getByRole('dialog', { name: /reschedule interview/i })).toBeVisible();
      await page.getByLabel(/new date/i).fill('2025-11-16');
      await page.getByLabel(/new time/i).fill('15:00');
      await page.getByLabel(/reason/i).fill('Candidate requested different time');

      await page.getByRole('button', { name: /confirm/i }).click();

      // THEN: Interview is rescheduled
      await expect(page.getByText(/interview rescheduled/i)).toBeVisible();
      await expect(page.getByText(/nov 16.*3:00 pm/i)).toBeVisible();

      // AND: Notification is sent to all parties
      await expect(page.getByText(/notifications sent/i)).toBeVisible();
    });

    test('should cancel an interview', async ({ page }) => {
      // GIVEN: An existing interview
      await navigateToInterviewsPage(page);

      // WHEN: User cancels the interview
      await page.getByRole('row', { name: /phone screen.*john doe/i })
        .getByRole('button', { name: /actions/i })
        .click();

      await page.getByRole('menuitem', { name: /cancel interview/i }).click();

      // AND: Provide cancellation reason
      await expect(page.getByRole('dialog', { name: /cancel interview/i })).toBeVisible();
      await page.getByLabel(/reason/i).fill('Position filled');
      await page.getByRole('button', { name: /confirm cancellation/i }).click();

      // THEN: Interview is cancelled
      await expect(page.getByText(/interview cancelled/i)).toBeVisible();

      // AND: Interview shows cancelled status
      await expect(page.getByRole('row', { name: /phone screen.*john doe/i }))
        .getByText(/cancelled/i).toBeVisible();
    });

    test('should add interviewer to existing interview', async ({ page }) => {
      // GIVEN: An interview with one interviewer
      await navigateToInterviewsPage(page);
      await page.getByRole('row', { name: /technical.*jane smith/i }).click();

      // WHEN: User adds another interviewer
      await page.getByRole('button', { name: /add interviewer/i }).click();

      await page.getByLabel(/select interviewer/i).click();
      await page.getByRole('option', { name: /eve interviewer/i }).click();

      await page.getByRole('button', { name: /add/i }).click();

      // THEN: Interviewer is added
      await expect(page.getByText(/interviewer added/i)).toBeVisible();
      await expect(page.getByText(/eve interviewer/i)).toBeVisible();
    });

    test('should remove interviewer from interview', async ({ page }) => {
      // GIVEN: An interview with multiple interviewers
      await navigateToInterviewsPage(page);
      await page.getByRole('row', { name: /technical.*jane smith/i }).click();

      // WHEN: User removes an interviewer
      await page.getByRole('row', { name: /dave recruiter/i })
        .getByRole('button', { name: /remove/i })
        .click();

      await page.getByRole('button', { name: /confirm/i }).click();

      // THEN: Interviewer is removed
      await expect(page.getByText(/interviewer removed/i)).toBeVisible();
      await expect(page.getByText(/dave recruiter/i)).not.toBeVisible();
    });
  });

  test.describe('Candidate Availability', () => {
    test('should request availability from candidate', async ({ page }) => {
      // GIVEN: An application without scheduled interview
      await navigateToApplicationPage(page, 'app-456');

      // WHEN: Recruiter requests candidate availability
      await page.getByRole('button', { name: /request availability/i }).click();

      // AND: Set deadline
      await expect(page.getByRole('dialog', { name: /request availability/i })).toBeVisible();
      await page.getByLabel(/deadline/i).fill('2025-11-12');

      await page.getByRole('button', { name: /send request/i }).click();

      // THEN: Request is sent
      await expect(page.getByText(/availability request sent/i)).toBeVisible();

      // AND: Status shows pending
      await expect(page.getByText(/waiting for.*availability/i)).toBeVisible();
    });

    test('should view submitted candidate availability', async ({ page }) => {
      // GIVEN: Candidate has submitted availability
      await navigateToApplicationPage(page, 'app-789');

      // WHEN: Recruiter views availability
      await page.getByRole('button', { name: /view availability/i }).click();

      // THEN: Time slots are displayed
      await expect(page.getByRole('dialog', { name: /candidate availability/i })).toBeVisible();
      await expect(page.getByText(/nov 10.*10:00 am - 11:00 am/i)).toBeVisible();
      await expect(page.getByText(/nov 11.*2:00 pm - 3:00 pm/i)).toBeVisible();
      await expect(page.getByText(/nov 12.*9:00 am - 10:00 am/i)).toBeVisible();

      // AND: Preferred platform is shown
      await expect(page.getByText(/preferred.*zoom/i)).toBeVisible();

      // AND: Can schedule from available slots
      await page.getByRole('button', { name: /nov 10.*10:00 am/i }).click();
      await expect(page.getByRole('dialog', { name: /schedule interview/i })).toBeVisible();
    });
  });

  test.describe('Interview Feedback', () => {
    test('should submit interview feedback with ratings', async ({ page }) => {
      // GIVEN: An interviewer completes an interview
      await navigateToInterviewsPage(page);
      await page.getByRole('row', { name: /technical.*completed/i }).click();

      // WHEN: They click "Submit Feedback"
      await page.getByRole('button', { name: /submit feedback/i }).click();

      // AND: Fill in ratings
      await expect(page.getByRole('dialog', { name: /interview feedback/i })).toBeVisible();

      await page.getByLabel(/overall rating/i).click();
      await page.getByRole('option', { name: /4 - good/i }).click();

      await page.getByLabel(/technical rating/i).click();
      await page.getByRole('option', { name: /5 - excellent/i }).click();

      await page.getByLabel(/communication rating/i).click();
      await page.getByRole('option', { name: /4 - good/i }).click();

      await page.getByLabel(/culture fit rating/i).click();
      await page.getByRole('option', { name: /3 - average/i }).click();

      // AND: Add strengths and concerns
      await page.getByLabel(/strengths/i).fill('Strong Python skills, excellent problem-solving');
      await page.getByLabel(/concerns/i).fill('Limited experience with distributed systems');

      // AND: Add notes
      await page.getByLabel(/notes/i).fill('Candidate showed great potential. Answered all technical questions thoroughly.');

      // AND: Make recommendation
      await page.getByLabel(/recommendation/i).click();
      await page.getByRole('option', { name: /yes/i }).click();

      await page.getByRole('button', { name: /submit feedback/i }).click();

      // THEN: Feedback is submitted successfully
      await expect(page.getByText(/feedback submitted/i)).toBeVisible();
    });

    test('should view aggregated feedback from multiple interviewers', async ({ page }) => {
      // GIVEN: Multiple interviewers have submitted feedback
      await navigateToApplicationPage(page, 'app-with-feedback');

      // WHEN: User views feedback summary
      await page.getByRole('tab', { name: /feedback/i }).click();

      // THEN: Aggregated ratings are shown
      await expect(page.getByRole('heading', { name: /interview feedback summary/i })).toBeVisible();
      await expect(page.getByText(/3 interviewers/i)).toBeVisible();

      await expect(page.getByText(/overall.*4\.3\/5/i)).toBeVisible();
      await expect(page.getByText(/technical.*4\.7\/5/i)).toBeVisible();
      await expect(page.getByText(/communication.*4\.0\/5/i)).toBeVisible();
      await expect(page.getByText(/culture fit.*3\.7\/5/i)).toBeVisible();

      // AND: Common strengths are highlighted
      await expect(page.getByText(/common strengths/i)).toBeVisible();
      await expect(page.getByText(/strong technical skills/i)).toBeVisible();
      await expect(page.getByText(/good problem-solving/i)).toBeVisible();

      // AND: Recommendation distribution is shown
      await expect(page.getByText(/recommendations/i)).toBeVisible();
      await expect(page.getByText(/yes.*2/i)).toBeVisible();
      await expect(page.getByText(/maybe.*1/i)).toBeVisible();
    });

    test('should edit draft feedback before submission', async ({ page }) => {
      // GIVEN: An interviewer has saved a draft
      await navigateToInterviewsPage(page);
      await page.getByRole('row', { name: /behavioral.*john doe/i }).click();

      // WHEN: They open their draft feedback
      await page.getByRole('button', { name: /edit draft/i }).click();

      // THEN: Previous values are loaded
      await expect(page.getByLabel(/overall rating/i)).toHaveValue('3');
      await expect(page.getByLabel(/notes/i)).toContainText('Draft notes');

      // WHEN: They update and submit
      await page.getByLabel(/overall rating/i).click();
      await page.getByRole('option', { name: /4 - good/i }).click();

      await page.getByRole('button', { name: /submit feedback/i }).click();

      // THEN: Feedback is submitted
      await expect(page.getByText(/feedback submitted/i)).toBeVisible();
    });
  });

  test.describe('Upcoming Interviews View', () => {
    test('should display upcoming interviews for current week', async ({ page }) => {
      // GIVEN: An interviewer navigates to interviews page
      await navigateToInterviewsPage(page);

      // WHEN: They view the upcoming interviews widget
      await page.getByRole('tab', { name: /upcoming/i }).click();

      // THEN: This week's interviews are shown
      await expect(page.getByRole('heading', { name: /upcoming interviews/i })).toBeVisible();
      await expect(page.getByText(/phone screen.*john doe.*today.*2:00 pm/i)).toBeVisible();
      await expect(page.getByText(/technical.*jane smith.*tomorrow.*10:00 am/i)).toBeVisible();

      // AND: Shows count
      await expect(page.getByText(/5 interviews.*this week/i)).toBeVisible();
    });

    test('should filter interviews by interviewer', async ({ page }) => {
      // GIVEN: An admin views all interviews
      await navigateToInterviewsPage(page);

      // WHEN: They filter by specific interviewer
      await page.getByLabel(/filter by interviewer/i).click();
      await page.getByRole('option', { name: /carol manager/i }).click();

      // THEN: Only Carol's interviews are shown
      await expect(page.getByText(/showing.*carol manager/i)).toBeVisible();
      await expect(page.getByRole('row', { name: /phone screen/i })).toBeVisible();
      await expect(page.getByRole('row', { name: /technical/i })).toBeVisible();

      // AND: Others are hidden
      await expect(page.getByRole('row', { name: /dave recruiter/i })).not.toBeVisible();
    });
  });

  test.describe('Calendar Integration', () => {
    test('should sync interview to Google Calendar', async ({ page }) => {
      // GIVEN: A scheduled interview
      await navigateToInterviewsPage(page);
      await page.getByRole('row', { name: /phone screen.*john doe/i }).click();

      // WHEN: User clicks "Add to Calendar"
      await page.getByRole('button', { name: /add to calendar/i }).click();

      // AND: Selects Google Calendar
      await page.getByRole('menuitem', { name: /google calendar/i }).click();

      // THEN: Calendar event is created
      await expect(page.getByText(/added to google calendar/i)).toBeVisible();

      // AND: Calendar icon is shown
      await expect(page.locator('[aria-label="Calendar synced"]')).toBeVisible();
    });

    test('should send calendar invites to all participants', async ({ page }) => {
      // GIVEN: A scheduled interview with multiple interviewers
      await navigateToInterviewsPage(page);
      await page.getByRole('row', { name: /technical.*jane smith/i }).click();

      // WHEN: User sends calendar invites
      await page.getByRole('button', { name: /send calendar invites/i }).click();

      // THEN: Invites are sent
      await expect(page.getByText(/calendar invites sent/i)).toBeVisible();
      await expect(page.getByText(/sent to.*candidate.*2 interviewers/i)).toBeVisible();
    });
  });
});
