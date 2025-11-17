Feature: Job Posting CRUD with AI-Assisted Creation
  As a recruiter
  I want to create, manage, and publish job postings with AI assistance
  So that I can attract qualified candidates efficiently

  Background:
    Given I am logged in as an employer user
    And I have "professional" subscription tier
    And I am on the employer dashboard

  # ============================================================================
  # 1. JOB LIST PAGE - Browse and Filter Jobs
  # ============================================================================

  @job-posting @list @happy-path
  Scenario: View all job postings with default sort
    Given I navigate to "/employer/jobs"
    When the page loads
    Then I should see a list of my job postings
    And jobs should be sorted by "created_at" descending
    And I should see the following columns:
      | Column             | Description                          |
      | Job Title          | Position title                       |
      | Department         | Team or department                   |
      | Location           | Work location or remote              |
      | Status             | draft, active, paused, closed        |
      | Applications       | Count of applications received       |
      | Views              | Number of views                      |
      | Avg Fit Index      | Average candidate match score        |
      | Created Date       | When job was created                 |
      | Actions            | Edit, Pause/Resume, Close, Delete    |

  @job-posting @list @filters
  Scenario: Filter jobs by status
    Given I am on "/employer/jobs"
    And I have jobs with various statuses:
      | Status  | Count |
      | draft   | 3     |
      | active  | 5     |
      | paused  | 2     |
      | closed  | 4     |
    When I select filter "Status: Active"
    Then I should see only 5 jobs
    And all displayed jobs should have status "active"

  @job-posting @list @filters
  Scenario: Filter jobs by department
    Given I am on "/employer/jobs"
    And I have jobs in departments:
      | Department   | Count |
      | Engineering  | 7     |
      | Sales        | 3     |
      | Marketing    | 2     |
    When I select filter "Department: Engineering"
    Then I should see only 7 jobs
    And all displayed jobs should have department "Engineering"

  @job-posting @list @filters
  Scenario: Search jobs by title
    Given I am on "/employer/jobs"
    And I have jobs with titles:
      | Title                          |
      | Senior Software Engineer       |
      | Junior Software Engineer       |
      | Product Manager                |
      | Engineering Manager            |
    When I search for "Software Engineer"
    Then I should see 2 jobs
    And results should include "Senior Software Engineer"
    And results should include "Junior Software Engineer"

  @job-posting @list @pagination
  Scenario: Paginate through job listings
    Given I am on "/employer/jobs"
    And I have 35 job postings
    And pagination is set to 20 per page
    When the page loads
    Then I should see 20 jobs on page 1
    When I click "Next Page"
    Then I should see 15 jobs on page 2

  @job-posting @list @empty-state
  Scenario: View empty state when no jobs exist
    Given I am on "/employer/jobs"
    And I have 0 job postings
    Then I should see empty state message "No jobs posted yet"
    And I should see a button "Create Your First Job"
    When I click "Create Your First Job"
    Then I should be redirected to "/employer/jobs/new"

  @job-posting @list @actions
  Scenario: Quick actions from job list
    Given I am on "/employer/jobs"
    And I have an active job "Senior Developer"
    When I click "Edit" action for "Senior Developer"
    Then I should be redirected to "/employer/jobs/{id}/edit"

  # ============================================================================
  # 2. JOB CREATION - Manual Entry (Without AI)
  # ============================================================================

  @job-posting @create @manual @happy-path
  Scenario: Create a job posting with manual entry
    Given I navigate to "/employer/jobs/new"
    When I fill in job details:
      | Field             | Value                          |
      | Title             | Senior Software Engineer       |
      | Department        | Engineering                    |
      | Location          | San Francisco, CA              |
      | Location Type     | On-site                        |
      | Employment Type   | Full-time                      |
      | Experience Level  | Senior                         |
      | Salary Min        | 150000                         |
      | Salary Max        | 200000                         |
      | Salary Currency   | USD                            |
    And I fill in description "We are seeking a talented Senior Software Engineer..."
    And I add requirements:
      | Requirement                              |
      | 5+ years of software development         |
      | Strong Python and JavaScript skills      |
      | Experience with cloud platforms (AWS)    |
    And I add responsibilities:
      | Responsibility                           |
      | Design and build scalable backend systems|
      | Lead technical design discussions        |
      | Mentor junior engineers                  |
    And I add skills:
      | Skill       |
      | Python      |
      | JavaScript  |
      | React       |
      | AWS         |
      | PostgreSQL  |
    And I click "Save as Draft"
    Then I should see success message "Job saved as draft"
    And the job should be saved with status "draft"
    And I should be redirected to "/employer/jobs"

  @job-posting @create @manual @validation
  Scenario: Validate required fields on job creation
    Given I am on "/employer/jobs/new"
    When I click "Save as Draft" without filling required fields
    Then I should see validation errors:
      | Field             | Error Message                    |
      | Title             | Job title is required            |
      | Department        | Department is required           |
      | Location          | Location is required             |
      | Description       | Job description is required      |

  @job-posting @create @manual @skills-autocomplete
  Scenario: Use skills autocomplete
    Given I am on "/employer/jobs/new"
    And I am in the "Skills" field
    When I type "Pyth"
    Then I should see skill suggestions:
      | Skill      |
      | Python     |
      | Python 3   |
      | PyTorch    |
    When I select "Python" from suggestions
    Then "Python" should be added to selected skills
    And the input should clear for next skill

  # ============================================================================
  # 3. AI JOB DESCRIPTION GENERATION
  # ============================================================================

  @job-posting @ai-generation @happy-path
  Scenario: Generate job description with AI from minimal input
    Given I am on "/employer/jobs/new"
    When I fill in:
      | Field             | Value                          |
      | Title             | Senior Software Engineer       |
      | Experience Level  | Senior                         |
      | Location          | San Francisco, CA              |
    And I enter AI key points:
      | Key Point                             |
      | Build scalable backend systems        |
      | Lead technical design                 |
      | Mentor junior engineers               |
    And I click "Generate with AI"
    Then I should see a loading indicator "Generating job description..."
    And within 6 seconds I should see AI-generated content:
      | Field            | Generated Content                                  |
      | Description      | We are seeking a Senior Software Engineer...       |
      | Requirements     | 5+ years experience, Python, Node.js expertise     |
      | Responsibilities | Design and build distributed systems...            |
      | Suggested Skills | Python, React, AWS, Kubernetes, PostgreSQL         |
    And the tone should be "professional"

  @job-posting @ai-generation @tone-selection
  Scenario: Generate job description with different tones
    Given I am on "/employer/jobs/new"
    And I have filled basic job information
    When I select AI tone "casual"
    And I click "Generate with AI"
    Then the generated description should use casual language
    And it should avoid overly formal phrasing

  @job-posting @ai-generation @tone-selection
  Scenario Outline: Generate with different AI tones
    Given I am on "/employer/jobs/new"
    And I have filled basic job information
    When I select AI tone "<tone>"
    And I click "Generate with AI"
    Then the generated description should match "<tone>" style

    Examples:
      | tone         |
      | formal       |
      | casual       |
      | concise      |

  @job-posting @ai-generation @skills-extraction
  Scenario: AI automatically suggests relevant skills
    Given I am on "/employer/jobs/new"
    When I generate job description for "Machine Learning Engineer"
    Then AI should suggest skills:
      | Skill              |
      | Python             |
      | TensorFlow         |
      | PyTorch            |
      | Scikit-learn       |
      | Deep Learning      |
      | Neural Networks    |
    And I can accept or remove any suggested skill

  @job-posting @ai-generation @salary-suggestion
  Scenario: AI suggests salary range based on role and location
    Given I am on "/employer/jobs/new"
    When I fill in:
      | Field             | Value                    |
      | Title             | Senior Software Engineer |
      | Experience Level  | Senior                   |
      | Location          | San Francisco, CA        |
    And I click "Suggest Salary Range"
    Then I should see AI-suggested salary range:
      | Min     | Max     | Currency |
      | 150000  | 200000  | USD      |
    And I should see explanation "Based on senior level in San Francisco, CA"
    And I can adjust the suggested range manually

  @job-posting @ai-generation @error-handling
  Scenario: Handle AI generation timeout
    Given I am on "/employer/jobs/new"
    And the AI service is slow to respond
    When I click "Generate with AI"
    And the request exceeds 10 seconds
    Then I should see error "AI generation timed out. Please try again."
    And my form data should be preserved
    And I should see a "Retry" button

  @job-posting @ai-generation @error-handling
  Scenario: Handle AI service unavailable
    Given I am on "/employer/jobs/new"
    And the AI service is unavailable
    When I click "Generate with AI"
    Then I should see error "AI service temporarily unavailable"
    And I should be able to create job manually without AI

  # ============================================================================
  # 4. JOB TEMPLATES
  # ============================================================================

  @job-posting @templates @happy-path
  Scenario: Use a job template to quick-start creation
    Given I am on "/employer/jobs/new"
    And I have saved templates:
      | Template Name              | Department  |
      | Software Engineer Template | Engineering |
      | Sales Rep Template         | Sales       |
    When I click "Use Template"
    And I select "Software Engineer Template"
    Then all fields should be pre-filled from template:
      | Field             | Value                          |
      | Title             | Software Engineer              |
      | Department        | Engineering                    |
      | Description       | [Template description]         |
      | Requirements      | [Template requirements]        |
      | Responsibilities  | [Template responsibilities]    |
      | Skills            | [Template skills]              |
    And I can modify any pre-filled field

  @job-posting @templates @save-as-template
  Scenario: Save current job as a template
    Given I am on "/employer/jobs/new"
    And I have filled all job details
    When I click "Save as Template"
    And I enter template name "DevOps Engineer Template"
    And I click "Confirm"
    Then I should see success message "Template saved"
    And the template should appear in my templates library

  @job-posting @templates @manage
  Scenario: View and manage job templates
    Given I am on "/employer/jobs/new"
    When I click "Manage Templates"
    Then I should see my templates library
    And I can edit existing templates
    And I can delete templates
    And I can create new blank templates

  # ============================================================================
  # 5. JOB EDITING
  # ============================================================================

  @job-posting @edit @happy-path
  Scenario: Edit an existing job posting
    Given I have a job with id "job-123"
    When I navigate to "/employer/jobs/job-123/edit"
    Then all job fields should be pre-filled
    When I update:
      | Field             | New Value                      |
      | Title             | Senior Software Engineer II    |
      | Salary Max        | 210000                         |
    And I click "Update Job"
    Then I should see success message "Job updated successfully"
    And the job should be saved with updated values

  @job-posting @edit @draft-to-active
  Scenario: Publish a draft job
    Given I have a draft job "Backend Developer"
    When I navigate to "/employer/jobs/{id}/edit"
    And I click "Publish Job"
    Then I should see confirmation "Are you sure you want to publish this job?"
    When I confirm
    Then the job status should change to "active"
    And I should see success message "Job published successfully"
    And the job should appear on job boards

  @job-posting @edit @pause-job
  Scenario: Pause an active job
    Given I have an active job "Frontend Developer"
    When I navigate to "/employer/jobs/{id}"
    And I click "Pause Job"
    Then the job status should change to "paused"
    And the job should stop accepting applications
    And I should see message "Job paused. No new applications will be accepted."

  @job-posting @edit @resume-job
  Scenario: Resume a paused job
    Given I have a paused job "Full Stack Developer"
    When I navigate to "/employer/jobs/{id}"
    And I click "Resume Job"
    Then the job status should change to "active"
    And the job should accept applications again
    And I should see message "Job resumed and is now active"

  @job-posting @edit @close-job
  Scenario: Close a job posting
    Given I have an active job "Data Engineer"
    When I navigate to "/employer/jobs/{id}"
    And I click "Close Job"
    Then I should see confirmation "Are you sure you want to close this job? This action cannot be undone."
    When I confirm
    Then the job status should change to "closed"
    And the job should no longer accept applications
    And existing applications should remain accessible

  # ============================================================================
  # 6. JOB DELETION
  # ============================================================================

  @job-posting @delete @happy-path
  Scenario: Delete a draft job
    Given I have a draft job "DevOps Engineer"
    When I navigate to "/employer/jobs/{id}"
    And I click "Delete Job"
    Then I should see confirmation "Are you sure you want to delete this job?"
    When I confirm
    Then the job should be deleted
    And I should be redirected to "/employer/jobs"
    And I should see message "Job deleted successfully"

  @job-posting @delete @prevent-deletion
  Scenario: Prevent deletion of job with applications
    Given I have an active job "Product Manager"
    And the job has 5 applications
    When I try to delete the job
    Then I should see error "Cannot delete job with existing applications. Please close the job instead."
    And the delete action should be disabled

  # ============================================================================
  # 7. JOB PREVIEW
  # ============================================================================

  @job-posting @preview @happy-path
  Scenario: Preview job before publishing
    Given I am creating a new job
    And I have filled all job details
    When I click "Preview"
    Then I should see a modal with job preview
    And the preview should show:
      | Section          | Description                          |
      | Job Title        | As entered                           |
      | Company Name     | My company name                      |
      | Location         | Location and type                    |
      | Salary Range     | If provided                          |
      | Description      | Formatted description                |
      | Requirements     | Bulleted list                        |
      | Responsibilities | Bulleted list                        |
      | Skills           | Tag pills                            |
      | Apply Button     | Visible (non-functional in preview)  |
    And I can close the preview to continue editing

  # ============================================================================
  # 8. RICH TEXT EDITOR
  # ============================================================================

  @job-posting @rich-text-editor @formatting
  Scenario: Format job description with rich text editor
    Given I am on "/employer/jobs/new"
    And I am in the "Description" field
    When I select text and click "Bold"
    Then the text should be bold
    When I click "Bullet List"
    Then a bulleted list should be inserted
    And I can add list items

  @job-posting @rich-text-editor @features
  Scenario: Use rich text editor features
    Given I am editing job description
    Then I should have access to:
      | Feature        | Description                     |
      | Bold           | Make text bold                  |
      | Italic         | Make text italic                |
      | Underline      | Underline text                  |
      | Bullet List    | Create bulleted lists           |
      | Numbered List  | Create numbered lists           |
      | Headings       | H1, H2, H3 headings             |
      | Links          | Insert hyperlinks               |
      | Clear Format   | Remove all formatting           |

  # ============================================================================
  # 9. PERFORMANCE & LOADING STATES
  # ============================================================================

  @job-posting @performance @loading
  Scenario: Job list loads quickly
    Given I navigate to "/employer/jobs"
    When the page starts loading
    Then I should see loading skeleton for job list
    And the job list should load within 500ms
    And skeleton should be replaced with actual data

  @job-posting @performance @ai-generation
  Scenario: AI generation provides feedback
    Given I am on "/employer/jobs/new"
    When I click "Generate with AI"
    Then I should immediately see loading state "Generating..."
    And a progress indicator should be visible
    And the form should be disabled during generation
    And generation should complete within 6 seconds (p95)

  @job-posting @performance @autosave
  Scenario: Auto-save draft job while editing
    Given I am creating a job
    When I pause typing for 3 seconds
    Then the job should auto-save as draft
    And I should see indicator "Draft saved at 10:45 AM"
    And if I navigate away, my changes should persist

  # ============================================================================
  # 10. ANALYTICS & INSIGHTS
  # ============================================================================

  @job-posting @analytics @job-performance
  Scenario: View job performance metrics
    Given I have an active job "Backend Engineer"
    When I navigate to "/employer/jobs/{id}"
    Then I should see performance metrics:
      | Metric            | Example Value |
      | Views             | 127           |
      | Applications      | 15            |
      | Avg Fit Index     | 82.5          |
      | Application Rate  | 11.8%         |
      | Time Posted       | 5 days ago    |
    And I can view detailed analytics

  @job-posting @analytics @conversion-funnel
  Scenario: View application conversion funnel
    Given I have a job with analytics data
    When I view job details
    Then I should see conversion funnel:
      | Stage                | Count | Percentage |
      | Job Views            | 500   | 100%       |
      | Apply Clicks         | 75    | 15%        |
      | Applications Started | 50    | 10%        |
      | Applications Submitted | 35  | 7%         |

  # ============================================================================
  # 11. PERMISSIONS & ACCESS CONTROL
  # ============================================================================

  @job-posting @permissions @owner
  Scenario: Owner can perform all job operations
    Given I am logged in as company "Owner"
    Then I can create, edit, publish, pause, close, and delete jobs

  @job-posting @permissions @admin
  Scenario: Admin can manage all jobs
    Given I am logged in as company "Admin"
    Then I can create, edit, publish, pause, and close jobs
    But I cannot delete jobs

  @job-posting @permissions @manager
  Scenario: Manager can edit assigned jobs
    Given I am logged in as company "Manager"
    Then I can edit jobs assigned to my department
    But I cannot edit jobs from other departments
    And I cannot delete any jobs

  @job-posting @permissions @recruiter
  Scenario: Recruiter can create and edit jobs
    Given I am logged in as company "Recruiter"
    Then I can create new jobs
    And I can edit jobs I created
    But I cannot delete jobs
    And I cannot close jobs (only pause)

  @job-posting @permissions @viewer
  Scenario: Viewer can only view jobs
    Given I am logged in as company "Viewer"
    Then I can view job list
    And I can view job details
    But I cannot create, edit, or delete jobs

  # ============================================================================
  # 12. SUBSCRIPTION TIER LIMITS
  # ============================================================================

  @job-posting @subscription @starter
  Scenario: Starter tier can create 1 active job
    Given I have "starter" subscription tier
    And I have 1 active job
    When I try to publish another job
    Then I should see error "You have reached your active jobs limit (1/1)"
    And I should see upgrade prompt "Upgrade to Growth plan for 10 active jobs"

  @job-posting @subscription @growth
  Scenario: Growth tier can create 10 active jobs
    Given I have "growth" subscription tier
    And I have 10 active jobs
    When I try to publish another job
    Then I should see error "You have reached your active jobs limit (10/10)"
    And I should see upgrade prompt "Upgrade to Professional plan for unlimited jobs"

  @job-posting @subscription @professional
  Scenario: Professional tier has unlimited active jobs
    Given I have "professional" subscription tier
    And I have 25 active jobs
    When I create another job
    Then it should publish successfully
    And I should see no limit warnings

  # ============================================================================
  # 13. ERROR HANDLING & EDGE CASES
  # ============================================================================

  @job-posting @error-handling @network
  Scenario: Handle network error during job creation
    Given I am creating a job
    And the network connection is lost
    When I click "Save as Draft"
    Then I should see error "Network error. Please check your connection."
    And the form data should be preserved in local storage
    And I should see a "Retry" button

  @job-posting @error-handling @api-failure
  Scenario: Handle API error during job creation
    Given I am creating a job
    And the API returns 500 error
    When I click "Save as Draft"
    Then I should see error "Something went wrong. Please try again."
    And my form data should be preserved
    And I should see a "Retry" button

  @job-posting @error-handling @unauthorized
  Scenario: Handle session expiration during job editing
    Given I am editing a job
    And my session expires
    When I click "Update Job"
    Then I should see message "Your session has expired"
    And I should be redirected to login
    And after login, I should return to the job edit page with data preserved

  @job-posting @edge-cases @concurrent-edit
  Scenario: Handle concurrent edits by team members
    Given I am editing job "Software Engineer"
    And another user saves changes to the same job
    When I try to save my changes
    Then I should see warning "This job was updated by [User Name] 2 minutes ago"
    And I should see option to "View Latest Version" or "Override"

  @job-posting @edge-cases @bulk-operations
  Scenario: Bulk close multiple jobs
    Given I am on "/employer/jobs"
    And I have 5 active jobs selected
    When I click "Bulk Actions" > "Close Selected"
    Then I should see confirmation "Close 5 jobs?"
    When I confirm
    Then all 5 jobs should be closed
    And I should see success message "5 jobs closed successfully"

  # ============================================================================
  # 14. RESPONSIVE DESIGN
  # ============================================================================

  @job-posting @responsive @mobile
  Scenario: Create job on mobile device
    Given I am on a mobile device (375px width)
    When I navigate to "/employer/jobs/new"
    Then the form should be mobile-optimized
    And inputs should be touch-friendly (48px min height)
    And the AI generation button should be accessible
    And I can scroll through all sections

  @job-posting @responsive @tablet
  Scenario: View job list on tablet
    Given I am on a tablet device (768px width)
    When I navigate to "/employer/jobs"
    Then the job list should show 2 columns
    And filters should be accessible from a sidebar
    And all actions should be visible

  # ============================================================================
  # 15. ACCESSIBILITY (WCAG 2.1 AA)
  # ============================================================================

  @job-posting @accessibility @keyboard
  Scenario: Navigate job creation form with keyboard
    Given I am on "/employer/jobs/new"
    When I use Tab key
    Then I can navigate through all form fields
    And I can activate buttons with Enter/Space
    And I can close modals with Escape

  @job-posting @accessibility @screen-reader
  Scenario: Job creation form is screen reader accessible
    Given I am using a screen reader
    When I navigate to "/employer/jobs/new"
    Then all form fields should have proper labels
    And error messages should be announced
    And AI generation status should be announced
    And success messages should be announced

  @job-posting @accessibility @focus
  Scenario: Visible focus indicators on all interactive elements
    Given I am on "/employer/jobs/new"
    When I navigate with keyboard
    Then all focused elements should have visible focus rings
    And focus should be trapped in modals
    And focus should return to trigger element when modal closes

  # ============================================================================
  # 16. DATA VALIDATION
  # ============================================================================

  @job-posting @validation @salary-range
  Scenario: Validate salary range min/max
    Given I am on "/employer/jobs/new"
    When I enter:
      | Salary Min | Salary Max |
      | 150000     | 100000     |
    And I try to save
    Then I should see error "Maximum salary must be greater than minimum salary"

  @job-posting @validation @character-limits
  Scenario: Enforce character limits on text fields
    Given I am on "/employer/jobs/new"
    When I enter a job title with 200 characters
    Then I should see warning "Title must be 100 characters or less"
    And the save button should be disabled

  @job-posting @validation @required-skills
  Scenario: Require at least 3 skills
    Given I am on "/employer/jobs/new"
    When I try to publish with only 2 skills
    Then I should see warning "Please add at least 3 skills"
    And I should be able to save as draft

  # ============================================================================
  # 17. INTEGRATION WITH OTHER FEATURES
  # ============================================================================

  @job-posting @integration @dashboard
  Scenario: View job metrics from dashboard
    Given I am on "/employer/dashboard"
    When I view "Top Performing Jobs"
    Then I should see my jobs ranked by applications
    When I click on a job
    Then I should navigate to job details page

  @job-posting @integration @applications
  Scenario: View applications for a job
    Given I have a job with 10 applications
    When I navigate to "/employer/jobs/{id}"
    And I click "View Applications (10)"
    Then I should be redirected to "/employer/jobs/{id}/applications"
    And I should see all 10 applications for this job

  @job-posting @integration @ats
  Scenario: Job is integrated with ATS pipeline
    Given I create and publish a job
    When applications are received
    Then they should automatically appear in the ATS pipeline
    And the first stage should be "New"

  # ============================================================================
  # 18. CACHING & OPTIMIZATION
  # ============================================================================

  @job-posting @caching @list-page
  Scenario: Job list is cached for performance
    Given I am on "/employer/jobs"
    And the job list is loaded
    When I navigate away and return within 5 minutes
    Then the job list should load instantly from cache
    And I should see a "Refresh" button to get latest data

  @job-posting @caching @ai-suggestions
  Scenario: AI skill suggestions are cached
    Given I have generated AI suggestions for "Software Engineer"
    When I create another "Software Engineer" job
    Then AI should reuse cached skills suggestions
    And generation should be faster (<2s)

  # ============================================================================
  # 19. COMPLIANCE & LEGAL
  # ============================================================================

  @job-posting @compliance @eeo-statement
  Scenario: Include EEO statement in job posting
    Given I am creating a job
    When I publish the job
    Then an EEO (Equal Employment Opportunity) statement should be automatically appended
    And I should see "We are an equal opportunity employer..."

  @job-posting @compliance @salary-transparency
  Scenario: Comply with salary transparency laws
    Given I am posting a job in "California"
    When I try to publish without salary range
    Then I should see warning "California requires salary range disclosure"
    And I should be prompted to add salary range

  # ============================================================================
  # 20. AUDIT TRAIL
  # ============================================================================

  @job-posting @audit @job-history
  Scenario: View job edit history
    Given I have a job that was edited 3 times
    When I navigate to "/employer/jobs/{id}"
    And I click "View History"
    Then I should see audit log:
      | Timestamp           | User        | Action             | Changes                |
      | 2025-11-16 10:30 AM | John Doe    | Updated            | Changed salary max     |
      | 2025-11-15 3:45 PM  | Jane Smith  | Published          | Status: draft → active |
      | 2025-11-15 2:00 PM  | John Doe    | Created            | Initial creation       |

  @job-posting @audit @status-changes
  Scenario: Track job status change history
    Given I have a job with status changes
    Then I should see status timeline:
      | Date       | Status  | Changed By  |
      | 2025-11-16 | Active  | John Doe    |
      | 2025-11-15 | Paused  | Jane Smith  |
      | 2025-11-14 | Active  | John Doe    |
      | 2025-11-13 | Draft   | John Doe    |
