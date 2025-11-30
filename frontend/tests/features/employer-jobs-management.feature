# Feature: Employer Jobs Management (Issue #79)
# 
# As an employer user
# I want to create, edit, and manage job postings
# So that I can attract qualified candidates
#
# Scope:
# - Jobs list with filters and search
# - Create job wizard (5 steps)
# - Edit job functionality
# - Draft autosave
# - Job preview
# - Per-section validation

Feature: Employer Jobs Management

  Background:
    Given I am logged in as an employer user
    And I have completed onboarding
    And I am on the employer dashboard

  # ============================================================================
  # 1. Jobs List - Display & Navigation
  # ============================================================================

  Scenario: Access jobs list from employer dashboard
    When I click "Jobs" in the navigation
    Then I should see the jobs list page
    And I should see a "Create New Job" button
    And I should see job statistics (total jobs, active, draft, closed)

  Scenario: Display empty jobs list for new employer
    Given I have no jobs posted
    When I navigate to the jobs list page
    Then I should see an empty state message
    And I should see "Create Your First Job" button
    And I should see helpful tips for creating a job

  Scenario: Display jobs list with multiple jobs
    Given I have 5 jobs posted (2 active, 2 draft, 1 closed)
    When I navigate to the jobs list page
    Then I should see 5 job cards
    And each job card should display:
      | title          |
      | department     |
      | location       |
      | status badge   |
      | applicant count|
      | created date   |
      | edit button    |

  # ============================================================================
  # 2. Jobs List - Filters & Search
  # ============================================================================

  Scenario: Filter jobs by status
    Given I have 5 jobs (2 active, 2 draft, 1 closed)
    When I click the "Active" filter
    Then I should see only 2 active jobs
    When I click the "Draft" filter
    Then I should see only 2 draft jobs

  Scenario: Search jobs by title
    Given I have jobs with titles "Senior Engineer", "Junior Designer", "Product Manager"
    When I type "Engineer" in the search box
    Then I should see only jobs containing "Engineer" in the title
    And I should see 1 job result

  Scenario: Clear all filters
    Given I have applied filters (status: "Active", search: "Engineer")
    When I click "Clear Filters"
    Then all filters should be reset
    And I should see all my jobs

  # ============================================================================
  # 3. Jobs List - Sorting
  # ============================================================================

  Scenario: Sort jobs by date (newest first)
    Given I have 3 jobs created on different dates
    When I select "Newest First" from the sort dropdown
    Then jobs should be ordered by creation date descending

  Scenario: Sort jobs by applicant count
    Given I have jobs with 10, 5, 15 applicants
    When I select "Most Applicants" from the sort dropdown
    Then jobs should be ordered by applicant count descending (15, 10, 5)

  # ============================================================================
  # 4. Create Job Wizard - Access & Navigation
  # ============================================================================

  Scenario: Access create job wizard
    When I click "Create New Job" button
    Then I should see the job creation wizard
    And I should see step indicators (5 steps)
    And I should see "Step 1: Basics" as active

  Scenario: Navigate through wizard steps
    Given I am on the job creation wizard
    When I complete step 1 and click "Next"
    Then I should be on step 2
    And step 1 should be marked as complete
    When I click "Back"
    Then I should be on step 1
    And my previously entered data should be preserved

  Scenario: Exit wizard without saving
    Given I am on step 2 of the job creation wizard
    And I have entered some data
    When I click "Cancel"
    Then I should see a confirmation dialog "You have unsaved changes. Are you sure?"
    When I click "Leave" in the dialog
    Then I should be redirected to the jobs list
    And no draft should be saved

  # ============================================================================
  # 5. Step 1: Basics - Required Fields
  # ============================================================================

  Scenario: Display job basics form
    Given I am on step 1 of the job creation wizard
    Then I should see the following fields:
      | Job Title       | required |
      | Department      | required |
      | Location        | required |
      | Employment Type | required |
      | Remote Options  | optional |

  Scenario: Complete step 1 with valid data
    Given I am on step 1 of the job creation wizard
    When I enter job title "Senior Software Engineer"
    And I enter department "Engineering"
    And I enter location "San Francisco, CA"
    And I select employment type "Full-time"
    And I click "Next"
    Then I should be on step 2
    And my data should be saved as a draft

  Scenario: Validate required fields on step 1
    Given I am on step 1 of the job creation wizard
    When I leave job title empty
    And I click "Next"
    Then I should see error "Job title is required"
    And I should remain on step 1

  # ============================================================================
  # 6. Step 2: Description - Job Description & Responsibilities
  # ============================================================================

  Scenario: Display job description form
    Given I am on step 2 of the job creation wizard
    Then I should see the following fields:
      | Job Description    | textarea, required |
      | Responsibilities   | textarea, required |
      | AI Generate button | optional           |

  Scenario: Generate job description with AI
    Given I am on step 2 of the job creation wizard
    And I have completed step 1 with job title "Senior Software Engineer"
    When I click "Generate with AI" button
    Then I should see a loading indicator
    And after 2 seconds I should see AI-generated description
    And the description should include:
      | About the Role       |
      | Key Responsibilities |
      | What You'll Do       |

  Scenario: Complete step 2 manually
    Given I am on step 2 of the job creation wizard
    When I enter job description "We're looking for a Senior Software Engineer..."
    And I enter responsibilities "Build scalable systems..."
    And I click "Next"
    Then I should be on step 3
    And my data should be auto-saved

  # ============================================================================
  # 7. Step 3: Requirements - Skills, Experience, Education
  # ============================================================================

  Scenario: Display requirements form
    Given I am on step 3 of the job creation wizard
    Then I should see the following fields:
      | Required Skills     | multi-select, required |
      | Nice-to-Have Skills | multi-select, optional |
      | Years of Experience | number, required       |
      | Education Level     | dropdown, required     |

  Scenario: Add multiple skills
    Given I am on step 3 of the job creation wizard
    When I type "React" in the required skills field
    And I press Enter
    Then "React" should be added as a skill tag
    When I add "TypeScript", "Node.js", "PostgreSQL"
    Then I should see 4 skill tags
    And I should be able to remove a skill tag by clicking the X

  Scenario: Validate minimum requirements
    Given I am on step 3 of the job creation wizard
    When I leave required skills empty
    And I click "Next"
    Then I should see error "At least one required skill is needed"
    When I leave years of experience empty
    And I click "Next"
    Then I should see error "Years of experience is required"

  # ============================================================================
  # 8. Step 4: Compensation - Salary & Benefits
  # ============================================================================

  Scenario: Display compensation form
    Given I am on step 4 of the job creation wizard
    Then I should see the following fields:
      | Salary Range Min | number, required |
      | Salary Range Max | number, required |
      | Salary Currency  | dropdown         |
      | Benefits         | multi-select     |

  Scenario: Enter salary range
    Given I am on step 4 of the job creation wizard
    When I enter salary min "$100,000"
    And I enter salary max "$150,000"
    And I click "Next"
    Then I should be on step 5

  Scenario: Validate salary range
    Given I am on step 4 of the job creation wizard
    When I enter salary min "$150,000"
    And I enter salary max "$100,000"
    And I click "Next"
    Then I should see error "Maximum salary must be greater than minimum"

  Scenario: Select benefits
    Given I am on step 4 of the job creation wizard
    When I select the following benefits:
      | Health Insurance     |
      | 401(k) Matching      |
      | Remote Work          |
      | Unlimited PTO        |
    Then I should see 4 benefit tags
    And I should be able to remove a benefit tag

  # ============================================================================
  # 9. Step 5: Review & Publish
  # ============================================================================

  Scenario: Display job preview
    Given I have completed steps 1-4
    And I am on step 5 (Review)
    Then I should see a preview of my job posting
    And the preview should include all entered data:
      | Job Title            |
      | Department & Location|
      | Employment Type      |
      | Job Description      |
      | Responsibilities     |
      | Required Skills      |
      | Experience Level     |
      | Salary Range         |
      | Benefits             |

  Scenario: Edit from review step
    Given I am on step 5 (Review)
    When I click "Edit" next to "Job Title"
    Then I should be taken back to step 1
    And I should be able to modify the job title
    When I navigate forward to step 5 again
    Then I should see my updated job title in the preview

  Scenario: Publish job
    Given I am on step 5 (Review)
    When I click "Publish Job" button
    Then I should see a success message "Job posted successfully!"
    And I should be redirected to the jobs list
    And I should see my new job in the active jobs list
    And the job status should be "Active"

  Scenario: Save as draft
    Given I am on step 5 (Review)
    When I click "Save as Draft" button
    Then I should see a success message "Job saved as draft"
    And I should be redirected to the jobs list
    And I should see my new job in the draft jobs list
    And the job status should be "Draft"

  # ============================================================================
  # 10. Draft Autosave
  # ============================================================================

  Scenario: Autosave draft on step completion
    Given I am on step 1 of the job creation wizard
    When I enter job title "Test Job"
    And I click "Next"
    Then a draft should be automatically saved
    And I should see a "Draft saved" indicator

  Scenario: Resume draft from jobs list
    Given I have a draft job "Test Job" at step 3
    When I navigate to the jobs list
    And I click "Edit" on the draft job
    Then I should be taken to step 3 of the wizard
    And my previously entered data should be pre-filled

  Scenario: Autosave every 30 seconds
    Given I am on step 2 of the job creation wizard
    When I start typing in the description field
    And 30 seconds pass
    Then I should see "Draft auto-saved" message
    And my data should be persisted

  # ============================================================================
  # 11. Edit Existing Job
  # ============================================================================

  Scenario: Edit an active job
    Given I have an active job "Senior Engineer"
    When I click "Edit" on the job card
    Then I should see the job wizard pre-filled with existing data
    And I should be on step 1
    And all fields should contain the saved values

  Scenario: Update job and republish
    Given I am editing an existing job
    When I update the job title to "Staff Engineer"
    And I navigate through all steps to Review
    And I click "Update Job"
    Then I should see "Job updated successfully!"
    And the job should remain "Active"
    And applicants should see the updated job

  Scenario: Unpublish job to draft
    Given I am editing an active job with 5 applicants
    When I navigate to Review step
    And I click "Save as Draft"
    Then I should see a warning "This job has 5 applicants. Saving as draft will hide it from job seekers."
    When I confirm "Save as Draft"
    Then the job status should change to "Draft"
    And the job should be hidden from job seekers

  # ============================================================================
  # 12. Job Card Actions
  # ============================================================================

  Scenario: View job applicants from jobs list
    Given I have a job with 10 applicants
    When I click "View Applicants" on the job card
    Then I should be taken to the applicants page for that job

  Scenario: Duplicate existing job
    Given I have a job "Senior Engineer"
    When I click the "..." menu on the job card
    And I select "Duplicate"
    Then I should see the job wizard
    And all fields should be pre-filled with copied data
    And the job title should be "Copy of Senior Engineer"
    And the job should start as a draft

  Scenario: Close job posting
    Given I have an active job "Senior Engineer" with 3 applicants
    When I click "..." menu and select "Close Job"
    Then I should see a confirmation "Are you sure? This will hide the job from candidates."
    When I confirm "Close Job"
    Then the job status should change to "Closed"
    And the job should no longer accept new applicants

  Scenario: Delete draft job
    Given I have a draft job "Test Job" with 0 applicants
    When I click "..." menu and select "Delete"
    Then I should see a confirmation "Delete this draft? This cannot be undone."
    When I confirm "Delete"
    Then the job should be removed from the jobs list

  Scenario: Prevent deletion of job with applicants
    Given I have a job with 5 applicants
    When I click "..." menu
    Then I should not see a "Delete" option
    And I should only see "Edit", "Close", and "Duplicate"

  # ============================================================================
  # 13. Validation & Error Handling
  # ============================================================================

  Scenario: Handle network errors during publish
    Given I am on step 5 (Review)
    When I click "Publish Job" button
    And the API returns an error
    Then I should see an error message "Failed to publish job. Please try again."
    And I should remain on step 5
    And I should be able to retry publishing

  Scenario: Validate employment type selection
    Given I am on step 1 of the job creation wizard
    When I leave employment type unselected
    And I click "Next"
    Then I should see error "Employment type is required"

  Scenario: Validate education level
    Given I am on step 3 of the job creation wizard
    When I leave education level unselected
    And I click "Next"
    Then I should see error "Education level is required"

  # ============================================================================
  # 14. Job Statistics & Analytics
  # ============================================================================

  Scenario: Display job statistics on jobs list
    Given I have 10 jobs (5 active, 3 draft, 2 closed)
    When I navigate to the jobs list page
    Then I should see statistics:
      | Total Jobs  | 10 |
      | Active      | 5  |
      | Draft       | 3  |
      | Closed      | 2  |

  Scenario: Display applicant count per job
    Given I have a job "Senior Engineer" with 25 applicants
    When I view the jobs list
    Then I should see "25 applicants" on the job card

  # ============================================================================
  # 15. Mobile Responsiveness
  # ============================================================================

  Scenario: View jobs list on mobile
    Given I am on a mobile device (375px width)
    When I navigate to the jobs list
    Then jobs should display in a single column
    And each job card should be touch-friendly (44px+ tap targets)
    And filters should be in a collapsible panel

  Scenario: Create job on mobile
    Given I am on a mobile device
    When I access the create job wizard
    Then the wizard should be mobile-optimized
    And form fields should be full-width
    And buttons should be large and touch-friendly

  # ============================================================================
  # 16. Accessibility
  # ============================================================================

  Scenario: Navigate wizard with keyboard
    Given I am on the job creation wizard
    When I use Tab to navigate between fields
    Then focus should move through all form fields in order
    When I press Enter on the "Next" button
    Then I should advance to the next step

  Scenario: Screen reader announcements
    Given I am using a screen reader
    When I navigate to a new wizard step
    Then the screen reader should announce "Step 2 of 5: Description"
    When validation errors occur
    Then the screen reader should announce the error messages

  # ============================================================================
  # 17. Role-Based Access Control
  # ============================================================================

  Scenario: Employer role can access job wizard
    Given I am logged in as an employer
    When I navigate to "/employer/jobs/create"
    Then I should see the job creation wizard

  Scenario: Non-employer role cannot access job wizard
    Given I am logged in as a job seeker
    When I try to navigate to "/employer/jobs/create"
    Then I should see a "403 Forbidden" error
    Or I should be redirected to the job seeker dashboard

  # ============================================================================
  # 18. Job Preview (Public View)
  # ============================================================================

  Scenario: Preview job as it will appear to candidates
    Given I am on step 5 (Review)
    When I click "Preview as Job Seeker"
    Then I should see a modal with the public job posting view
    And the preview should match the actual job seeker view
    And I should see a "Close Preview" button

  # ============================================================================
  # 19. Integration with Onboarding
  # ============================================================================

  Scenario: First job from onboarding is pre-filled
    Given I created a job during onboarding
    And the job was saved as a draft
    When I navigate to the jobs list
    Then I should see my onboarding job as a draft
    When I click "Edit" on the onboarding job
    Then all fields should be pre-filled with onboarding data

  # ============================================================================
  # 20. Bulk Actions
  # ============================================================================

  Scenario: Select multiple jobs for bulk actions
    Given I have 5 jobs in the list
    When I check the checkboxes for 3 jobs
    Then I should see a bulk actions toolbar
    And I should see options:
      | Close Selected Jobs    |
      | Change Status to Draft |

  Scenario: Bulk close jobs
    Given I have selected 3 active jobs
    When I click "Close Selected Jobs"
    Then I should see a confirmation "Close 3 jobs? They will no longer accept applicants."
    When I confirm "Close All"
    Then all 3 jobs should have status "Closed"
