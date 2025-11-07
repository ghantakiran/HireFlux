/**
 * E2E Tests: Team Collaboration & RBAC (Sprint 13-14)
 *
 * Tests team member invitations, role management, permissions,
 * activity tracking, and collaboration features.
 *
 * BDD Scenarios:
 * - Sending team invitations
 * - Accepting invitations
 * - Managing team member roles
 * - Suspending and reactivating members
 * - Removing team members
 * - Viewing activity feed
 * - Permission enforcement
 * - Resending/revoking invitations
 */

import { test, expect, Page } from '@playwright/test';
import { mockTeamCollaborationAPI } from './mocks/team-collaboration.mock';

// Helper functions - Using pre-authenticated session via storageState
async function navigateToTeamPage(page: Page) {
  await page.goto('/employer/team');
  await expect(page.getByRole('heading', { name: /team management/i })).toBeVisible();
}

async function openInviteMemberModal(page: Page) {
  await page.getByRole('button', { name: /invite member/i }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('heading', { name: /invite team member/i })).toBeVisible();
}

async function fillInviteForm(page: Page, email: string, role: string) {
  await page.getByLabel(/email address/i).fill(email);
  await page.getByLabel(/role/i).click();
  await page.getByRole('option', { name: new RegExp(role, 'i') }).click();
}

async function submitInvite(page: Page) {
  await page.getByRole('button', { name: /send invitation/i }).click();
}

test.describe('Team Collaboration', () => {
  // Enable API mocking for all tests
  test.beforeEach(async ({ page }) => {
    await mockTeamCollaborationAPI(page);
  });

  test.describe('Team Invitations', () => {
    test('should invite a new team member as Hiring Manager', async ({ page }) => {
      // GIVEN: An employer (owner/admin) on the team management page
      await navigateToTeamPage(page);

      // WHEN: They click "Invite Member"
      await openInviteMemberModal(page);

      // AND: Fill in the invite form
      await fillInviteForm(page, 'recruiter@company.com', 'Hiring Manager');

      // AND: Submit the invitation
      await submitInvite(page);

      // THEN: Invitation is sent successfully
      await expect(page.getByText(/invitation sent successfully/i)).toBeVisible();

      // AND: The invitation appears in pending invitations section
      await expect(page.getByText('recruiter@company.com')).toBeVisible();
      await expect(page.getByText(/hiring manager/i)).toBeVisible();
      await expect(page.getByText(/pending/i)).toBeVisible();
    });

    test('should prevent duplicate invitation to existing member', async ({ page }) => {
      // GIVEN: An employer on the team management page
      await navigateToTeamPage(page);

      // WHEN: They try to invite an existing team member
      await openInviteMemberModal(page);
      await fillInviteForm(page, 'existing@company.com', 'Recruiter');
      await submitInvite(page);

      // THEN: Error message is shown
      await expect(page.getByText(/already a member/i)).toBeVisible();
      await expect(page.getByRole('dialog')).toBeVisible(); // Modal stays open
    });

    test('should validate team size limits on free plan', async ({ page }) => {
      // GIVEN: A company on the free Starter plan (max 3 members)
      await navigateToTeamPage(page);

      // WHEN: They try to invite a 4th member
      await openInviteMemberModal(page);
      await fillInviteForm(page, 'fourth@company.com', 'Viewer');
      await submitInvite(page);

      // THEN: Error message is shown
      await expect(page.getByText(/upgrade.*plan.*invite more members/i)).toBeVisible();

      // AND: Upgrade link is provided
      await expect(page.getByRole('link', { name: /upgrade/i })).toBeVisible();
    });

    test('should resend invitation email', async ({ page }) => {
      // GIVEN: A pending invitation exists
      await navigateToTeamPage(page);
      await expect(page.getByText('pending@company.com')).toBeVisible();

      // WHEN: Admin clicks "Resend" on the invitation
      await page.getByRole('row', { name: /pending@company\.com/i })
        .getByRole('button', { name: /resend/i })
        .click();

      // THEN: Confirmation message is shown
      await expect(page.getByText(/invitation resent/i)).toBeVisible();
    });

    test('should revoke pending invitation', async ({ page }) => {
      // GIVEN: A pending invitation exists
      await navigateToTeamPage(page);
      await expect(page.getByText('revokeme@company.com')).toBeVisible();

      // WHEN: Admin clicks "Revoke" on the invitation
      await page.getByRole('row', { name: /revokeme@company\.com/i })
        .getByRole('button', { name: /revoke/i })
        .click();

      // AND: Confirms the revocation
      await page.getByRole('button', { name: /confirm/i }).click();

      // THEN: Invitation is removed from the list
      await expect(page.getByText('revokeme@company.com')).not.toBeVisible();
      await expect(page.getByText(/invitation revoked/i)).toBeVisible();
    });
  });

  test.describe('Team Member Management', () => {
    test('should display all active team members with roles', async ({ page }) => {
      // GIVEN: An employer navigates to team page
      await navigateToTeamPage(page);

      // THEN: All team members are visible
      await expect(page.getByText('owner@company.com')).toBeVisible();
      await expect(page.getByText('admin@company.com')).toBeVisible();
      await expect(page.getByText('manager@company.com')).toBeVisible();

      // AND: Roles are displayed
      await expect(page.getByRole('row', { name: /owner@company\.com/i }))
        .getByText(/owner/i).toBeVisible();
      await expect(page.getByRole('row', { name: /admin@company\.com/i }))
        .getByText(/admin/i).toBeVisible();
    });

    test('should update team member role from Recruiter to Hiring Manager', async ({ page }) => {
      // GIVEN: An admin views a recruiter's profile
      await navigateToTeamPage(page);

      // WHEN: They click "Change Role" on the recruiter
      await page.getByRole('row', { name: /recruiter@company\.com/i })
        .getByRole('button', { name: /actions/i })
        .click();

      await page.getByRole('menuitem', { name: /change role/i }).click();

      // AND: Select new role
      await page.getByLabel(/new role/i).click();
      await page.getByRole('option', { name: /hiring manager/i }).click();

      // AND: Confirm the change
      await page.getByRole('button', { name: /update role/i }).click();

      // THEN: Role is updated successfully
      await expect(page.getByText(/role updated.*hiring manager/i)).toBeVisible();
      await expect(page.getByRole('row', { name: /recruiter@company\.com/i }))
        .getByText(/hiring manager/i).toBeVisible();
    });

    test('should prevent changing own role', async ({ page }) => {
      // GIVEN: An admin views their own profile
      await navigateToTeamPage(page);

      // WHEN: They try to change their own role
      const ownRow = page.getByRole('row', { name: /admin@company\.com.*\(you\)/i });
      await ownRow.getByRole('button', { name: /actions/i }).click();

      // THEN: "Change Role" option is disabled or not visible
      await expect(page.getByRole('menuitem', { name: /change role/i }))
        .toBeDisabled();
    });

    test('should suspend team member', async ({ page }) => {
      // GIVEN: An admin views a team member
      await navigateToTeamPage(page);

      // WHEN: They suspend the member
      await page.getByRole('row', { name: /suspend-me@company\.com/i })
        .getByRole('button', { name: /actions/i })
        .click();

      await page.getByRole('menuitem', { name: /suspend/i }).click();

      // AND: Confirm suspension
      await page.getByRole('button', { name: /confirm/i }).click();

      // THEN: Member is suspended
      await expect(page.getByText(/member suspended/i)).toBeVisible();
      await expect(page.getByRole('row', { name: /suspend-me@company\.com/i }))
        .getByText(/suspended/i).toBeVisible();
    });

    test('should reactivate suspended member', async ({ page }) => {
      // GIVEN: A suspended member exists
      await navigateToTeamPage(page);

      // AND: Show suspended members
      await page.getByRole('checkbox', { name: /show suspended/i }).check();

      // WHEN: Admin clicks "Reactivate"
      await page.getByRole('row', { name: /suspended@company\.com/i })
        .getByRole('button', { name: /actions/i })
        .click();

      await page.getByRole('menuitem', { name: /reactivate/i }).click();

      // THEN: Member is reactivated
      await expect(page.getByText(/member reactivated/i)).toBeVisible();
      await expect(page.getByRole('row', { name: /suspended@company\.com/i }))
        .getByText(/active/i).toBeVisible();
    });

    test('should remove team member permanently', async ({ page }) => {
      // GIVEN: An admin views a team member
      await navigateToTeamPage(page);

      // WHEN: They remove the member
      await page.getByRole('row', { name: /remove-me@company\.com/i })
        .getByRole('button', { name: /actions/i })
        .click();

      await page.getByRole('menuitem', { name: /remove/i }).click();

      // AND: Confirm removal (with warning)
      await expect(page.getByText(/permanently remove/i)).toBeVisible();
      await page.getByRole('button', { name: /confirm removal/i }).click();

      // THEN: Member is removed
      await expect(page.getByText(/member removed/i)).toBeVisible();
      await expect(page.getByText('remove-me@company.com')).not.toBeVisible();
    });
  });

  test.describe('Activity Feed', () => {
    test('should display team activity feed with recent actions', async ({ page }) => {
      // GIVEN: An employer navigates to team page
      await navigateToTeamPage(page);

      // WHEN: They view the activity feed
      await page.getByRole('tab', { name: /activity/i }).click();

      // THEN: Recent activities are displayed
      await expect(page.getByText(/job posted.*senior engineer/i)).toBeVisible();
      await expect(page.getByText(/application reviewed/i)).toBeVisible();
      await expect(page.getByText(/interview scheduled/i)).toBeVisible();

      // AND: Activities show who performed them
      await expect(page.getByText(/manager@company\.com/i)).toBeVisible();

      // AND: Timestamps are shown
      await expect(page.getByText(/2 hours ago/i)).toBeVisible();
    });

    test('should filter activity by time range', async ({ page }) => {
      // GIVEN: An employer views the activity feed
      await navigateToTeamPage(page);
      await page.getByRole('tab', { name: /activity/i }).click();

      // WHEN: They select "Last 7 days" filter
      await page.getByLabel(/time range/i).click();
      await page.getByRole('option', { name: /last 7 days/i }).click();

      // THEN: Only activities from last 7 days are shown
      await expect(page.getByText(/showing.*last 7 days/i)).toBeVisible();

      // AND: Future date activities are not shown
      await expect(page.getByText(/30 days ago/i)).not.toBeVisible();
    });

    test('should view specific member activity history', async ({ page }) => {
      // GIVEN: An admin views team members
      await navigateToTeamPage(page);

      // WHEN: They click on a member to view their activity
      await page.getByRole('row', { name: /manager@company\.com/i })
        .getByRole('button', { name: /view activity/i })
        .click();

      // THEN: Member's activity history is shown
      await expect(page.getByRole('heading', { name: /activity.*manager@company\.com/i })).toBeVisible();
      await expect(page.getByText(/posted 5 jobs/i)).toBeVisible();
      await expect(page.getByText(/reviewed 12 applications/i)).toBeVisible();
    });
  });

  test.describe('Permissions & RBAC', () => {
    test('should display current user permissions', async ({ page }) => {
      // GIVEN: An employer navigates to team page
      await navigateToTeamPage(page);

      // WHEN: They view the permissions tab
      await page.getByRole('tab', { name: /permissions/i }).click();

      // THEN: Their role-based permissions are displayed
      await expect(page.getByRole('heading', { name: /your permissions/i })).toBeVisible();
      await expect(page.getByText(/role:.*admin/i)).toBeVisible();

      // AND: Permission matrix is shown
      await expect(page.getByText(/manage team/i)).toBeVisible();
      await expect(page.getByText(/post jobs/i)).toBeVisible();
      await expect(page.getByText(/view all candidates/i)).toBeVisible();

      // AND: Checkmarks indicate granted permissions
      const manageTeamRow = page.getByRole('row', { name: /manage team/i });
      await expect(manageTeamRow.locator('[aria-label="Allowed"]')).toBeVisible();
    });

    test('should enforce Viewer role cannot invite members', async ({ page }) => {
      // GIVEN: A user with Viewer role
      await navigateToTeamPage(page);

      // THEN: "Invite Member" button is not visible
      await expect(page.getByRole('button', { name: /invite member/i })).not.toBeVisible();

      // AND: Message indicates limited permissions
      await expect(page.getByText(/view-only access/i)).toBeVisible();
    });

    test('should enforce Recruiter cannot change member roles', async ({ page }) => {
      // GIVEN: A user with Recruiter role
      await navigateToTeamPage(page);

      // WHEN: They view team members
      const memberRow = page.getByRole('row', { name: /manager@company\.com/i });

      // THEN: "Change Role" action is not available
      await memberRow.getByRole('button', { name: /actions/i }).click();
      await expect(page.getByRole('menuitem', { name: /change role/i })).not.toBeVisible();
    });
  });

  test.describe('Invitation Acceptance Flow', () => {
    test('should accept team invitation via email link', async ({ page, context }) => {
      // GIVEN: A user receives an invitation email with token
      const invitationToken = 'mock-secure-invitation-token-64-chars';

      // WHEN: They click the invitation link
      await page.goto(`/employer/team/accept/${invitationToken}`);

      // THEN: Invitation details are shown
      await expect(page.getByRole('heading', { name: /join.*acme corp/i })).toBeVisible();
      await expect(page.getByText(/role.*hiring manager/i)).toBeVisible();
      await expect(page.getByText(/invited by.*owner@company\.com/i)).toBeVisible();

      // WHEN: They click "Accept Invitation"
      await page.getByRole('button', { name: /accept invitation/i }).click();

      // THEN: They are added to the team
      await expect(page.getByText(/welcome to the team/i)).toBeVisible();

      // AND: Redirected to team dashboard
      await expect(page).toHaveURL(/\/employer\/team/);
      await expect(page.getByText(/your role.*hiring manager/i)).toBeVisible();
    });

    test('should reject expired invitation', async ({ page }) => {
      // GIVEN: An expired invitation token (>7 days old)
      const expiredToken = 'mock-expired-invitation-token';

      // WHEN: User tries to accept it
      await page.goto(`/employer/team/accept/${expiredToken}`);

      // THEN: Error message is shown
      await expect(page.getByText(/invitation.*expired/i)).toBeVisible();
      await expect(page.getByText(/please request.*new invitation/i)).toBeVisible();

      // AND: Accept button is disabled
      await expect(page.getByRole('button', { name: /accept invitation/i })).toBeDisabled();
    });
  });
});
