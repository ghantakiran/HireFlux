/**
 * Mock API Handlers for Team Collaboration (Sprint 13-14)
 *
 * Purpose: Enable E2E testing without running backend server
 * Following TDD/BDD: Tests exist (written first), now making them pass with mocks
 *
 * Mock responses match backend API contract from backend/app/api/v1/endpoints/team.py
 */

import { Page, Route } from '@playwright/test';

export interface TeamMember {
  id: string;
  company_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'hiring_manager' | 'recruiter' | 'interviewer' | 'viewer';
  status: 'active' | 'suspended';
  email: string;
  full_name: string;
  last_active_at: string | null;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

export interface TeamInvitation {
  id: string;
  company_id: string;
  email: string;
  role: string;
  invited_by: string;
  invitation_token: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  accepted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TeamActivity {
  id: string;
  company_id: string;
  member_id: string;
  user_id: string;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string | null;
  member_name: string;
  member_email: string;
  created_at: string;
}

export interface PermissionMatrix {
  member_id: string;
  role: string;
  permissions: {
    [key: string]: boolean;
  };
}

// Mock data
const mockMembers: TeamMember[] = [
  {
    id: 'member-1',
    company_id: 'company-123',
    user_id: 'user-1',
    role: 'owner',
    status: 'active',
    email: 'owner@company.com',
    full_name: 'Alice Owner',
    last_active_at: new Date().toISOString(),
    joined_at: '2025-01-01T00:00:00Z',
    created_at: '2025-01-01T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'member-2',
    company_id: 'company-123',
    user_id: 'user-2',
    role: 'admin',
    status: 'active',
    email: 'admin@company.com',
    full_name: 'Bob Admin',
    last_active_at: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
    joined_at: '2025-01-15T00:00:00Z',
    created_at: '2025-01-15T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'member-3',
    company_id: 'company-123',
    user_id: 'user-3',
    role: 'hiring_manager',
    status: 'active',
    email: 'manager@company.com',
    full_name: 'Carol Manager',
    last_active_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
    joined_at: '2025-02-01T00:00:00Z',
    created_at: '2025-02-01T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'member-4',
    company_id: 'company-123',
    user_id: 'user-4',
    role: 'recruiter',
    status: 'active',
    email: 'recruiter@company.com',
    full_name: 'Dave Recruiter',
    last_active_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    joined_at: '2025-03-01T00:00:00Z',
    created_at: '2025-03-01T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
  {
    id: 'member-5',
    company_id: 'company-123',
    user_id: 'user-5',
    role: 'recruiter',
    status: 'suspended',
    email: 'suspended@company.com',
    full_name: 'Eve Suspended',
    last_active_at: new Date(Date.now() - 604800000).toISOString(), // 7 days ago
    joined_at: '2025-04-01T00:00:00Z',
    created_at: '2025-04-01T00:00:00Z',
    updated_at: new Date().toISOString(),
  },
];

const mockInvitations: TeamInvitation[] = [
  {
    id: 'invite-1',
    company_id: 'company-123',
    email: 'pending@company.com',
    role: 'recruiter',
    invited_by: 'member-1',
    invitation_token: 'mock-token-pending-123456789012345678901234567890123456789012345678901234567890',
    expires_at: new Date(Date.now() + 604800000).toISOString(), // 7 days from now
    status: 'pending',
    accepted_at: null,
    created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'invite-2',
    company_id: 'company-123',
    email: 'revokeme@company.com',
    role: 'viewer',
    invited_by: 'member-2',
    invitation_token: 'mock-token-revoke-123456789012345678901234567890123456789012345678901234567890',
    expires_at: new Date(Date.now() + 518400000).toISOString(), // 6 days from now
    status: 'pending',
    accepted_at: null,
    created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
    updated_at: new Date(Date.now() - 172800000).toISOString(),
  },
];

const mockActivities: TeamActivity[] = [
  {
    id: 'activity-1',
    company_id: 'company-123',
    member_id: 'member-3',
    user_id: 'user-3',
    action_type: 'job_posted',
    entity_type: 'job',
    entity_id: 'job-123',
    description: 'Posted job: Senior Software Engineer',
    member_name: 'Carol Manager',
    member_email: 'manager@company.com',
    created_at: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
  },
  {
    id: 'activity-2',
    company_id: 'company-123',
    member_id: 'member-4',
    user_id: 'user-4',
    action_type: 'application_reviewed',
    entity_type: 'application',
    entity_id: 'app-456',
    description: 'Reviewed application from John Doe',
    member_name: 'Dave Recruiter',
    member_email: 'recruiter@company.com',
    created_at: new Date(Date.now() - 10800000).toISOString(), // 3 hours ago
  },
  {
    id: 'activity-3',
    company_id: 'company-123',
    member_id: 'member-3',
    user_id: 'user-3',
    action_type: 'interview_scheduled',
    entity_type: 'interview',
    entity_id: 'interview-789',
    description: 'Scheduled interview with Jane Smith',
    member_name: 'Carol Manager',
    member_email: 'manager@company.com',
    created_at: new Date(Date.now() - 14400000).toISOString(), // 4 hours ago
  },
];

/**
 * Enable API mocking for team collaboration endpoints
 */
export async function mockTeamCollaborationAPI(page: Page) {
  // Mock GET /api/v1/employer/team/members - List team members
  await page.route('**/api/v1/employer/team/members*', async (route: Route) => {
    if (route.request().method() === 'GET') {
      const url = new URL(route.request().url());
      const includeSuspended = url.searchParams.get('include_suspended') === 'true';

      const members = includeSuspended
        ? mockMembers
        : mockMembers.filter(m => m.status === 'active');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          members,
          pending_invitations: mockInvitations,
          total_members: members.length,
          total_pending: mockInvitations.length,
        }),
      });
    }
  });

  // Mock POST /api/v1/employer/team/invite - Invite team member
  await page.route('**/api/v1/employer/team/invite', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const body = JSON.parse(route.request().postData() || '{}');

      // Check for existing member
      if (body.email === 'existing@company.com') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'User already a member of this company',
          }),
        });
        return;
      }

      // Check team size limit (mock free plan with 3 member limit)
      if (mockMembers.filter(m => m.status === 'active').length >= 3) {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Team size limit reached. Please upgrade your plan to invite more members.',
          }),
        });
        return;
      }

      // Success response
      const newInvitation: TeamInvitation = {
        id: `invite-${Date.now()}`,
        company_id: 'company-123',
        email: body.email,
        role: body.role,
        invited_by: 'member-2',
        invitation_token: `mock-token-${Date.now()}-${'x'.repeat(50)}`,
        expires_at: new Date(Date.now() + 604800000).toISOString(),
        status: 'pending',
        accepted_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify(newInvitation),
      });
    }
  });

  // Mock POST /api/v1/employer/team/invitations/{id}/resend - Resend invitation
  await page.route('**/api/v1/employer/team/invitations/*/resend', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const invitation = mockInvitations[0];
      invitation.updated_at = new Date().toISOString();

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(invitation),
      });
    }
  });

  // Mock DELETE /api/v1/employer/team/invitations/{id} - Revoke invitation
  await page.route('**/api/v1/employer/team/invitations/*', async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 204,
        body: '',
      });
    }
  });

  // Mock PATCH /api/v1/employer/team/members/{id}/role - Update member role
  await page.route('**/api/v1/employer/team/members/*/role', async (route: Route) => {
    if (route.request().method() === 'PATCH') {
      const body = JSON.parse(route.request().postData() || '{}');
      const updatedMember = { ...mockMembers[3], role: body.role, updated_at: new Date().toISOString() };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(updatedMember),
      });
    }
  });

  // Mock POST /api/v1/employer/team/members/{id}/suspend - Suspend member
  await page.route('**/api/v1/employer/team/members/*/suspend', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const suspendedMember = { ...mockMembers[3], status: 'suspended', updated_at: new Date().toISOString() };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(suspendedMember),
      });
    }
  });

  // Mock POST /api/v1/employer/team/members/{id}/reactivate - Reactivate member
  await page.route('**/api/v1/employer/team/members/*/reactivate', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const reactivatedMember = { ...mockMembers[4], status: 'active', updated_at: new Date().toISOString() };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(reactivatedMember),
      });
    }
  });

  // Mock DELETE /api/v1/employer/team/members/{id} - Remove member
  await page.route('**/api/v1/employer/team/members/*', async (route: Route) => {
    if (route.request().method() === 'DELETE') {
      await route.fulfill({
        status: 204,
        body: '',
      });
    }
  });

  // Mock GET /api/v1/employer/team/activity - Get team activity
  await page.route('**/api/v1/employer/team/activity*', async (route: Route) => {
    if (route.request().method() === 'GET') {
      const url = new URL(route.request().url());
      const days = parseInt(url.searchParams.get('days') || '7');

      // Filter activities based on days
      const cutoffDate = new Date(Date.now() - days * 86400000);
      const filtered = mockActivities.filter(a => new Date(a.created_at) >= cutoffDate);

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(filtered),
      });
    }
  });

  // Mock GET /api/v1/employer/team/members/{id}/activity - Get member activity
  await page.route('**/api/v1/employer/team/members/*/activity*', async (route: Route) => {
    if (route.request().method() === 'GET') {
      const memberActivities = mockActivities.filter(a => a.member_email === 'manager@company.com');

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(memberActivities),
      });
    }
  });

  // Mock GET /api/v1/employer/team/permissions - Get current user permissions
  await page.route('**/api/v1/employer/team/permissions', async (route: Route) => {
    if (route.request().method() === 'GET') {
      const permissions: PermissionMatrix = {
        member_id: 'member-2',
        role: 'admin',
        permissions: {
          manage_billing: false,
          manage_team: true,
          post_jobs: true,
          edit_jobs: true,
          delete_jobs: true,
          view_all_candidates: true,
          search_candidates: true,
          view_assigned_candidates: true,
          change_application_status: true,
          schedule_interviews: true,
          leave_feedback: true,
          view_analytics: true,
        },
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(permissions),
      });
    }
  });

  // Mock POST /api/v1/employer/team/accept/{token} - Accept invitation
  await page.route('**/api/v1/employer/team/accept/*', async (route: Route) => {
    if (route.request().method() === 'POST') {
      const token = route.request().url().split('/').pop();

      // Mock expired token
      if (token === 'mock-expired-invitation-token') {
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({
            detail: 'Invitation has expired. Please request a new invitation.',
          }),
        });
        return;
      }

      // Success response
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'Welcome to the team!',
          data: {
            company_id: 'company-123',
            role: 'hiring_manager',
            member_id: 'member-new',
          },
        }),
      });
    }
  });
}
