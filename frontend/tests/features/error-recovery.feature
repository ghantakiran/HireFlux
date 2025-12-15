Feature: Error States & Recovery Flows
  As a user of HireFlux
  I want to see friendly error messages with recovery suggestions
  So that I can easily resolve issues and continue using the application

  Background:
    Given the application is configured with error handling
    And error logging is initialized
    And offline detection is active

  # ============================================================================
  # FRIENDLY ERROR MESSAGES
  # ============================================================================

  Scenario: Display friendly error message for network failure
    Given I am on the dashboard page
    When a network error occurs during data fetch
    Then I should see a friendly error message
    And the error message should explain what happened
    And the error message should avoid technical jargon
    And the error message should have a friendly tone

  Scenario: Display context-specific error messages
    Given I am on the "resume builder" page
    When an error occurs during resume generation
    Then I should see an error message specific to resume generation
    And the message should mention "resume" not generic "data"

  Scenario: Show error icons appropriate to error type
    Given I am viewing an error state
    When the error is a network error
    Then I should see a wifi/connection icon
    When the error is a server error
    Then I should see a server/cloud icon
    When the error is a validation error
    Then I should see a warning icon

  # ============================================================================
  # RECOVERY SUGGESTIONS
  # ============================================================================

  Scenario: Provide actionable recovery suggestions for network errors
    Given I am experiencing a network error
    When I view the error message
    Then I should see suggestions like:
      | suggestion |
      | Check your internet connection |
      | Try again in a few moments |
      | Contact support if problem persists |

  Scenario: Provide recovery suggestions for validation errors
    Given I submitted a form with validation errors
    When I view the error message
    Then I should see specific field errors highlighted
    And each field should have a clear fix suggestion
    And I should be able to click to jump to the error field

  Scenario: Provide recovery suggestions for authentication errors
    Given my session has expired
    When I try to perform an authenticated action
    Then I should see a message "Your session has expired"
    And I should see a "Sign in again" button
    And clicking the button should take me to the login page
    And I should be redirected back after successful login

  Scenario: Provide recovery suggestions for permission errors
    Given I don't have permission to access a resource
    When I try to access it
    Then I should see a message explaining I don't have access
    And I should see suggestions to:
      | suggestion |
      | Contact your team admin |
      | Upgrade your plan |
      | Return to dashboard |

  # ============================================================================
  # RETRY MECHANISMS
  # ============================================================================

  Scenario: Show retry button on transient errors
    Given I encountered a network timeout error
    When I view the error state
    Then I should see a "Try Again" button
    And the button should be prominently displayed
    And the button should have a retry icon

  Scenario: Retry with exponential backoff for failed requests
    Given a request failed due to server error
    When I click "Try Again"
    Then the system should retry the request
    And if it fails again, wait 2 seconds before allowing retry
    And if it fails a third time, wait 4 seconds
    And show retry attempt count "Retry attempt 2 of 5"

  Scenario: Automatic retry for transient failures
    Given I am performing a critical operation
    When a transient network error occurs
    Then the system should automatically retry up to 3 times
    And I should see a loading indicator with "Retrying..."
    And if all retries fail, show error with manual retry option

  Scenario: Show loading state during retry
    Given I clicked "Try Again" on an error
    When the system is retrying the request
    Then the "Try Again" button should show a loading spinner
    And the button should be disabled
    And I should see text "Retrying..."

  Scenario: Preserve user data on retry
    Given I filled out a form
    When submission fails with an error
    And I click "Try Again"
    Then all my form data should be preserved
    And the form should not be reset

  Scenario: Batch retry for multiple failed items
    Given I am uploading 5 resumes
    And 2 of them failed to upload
    When I view the error summary
    Then I should see "2 of 5 uploads failed"
    And I should see a "Retry Failed Items" button
    And clicking it should only retry the 2 failed items

  # ============================================================================
  # ERROR LOGGING (SENTRY)
  # ============================================================================

  Scenario: Log errors to Sentry automatically
    Given Sentry is configured
    When an unexpected error occurs
    Then the error should be logged to Sentry
    And the log should include error message
    And the log should include stack trace
    And the log should include user context
    And the log should include breadcrumbs

  Scenario: Include user context in error logs
    Given I am logged in as "test@example.com"
    When an error occurs
    Then the Sentry log should include my email
    And the log should include my user ID
    And the log should NOT include sensitive data like password

  Scenario: Include breadcrumbs in error logs
    Given I navigated from dashboard → resumes → generate
    When an error occurs during resume generation
    Then the Sentry log should include navigation breadcrumbs
    And the breadcrumbs should show the user's journey
    And the breadcrumbs should include timestamps

  Scenario: Tag errors by category
    Given Sentry is configured
    When a network error occurs
    Then the error should be tagged as "network"
    When a validation error occurs
    Then the error should be tagged as "validation"
    When an API error occurs
    Then the error should be tagged as "api"

  Scenario: Set error severity levels
    Given Sentry is configured
    When a critical error occurs (e.g., payment failure)
    Then the error severity should be "error"
    When a warning occurs (e.g., slow API)
    Then the error severity should be "warning"
    When info is logged (e.g., retry success)
    Then the error severity should be "info"

  # ============================================================================
  # OFFLINE DETECTION
  # ============================================================================

  Scenario: Detect when user goes offline
    Given I am online and using the application
    When my internet connection is lost
    Then I should see an offline banner within 2 seconds
    And the banner should say "You're offline"
    And the banner should be at the top of the page
    And the banner should have a distinct color (e.g., yellow/orange)

  Scenario: Detect when user comes back online
    Given I am offline
    When my internet connection is restored
    Then the offline banner should disappear
    And I should see a success message "You're back online"
    And the success message should auto-dismiss after 3 seconds
    And any pending actions should automatically retry

  Scenario: Disable actions that require internet when offline
    Given I am offline
    When I view the dashboard
    Then any action requiring internet should be disabled
    And disabled actions should have a tooltip "Requires internet connection"
    And the UI should clearly indicate which features are unavailable

  Scenario: Show offline-capable features when offline
    Given I am offline
    When I view the application
    Then I should still be able to view cached data
    And I should be able to draft resumes offline
    And I should be able to prepare cover letters offline
    And changes should be queued for sync when online

  Scenario: Queue actions when offline
    Given I am offline
    When I try to submit a job application
    Then the application should be queued
    And I should see "Application queued - will submit when online"
    And when I come back online, the queue should auto-process

  Scenario: Show offline status in UI
    Given I am offline
    When I view the application
    Then I should see an offline indicator in the header
    And the indicator should be a cloud with slash icon
    And hovering over it should show "Offline - some features unavailable"

  # ============================================================================
  # ERROR BOUNDARIES
  # ============================================================================

  Scenario: Catch React errors with error boundary
    Given I am using the application
    When a component throws an unexpected error
    Then I should see a fallback error UI
    And I should NOT see a blank white screen
    And the error boundary should isolate the error to that component
    And the rest of the app should continue working

  Scenario: Show component-specific error boundaries
    Given I am viewing a page with multiple components
    When one component errors
    Then only that component should show an error state
    And other components should continue rendering normally
    And I should be able to retry loading the failed component

  Scenario: Error boundary with retry functionality
    Given a component failed to render
    When I view the error boundary fallback
    Then I should see a "Reload Component" button
    And clicking it should attempt to re-render the component
    And if successful, the component should display normally

  Scenario: Report error boundary errors to Sentry
    Given an error boundary caught an error
    When the fallback UI is displayed
    Then the error should be logged to Sentry
    And the log should include component name
    And the log should include component stack

  # ============================================================================
  # VALIDATION ERROR HANDLING
  # ============================================================================

  Scenario: Display inline validation errors
    Given I am filling out a form
    When I enter invalid data in a field
    Then I should see an error message below the field
    And the field should be highlighted in red
    And the error should appear immediately on blur

  Scenario: Show form-level validation summary
    Given I submitted a form with 3 validation errors
    When the form is invalid
    Then I should see an error summary at the top
    And the summary should list all 3 errors
    And clicking an error should focus that field
    And the submit button should remain disabled

  Scenario: Clear validation errors on fix
    Given I have a validation error on email field
    When I correct the email format
    Then the error message should disappear
    And the red highlight should be removed
    And the submit button should become enabled if form is valid

  # ============================================================================
  # API ERROR HANDLING
  # ============================================================================

  Scenario: Handle 400 Bad Request errors
    Given I submit invalid data to the API
    When the API returns 400 Bad Request
    Then I should see validation errors from the API
    And the errors should be displayed on the correct fields
    And I should see a friendly summary "Please fix the errors below"

  Scenario: Handle 401 Unauthorized errors
    Given my session expired
    When I make an API request
    And the API returns 401 Unauthorized
    Then I should see "Your session has expired"
    And I should be redirected to login
    And after login, I should return to my previous page

  Scenario: Handle 403 Forbidden errors
    Given I don't have permission to perform an action
    When I try to access a forbidden resource
    And the API returns 403 Forbidden
    Then I should see "You don't have permission to do this"
    And I should see suggestions to contact admin or upgrade plan

  Scenario: Handle 404 Not Found errors
    Given I request a resource that doesn't exist
    When the API returns 404 Not Found
    Then I should see "We couldn't find what you're looking for"
    And I should see a "Return to Dashboard" button
    And I should NOT see technical error codes

  Scenario: Handle 429 Rate Limit errors
    Given I exceeded the API rate limit
    When the API returns 429 Too Many Requests
    Then I should see "You're doing that too quickly"
    And I should see "Please wait X seconds before trying again"
    And I should see a countdown timer
    And the retry button should be disabled until timer expires

  Scenario: Handle 500 Internal Server errors
    Given the server encountered an error
    When the API returns 500 Internal Server Error
    Then I should see "Something went wrong on our end"
    And I should see "We've been notified and are working on it"
    And I should see a "Try Again" button
    And I should see a reference number for support

  Scenario: Handle 503 Service Unavailable errors
    Given the service is temporarily unavailable
    When the API returns 503 Service Unavailable
    Then I should see "We're currently down for maintenance"
    And I should see estimated time until service resumes
    And I should see a "Check Status" button linking to status page

  # ============================================================================
  # TOAST NOTIFICATIONS FOR ERRORS
  # ============================================================================

  Scenario: Show error toast for failed actions
    Given I am on the dashboard
    When I try to delete a resume and it fails
    Then I should see an error toast notification
    And the toast should have a red/error color
    And the toast should show for 5 seconds
    And the toast should have a close button

  Scenario: Show success toast after recovery
    Given an action failed and I retried
    When the retry succeeds
    Then I should see a success toast
    And the toast should say "Success! Your action completed"
    And the toast should have a green/success color

  Scenario: Allow dismissing error toasts
    Given I see an error toast
    When I click the close button
    Then the toast should disappear immediately
    When I click anywhere else on the page
    Then the toast should remain visible until timeout

  Scenario: Stack multiple error toasts
    Given multiple errors occur in quick succession
    When I view the notifications
    Then I should see all error toasts stacked vertically
    And the most recent should be at the top
    And each should auto-dismiss after 5 seconds

  # ============================================================================
  # MOBILE ERROR HANDLING
  # ============================================================================

  Scenario: Show mobile-optimized error states
    Given I am on a mobile device
    When an error occurs
    Then the error message should be full-width
    And action buttons should be touch-friendly (min 44px)
    And the error should be easy to read on small screens
    And I can easily tap retry or dismiss

  Scenario: Show offline banner on mobile
    Given I am on a mobile device
    When I go offline
    Then I should see an offline banner at the top
    And the banner should not cover important UI
    And I can swipe to dismiss the banner
    And the banner should reappear if I try offline actions

  # ============================================================================
  # ACCESSIBILITY
  # ============================================================================

  Scenario: Announce errors to screen readers
    Given I am using a screen reader
    When an error occurs
    Then the error should be announced via ARIA live region
    And the announcement should include the full error message
    And the announcement should include available actions

  Scenario: Focus management for errors
    Given an error occurred on form submission
    When the error is displayed
    Then focus should move to the error summary
    And I can tab through error messages
    And I can press Enter on an error to focus that field

  Scenario: Keyboard navigation for error actions
    Given I see an error with retry button
    When I navigate with keyboard
    Then I can tab to the "Try Again" button
    And I can activate it with Enter or Space
    And I can dismiss with Escape key

  # ============================================================================
  # PERFORMANCE
  # ============================================================================

  Scenario: Error states load quickly
    Given an error occurs
    When the error UI is displayed
    Then it should render in less than 100ms
    And there should be no layout shift
    And animations should be smooth (60fps)

  Scenario: Error logging doesn't block UI
    Given an error occurs
    When logging to Sentry
    Then the UI should remain responsive
    And the error should be logged asynchronously
    And logging should not delay error message display

  # ============================================================================
  # EDGE CASES
  # ============================================================================

  Scenario: Handle errors during error handling
    Given the error logging service fails
    When an error occurs
    Then the error UI should still be shown
    And I should still see recovery options
    And a fallback error log should be created

  Scenario: Handle rapid repeated errors
    Given errors are occurring repeatedly
    When the same error occurs 3+ times in 10 seconds
    Then the system should show a single error
    And include a count "This error occurred 5 times"
    And suggest contacting support if it continues

  Scenario: Clear errors on navigation
    Given I am viewing an error state
    When I navigate to a different page
    Then the error should be cleared
    And I should see the new page normally
    And the error should not persist across navigation

  Scenario: Persist critical errors across navigation
    Given a critical error occurred (e.g., payment failed)
    When I navigate away
    Then the error notification should persist
    And I should see it in the notification center
    And I can dismiss it manually
