# Feature: Feedback & Bug Reporting - Issue #139
# As a user
# I want to easily report bugs and provide feedback
# So that I can help improve the application and get support when needed

Feature: Feedback & Bug Reporting

  Background:
    Given I am logged in to the application
    And the feedback widget is available

  # ============================================================================
  # Scenario 1: Feedback Widget Accessibility
  # ============================================================================

  Scenario: Access feedback widget from any page
    Given I am on any page in the application
    When I look for the feedback widget
    Then I should see a floating feedback button
    And the button should be accessible via keyboard
    And the button should have an aria-label
    And the button should be visible but not intrusive

  Scenario: Open feedback widget
    Given I am on the dashboard
    When I click the feedback button
    Then the feedback widget should open
    And I should see feedback options
    And the widget should be positioned properly
    And the widget should have a close button

  Scenario: Close feedback widget
    Given the feedback widget is open
    When I click the close button
    Then the widget should close smoothly
    And I should be returned to the main content
    And focus should return to the trigger button

  # ============================================================================
  # Scenario 2: Feedback Type Selection
  # ============================================================================

  Scenario: Choose bug report option
    Given the feedback widget is open
    When I select "Report a Bug"
    Then I should see the bug report form
    And the form should have required fields
    And I should see a screenshot capture option
    And I should see severity selection

  Scenario: Choose feature request option
    Given the feedback widget is open
    When I select "Request a Feature"
    Then I should see the feature request form
    And the form should ask for feature description
    And I should see use case field
    And I should see priority selection

  Scenario: Choose general feedback option
    Given the feedback widget is open
    When I select "Send Feedback"
    Then I should see the general feedback form
    And the form should have a text area
    And I should see rating options
    And I should see category selection

  # ============================================================================
  # Scenario 3: Screenshot Capture
  # ============================================================================

  Scenario: Capture screenshot automatically
    Given I am reporting a bug
    When the bug report form opens
    Then a screenshot should be automatically captured
    And the screenshot should be shown as a preview
    And I should see the screenshot file size
    And I should be able to remove the screenshot

  Scenario: Manually capture screenshot
    Given I am in the bug report form
    When I click "Capture Screenshot"
    Then the current page should be captured
    And the screenshot should replace any existing one
    And I should see a success notification
    And the screenshot should be included in the form data

  Scenario: Annotate screenshot
    Given I have a screenshot captured
    When I click "Annotate"
    Then I should see annotation tools
    And I should be able to draw on the screenshot
    And I should be able to add text annotations
    And I should be able to highlight areas
    And I should be able to save annotations

  Scenario: Remove screenshot
    Given I have a screenshot captured
    When I click "Remove Screenshot"
    Then the screenshot should be removed
    And I should see an option to capture a new one
    And the form should still be valid without screenshot

  # ============================================================================
  # Scenario 4: Bug Report Submission
  # ============================================================================

  Scenario: Submit bug report with all details
    Given I am filling out a bug report
    When I enter the following details:
      | Field           | Value                          |
      | Title           | Login button not working       |
      | Description     | Cannot click login button      |
      | Steps           | 1. Go to login\n2. Click login |
      | Expected        | Should redirect to dashboard   |
      | Actual          | Nothing happens                |
      | Severity        | High                           |
    And I include a screenshot
    And I click "Submit Report"
    Then the report should be submitted successfully
    And I should see a confirmation message
    And I should receive a tracking ID
    And the widget should close

  Scenario: Submit bug report with error context
    Given I encountered an error with ID "ERR-123456"
    When I click "Report this Error"
    Then the bug report form should open
    And the error ID should be pre-filled
    And error details should be auto-populated
    And the page URL should be captured
    And the user agent should be captured

  Scenario: Validate required fields
    Given I am filling out a bug report
    When I try to submit without filling required fields
    Then I should see validation errors
    And the submit button should be disabled
    And each missing field should be highlighted
    And I should see helpful error messages

  # ============================================================================
  # Scenario 5: Feature Request Submission
  # ============================================================================

  Scenario: Submit feature request
    Given I am filling out a feature request
    When I enter the following details:
      | Field        | Value                                    |
      | Title        | Dark mode support                        |
      | Description  | Add dark theme option to reduce eye strain |
      | Use Case     | Working late at night                    |
      | Priority     | Medium                                   |
    And I click "Submit Request"
    Then the request should be submitted successfully
    And I should see a confirmation message
    And I should receive a tracking ID
    And I should be thanked for the suggestion

  Scenario: Attach mockups to feature request
    Given I am submitting a feature request
    When I upload a mockup image
    Then the image should be validated (PNG, JPG, max 5MB)
    And the image should show as a preview
    And I should be able to upload up to 3 images
    And the images should be included in the request

  # ============================================================================
  # Scenario 6: General Feedback Submission
  # ============================================================================

  Scenario: Submit positive feedback
    Given I am sending general feedback
    When I select 5-star rating
    And I enter "Great app! Love the UI"
    And I select category "User Experience"
    And I click "Send Feedback"
    Then the feedback should be submitted
    And I should see a thank you message
    And I should see an option to leave more feedback

  Scenario: Submit negative feedback with improvement suggestions
    Given I am sending general feedback
    When I select 2-star rating
    And I enter my concerns and suggestions
    And I select category "Performance"
    And I click "Send Feedback"
    Then the feedback should be submitted
    And I should see acknowledgment
    And I should be offered a follow-up option

  # ============================================================================
  # Scenario 7: Feedback Tracking
  # ============================================================================

  Scenario: View my submitted feedback
    Given I have submitted feedback previously
    When I go to "My Feedback" section
    Then I should see a list of my submissions
    And each item should show status
    And each item should show submission date
    And I should be able to filter by type
    And I should be able to search my feedback

  Scenario: Track bug report status
    Given I submitted a bug report with ID "BUG-789"
    When I search for "BUG-789"
    Then I should see the bug details
    And I should see current status
    And I should see status history
    And I should see any responses from the team

  Scenario: Receive updates on my feedback
    Given I submitted a feature request
    When the team updates the status
    Then I should receive a notification
    And I should see the new status in my feedback list
    And I should be able to add comments

  # ============================================================================
  # Scenario 8: Integration with Error Handling
  # ============================================================================

  Scenario: Report bug from error screen
    Given I encounter an error with the error boundary
    When I see the error screen with ID "ERR-456789"
    And I click "Report this Error"
    Then the bug report form should open
    And the error ID should be pre-filled
    And the error message should be included
    And the stack trace should be attached (if dev mode)
    And the page context should be captured

  Scenario: Attach console logs to bug report
    Given I am reporting a bug
    When I enable "Include Console Logs"
    Then recent console logs should be captured
    And the logs should be sanitized (no sensitive data)
    And the logs should be attached to the report
    And I should see the log count

  # ============================================================================
  # Scenario 9: Keyboard Accessibility
  # ============================================================================

  Scenario: Navigate feedback widget with keyboard
    Given I am using only keyboard
    When I press the feedback widget shortcut (Ctrl+Shift+F)
    Then the feedback widget should open
    And I should be able to tab through options
    And I should be able to select with Enter
    And I should be able to close with Escape

  Scenario: Complete bug report using keyboard only
    Given the bug report form is open
    When I navigate using Tab and Shift+Tab
    Then I should reach all form fields
    And I should be able to fill all fields
    And I should be able to submit with Enter
    And focus indicators should be visible

  # ============================================================================
  # Scenario 10: Mobile Responsiveness
  # ============================================================================

  Scenario: Access feedback widget on mobile
    Given I am on a mobile device
    When I look for the feedback button
    Then I should see a mobile-optimized button
    And the button should be positioned for thumb access
    And the widget should be full-screen on mobile

  Scenario: Submit bug report on mobile
    Given I am on mobile with the bug report form open
    When I fill out the form
    Then the form should be touch-friendly
    And inputs should have proper mobile keyboards
    And the screenshot should capture mobile viewport
    And I should be able to submit successfully

  # ============================================================================
  # Acceptance Criteria Validation
  # ============================================================================

  @acceptance
  Scenario: Widget is accessible from everywhere
    Given I navigate through different pages
    Then the feedback widget should always be visible
    And it should maintain consistent position
    And it should not block important content

  @acceptance
  Scenario: Screenshots are captured correctly
    Given I trigger screenshot capture
    Then the screenshot should capture the current viewport
    And it should have reasonable file size (<2MB)
    And it should be in a web-compatible format (PNG)
    And it should preserve visual quality

  @acceptance
  Scenario: Reports are submitted successfully
    Given I submit any type of feedback
    Then it should reach the backend
    And I should receive confirmation
    And I should get a tracking ID
    And the data should be properly formatted

  @acceptance
  Scenario: Tracking is visible and accurate
    Given I have submitted multiple feedback items
    Then I should see all my submissions
    And statuses should be accurate
    And I should be able to manage my feedback
    And the history should be preserved
