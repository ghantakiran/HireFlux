# Sprint 13-14: Team Collaboration & Interview Scheduling

**Sprint Duration**: Weeks 25-28 (Phase 2, Advanced Employer Features)
**Start Date**: 2025-11-06
**Target Completion**: 2025-12-03
**Status**: 🟢 In Progress
**Priority**: P1 (Important for Growth)

---

## Sprint Objectives

Transform HireFlux into an enterprise-ready recruiting platform by adding:
1. **Multi-user team collaboration** with granular role-based access control
2. **Interview scheduling** with calendar integration and feedback collection
3. **Team activity tracking** with @mentions and notifications
4. **Collaboration features** for hiring decisions

---

## Success Criteria

| Metric | Target | Description |
|--------|--------|-------------|
| **Unit Test Coverage** | >85% | All services with comprehensive tests |
| **E2E Test Pass Rate** | >75% | Critical user flows validated |
| **API Endpoints** | 15+ | Team management + Interview scheduling |
| **RBAC Roles** | 6 | Owner, Admin, Hiring Manager, Recruiter, Interviewer, Viewer |
| **Permission Matrix** | 12×6 | 12 actions × 6 roles |
| **Performance** | <500ms | API response times (p95) |

---

## Phase 1: Team Collaboration (Weeks 25-26)

### 1.1 Role-Based Access Control (RBAC)

#### Role Definitions

```python
class CompanyRole(str, Enum):
    """Company member roles with hierarchical permissions"""
    OWNER = "owner"              # Full access + billing
    ADMIN = "admin"              # Full access except billing
    HIRING_MANAGER = "hiring_manager"  # Post jobs, manage applications
    RECRUITER = "recruiter"      # View candidates, schedule interviews
    INTERVIEWER = "interviewer"  # View assigned candidates, leave feedback
    VIEWER = "viewer"            # Read-only access
```

#### Permission Matrix

| Action | Owner | Admin | Hiring Manager | Recruiter | Interviewer | Viewer |
|--------|-------|-------|----------------|-----------|-------------|--------|
| **Manage Billing** | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Manage Team** | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Post Jobs** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Edit Jobs** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Delete Jobs** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **View All Candidates** | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Search Candidates** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **View Assigned Candidates** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **Change Application Status** | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| **Schedule Interviews** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Leave Interview Feedback** | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| **View Analytics** | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |

#### Database Schema

```sql
-- Enhanced company_members table
ALTER TABLE company_members
ADD COLUMN last_active_at TIMESTAMP,
ADD COLUMN notification_preferences JSONB DEFAULT '{"email": true, "in_app": true}';

-- Team invitations table
CREATE TABLE team_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id),
    invitation_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    accepted_at TIMESTAMP,
    status VARCHAR(50) DEFAULT 'pending',  -- 'pending', 'accepted', 'expired', 'revoked'

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    UNIQUE(company_id, email),
    INDEX idx_team_invitations_token (invitation_token),
    INDEX idx_team_invitations_status (status)
);
```

### 1.2 Team Management Service

**File**: `backend/app/services/team_collaboration_service.py`

**Methods** (15 total):

```python
class TeamCollaborationService:
    # Team member management
    async def invite_team_member(company_id, inviter_id, email, role) -> TeamInvitation
    async def resend_invitation(invitation_id, company_id) -> TeamInvitation
    async def revoke_invitation(invitation_id, company_id) -> None
    async def accept_invitation(token, user_id) -> CompanyMember
    async def list_pending_invitations(company_id) -> List[TeamInvitation]

    # Member management
    async def update_member_role(member_id, company_id, new_role) -> CompanyMember
    async def suspend_member(member_id, company_id) -> CompanyMember
    async def reactivate_member(member_id, company_id) -> CompanyMember
    async def remove_member(member_id, company_id) -> None
    async def get_team_members(company_id, include_suspended=False) -> List[CompanyMember]

    # Permissions
    async def check_permission(member_id, action) -> bool
    async def get_member_permissions(member_id) -> Dict[str, bool]

    # Activity tracking
    async def log_team_activity(member_id, action, metadata) -> TeamActivity
    async def get_team_activity(company_id, days=7) -> List[TeamActivity]
    async def get_member_activity(member_id, days=30) -> List[TeamActivity]
```

### 1.3 Team Activity Tracking

#### Database Schema

```sql
CREATE TABLE team_activities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES company_members(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Activity details
    action_type VARCHAR(50) NOT NULL,  -- 'job_posted', 'application_reviewed', 'interview_scheduled', etc.
    entity_type VARCHAR(50),  -- 'job', 'application', 'interview', 'candidate'
    entity_id UUID,

    -- Content
    description TEXT,
    metadata JSONB,

    -- Mentions
    mentioned_members UUID[],  -- Array of member IDs mentioned in notes/comments

    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_team_activities_company (company_id, created_at DESC),
    INDEX idx_team_activities_member (member_id, created_at DESC),
    INDEX idx_team_activities_action (action_type)
);

CREATE TABLE team_mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    activity_id UUID NOT NULL REFERENCES team_activities(id) ON DELETE CASCADE,
    mentioned_member_id UUID NOT NULL REFERENCES company_members(id) ON DELETE CASCADE,
    mentioned_by_member_id UUID NOT NULL REFERENCES company_members(id) ON DELETE CASCADE,

    -- Notification status
    notified BOOLEAN DEFAULT FALSE,
    read_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_team_mentions_member (mentioned_member_id, read_at)
);
```

### 1.4 API Endpoints (Team Management)

**File**: `backend/app/api/v1/endpoints/team.py`

```
POST   /api/v1/employer/team/invite             - Invite team member
GET    /api/v1/employer/team/invitations        - List pending invitations
POST   /api/v1/employer/team/invitations/{id}/resend  - Resend invitation
DELETE /api/v1/employer/team/invitations/{id}   - Revoke invitation
POST   /api/v1/employer/team/accept/{token}     - Accept invitation (public)

GET    /api/v1/employer/team/members            - List team members
PATCH  /api/v1/employer/team/members/{id}/role  - Update member role
POST   /api/v1/employer/team/members/{id}/suspend    - Suspend member
POST   /api/v1/employer/team/members/{id}/reactivate - Reactivate member
DELETE /api/v1/employer/team/members/{id}       - Remove member

GET    /api/v1/employer/team/activity           - Get team activity feed
GET    /api/v1/employer/team/members/{id}/activity   - Get member activity

GET    /api/v1/employer/team/permissions        - Get current user permissions
```

---

## Phase 2: Interview Scheduling (Weeks 27-28)

### 2.1 Interview Scheduling Service

#### Database Schema

```sql
-- Enhanced interview_schedules table
ALTER TABLE interview_schedules
ADD COLUMN interview_round VARCHAR(50),  -- 'phone_screen', 'technical', 'behavioral', 'final', 'cultural_fit'
ADD COLUMN calendar_event_id VARCHAR(255),  -- Google Calendar / Outlook event ID
ADD COLUMN meeting_platform VARCHAR(50),  -- 'zoom', 'google_meet', 'microsoft_teams', 'in_person'
ADD COLUMN reminder_sent BOOLEAN DEFAULT FALSE,
ADD COLUMN reminders_config JSONB DEFAULT '{"24h": true, "1h": true}';

-- Interview feedback table
CREATE TABLE interview_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interview_id UUID NOT NULL REFERENCES interview_schedules(id) ON DELETE CASCADE,
    interviewer_id UUID NOT NULL REFERENCES company_members(id),
    application_id UUID NOT NULL REFERENCES job_applications(id),

    -- Rating (1-5 scale)
    overall_rating INTEGER CHECK (overall_rating BETWEEN 1 AND 5),
    technical_rating INTEGER CHECK (technical_rating BETWEEN 1 AND 5),
    communication_rating INTEGER CHECK (communication_rating BETWEEN 1 AND 5),
    culture_fit_rating INTEGER CHECK (culture_fit_rating BETWEEN 1 AND 5),

    -- Detailed feedback
    strengths TEXT[],
    concerns TEXT[],
    notes TEXT,

    -- Recommendation
    recommendation VARCHAR(50),  -- 'strong_yes', 'yes', 'maybe', 'no', 'strong_no'
    next_steps TEXT,

    -- Status
    is_submitted BOOLEAN DEFAULT FALSE,
    submitted_at TIMESTAMP,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_interview_feedback_interview (interview_id),
    INDEX idx_interview_feedback_application (application_id)
);

-- Interview availability (for candidates)
CREATE TABLE candidate_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    application_id UUID NOT NULL REFERENCES job_applications(id) ON DELETE CASCADE,
    candidate_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Time slots (candidate provides multiple options)
    available_slots JSONB NOT NULL,  -- [{"start": "2025-11-10T10:00:00Z", "end": "2025-11-10T11:00:00Z"}, ...]
    timezone VARCHAR(50) NOT NULL,

    -- Preferences
    preferred_platform VARCHAR(50),  -- 'zoom', 'google_meet', etc.
    notes TEXT,

    expires_at TIMESTAMP NOT NULL,

    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),

    INDEX idx_candidate_availability_application (application_id)
);
```

### 2.2 Interview Scheduling Service Methods

**File**: `backend/app/services/interview_scheduling_service.py`

```python
class InterviewSchedulingService:
    # Interview scheduling
    async def create_interview(application_id, schedule_data) -> InterviewSchedule
    async def update_interview(interview_id, schedule_data) -> InterviewSchedule
    async def cancel_interview(interview_id, reason) -> None
    async def reschedule_interview(interview_id, new_time) -> InterviewSchedule

    # Interviewer assignment
    async def assign_interviewers(interview_id, interviewer_ids) -> InterviewSchedule
    async def remove_interviewer(interview_id, interviewer_id) -> InterviewSchedule

    # Availability
    async def request_candidate_availability(application_id, deadline) -> CandidateAvailability
    async def submit_candidate_availability(application_id, slots) -> CandidateAvailability
    async def get_candidate_availability(application_id) -> CandidateAvailability

    # Calendar integration (placeholder for now)
    async def sync_to_calendar(interview_id, platform='google') -> str  # Returns event ID
    async def send_calendar_invite(interview_id) -> None

    # Reminders
    async def send_interview_reminders(hours_before=24) -> int  # Returns count sent

    # Feedback
    async def submit_feedback(interview_id, interviewer_id, feedback_data) -> InterviewFeedback
    async def get_interview_feedback(interview_id) -> List[InterviewFeedback]
    async def get_aggregated_feedback(application_id) -> Dict[str, Any]

    # Listing
    async def list_interviews(company_id, filters) -> List[InterviewSchedule]
    async def list_upcoming_interviews(member_id) -> List[InterviewSchedule]
```

### 2.3 API Endpoints (Interview Scheduling)

**File**: `backend/app/api/v1/endpoints/interviews.py`

```
POST   /api/v1/employer/interviews              - Schedule new interview
GET    /api/v1/employer/interviews               - List company interviews
GET    /api/v1/employer/interviews/{id}          - Get interview details
PATCH  /api/v1/employer/interviews/{id}          - Update interview
DELETE /api/v1/employer/interviews/{id}          - Cancel interview

POST   /api/v1/employer/interviews/{id}/assign   - Assign interviewers
DELETE /api/v1/employer/interviews/{id}/interviewers/{interviewer_id}  - Remove interviewer

POST   /api/v1/employer/interviews/{id}/reschedule  - Reschedule interview

GET    /api/v1/employer/interviews/upcoming      - Get upcoming interviews for current user

POST   /api/v1/employer/interviews/{id}/feedback - Submit interview feedback
GET    /api/v1/employer/interviews/{id}/feedback - Get interview feedback

POST   /api/v1/employer/applications/{id}/request-availability  - Request candidate availability
POST   /api/v1/candidate/applications/{id}/availability         - Submit availability (candidate endpoint)
GET    /api/v1/employer/applications/{id}/availability          - Get candidate availability
```

---

## Phase 3: Frontend UI (Weeks 27-28)

### 3.1 Team Management Page

**File**: `frontend/app/employer/team/page.tsx`

**Features**:
- Team members table with roles, status, last active
- Invite member modal with email + role selection
- Pending invitations section with resend/revoke actions
- Member actions: Change role, Suspend, Remove
- Permission matrix visualization
- Activity feed (recent team actions)

**UI Components**:
- `<TeamMembersTable>` - Table with search, filters
- `<InviteMemberModal>` - Invite flow
- `<RoleSelector>` - Dropdown with role descriptions
- `<MemberActions>` - Action menu (Edit, Suspend, Remove)
- `<ActivityFeed>` - Real-time activity stream
- `<PermissionMatrixView>` - Visual permission grid

### 3.2 Interview Scheduling UI

**File**: `frontend/app/employer/interviews/page.tsx`

**Features**:
- Calendar view of all interviews (week/month view)
- Schedule interview modal (date/time picker, interviewers, platform)
- Interview details page (feedback, notes, status)
- Upcoming interviews widget (dashboard)
- Interview feedback form (ratings, notes, recommendation)
- Candidate availability request flow

**UI Components**:
- `<InterviewCalendar>` - Full calendar with events
- `<ScheduleInterviewModal>` - Scheduling wizard
- `<InterviewerSelector>` - Multi-select with avatars
- `<InterviewFeedbackForm>` - Rating + text inputs
- `<AvailabilityRequestModal>` - Request candidate slots
- `<UpcomingInterviewsWidget>` - Dashboard widget

---

## Phase 4: E2E Tests (BDD Scenarios)

### 4.1 Team Collaboration Tests

**File**: `frontend/tests/e2e/23-team-collaboration.spec.ts`

**Scenarios** (15 tests):
1. Owner invites new team member with hiring_manager role
2. Pending invitation appears in invitations list
3. Invited user receives email with accept link
4. Invited user accepts invitation and joins team
5. Admin changes member role from recruiter to hiring_manager
6. Hiring manager cannot access billing page (permission denied)
7. Recruiter can view candidates but cannot change application status
8. Interviewer can only see assigned candidates
9. Viewer has read-only access to all pages
10. Owner suspends team member (member loses access)
11. Owner removes team member from company
12. Activity feed shows recent team actions
13. @mention in application note notifies mentioned member
14. Team member updates notification preferences
15. Permission matrix displays correctly for each role

### 4.2 Interview Scheduling Tests

**File**: `frontend/tests/e2e/24-interview-scheduling.spec.ts`

**Scenarios** (12 tests):
1. Recruiter schedules phone screen interview
2. Interview appears in calendar and upcoming list
3. Assign multiple interviewers to interview
4. Send calendar invite to interviewers and candidate
5. Reminder sent 24 hours before interview
6. Request candidate availability for next round
7. Candidate submits 3 available time slots
8. Recruiter selects slot and schedules interview
9. Interviewer submits feedback after interview
10. View aggregated feedback from all interviewers
11. Reschedule interview to new time
12. Cancel interview with reason

---

## Implementation Plan

### Week 25: Team Management Foundation
- [ ] Day 1-2: Database migrations (team_invitations, team_activities, team_mentions)
- [ ] Day 3-4: TeamCollaborationService (TDD - write tests first)
- [ ] Day 5: API endpoints for team management

### Week 26: RBAC & Permissions
- [ ] Day 1-2: Permission matrix implementation
- [ ] Day 3: Permission checks in existing endpoints
- [ ] Day 4-5: Frontend team management page

### Week 27: Interview Scheduling
- [ ] Day 1-2: Database migrations (interview_feedback, candidate_availability)
- [ ] Day 3-4: InterviewSchedulingService (TDD)
- [ ] Day 5: API endpoints for interview scheduling

### Week 28: UI & E2E Tests
- [ ] Day 1-2: Frontend interview scheduling UI
- [ ] Day 3-4: E2E tests (team collaboration + interview scheduling)
- [ ] Day 5: Documentation update, staging deployment

---

## Success Metrics (Sprint 13-14)

### Technical Metrics
- Unit test coverage: >85% (target: 90%)
- E2E test pass rate: >75% (target: 80%)
- API response time: <500ms (p95)
- Zero critical security vulnerabilities

### Business Metrics
- Enable enterprise adoption (10+ team members)
- Reduce time-to-hire by 30% (with interview scheduling)
- Increase collaboration efficiency by 50%
- Support 500+ companies with team features

### Quality Metrics
- Code review approval: 100%
- Documentation coverage: 100%
- Accessibility: WCAG 2.1 AA compliance
- Mobile responsiveness: Tested on 6 devices

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Permission bugs** | Medium | High | Comprehensive unit tests, manual security review |
| **Calendar integration complexity** | High | Medium | Start with mock implementation, real integration in Sprint 15-16 |
| **Email delivery issues** | Low | Medium | Use Resend with retry logic, test with real emails |
| **Team invitation spam** | Low | Medium | Rate limiting (5 invites/hour), email verification |

---

**Document Created**: 2025-11-06
**Author**: Development Team
**Status**: Approved - Ready for Implementation
**Next Review**: 2025-11-20 (Mid-sprint checkpoint)
