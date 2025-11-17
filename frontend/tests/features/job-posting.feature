# Feature: Job Posting CRUD with AI-Assisted Creation (Issue #23)
# Priority: P0 - Critical Blocker
# Sprint: 5-6 (Weeks 9-12)
# Story Points: 13
#
# As an employer, I want to quickly create high-quality job postings with AI assistance
# so that I can fill positions faster with better candidate matches.

@job-posting @p0-critical
Feature: Job Posting CRUD with AI-Assisted Creation

  Background:
    Given I am logged in as an employer
    And my company has an active subscription
    And I am on the jobs dashboard

  # ========================================================================
  # Scenario Group 1: Job List View
  # ========================================================================

  @job-list @empty-state
  Scenario: View empty job list
    Given I have no active job postings
    When I navigate to "/employer/jobs"
    Then I should see an empty state message
    And I should see a "Create Job" button
    And I should see text "You haven't posted any jobs yet"

  @job-list @display
  Scenario: View job list with existing jobs
    Given I have 15 active job postings
    When I navigate to "/employer/jobs"
    Then I should see a list of jobs
    And I should see pagination controls
    And each job card should display:
      | Field               |
      | Job title           |
      | Location            |
      | Employment type     |
      | Posted date         |
      | Application count   |
      | Status badge        |
    And I should see "Create Job" button

  @job-list @filtering
  Scenario: Filter jobs by status
    Given I have jobs with different statuses:
      | Status | Count |
      | active | 5     |
      | paused | 3     |
      | closed | 2     |
    When I select "Active" from the status filter
    Then I should see 5 jobs
    And all visible jobs should have "Active" status badge
    When I select "Paused" from the status filter
    Then I should see 3 jobs
    And all visible jobs should have "Paused" status badge

  @job-list @search
  Scenario: Search jobs by title
    Given I have jobs with titles:
      | Title                      |
      | Senior Software Engineer   |
      | Product Manager            |
      | DevOps Engineer            |
      | Senior Product Designer    |
    When I search for "Senior"
    Then I should see 2 jobs
    And I should see "Senior Software Engineer"
    And I should see "Senior Product Designer"
    And I should not see "Product Manager"

  # ========================================================================
  # Scenario Group 2: AI Job Description Generation
  # ========================================================================

  @ai-generation @job-creation @critical
  Scenario: Generate job description with AI from minimal input
    Given I am on the job creation page
    When I enter job title "Senior Software Engineer"
    And I enter key points:
      | Key Point                              |
      | Build scalable backend systems         |
      | Lead technical design decisions        |
      | Mentor junior engineers                |
      | Work with Python, FastAPI, PostgreSQL  |
    And I click "Generate with AI" button
    Then I should see a loading indicator
    And the AI generation should complete within 6 seconds
    And I should see generated content:
      | Field            | Minimum Length |
      | Description      | 200 characters |
      | Requirements     | 4 items        |
      | Responsibilities | 5 items        |
      | Suggested skills | 6 skills       |
    And I should see token usage count
    And I should see estimated cost

  @ai-generation @performance
  Scenario: AI generation completes within performance requirements
    Given I am on the job creation page
    When I trigger AI job description generation
    And I start a performance timer
    Then the AI response should complete in less than 6000 milliseconds (p95)
    And the response should include all required fields
    And the description should be 200-500 words

  @ai-generation @skills
  Scenario: Suggest skills with AI
    Given I am creating a new job
    When I enter job title "Data Scientist"
    And I click "Suggest Skills" button
    Then I should see AI-suggested skills within 3 seconds
    And I should see at least 8 skills
    And skills should be categorized as:
      | Category         | Example Skills                    |
      | Technical Skills | Python, TensorFlow, SQL, Tableau  |
      | Soft Skills      | Communication, Problem-solving    |
    And I should be able to add/remove suggested skills

  @ai-generation @salary
  Scenario: Suggest salary range with AI
    Given I am creating a new job
    When I enter job title "Senior Software Engineer"
    And I select experience level "Senior"
    And I enter location "San Francisco, CA"
    And I click "Suggest Salary Range" button
    Then I should see AI-suggested salary range within 2 seconds
    And I should see:
      | Field       |
      | salary_min  |
      | salary_max  |
      | market_data |
    And salary_min should be less than salary_max
    And I should be able to adjust the suggested range

  # ========================================================================
  # Scenario Group 3: Job Creation (Manual & AI-Assisted)
  # ========================================================================

  @job-creation @ai-assisted
  Scenario: Create job posting with AI assistance (full flow)
    Given I am on the job creation page
    And I have 3 active jobs (out of 10 limit)
    When I generate job description with AI:
      | Field            | Value                           |
      | Title            | Product Manager                 |
      | Key Point 1      | Define product roadmap          |
      | Key Point 2      | Work with engineering and design |
      | Key Point 3      | Analyze user feedback           |
      | Experience Level | Mid                             |
      | Location         | New York, NY                    |
    And I wait for AI generation to complete
    And I review the generated content
    And I fill in additional details:
      | Field           | Value        |
      | Department      | Product      |
      | Location Type   | Hybrid       |
      | Employment Type | Full-time    |
    And I suggest skills with AI
    And I suggest salary range with AI
    And I click "Preview"
    And I review the job preview
    And I click "Publish"
    Then I should see success message "Job posted successfully"
    And I should be redirected to the job list page
    And I should see my new job "Product Manager" with "Active" status
    And I should now have 4 active jobs

  @job-creation @manual
  Scenario: Create job posting manually (without AI)
    Given I am on the job creation page
    When I skip the AI generator
    And I manually enter job details:
      | Field                | Value                                      |
      | Title                | Marketing Manager                          |
      | Department           | Marketing                                  |
      | Location             | Remote                                     |
      | Location Type        | Remote                                     |
      | Employment Type      | Full-time                                  |
      | Experience Level     | Mid                                        |
      | Description          | We are seeking a talented marketing manager... |
      | Salary Min           | 80000                                      |
      | Salary Max           | 110000                                     |
    And I manually add requirements:
      | Requirement                          |
      | 3+ years of marketing experience     |
      | Strong analytical skills             |
    And I manually add responsibilities:
      | Responsibility                       |
      | Develop marketing strategies         |
      | Manage marketing campaigns           |
    And I manually add skills:
      | Skill           |
      | SEO             |
      | Google Analytics |
      | Content Marketing |
    And I click "Publish"
    Then the job should be created successfully
    And I should see "Marketing Manager" in my job list

  @job-creation @draft
  Scenario: Save job as draft
    Given I am creating a new job
    And I have partially filled the job form
    When I click "Save as Draft" button
    Then the job should be saved with status "Draft"
    And I should see success message "Job saved as draft"
    And I should be able to continue editing later

  @job-creation @subscription-limit
  Scenario: Subscription limit prevents job creation
    Given my company has a "Growth" plan (limit: 10 active jobs)
    And I have 10 active jobs
    When I try to create a new job
    Then I should see an error message
    And the error should say "Subscription limit reached"
    And I should see a suggestion to "upgrade or close existing jobs"
    And the "Publish" button should be disabled

  @job-creation @validation
  Scenario: Job creation validation errors
    Given I am on the job creation page
    When I try to publish without required fields
    Then I should see validation errors:
      | Field       | Error Message                |
      | Title       | Job title is required        |
      | Location    | Location is required         |
      | Description | Description is required      |
    When I enter salary_max less than salary_min
    Then I should see error "Maximum salary must be greater than minimum salary"

  # ========================================================================
  # Scenario Group 4: Job Editing
  # ========================================================================

  @job-editing @update
  Scenario: Edit existing job
    Given I have an active job "Software Engineer"
    When I navigate to the job edit page
    And I update the job:
      | Field       | New Value                |
      | Title       | Senior Software Engineer |
      | Salary Min  | 130000                   |
      | Salary Max  | 170000                   |
    And I click "Update Job"
    Then I should see success message "Job updated successfully"
    And the job should be updated in the job list
    And the job should maintain its active status

  @job-editing @ai-regenerate
  Scenario: Regenerate job description with AI
    Given I am editing an existing job
    When I click "Regenerate with AI" button
    And I provide updated key points
    And I wait for AI generation
    Then I should see newly generated content
    And I should have the option to "Keep Current" or "Use New Content"

  @job-editing @status-change
  Scenario Outline: Update job status
    Given I have an <initial_status> job "Test Job"
    When I change the job status to <new_status>
    Then the job status should update to <new_status>
    And I should see a status badge showing <new_status>

    Examples:
      | initial_status | new_status |
      | active         | paused     |
      | paused         | active     |
      | active         | closed     |

  @job-editing @delete
  Scenario: Delete job with confirmation
    Given I have a job "Old Job Posting"
    When I click the delete button
    Then I should see a confirmation dialog
    And the dialog should say "Are you sure you want to delete 'Old Job Posting'?"
    When I confirm deletion
    Then the job should be soft-deleted (is_active = false)
    And I should see success message "Job deleted"
    And the job should no longer appear in the active jobs list

  # ========================================================================
  # Scenario Group 5: Rich Text Editor & Advanced Features
  # ========================================================================

  @rich-text-editor @formatting
  Scenario: Format job description with rich text editor
    Given I am creating a new job
    When I use the rich text editor
    Then I should be able to format text with:
      | Format          |
      | Bold            |
      | Italic          |
      | Underline       |
      | Bullet list     |
      | Numbered list   |
      | Hyperlinks      |
    And I should see a character count
    And I should be able to preview formatted text

  @skills-autocomplete @interaction
  Scenario: Add and remove skills with autocomplete
    Given I am creating a new job
    When I type "Pyth" in the skills field
    Then I should see autocomplete suggestions:
      | Skill           |
      | Python          |
      | Python Django   |
      | Python Flask    |
    When I select "Python"
    Then "Python" should be added as a chip
    When I click the remove button on "Python" chip
    Then "Python" should be removed from the selected skills

  @salary-range-picker @interaction
  Scenario: Adjust salary range with dual slider
    Given I am creating a new job
    When I drag the minimum salary slider to $100,000
    And I drag the maximum salary slider to $150,000
    Then the salary range should display "$100,000 - $150,000"
    When I type "120000" in the min salary input
    And I type "160000" in the max salary input
    Then the sliders should adjust to the new values

  # ========================================================================
  # Scenario Group 6: Error Handling & Edge Cases
  # ========================================================================

  @error-handling @ai-failure
  Scenario: Handle AI generation failure gracefully
    Given I am creating a new job
    When I trigger AI generation
    And the AI service fails with an error
    Then I should see a user-friendly error message
    And I should see a "Retry" button
    And I should still be able to create the job manually

  @error-handling @network-failure
  Scenario: Handle network errors during job creation
    Given I am creating a new job
    And I have filled all required fields
    When I click "Publish"
    And the network request fails
    Then I should see an error message
    And my form data should be preserved
    And I should be able to retry submission

  # ========================================================================
  # Scenario Group 7: Performance & Accessibility
  # ========================================================================

  @performance @page-load
  Scenario: Job list page loads within performance requirements
    Given I have 50 active jobs
    When I navigate to "/employer/jobs"
    Then the page should load in less than 500 milliseconds (p95)
    And I should see the first 10 jobs (pagination)

  @accessibility @wcag
  Scenario: Job creation form meets accessibility standards
    Given I am on the job creation page
    Then all form fields should have proper labels
    And all interactive elements should be keyboard-accessible
    And error messages should be announced to screen readers
    And the page should meet WCAG 2.1 AA standards

# ========================================================================
# Tags Reference:
# - @job-posting: All job posting scenarios
# - @ai-generation: AI-powered features
# - @job-creation: Job creation flows
# - @job-editing: Job editing flows
# - @job-list: Job list views
# - @performance: Performance-related tests
# - @accessibility: Accessibility tests
# - @error-handling: Error scenarios
# - @p0-critical: Critical priority scenarios
# ========================================================================
