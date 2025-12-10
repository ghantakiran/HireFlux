# Feature: Keyboard Navigation Enhancement (Issue #149)
#
# As a user navigating HireFlux with a keyboard
# I want comprehensive keyboard support throughout the application
# So that I can efficiently use the platform without a mouse
#
# Priority: P0 (Critical for accessibility)
# Phase: 5 (Advanced)
# Estimated: 1 week
#
# Scope:
# - Logical tab order across all pages
# - Skip links for quick navigation
# - Visible focus indicators (WCAG 2.2 AA compliant)
# - Keyboard shortcuts for common actions
# - Escape key to close modals, dropdowns, and overlays
# - Enter/Space to activate buttons and links
# - Arrow keys for navigation in menus and lists

Feature: Keyboard Navigation Enhancement

  # ============================================================================
  # 1. Tab Order - Logical Flow
  # ============================================================================

  Scenario: Tab order is logical on job seeker dashboard
    Given I am logged in as a job seeker
    And I am on the dashboard page
    When I press Tab repeatedly
    Then the focus should move in this order:
      | Element                 | Description                    |
      | Skip to main content    | Skip link at top               |
      | Logo                    | Top navigation logo            |
      | Dashboard link          | Main navigation                |
      | Jobs link               | Main navigation                |
      | Applications link       | Main navigation                |
      | Profile menu            | Top right dropdown             |
      | Search input            | Main content search            |
      | First job card          | Job listing                    |
      | Apply button            | Primary action                 |
    And the tab order should follow visual layout (left-to-right, top-to-bottom)

  Scenario: Tab order is logical on employer dashboard
    Given I am logged in as an employer
    And I am on the employer dashboard page
    When I press Tab repeatedly
    Then the focus should move in this order:
      | Element                 | Description                    |
      | Skip to main content    | Skip link at top               |
      | Logo                    | Top navigation logo            |
      | Dashboard link          | Main navigation                |
      | Jobs link               | Main navigation                |
      | Candidates link         | Main navigation                |
      | Post Job button         | Primary CTA                    |
      | Profile menu            | Top right dropdown             |
      | Quick stats cards       | Dashboard metrics              |
      | First job listing       | Active jobs table              |
    And no elements should be skipped inappropriately

  Scenario: Tab order skips hidden elements
    Given I am on any page
    And there are hidden elements (collapsed menus, hidden modals)
    When I press Tab
    Then focus should never move to hidden or display:none elements
    And focus should skip over collapsed menu items
    And focus should skip over closed modals

  Scenario: Tab order works in data tables
    Given I am viewing a data table with sortable columns
    When I Tab through the table
    Then I should focus on each column header
    And I should focus on each actionable row element
    And I should be able to navigate to pagination controls
    And the order should be: headers → row actions → pagination

  # ============================================================================
  # 2. Skip Links - Quick Navigation
  # ============================================================================

  Scenario: Skip to main content link appears on Tab
    Given I am on any page
    When I press Tab as my first action
    Then I should see a "Skip to main content" link
    And the link should be visually prominent (not hidden)
    And the link should be the first focusable element
    And the link should have high contrast (4.5:1 minimum)

  Scenario: Skip to main content link works
    Given I have focused on the "Skip to main content" link
    When I press Enter
    Then focus should move to the main content area
    And I should bypass all navigation elements
    And the main content should receive focus
    And a focus outline should be visible on main content

  Scenario: Skip to navigation link exists
    Given I am on any page with a long content area
    When I Tab to the bottom of the page
    Then I should see a "Skip to navigation" link
    When I press Enter on that link
    Then focus should move back to the main navigation
    And I should not have to Tab through all content again

  Scenario: Skip links are announced by screen readers
    Given I am using a screen reader
    When I press Tab on page load
    Then I should hear "Skip to main content, link"
    And the link purpose should be clear
    And it should be the first announced element

  # ============================================================================
  # 3. Focus Indicators - Visibility
  # ============================================================================

  Scenario: All interactive elements have visible focus indicators
    Given I am navigating with keyboard
    When I Tab to any interactive element (button, link, input, dropdown)
    Then I should see a clear focus outline
    And the outline should be at least 2px thick
    And the outline should have contrast >= 3:1 with background (WCAG 2.2)
    And the outline should not be removed by CSS

  Scenario: Focus indicators use brand colors
    Given I am navigating the application
    When I focus on any element
    Then the focus ring should use primary color (--color-primary-500)
    And the ring should have a subtle shadow for depth
    And the ring should be visible in both light and dark themes

  Scenario: Focus indicators work on custom components
    Given I am interacting with custom components (cards, avatars, chips)
    When I Tab to these components
    Then they should have the same focus style as native elements
    And the focus should be clearly visible
    And the focus should not be cut off by overflow

  Scenario: Focus indicators persist while element is focused
    Given I have focused on a button
    When I hold focus on that button
    Then the focus indicator should remain visible
    And it should not flicker or disappear
    When I press Space or Enter
    Then the focus should remain on the button after activation
    And the indicator should still be visible

  # ============================================================================
  # 4. Keyboard Shortcuts - Global Actions
  # ============================================================================

  Scenario: Slash (/) opens global search
    Given I am on any page
    And I am not focused on an input field
    When I press the "/" key
    Then the global search modal should open
    And focus should move to the search input
    And I should see a placeholder: "Search jobs, candidates, or applications..."

  Scenario: Ctrl+K opens command palette
    Given I am on any page
    When I press "Ctrl+K" (or "Cmd+K" on Mac)
    Then the command palette should open
    And I should see quick actions:
      | Action              | Shortcut |
      | New Job Post        | Ctrl+N   |
      | View Applications   | Ctrl+A   |
      | View Dashboard      | Ctrl+D   |
      | Profile Settings    | Ctrl+,   |
    And I should be able to type to filter actions

  Scenario: Escape closes modals and dropdowns
    Given I have a modal open (job details, edit form, etc.)
    When I press the "Escape" key
    Then the modal should close immediately
    And focus should return to the trigger element
    And no other UI should be affected

  Scenario: Escape closes dropdown menus
    Given I have opened a dropdown menu (profile, actions, filters)
    When I press "Escape"
    Then the dropdown should close
    And focus should return to the dropdown trigger button

  Scenario: Escape stops inline editing
    Given I am editing a field inline (job title, company name)
    When I press "Escape"
    Then the edit mode should cancel
    And my changes should be discarded
    And the original value should be restored

  Scenario: Question mark (?) opens keyboard shortcuts help
    Given I am on any page
    When I press "Shift+/" (which produces "?")
    Then a keyboard shortcuts modal should open
    And I should see all available shortcuts listed
    And shortcuts should be grouped by category:
      | Category       | Shortcuts                      |
      | Navigation     | /, Ctrl+K, G+D, G+J, G+A      |
      | Actions        | Ctrl+N, Ctrl+S, Enter, Escape |
      | Accessibility  | Tab, Shift+Tab, Arrow keys    |

  # ============================================================================
  # 5. Escape Key - Universal Close
  # ============================================================================

  Scenario: Escape closes all overlay types
    Given I have the following overlays open:
      | Overlay Type        |
      | Modal dialog        |
      | Dropdown menu       |
      | Tooltip             |
      | Date picker         |
      | Autocomplete list   |
    When I press "Escape" on each overlay
    Then each overlay should close immediately
    And focus should return to the trigger element
    And the page should not scroll or change

  Scenario: Escape closes nested modals in order
    Given I have a modal open with a confirmation dialog inside it
    When I press "Escape" once
    Then the inner confirmation dialog should close
    When I press "Escape" again
    Then the outer modal should close
    And I should close modals in reverse order (last opened, first closed)

  Scenario: Escape works in form fields
    Given I am typing in a search field
    When I press "Escape"
    Then the search input should be cleared
    And any autocomplete dropdown should close
    And focus should remain in the input field

  # ============================================================================
  # 6. Enter and Space Keys - Activation
  # ============================================================================

  Scenario: Enter activates buttons and links
    Given I have focused on a button or link
    When I press "Enter"
    Then the button/link action should execute
    And the behavior should match a mouse click
    And any loading states should be shown

  Scenario: Space activates buttons
    Given I have focused on a button
    When I press "Space"
    Then the button action should execute
    And it should behave like Enter

  Scenario: Space scrolls page when focused on non-interactive element
    Given I have focused on the main content area
    When I press "Space"
    Then the page should scroll down
    When I press "Shift+Space"
    Then the page should scroll up

  Scenario: Enter submits forms
    Given I am focused on a form input
    And the form has a submit button
    When I press "Enter"
    Then the form should submit
    And validation should run
    And I should see success or error feedback

  # ============================================================================
  # 7. Arrow Keys - Menu and List Navigation
  # ============================================================================

  Scenario: Arrow keys navigate dropdown menus
    Given I have opened a dropdown menu
    When I press "Down Arrow"
    Then focus should move to the next menu item
    When I press "Up Arrow"
    Then focus should move to the previous menu item
    When I reach the last item and press "Down Arrow"
    Then focus should wrap to the first item
    When I reach the first item and press "Up Arrow"
    Then focus should wrap to the last item

  Scenario: Arrow keys navigate autocomplete results
    Given I am typing in a search field with autocomplete
    And autocomplete results are shown
    When I press "Down Arrow"
    Then the first result should be highlighted
    When I press "Down Arrow" again
    Then the second result should be highlighted
    When I press "Enter"
    Then the highlighted result should be selected

  Scenario: Arrow keys navigate date pickers
    Given I have opened a date picker
    When I press "Right Arrow"
    Then focus should move to the next day
    When I press "Left Arrow"
    Then focus should move to the previous day
    When I press "Down Arrow"
    Then focus should move to the same day next week
    When I press "Up Arrow"
    Then focus should move to the same day previous week

  Scenario: Arrow keys navigate table rows
    Given I have focused on a data table
    When I press "Down Arrow"
    Then the next row should be highlighted
    When I press "Up Arrow"
    Then the previous row should be highlighted
    When I press "Enter"
    Then the row action should execute (view details, select, etc.)

  # ============================================================================
  # 8. Focus Management - Modals and Dialogs
  # ============================================================================

  Scenario: Focus moves to modal on open
    Given I am on the dashboard
    When I click "Post New Job" button
    Then the job posting modal should open
    And focus should immediately move to the modal
    And focus should be on the first focusable element (close button or first input)

  Scenario: Focus is trapped within modal
    Given I have a modal open
    When I Tab through all focusable elements in the modal
    And I reach the last element
    And I press Tab again
    Then focus should wrap back to the first element in the modal
    And focus should never leave the modal while it's open

  Scenario: Focus returns to trigger on modal close
    Given I opened a modal by clicking a "Edit Job" button
    When I close the modal (via Escape or close button)
    Then focus should return to the "Edit Job" button
    And I should be able to Tab from where I left off

  Scenario: Focus is restored after delete confirmation
    Given I clicked "Delete Job" on the 3rd job in a list
    And a confirmation modal appeared
    When I confirm deletion
    Then the modal should close
    And focus should move to the next job in the list (4th job)
    And if there is no next job, focus should move to the previous job (2nd job)

  # ============================================================================
  # 9. Keyboard Shortcuts List - Discoverability
  # ============================================================================

  Scenario: Keyboard shortcuts are documented
    Given I press "?" to open the shortcuts modal
    Then I should see all available shortcuts
    And shortcuts should be grouped by category
    And each shortcut should show:
      | Field       | Example                          |
      | Action      | "Open search"                    |
      | Keys        | "/" or "Ctrl+K"                  |
      | Description | "Quickly search jobs or content" |
    And platform-specific shortcuts should be shown (Cmd vs Ctrl)

  Scenario: Shortcuts modal is keyboard accessible
    Given I have opened the shortcuts modal
    When I Tab through the shortcuts
    Then I should be able to focus on each shortcut row
    When I press "Escape"
    Then the modal should close
    And focus should return to the page

  # ============================================================================
  # 10. Platform-Specific Shortcuts (Mac vs Windows/Linux)
  # ============================================================================

  Scenario: Shortcuts use Cmd on macOS
    Given I am on a macOS device
    When I view keyboard shortcuts
    Then I should see "Cmd+K" instead of "Ctrl+K"
    And I should see "Cmd+N" for new actions
    And the shortcuts should work with Cmd modifier

  Scenario: Shortcuts use Ctrl on Windows/Linux
    Given I am on a Windows or Linux device
    When I view keyboard shortcuts
    Then I should see "Ctrl+K" for command palette
    And I should see "Ctrl+N" for new actions
    And the shortcuts should work with Ctrl modifier

  # ============================================================================
  # 11. Focus Persistence - Navigation
  # ============================================================================

  Scenario: Focus persists across navigation (SPA behavior)
    Given I am on the Jobs page
    And I have focused on the 5th job card
    When I press "Enter" to view job details
    And the job details page loads (client-side navigation)
    Then focus should move to the main heading of the job details
    And I should not lose my place in the app

  Scenario: Back button restores focus
    Given I navigated from Job List (focused on 5th job) to Job Details
    When I press the browser back button
    Then I should return to the Job List
    And focus should be restored to the 5th job card
    And I should be able to continue tabbing from there

  # ============================================================================
  # 12. Edge Cases and Error Handling
  # ============================================================================

  Scenario: Keyboard shortcuts don't interfere with text input
    Given I am typing in a text field
    When I press "/" or "?"
    Then those characters should be typed into the field
    And shortcuts should NOT activate
    And only when I'm outside input fields should shortcuts work

  Scenario: Disabled buttons are not focusable
    Given there is a disabled "Submit" button
    When I Tab through the form
    Then the disabled button should be skipped
    And I should not be able to focus on it
    And it should have aria-disabled="true"

  Scenario: Hidden elements are not focusable
    Given there are elements with display:none or visibility:hidden
    When I Tab through the page
    Then those elements should be skipped entirely
    And I should never get stuck on invisible elements

  Scenario: Loading states maintain focus
    Given I clicked a "Load More Jobs" button
    And new jobs are being fetched
    When the jobs load
    Then focus should remain on the "Load More Jobs" button
    Or focus should move to the first newly loaded job
    And I should receive screen reader feedback about new content

  # ============================================================================
  # 13. Acceptance Criteria Validation
  # ============================================================================

  @acceptance
  Scenario: Tab order is correct across all pages
    Given I test all major pages:
      | Page                   |
      | Job Seeker Dashboard   |
      | Employer Dashboard     |
      | Job Posting Form       |
      | Job Details            |
      | Application Form       |
      | Profile Settings       |
    When I Tab through each page
    Then the tab order should be logical (top-to-bottom, left-to-right)
    And no elements should be unreachable via keyboard

  @acceptance
  Scenario: Skip links work on all pages
    Given I test all major pages
    When I press Tab as the first action
    Then I should see "Skip to main content"
    When I press Enter
    Then focus should move to main content
    And I should bypass navigation

  @acceptance
  Scenario: Focus indicators are visible everywhere
    Given I test all interactive elements:
      | Element Type    |
      | Buttons         |
      | Links           |
      | Form inputs     |
      | Dropdowns       |
      | Custom cards    |
      | Table rows      |
    When I Tab to each element
    Then I should see a visible focus indicator
    And contrast should be >= 3:1 with background

  @acceptance
  Scenario: All keyboard shortcuts are listed
    Given I press "?"
    Then I should see a complete list of shortcuts
    And shortcuts should be categorized
    And platform-specific keys should be shown (Cmd/Ctrl)
