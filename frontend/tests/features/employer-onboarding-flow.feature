# Feature: Employer Onboarding Flow (Issue #112)
#
# As a new employer user
# I want a guided onboarding experience
# So that I can quickly set up my account and start hiring candidates

Feature: Employer Onboarding Flow

  Background:
    Given I am a new employer user
    And I have not completed onboarding

  # ============================================================================
  # Registration & Account Creation
  # ============================================================================

  Scenario: Access employer registration page
    Given I navigate to the homepage
    When I click "For Employers" or "Post a Job"
    Then I should see the employer registration page
    And I should see a form with email and password fields

  Scenario: Register new employer account with valid details
    Given I am on the employer registration page
    When I enter email "employer@techcorp.com"
    And I enter password "SecurePass123!"
    And I confirm password "SecurePass123!"
    And I check "I agree to Terms of Service"
    And I click "Create Account"
    Then I should see a success message "Account created! Check your email."
    And I should be redirected to email verification page

  Scenario: Validation - Email already exists
    Given I am on the employer registration page
    When I enter email "existing@employer.com"
    And I enter password "SecurePass123!"
    And I confirm password "SecurePass123!"
    And I click "Create Account"
    Then I should see an error "Email already exists. Please sign in."
    And I should see a link to "Sign In"

  Scenario: Validation - Weak password
    Given I am on the employer registration page
    When I enter email "employer@techcorp.com"
    And I enter password "weak"
    And I confirm password "weak"
    Then I should see an error "Password must be at least 8 characters with uppercase, lowercase, and numbers"

  Scenario: Validation - Passwords do not match
    Given I am on the employer registration page
    When I enter email "employer@techcorp.com"
    And I enter password "SecurePass123!"
    And I confirm password "DifferentPass456!"
    Then I should see an error "Passwords do not match"

  Scenario: Validation - Terms of Service required
    Given I am on the employer registration page
    When I enter email "employer@techcorp.com"
    And I enter password "SecurePass123!"
    And I confirm password "SecurePass123!"
    And I do not check "I agree to Terms of Service"
    And I click "Create Account"
    Then I should see an error "Please agree to Terms of Service to continue"

  # ============================================================================
  # Email Verification
  # ============================================================================

  Scenario: Email verification sent after registration
    Given I have just registered as a new employer
    Then I should receive an email with subject "Verify your HireFlux employer account"
    And the email should contain a verification link
    And the email should contain my email address

  Scenario: Verify email with valid token
    Given I have registered and received a verification email
    When I click the verification link in the email
    Then I should see a success message "Email verified! Let's set up your company."
    And I should be redirected to onboarding step 1 (company profile)

  Scenario: Verify email with expired token
    Given I have a verification email from 25 hours ago
    When I click the verification link
    Then I should see an error "Verification link expired. Request a new one."
    And I should see a "Resend Verification Email" button

  Scenario: Resend verification email
    Given my verification email has expired
    When I click "Resend Verification Email"
    Then I should see a success message "Verification email sent to employer@techcorp.com"
    And I should receive a new verification email

  Scenario: Access app before email verification
    Given I have registered but not verified my email
    When I try to access the employer dashboard
    Then I should see a message "Please verify your email to continue"
    And I should see a "Resend Verification Email" button

  # ============================================================================
  # Onboarding Progress Tracking
  # ============================================================================

  Scenario: View onboarding progress indicator
    Given I have verified my email
    When I am on the onboarding page
    Then I should see a progress bar showing "Step 1 of 5"
    And I should see step indicators:
      | Step | Label                 | Status     |
      | 1    | Company Profile       | Active     |
      | 2    | First Job Post        | Incomplete |
      | 3    | Team Members          | Incomplete |
      | 4    | ATS Tour              | Incomplete |
      | 5    | Complete              | Incomplete |

  Scenario: Progress updates as steps completed
    Given I am on step 1 of onboarding
    When I complete the company profile
    Then the progress bar should update to "Step 2 of 5"
    And step 1 should be marked as "Complete" with a checkmark
    And step 2 should be marked as "Active"

  # ============================================================================
  # Step 1: Company Profile Setup
  # ============================================================================

  Scenario: Step 1 - Company profile setup screen
    Given I have verified my email
    And I am on onboarding step 1
    Then I should see a heading "Let's set up your company profile"
    And I should see a description "This helps job seekers learn about your company"
    And I should see the company profile form (from Issue #113)

  Scenario: Step 1 - Complete company profile (minimal)
    Given I am on onboarding step 1
    When I enter company name "TechCorp Inc"
    And I select industry "Technology"
    And I select company size "51-200 employees"
    And I enter company description "We build innovative software solutions"
    And I click "Continue"
    Then I should see a success message "Company profile saved!"
    And I should proceed to step 2 (First Job Post)

  Scenario: Step 1 - Complete company profile (full)
    Given I am on onboarding step 1
    When I fill complete company profile:
      | Field       | Value                                      |
      | Name        | TechCorp Inc                               |
      | Industry    | Technology                                 |
      | Size        | 51-200 employees                           |
      | Website     | https://techcorp.com                       |
      | Description | We build innovative software solutions     |
    And I upload company logo
    And I add benefits "Health Insurance, Remote Work, 401(k)"
    And I add office location "123 Main St, San Francisco, CA 94105" as "Headquarters"
    And I click "Continue"
    Then I should see "Company profile saved!" with 100% completion
    And I should proceed to step 2

  Scenario: Step 1 - Skip optional fields
    Given I am on onboarding step 1
    When I enter only required fields (name, industry, size)
    And I click "Skip for now"
    Then I should see a message "You can complete your profile later in Settings"
    And I should proceed to step 2 with 40% profile completion

  Scenario: Step 1 - Save and exit onboarding
    Given I am on onboarding step 1
    When I click "Save and Exit"
    Then my progress should be saved
    And I should be redirected to employer dashboard
    When I return later
    Then I should see a prompt "Complete your onboarding (20% done)"
    And I should be able to resume from step 1

  # ============================================================================
  # Step 2: First Job Post Walkthrough
  # ============================================================================

  Scenario: Step 2 - First job post walkthrough screen
    Given I have completed step 1 (company profile)
    And I am on onboarding step 2
    Then I should see a heading "Create your first job post"
    And I should see a description "We'll guide you through posting your first role"
    And I should see tooltips and help text for each field

  Scenario: Step 2 - Job post form with guidance
    Given I am on onboarding step 2
    Then I should see guided fields:
      | Field              | Guidance                                    |
      | Job Title          | "e.g., Senior Software Engineer"            |
      | Department         | "e.g., Engineering"                         |
      | Location           | "Use one of your office locations or Remote"|
      | Employment Type    | "Full-time, Part-time, Contract, Internship"|
      | Experience Level   | "Entry, Mid, Senior, Lead, Executive"       |
      | Salary Range       | "Optional but increases applications by 30%"|
    And each field should have contextual help icons

  Scenario: Step 2 - Use AI job description generator
    Given I am on onboarding step 2
    When I enter job title "Senior Software Engineer"
    And I click "Generate Job Description with AI"
    Then I should see a modal "AI Job Description Generator"
    When I enter key points:
      | Point                              |
      | Build scalable backend systems     |
      | Lead technical design decisions    |
      | Mentor junior engineers            |
    And I select tone "Professional"
    And I click "Generate"
    Then I should see AI-generated job description
    And I should see AI-generated requirements
    And I should see AI-generated responsibilities
    And I can edit the generated content before accepting

  Scenario: Step 2 - Pre-fill company information
    Given I completed company profile in step 1
    And I am on onboarding step 2 (job post)
    Then the company name should be pre-filled from step 1
    And the company logo should be pre-filled
    And office locations should be available in location dropdown
    And I should only need to fill job-specific details

  Scenario: Step 2 - Complete and publish first job post
    Given I am on onboarding step 2
    When I fill job post details:
      | Field            | Value                           |
      | Job Title        | Senior Software Engineer        |
      | Department       | Engineering                     |
      | Location         | San Francisco, CA (Headquarters)|
      | Employment Type  | Full-time                       |
      | Experience Level | Senior                          |
      | Salary Min       | 150000                          |
      | Salary Max       | 200000                          |
    And I use AI to generate job description
    And I add required skills "Python, Django, PostgreSQL, AWS"
    And I click "Publish Job"
    Then I should see "Job posted successfully! It's now live."
    And I should proceed to step 3 (Team Members)

  Scenario: Step 2 - Save job as draft
    Given I am on onboarding step 2
    When I partially fill job post details
    And I click "Save as Draft"
    Then the job should be saved as unpublished
    And I should proceed to step 3
    And I can publish the draft later from dashboard

  Scenario: Step 2 - Skip job posting
    Given I am on onboarding step 2
    When I click "Skip - I'll post a job later"
    Then I should see a message "You can create job posts anytime from your dashboard"
    And I should proceed to step 3 (Team Members)

  # ============================================================================
  # Step 3: Team Member Invitation (Optional)
  # ============================================================================

  Scenario: Step 3 - Team member invitation screen
    Given I have completed step 2 (first job post)
    And I am on onboarding step 3
    Then I should see a heading "Invite your team members"
    And I should see a description "Collaborate with recruiters and hiring managers"
    And I should see role options:
      | Role          | Permissions                           |
      | Owner         | Full access, billing, delete company  |
      | Admin         | Manage jobs, view analytics, settings |
      | Manager       | Create/edit jobs, view candidates     |
      | Recruiter     | View jobs, manage applications        |
      | Interviewer   | View candidates, schedule interviews  |
      | Viewer        | Read-only access to dashboard         |

  Scenario: Step 3 - Invite team member
    Given I am on onboarding step 3
    When I enter email "recruiter@techcorp.com"
    And I select role "Recruiter"
    And I click "Send Invitation"
    Then I should see "Invitation sent to recruiter@techcorp.com"
    And the team member should receive an invitation email

  Scenario: Step 3 - Invite multiple team members
    Given I am on onboarding step 3
    When I invite:
      | Email                   | Role        |
      | admin@techcorp.com      | Admin       |
      | recruiter@techcorp.com  | Recruiter   |
      | manager@techcorp.com    | Manager     |
    Then I should see 3 pending invitations
    And each should show "Invitation sent" status

  Scenario: Step 3 - Skip team invitations
    Given I am on onboarding step 3
    When I click "Skip - I'll work solo for now"
    Then I should proceed to step 4 (ATS Tour)
    And I can invite team members later from settings

  Scenario: Step 3 - Validation - Invalid email
    Given I am on onboarding step 3
    When I enter email "invalid-email"
    And I select role "Recruiter"
    And I click "Send Invitation"
    Then I should see an error "Please enter a valid email address"

  Scenario: Step 3 - Validation - Duplicate invitation
    Given I have already invited "recruiter@techcorp.com"
    When I try to invite "recruiter@techcorp.com" again
    Then I should see an error "This user has already been invited"

  # ============================================================================
  # Step 4: ATS Introduction Tour
  # ============================================================================

  Scenario: Step 4 - ATS tour welcome screen
    Given I have completed step 3 (team invitations)
    And I am on onboarding step 4
    Then I should see a heading "Welcome to your Applicant Tracking System"
    And I should see a description "Let's take a quick tour of how to manage candidates"
    And I should see "Start Tour" and "Skip Tour" buttons

  Scenario: Step 4 - Take interactive ATS tour
    Given I am on onboarding step 4
    When I click "Start Tour"
    Then I should see an interactive overlay highlighting:
      | Feature              | Description                                    |
      | Dashboard            | "See overview of all your jobs and applications" |
      | Applications Inbox   | "Review new candidate applications here"         |
      | Pipeline View        | "Track candidates through 8 hiring stages"       |
      | Candidate Ranking    | "AI-powered Fit Index (0-100) for each applicant"|
      | Interview Scheduling | "Schedule interviews directly from the ATS"      |
      | Team Collaboration   | "Leave notes and @mention team members"          |
    And I can advance through tour steps with "Next" button
    And I can exit tour anytime with "Skip Tour"

  Scenario: Step 4 - Complete ATS tour
    Given I started the ATS tour
    When I complete all 6 tour steps
    Then I should see "Tour complete! You're ready to start hiring."
    And I should proceed to step 5 (Onboarding Complete)

  Scenario: Step 4 - Skip ATS tour
    Given I am on onboarding step 4
    When I click "Skip Tour"
    Then I should see "You can access the tour anytime from Help → Product Tour"
    And I should proceed to step 5 (Onboarding Complete)

  Scenario: Step 4 - Replay tour later
    Given I skipped the ATS tour during onboarding
    When I navigate to "Help" menu in dashboard
    And I click "Product Tour"
    Then the ATS tour should start from the beginning

  # ============================================================================
  # Step 5: Onboarding Complete
  # ============================================================================

  Scenario: Step 5 - Onboarding completion screen
    Given I have completed all onboarding steps
    And I am on step 5
    Then I should see a heading "You're all set!"
    And I should see a success message "Welcome to HireFlux! Your account is ready."
    And I should see a summary:
      | Item                | Status    |
      | Company Profile     | ✓ Complete |
      | First Job Post      | ✓ Posted   |
      | Team Members        | ✓ 3 invited|
      | ATS Tour            | ✓ Completed|

  Scenario: Step 5 - Next steps recommendations
    Given I am on the onboarding completion screen
    Then I should see recommended next steps:
      | Action                          | Description                          |
      | View Applications               | "Check if you've received any applications" |
      | Post Another Job                | "Expand your hiring needs"            |
      | Explore Advanced Features       | "Candidate search, analytics, and more" |
      | Upgrade to Professional Plan    | "Unlock unlimited jobs and features"  |

  Scenario: Step 5 - Go to dashboard
    Given I am on the onboarding completion screen
    When I click "Go to Dashboard"
    Then I should be redirected to employer dashboard
    And I should not see onboarding prompts again
    And my onboarding_completed flag should be set to true

  # ============================================================================
  # Onboarding State & Resumption
  # ============================================================================

  Scenario: Resume incomplete onboarding
    Given I started onboarding but did not complete it
    And I completed step 1 (company profile)
    And I am at 20% completion
    When I log in again
    Then I should see a banner "Complete your onboarding (20% done) - Resume"
    When I click "Resume"
    Then I should be taken to step 2 (where I left off)

  Scenario: Onboarding state persists across sessions
    Given I completed steps 1 and 2
    When I log out and log back in
    Then my onboarding progress should show 40% complete
    And I should resume from step 3

  Scenario: Skip entire onboarding
    Given I am on onboarding step 1
    When I click "Skip Onboarding - Take me to dashboard"
    Then I should see a confirmation "Are you sure? We recommend completing onboarding."
    When I confirm
    Then I should be redirected to employer dashboard
    And I should see a persistent prompt to complete onboarding

  Scenario: Onboarding not required for existing users
    Given I am an existing employer who registered before onboarding flow
    When I log in
    Then I should go directly to my dashboard
    And I should not see any onboarding prompts

  # ============================================================================
  # Mobile Responsiveness
  # ============================================================================

  Scenario: Complete onboarding on mobile device
    Given I am on a mobile device (375px width)
    When I go through the onboarding flow
    Then all steps should be mobile-optimized:
      | Step              | Mobile Behavior                    |
      | Registration      | Single column form, large buttons   |
      | Email Verify      | Clear message, easy resend button   |
      | Company Profile   | Stacked fields, touch-friendly inputs|
      | Job Post          | AI generator works, easy text input |
      | Team Invitations  | Simple email list, role selector    |
      | ATS Tour          | Overlay adapts to mobile screen     |
      | Completion        | Readable summary, clear CTA buttons |

  Scenario: Onboarding progress on mobile
    Given I am on a mobile device
    When I am on any onboarding step
    Then the progress indicator should be visible
    And step navigation should be accessible
    And I can easily go "Back" or "Continue"

  # ============================================================================
  # Accessibility
  # ============================================================================

  Scenario: Navigate onboarding with keyboard
    Given I am on the registration page
    Then I should be able to Tab through all form fields
    And I should be able to submit forms with Enter key
    And I should be able to navigate between steps with arrow keys (if applicable)

  Scenario: Screen reader support for onboarding
    Given I am using a screen reader
    When I go through onboarding
    Then each step should announce its title and description
    And progress should be announced (e.g., "Step 2 of 5")
    And success messages should be read aloud
    And error messages should have role="alert"

  # ============================================================================
  # Error Handling
  # ============================================================================

  Scenario: Handle email sending failure
    Given I register as a new employer
    When the email service fails to send verification email
    Then I should see "Email could not be sent. Please try again."
    And I should see a "Retry" button
    When I click "Retry"
    Then the system should attempt to resend the email

  Scenario: Handle form submission failure in onboarding
    Given I am on step 1 (company profile)
    When I fill the form and click "Continue"
    And the API request fails
    Then I should see "Failed to save. Please try again."
    And my form data should be preserved
    And I should see a "Retry" button

  Scenario: Session timeout during onboarding
    Given I am halfway through onboarding
    When my session expires
    And I try to continue to the next step
    Then I should see "Session expired. Please log in again."
    And I should be redirected to login
    When I log in
    Then I should resume onboarding from where I left off

  # ============================================================================
  # Analytics & Tracking
  # ============================================================================

  Scenario: Track onboarding completion rate
    Given analytics are enabled
    When an employer completes onboarding
    Then the system should log:
      | Metric                   | Value                    |
      | onboarding_started       | timestamp                |
      | onboarding_completed     | timestamp                |
      | time_to_complete         | duration in minutes      |
      | steps_completed          | 1,2,3,4,5                |
      | job_posted_during_onboarding | true/false           |

  Scenario: Track drop-off points
    Given analytics are enabled
    When an employer abandons onboarding at step 2
    Then the system should log "onboarding_abandoned" with step_number: 2
    And this data should be used to optimize the flow

  # ============================================================================
  # Integration with Existing Features
  # ============================================================================

  Scenario: Onboarding integrates with company profile (Issue #113)
    Given I complete company profile during onboarding
    When I later visit /employer/company-profile
    Then I should see the profile I created during onboarding
    And I can edit it freely

  Scenario: Job post from onboarding appears in dashboard
    Given I created a job post during onboarding
    When I go to employer dashboard
    Then I should see my job listed under "Active Jobs"
    And I can edit or deactivate it

  Scenario: Team invitations from onboarding tracked
    Given I invited team members during onboarding
    When I go to "Team" settings
    Then I should see my invitations with status "Pending"
