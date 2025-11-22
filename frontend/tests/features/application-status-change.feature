Feature: Application Status Change & Notifications
  As an employer/hiring manager
  I want to change application status and send automated notifications
  So that candidates are kept informed throughout the hiring process

  Background:
    Given I am logged in as a company owner or hiring manager
    And I am viewing the applications page for a job
    And there are multiple applications in different stages

  # =========================================================================
  # Single Application Status Change
  # =========================================================================

  Scenario: Change single application status to "Reviewing"
    Given I select an application in "New" status
    When I click on the status dropdown
    And I select "Reviewing" from the status options
    Then I should see a confirmation modal
    And the modal should show "Move to Reviewing stage?"
    And I should see a checkbox "Send email notification to candidate"
    And the checkbox should be checked by default
    When I click "Confirm"
    Then the application status should update to "Reviewing"
    And an email notification should be sent to the candidate
    And I should see a success toast "Application status updated successfully"

  Scenario: Change application status with custom message
    Given I select an application in "Reviewing" status
    When I change the status to "Phone Screen"
    And I enter a custom message "Looking forward to speaking with you on Tuesday at 2 PM"
    And I click "Confirm"
    Then the custom message should be included in the email notification
    And the application status should update to "Phone Screen"

  Scenario: Reject application with reason
    Given I select an application in "Technical Interview" status
    When I change the status to "Rejected"
    Then I should see a "Rejection Reason" dropdown
    And I should see options:
      | Not enough experience with required technologies |
      | Looking for different skill set                  |
      | Position filled                                  |
      | Salary expectations too high                     |
      | Custom reason                                    |
    When I select "Not enough experience with required technologies"
    And I optionally add a custom note "Great candidate, but need more Python experience"
    And I click "Confirm"
    Then the rejection reason should be saved
    And the rejection email should include the reason
    And the application status should update to "Rejected"

  Scenario: Change status without sending email
    Given I select an application in "Phone Screen" status
    When I change the status to "Technical Interview"
    And I uncheck "Send email notification to candidate"
    And I click "Confirm"
    Then the application status should update
    But no email should be sent to the candidate

  Scenario: Cancel status change
    Given I select an application
    When I change the status to "Rejected"
    And I click "Cancel" in the confirmation modal
    Then the modal should close
    And the application status should remain unchanged
    And no email should be sent

  Scenario: Validate status transition rules
    Given I select an application in "Rejected" status
    When I try to change the status to "Phone Screen"
    Then I should see an error message "Cannot change status of rejected application"
    And the status dropdown should be disabled

  Scenario: Validate status transition for hired applications
    Given I select an application in "Hired" status
    When I view the status dropdown
    Then the dropdown should be disabled
    And I should see a tooltip "Cannot change status of hired application"

  # =========================================================================
  # Bulk Status Changes
  # =========================================================================

  Scenario: Bulk reject multiple applications
    Given I have 10 applications in "Reviewing" status
    When I select 5 applications using checkboxes
    Then I should see a bulk action toolbar at the top
    And the toolbar should show "5 applications selected"
    When I click "Bulk Actions" dropdown
    And I select "Reject Selected"
    Then I should see a bulk rejection modal
    And the modal should list all 5 selected applications
    And I should see a rejection reason dropdown
    When I select "Position filled" as the reason
    And I check "Send email notifications to all candidates"
    And I click "Reject 5 Applications"
    Then all 5 applications should be rejected
    And 5 rejection emails should be sent
    And I should see "Successfully rejected 5 applications"

  Scenario: Bulk move applications to different stage
    Given I have selected 3 applications in "Phone Screen" status
    When I use bulk actions to move them to "Technical Interview"
    And I add a custom message "You've been selected for the technical interview round"
    And I confirm the action
    Then all 3 applications should move to "Technical Interview"
    And all 3 candidates should receive the custom message
    And the success toast should show "3 applications moved to Technical Interview"

  Scenario: Bulk action with partial failures
    Given I have selected 5 applications
    And 2 of them are already in "Rejected" status
    When I try to bulk move all to "Offer" stage
    Then I should see a validation error
    And the error should say "2 applications cannot be changed (already rejected)"
    And I should have the option to "Continue with 3 applications"
    When I click "Continue with 3 applications"
    Then only the 3 valid applications should be updated
    And I should see "3 applications moved, 2 failed"

  Scenario: Deselect all applications
    Given I have 10 applications selected
    When I click "Deselect All" in the bulk toolbar
    Then all checkboxes should be unchecked
    And the bulk toolbar should disappear
    And no applications should be selected

  # =========================================================================
  # Email Preview & Testing
  # =========================================================================

  Scenario: Preview email before sending
    Given I am changing an application status to "Phone Screen"
    When I click "Preview Email" button in the modal
    Then I should see a preview of the email
    And the preview should show the subject line
    And the preview should show the HTML email body
    And the preview should include candidate name and job title
    And I should see a "Send Test Email" button

  Scenario: Send test email to myself
    Given I am in the status change modal
    When I click "Send Test Email"
    And I enter my email "hiring@company.com"
    And I click "Send"
    Then I should receive the test email
    And I should see "Test email sent to hiring@company.com"

  # =========================================================================
  # Status Change History & Audit Trail
  # =========================================================================

  Scenario: View status change history
    Given an application has gone through multiple status changes
    When I open the application detail view
    And I click on "Status History" tab
    Then I should see all status changes in chronological order
    And each entry should show:
      | Old Status | New Status | Changed By | Changed At       | Email Sent |
      | New        | Reviewing  | Jane Doe   | Nov 22, 2:30 PM | Yes        |
      | Reviewing  | Rejected   | John Smith | Nov 23, 10:15 AM | Yes        |

  # =========================================================================
  # Error Handling
  # =========================================================================

  Scenario: Handle email delivery failure
    Given I change an application status
    And the email service is unavailable
    When I confirm the status change
    Then the application status should still update
    But I should see a warning "Status updated, but email failed to send"
    And the status history should note "Email delivery failed"

  Scenario: Handle network error during status change
    Given I attempt to change application status
    And the network connection fails
    When I click "Confirm"
    Then I should see an error "Failed to update status. Please try again."
    And the status should not change
    And the modal should remain open

  Scenario: Handle concurrent status changes
    Given two hiring managers are viewing the same application
    When Manager A changes status to "Offer"
    And Manager B simultaneously changes status to "Rejected"
    Then the second change should show an error
    And the error should say "Status was recently changed by another team member"
    And Manager B should see the current status is now "Offer"

  # =========================================================================
  # Mobile Responsive
  # =========================================================================

  Scenario: Change status on mobile device
    Given I am using a mobile device (375px width)
    When I tap on an application
    And I tap "Change Status"
    Then I should see a mobile-optimized status selector
    And the confirmation modal should fit the screen
    And all buttons should be easily tappable (min 44px)

  # =========================================================================
  # Accessibility
  # =========================================================================

  Scenario: Navigate status change with keyboard
    Given I am using keyboard navigation
    When I tab to the status dropdown
    And I press Enter to open it
    And I use arrow keys to select "Phone Screen"
    And I press Enter to confirm
    Then the confirmation modal should open
    And I should be able to tab through all fields
    And I can press Enter on "Confirm" button

  Scenario: Screen reader support
    Given I am using a screen reader
    When I navigate to the status dropdown
    Then I should hear "Current status: Reviewing"
    When I change to "Technical Interview"
    Then I should hear "Selected: Technical Interview"
    And the modal should announce "Confirmation dialog: Move to Technical Interview stage?"
