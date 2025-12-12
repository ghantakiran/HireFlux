# Feature: Error States & Recovery Flows - Issue #138
# As a user
# I want to see friendly error messages with recovery suggestions
# So that I can resolve issues and continue using the application

Feature: Error States & Recovery Flows

  Background:
    Given I am on the HireFlux application

  # ============================================================================
  # Scenario 1: Network Error Handling
  # ============================================================================

  Scenario: Display friendly error message on network failure
    Given I am viewing the jobs page
    When the network connection fails
    And I try to load more jobs
    Then I should see a friendly error message
    And the error message should explain what happened
    And I should see a "Retry" button
    And the error should be logged to Sentry

  Scenario: Retry mechanism after network error
    Given I see a network error message
    When I click the "Retry" button
    Then the system should attempt to reload the data
    And the error message should disappear on success
    And the jobs should load normally

  # ============================================================================
  # Scenario 2: API Error Handling
  # ============================================================================

  Scenario: Display specific error for API failures
    Given I am submitting a job application
    When the API returns a 500 error
    Then I should see an error message saying "Something went wrong"
    And I should see a suggestion to try again later
    And the error should include a reference ID
    And the error should be logged with full context

  Scenario: Handle validation errors from API
    Given I am creating a cover letter
    When the API returns a 400 validation error
    Then I should see specific field errors
    And each error should highlight the problematic field
    And I should see suggestions to fix each error
    And I should be able to correct and retry

  # ============================================================================
  # Scenario 3: Offline Detection
  # ============================================================================

  Scenario: Detect when user goes offline
    Given I am using the application online
    When my internet connection is lost
    Then I should see an offline indicator
    And I should see a message "You're offline"
    And I should see cached content where available
    And I should not be able to submit forms

  Scenario: Detect when user comes back online
    Given I am currently offline
    When my internet connection is restored
    Then the offline indicator should disappear
    And I should see a success message "You're back online"
    And pending actions should sync automatically
    And I should be able to submit forms again

  # ============================================================================
  # Scenario 4: Authentication Errors
  # ============================================================================

  Scenario: Handle expired session gracefully
    Given I am logged in
    And my session has expired
    When I try to perform an action
    Then I should see a message "Your session has expired"
    And I should see a "Sign in again" button
    And I should be redirected to login
    And my intended action should be saved
    And after login, I should be redirected back

  Scenario: Handle invalid credentials
    Given I am on the login page
    When I enter invalid credentials
    Then I should see an error "Invalid email or password"
    And the password field should be cleared
    And the email field should remain filled
    And I should see a "Forgot password?" link

  # ============================================================================
  # Scenario 5: Form Submission Errors
  # ============================================================================

  Scenario: Prevent duplicate form submissions
    Given I am submitting an application
    When I click submit multiple times quickly
    Then only one request should be sent
    And the button should be disabled during submission
    And I should see a loading indicator
    And duplicate submissions should be prevented

  Scenario: Preserve form data on error
    Given I have filled out a long form
    When an error occurs during submission
    Then my form data should be preserved
    And I should see the error message
    And I can fix the error and resubmit
    And I don't have to re-enter all information

  # ============================================================================
  # Scenario 6: Resource Not Found (404)
  # ============================================================================

  Scenario: Handle job not found
    Given I click on a job link
    When the job no longer exists
    Then I should see a 404 error page
    And the page should say "Job not found"
    And I should see suggestions for similar jobs
    And I should see a link to browse all jobs

  Scenario: Handle resume not found
    Given I try to access a resume that was deleted
    Then I should see an error "Resume not found"
    And I should see a link to create a new resume
    And I should see a link to view my other resumes

  # ============================================================================
  # Scenario 7: Permission Errors (403)
  # ============================================================================

  Scenario: Handle insufficient permissions
    Given I am a free tier user
    When I try to access a premium feature
    Then I should see an error "Upgrade required"
    And I should see the benefits of upgrading
    And I should see a "Upgrade Now" button
    And I should see my current plan details

  # ============================================================================
  # Scenario 8: Rate Limiting
  # ============================================================================

  Scenario: Handle rate limit exceeded
    Given I have made many requests
    When I exceed the rate limit
    Then I should see an error "Too many requests"
    And I should see when I can try again
    And I should see my usage statistics
    And the retry button should be disabled temporarily

  # ============================================================================
  # Scenario 9: File Upload Errors
  # ============================================================================

  Scenario: Handle file too large
    Given I am uploading a resume
    When the file exceeds the size limit
    Then I should see an error "File too large"
    And I should see the maximum allowed size
    And I should see suggestions to compress the file
    And the upload should be cancelled

  Scenario: Handle invalid file type
    Given I am uploading a resume
    When the file is not a PDF or DOCX
    Then I should see an error "Invalid file type"
    And I should see the accepted file types
    And I should be able to select a different file

  # ============================================================================
  # Scenario 10: Error Recovery Actions
  # ============================================================================

  Scenario: Provide actionable recovery suggestions
    Given I encounter any error
    Then the error message should be user-friendly
    And I should see at least one recovery action
    And the action should be clearly labeled
    And clicking the action should resolve or help resolve the issue

  Scenario: Contact support option for unresolved errors
    Given I see an error I can't resolve
    Then I should see a "Contact Support" link
    And clicking it should open a pre-filled support form
    And the form should include error details automatically
    And I should be able to describe my issue

  # ============================================================================
  # Acceptance Criteria Validation
  # ============================================================================

  @acceptance
  Scenario: All errors have friendly messages
    Given I trigger various error scenarios
    Then all errors should use plain language
    And no errors should show technical jargon
    And all errors should be actionable

  @acceptance
  Scenario: Recovery suggestions are helpful
    Given I see any error message
    Then I should see at least one clear action
    And the action should be relevant to the error
    And following the action should help resolve the issue

  @acceptance
  Scenario: Retry mechanisms work correctly
    Given I encounter a transient error
    When I click retry
    Then the action should be attempted again
    And the retry should use exponential backoff
    And I should see retry progress

  @acceptance
  Scenario: Offline state is handled gracefully
    Given I go offline
    Then I should be notified immediately
    And cached content should still be accessible
    And form submissions should be queued
    And I should be notified when back online
