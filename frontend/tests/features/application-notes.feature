# Feature: Application Notes & Team Collaboration (Issue #27)
# BDD Scenarios for employer application notes functionality

Feature: Application Notes & Team Collaboration
  As a hiring team member
  I want to add, view, edit, and delete notes on candidate applications
  So that I can collaborate with my team on hiring decisions

  Background:
    Given I am logged in as an employer user
    And I am viewing a candidate application detail page
    And the application belongs to my company

  # ============================================================================
  # Scenario 1: Create Note - Happy Path
  # ============================================================================
  Scenario: Add a team note to an application
    Given I am on the application detail page
    When I click the "Add Note" button
    And I enter "Great technical skills, strong portfolio" in the note content field
    And I select "team" visibility
    And I select "feedback" note type
    And I click "Save Note"
    Then I should see a success message "Note added successfully"
    And the note should appear in the notes list
    And the note should show my name as the author
    And the note should show "feedback" as the type
    And the note should show "team" visibility indicator

  # ============================================================================
  # Scenario 2: Create Private Note
  # ============================================================================
  Scenario: Add a private note that only I can see
    Given I am on the application detail page
    When I add a note with content "Need to discuss salary expectations privately"
    And I select "private" visibility
    And I select "internal" note type
    And I save the note
    Then the note should appear with a "Private" badge
    And other team members should not see this note

  # ============================================================================
  # Scenario 3: Note Type Selection
  # ============================================================================
  Scenario Outline: Create notes with different types
    Given I am on the application detail page
    When I add a note with type "<note_type>"
    And I save the note
    Then the note should display a "<badge_color>" badge with text "<note_type>"

    Examples:
      | note_type       | badge_color |
      | internal        | gray        |
      | feedback        | blue        |
      | interview_notes | green       |

  # ============================================================================
  # Scenario 4: @Mention Team Members
  # ============================================================================
  Scenario: Mention a team member in a note
    Given I am on the application detail page
    And there are team members "john_recruiter" and "sarah_manager"
    When I start typing "@joh" in the note content field
    Then I should see an autocomplete dropdown with "john_recruiter"
    When I select "john_recruiter" from the dropdown
    And I type " please review this candidate"
    And I save the note
    Then the note should display with "@john_recruiter" highlighted
    And "john_recruiter" should receive a notification (future)

  # ============================================================================
  # Scenario 5: Multiple @Mentions
  # ============================================================================
  Scenario: Mention multiple team members in one note
    Given I am on the application detail page
    When I add a note with content "Great candidate! @sarah_manager @john_recruiter thoughts?"
    And I save the note
    Then the note should show both "@sarah_manager" and "@john_recruiter" highlighted
    And both mentioned users should be tracked in the note metadata

  # ============================================================================
  # Scenario 6: Edit Note (Within 5 Minutes)
  # ============================================================================
  Scenario: Edit my own note within 5-minute window
    Given I created a note "Original content" 2 minutes ago
    And I am viewing the notes list
    When I hover over my note
    Then I should see an "Edit" button
    And I should see a countdown timer showing "3 minutes remaining"
    When I click "Edit"
    And I change the content to "Updated content - fixed typo"
    And I save the changes
    Then the note should update to "Updated content - fixed typo"
    And the "updated_at" timestamp should be refreshed

  # ============================================================================
  # Scenario 7: Edit Note (After 5 Minutes) - Negative Test
  # ============================================================================
  Scenario: Cannot edit note after 5-minute window
    Given I created a note "Old content" 6 minutes ago
    And I am viewing the notes list
    When I hover over my note
    Then I should NOT see an "Edit" button
    And I should see a message "Edit window expired"

  # ============================================================================
  # Scenario 8: Edit Someone Else's Note - Negative Test
  # ============================================================================
  Scenario: Cannot edit another team member's note
    Given another team member created a note "Their note" 1 minute ago
    And I am viewing the notes list
    When I hover over their note
    Then I should NOT see an "Edit" button
    And I should see "Only the author can edit this note" tooltip

  # ============================================================================
  # Scenario 9: Delete Note (Within 5 Minutes)
  # ============================================================================
  Scenario: Delete my own note within 5-minute window
    Given I created a note "To be deleted" 1 minute ago
    And I am viewing the notes list
    When I hover over my note
    Then I should see a "Delete" button
    When I click "Delete"
    And I confirm the deletion in the confirmation dialog
    Then the note should be removed from the list
    And I should see a success message "Note deleted successfully"

  # ============================================================================
  # Scenario 10: Delete Note (After 5 Minutes) - Negative Test
  # ============================================================================
  Scenario: Cannot delete note after 5-minute window
    Given I created a note "Old note" 10 minutes ago
    And I am viewing the notes list
    When I hover over my note
    Then I should NOT see a "Delete" button
    And I should see a message "Delete window expired"

  # ============================================================================
  # Scenario 11: Delete Someone Else's Note - Negative Test
  # ============================================================================
  Scenario: Cannot delete another team member's note
    Given another team member created a note "Their note" 30 seconds ago
    And I am viewing the notes list
    When I hover over their note
    Then I should NOT see a "Delete" button

  # ============================================================================
  # Scenario 12: Real-Time Updates (Polling)
  # ============================================================================
  Scenario: See new notes from team members in real-time
    Given I am viewing the notes list
    And another team member adds a note "New candidate feedback"
    When 10 seconds pass (polling interval)
    Then I should see the new note appear in the list
    And I should see a subtle animation indicating a new note

  # ============================================================================
  # Scenario 13: Rich Text Formatting
  # ============================================================================
  Scenario: Use rich text formatting in notes
    Given I am adding a new note
    When I select text and apply bold formatting
    And I select text and apply italic formatting
    And I add a bulleted list
    And I save the note
    Then the note should display with proper formatting
    And the HTML should be sanitized for security

  # ============================================================================
  # Scenario 14: Note Visibility Filter
  # ============================================================================
  Scenario: Filter notes by visibility
    Given there are 3 team notes and 2 private notes
    When I am viewing the notes list
    Then I should see 3 team notes and only my 2 private notes (5 total)
    When I apply filter "Team notes only"
    Then I should see only the 3 team notes
    When I apply filter "My private notes only"
    Then I should see only my 2 private notes

  # ============================================================================
  # Scenario 15: Note Type Filter
  # ============================================================================
  Scenario: Filter notes by type
    Given there are notes of different types
    When I filter by "feedback" type
    Then I should see only feedback notes
    When I filter by "interview_notes" type
    Then I should see only interview notes

  # ============================================================================
  # Scenario 16: Empty State
  # ============================================================================
  Scenario: No notes exist for application
    Given no notes have been added to this application
    When I view the notes section
    Then I should see an empty state message
    And I should see "Be the first to add a note about this candidate"
    And I should see a "Add Note" button

  # ============================================================================
  # Scenario 17: Note Character Limit
  # ============================================================================
  Scenario: Note content has 5000 character limit
    Given I am adding a new note
    When I enter 4999 characters
    Then I should see "1 character remaining"
    When I enter 1 more character
    Then I should see "0 characters remaining"
    When I try to enter more characters
    Then the input should be prevented
    And I should see a warning "Maximum length reached"

  # ============================================================================
  # Scenario 18: Note Timeline Order
  # ============================================================================
  Scenario: Notes are displayed in reverse chronological order
    Given there are 5 notes created at different times
    When I view the notes list
    Then the most recent note should appear first
    And the oldest note should appear last

  # ============================================================================
  # Scenario 19: Accessibility - Keyboard Navigation
  # ============================================================================
  Scenario: Navigate notes using keyboard
    Given I am viewing the notes list
    When I press Tab
    Then focus should move to the "Add Note" button
    When I press Tab again
    Then focus should move to the first note's "Edit" button (if within 5 min)
    When I press Enter on a note
    Then the note should expand to show full content

  # ============================================================================
  # Scenario 20: Mobile Responsive
  # ============================================================================
  Scenario: View notes on mobile device
    Given I am viewing the application on a mobile device (375px width)
    When I view the notes section
    Then the notes should stack vertically
    And the "Add Note" button should be full-width
    And @mentions should be tappable
    And edit/delete buttons should be touch-friendly (44px minimum)

  # ============================================================================
  # Scenario 21: Loading States
  # ============================================================================
  Scenario: Display loading state while fetching notes
    Given I navigate to the application detail page
    When notes are being loaded from the API
    Then I should see a skeleton loader
    And the loader should show 3 placeholder note cards
    When the notes finish loading
    Then the skeleton loader should be replaced with actual notes

  # ============================================================================
  # Scenario 22: Error Handling - Network Error
  # ============================================================================
  Scenario: Handle network error when adding note
    Given the API is unavailable
    When I try to add a note
    Then I should see an error message "Failed to save note. Please try again."
    And the note form should remain populated with my content
    And I should see a "Retry" button

  # ============================================================================
  # Scenario 23: Error Handling - 403 Forbidden
  # ============================================================================
  Scenario: Handle authorization error when editing someone else's note
    Given another user's note exists
    When I attempt to edit their note via API manipulation
    Then I should see an error "You can only edit your own notes"
    And the note should remain unchanged

  # ============================================================================
  # Scenario 24: Optimistic UI Updates
  # ============================================================================
  Scenario: Show note immediately after saving (optimistic update)
    Given I am adding a new note
    When I click "Save Note"
    Then the note should appear immediately in the list (optimistic)
    And a subtle loading indicator should show
    When the API confirms the save
    Then the loading indicator should disappear
    And the note should show the server-assigned ID

  # ============================================================================
  # Edge Cases & Security
  # ============================================================================

  Scenario: XSS Prevention - Sanitize HTML in notes
    Given I am adding a new note
    When I enter "<script>alert('XSS')</script>" in the content
    And I save the note
    Then the script tag should be escaped/sanitized
    And no JavaScript should execute
    And the note should display as plain text or safe HTML

  Scenario: Note pagination for applications with many notes
    Given there are 100+ notes on this application
    When I view the notes section
    Then I should see the first 20 notes
    And I should see a "Load More" button
    When I click "Load More"
    Then the next 20 notes should append to the list

  Scenario: Concurrent edit conflict
    Given I am editing a note
    And another user deletes the same note
    When I try to save my changes
    Then I should see an error "This note has been deleted"
    And I should be prompted to create a new note with my content
