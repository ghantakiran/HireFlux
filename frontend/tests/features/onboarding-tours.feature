Feature: Onboarding Tooltips & Tours - Issue #137
  As a new user of HireFlux
  I want guided onboarding tours and contextual tooltips
  So that I can quickly learn how to use the platform effectively

  Background:
    Given I am a first-time user
    And I have not completed any onboarding tours

  # ============================================
  # Feature 1: Feature Introduction Tours
  # ============================================

  Scenario: @critical First-time user sees welcome tour on dashboard
    Given I am on the dashboard for the first time
    When the page loads
    Then I should see a welcome tour modal
    And the tour should have a "Start Tour" button
    And the tour should have a "Skip Tour" button
    And the modal should be accessible with ARIA labels

  Scenario: User progresses through dashboard tour steps
    Given I am on the dashboard
    And the welcome tour is active
    When I click "Start Tour"
    Then I should see the first tour step
    And the step should highlight the relevant UI element
    And I should see step progress (e.g., "1 of 5")
    And I should see a "Next" button
    And the highlighted element should have proper z-index and overlay

  Scenario: User completes entire dashboard tour
    Given I am viewing the dashboard tour
    When I progress through all 5 steps
    And I click "Finish" on the final step
    Then the tour should close
    And the tour completion should be saved to localStorage
    And I should not see the tour again on subsequent visits
    And a success toast should appear saying "Tour completed!"

  Scenario: User skips tour during introduction
    Given I am viewing the welcome tour modal
    When I click "Skip Tour"
    Then the tour should close immediately
    And the tour should be marked as "skipped" in localStorage
    And I should be able to replay it later from settings

  Scenario: User dismisses tour mid-progress
    Given I am on step 3 of the dashboard tour
    When I press the Escape key
    Then the tour should close
    And my progress should be saved (step 3)
    And I should be able to resume from step 3 later

  # ============================================
  # Feature 2: Contextual Tooltips
  # ============================================

  Scenario: @critical Contextual tooltip appears on hover
    Given I am on the dashboard
    And I have dismissed the welcome tour
    When I hover over the "Auto-Apply" button
    Then a contextual tooltip should appear after 500ms
    And the tooltip should explain "Enable auto-apply to automatically apply to matched jobs"
    And the tooltip should have a "Learn More" link
    And the tooltip should be positioned near the button without overlapping

  Scenario: Contextual tooltip appears on focus (keyboard navigation)
    Given I am on the dashboard
    When I tab to the "Auto-Apply" button
    And I focus the element for 1 second
    Then the contextual tooltip should appear
    And it should be announced to screen readers
    And pressing Escape should dismiss the tooltip

  Scenario: Tooltip with "Show me how" action
    Given I am viewing a tooltip for the "Resume Builder"
    When I click "Show me how" in the tooltip
    Then the relevant tour should start
    And I should be taken to step 1 of the Resume Builder tour
    And the tour should highlight the resume creation flow

  Scenario: Disable tooltips via settings
    Given I am in the settings page
    When I toggle "Show contextual tooltips" to OFF
    And I save my preferences
    Then tooltips should no longer appear on hover or focus
    And tours should still be available

  # ============================================
  # Feature 3: Skip/Dismiss Tours
  # ============================================

  Scenario: Skip button available on every tour step
    Given I am on any step of a tour
    Then I should see a "Skip Tour" button
    And clicking it should close the tour
    And the tour should be marked as skipped
    And I should be able to restart it later

  Scenario: Dismiss tour with close button (X)
    Given I am viewing step 2 of the job search tour
    When I click the close (X) button
    Then the tour should close
    And my progress should be saved as "step 2"
    And a toast should say "Tour paused. Resume anytime from Help menu"

  Scenario: Dismiss tour with Escape key
    Given I am viewing step 4 of the applications tour
    When I press the Escape key
    Then the tour should close immediately
    And my progress should be saved
    And I should be able to resume from step 4

  Scenario: Dismiss tour by clicking overlay
    Given I am viewing a tour step
    When I click on the dark overlay (backdrop)
    Then the tour should close
    And the progress should be saved
    And a dismissal confirmation should appear

  # ============================================
  # Feature 4: Progress Tracking
  # ============================================

  Scenario: @acceptance Tour progress saved to localStorage
    Given I am on step 3 of the "Cover Letter Generator" tour
    When I dismiss the tour
    Then localStorage should contain:
      | key                          | value                          |
      | tour-cover-letter-progress   | 3                              |
      | tour-cover-letter-status     | in-progress                    |
      | tour-cover-letter-updated    | [current timestamp]            |

  Scenario: Resume tour from saved progress
    Given I previously dismissed the "Job Matching" tour at step 4
    And my progress is saved in localStorage
    When I click "Resume Tour" in the Help menu
    Then the tour should start from step 4
    And the step counter should show "4 of 6"
    And I should be able to continue or restart

  Scenario: View all tour progress in settings
    Given I am in Settings > Onboarding
    Then I should see a list of all available tours
    And each tour should show:
      | Status       | Progress  | Action Button        |
      | Completed    | 5/5       | Replay Tour          |
      | In Progress  | 3/7       | Resume Tour          |
      | Not Started  | 0/4       | Start Tour           |
      | Skipped      | -         | Start Tour           |

  Scenario: Reset all tour progress
    Given I am in Settings > Onboarding
    When I click "Reset All Tours"
    And I confirm the action
    Then all tour progress should be cleared from localStorage
    And all tours should be marked as "Not Started"
    And a success message should appear

  Scenario: Tour completion statistics
    Given I am in Settings > Onboarding
    Then I should see overall statistics:
      | Metric                    | Value  |
      | Tours Completed           | 3/8    |
      | Tours In Progress         | 2      |
      | Tours Not Started         | 3      |
      | Last Completed            | [date] |

  # ============================================
  # Feature 5: Tour Replay Option
  # ============================================

  Scenario: Replay completed tour from settings
    Given I have completed the "Dashboard Overview" tour
    And I am in Settings > Onboarding
    When I click "Replay Tour" for "Dashboard Overview"
    Then the tour should start from step 1
    And my completion status should remain as "Completed"
    And the tour should play through all steps again

  Scenario: Replay tour from help menu
    Given I am on the dashboard
    When I open the Help menu (? icon or Shift+?)
    And I click "Show Dashboard Tour"
    Then the tour should start from step 1
    And I should be able to complete it again

  Scenario: Restart in-progress tour
    Given I have an in-progress tour at step 3
    And I am in Settings > Onboarding
    When I click "Restart Tour" from the dropdown
    Then the tour should start from step 1
    And my saved progress should be reset to step 1
    And a confirmation should appear

  # ============================================
  # Tour Smoothness (Performance)
  # ============================================

  Scenario: @performance Tour animations are smooth
    Given I am viewing a tour step
    When I click "Next"
    Then the transition to the next step should be smooth
    And the animation should complete within 300ms
    And there should be no layout shift or jank
    And the highlighted element should smoothly transition

  Scenario: Tour overlay renders without blocking UI
    Given a tour is active
    Then the rest of the page should remain accessible
    And I should be able to see non-highlighted content
    And the overlay should have opacity 0.5-0.7
    And the highlighted element should be interactive if needed

  Scenario: Tour loads without delaying page render
    Given I am loading the dashboard for the first time
    When the page renders
    Then the initial content should appear within 200ms
    And the tour modal should appear within 500ms after page load
    And the page should not be blocked while tour loads

  # ============================================
  # Dismissibility
  # ============================================

  Scenario: @acceptance Multiple ways to dismiss tour
    Given I am viewing a tour step
    Then I should be able to dismiss using:
      | Method                | Result          |
      | Skip Tour button      | Tour closed     |
      | Close (X) button      | Tour closed     |
      | Escape key            | Tour closed     |
      | Click overlay         | Tour closed     |
    And progress should be saved in all cases

  Scenario: Confirm dismissal for first-time users
    Given I am a first-time user
    And I am on step 1 of my first tour
    When I try to skip or close the tour
    Then a confirmation modal should appear
    And it should say "Are you sure? This tour will help you get started"
    And I should have options to "Continue Tour" or "Skip Anyway"

  Scenario: No confirmation for returning users
    Given I have completed at least one tour
    When I dismiss any other tour
    Then no confirmation should be required
    And the tour should close immediately

  # ============================================
  # Progress Persistence
  # ============================================

  Scenario: @acceptance Progress persists across sessions
    Given I am on step 4 of the "Applications Tracker" tour
    When I dismiss the tour
    And I close the browser
    And I reopen the browser and navigate to the same page
    Then I should see a prompt to "Resume Tour" from step 4
    And clicking "Resume" should continue from step 4
    And clicking "Dismiss" should remove the prompt

  Scenario: Progress persists across devices (synced users)
    Given I am logged in
    And I completed steps 1-3 of a tour on Device A
    When I log in on Device B
    And I navigate to the tour page
    Then I should be able to resume from step 4
    And the progress should sync from the server

  Scenario: Offline progress saved locally
    Given I am offline
    And I complete step 2 of a tour
    When I go online later
    Then my progress should sync to the server
    And it should be available on other devices

  # ============================================
  # Mobile Adaptation
  # ============================================

  Scenario: @mobile Tour adapted for mobile viewport
    Given I am on a mobile device (width < 768px)
    When a tour starts
    Then the tour modal should be full-screen
    And the spotlight should highlight the entire element
    And the "Next" button should be large and touch-friendly (min 44px height)
    And the step content should be readable without zooming

  Scenario: Mobile tour uses bottom sheet UI
    Given I am on mobile
    And a tour step is active
    Then the tour content should appear in a bottom sheet
    And I should be able to swipe down to dismiss
    And the sheet should have a drag handle
    And the content should scroll if it exceeds viewport height

  Scenario: Touch gestures for mobile tour navigation
    Given I am viewing a tour on mobile
    Then I should be able to:
      | Gesture           | Action              |
      | Swipe left        | Go to next step     |
      | Swipe right       | Go to previous step |
      | Swipe down        | Dismiss tour        |
      | Tap overlay       | Dismiss tour        |

  Scenario: Tablet tour uses hybrid layout
    Given I am on a tablet (width 768px - 1024px)
    When a tour starts
    Then the tour should use a side panel layout
    And the highlighted element should be on the left
    And the tour content should be on the right
    And both should be visible simultaneously

  # ============================================
  # Multiple Tours & Tour Types
  # ============================================

  Scenario: Different tours for different user roles
    Given I am logged in as a "Job Seeker"
    Then I should see tours for:
      | Tour Name                | Steps | Priority |
      | Dashboard Overview       | 5     | High     |
      | Resume Builder           | 7     | High     |
      | Job Matching             | 6     | Medium   |
      | Auto-Apply Setup         | 4     | Medium   |
      | Interview Prep           | 5     | Low      |

  Scenario: Employer sees different tours
    Given I am logged in as an "Employer"
    Then I should see tours for:
      | Tour Name                | Steps | Priority |
      | Employer Dashboard       | 6     | High     |
      | Job Posting              | 8     | High     |
      | Candidate Review         | 7     | Medium   |
      | Team Collaboration       | 5     | Low      |

  Scenario: Page-specific tours auto-start
    Given I have completed the dashboard tour
    When I navigate to the Resume Builder for the first time
    Then the Resume Builder tour should auto-start
    And it should be independent of other tours
    And I should be able to skip it

  # ============================================
  # Tour Content & UX
  # ============================================

  Scenario: Tour step includes rich content
    Given I am viewing a tour step
    Then the step content should include:
      | Element       | Description                           |
      | Title         | Clear, action-oriented heading        |
      | Description   | Brief explanation (1-2 sentences)     |
      | Image/GIF     | Optional visual demonstration         |
      | CTA Button    | "Try it now" or "Next"                |
      | Skip link     | Subtle "Skip tour" option             |

  Scenario: Tour highlights interactive elements
    Given I am on a tour step highlighting the "Create Resume" button
    When the step is active
    Then the button should be highlighted with a spotlight effect
    And the button should be clickable
    And clicking it should advance the tour or trigger the action
    And the tour should adapt to the user's action

  Scenario: Tour beacon indicates available tours
    Given I have not started the "Job Alerts" tour
    And I am on the jobs page
    Then I should see a pulsing beacon on the "Alerts" icon
    And hovering should show "New! Take the Job Alerts tour"
    And clicking should start the tour

  # ============================================
  # Accessibility
  # ============================================

  Scenario: @accessibility Tour is fully keyboard navigable
    Given I am viewing a tour
    Then I should be able to navigate using keyboard:
      | Key           | Action                  |
      | Tab           | Focus next button       |
      | Shift+Tab     | Focus previous button   |
      | Enter/Space   | Activate focused button |
      | Escape        | Dismiss tour            |
      | Arrow Right   | Next step               |
      | Arrow Left    | Previous step           |

  Scenario: Tour announces to screen readers
    Given I am using a screen reader
    When a tour step appears
    Then the step title should be announced
    And the step number should be announced ("Step 2 of 5")
    And the description should be read aloud
    And interactive elements should have ARIA labels

  Scenario: High contrast mode support
    Given I have high contrast mode enabled
    When a tour is active
    Then the spotlight should have visible borders
    And the tour content should have sufficient contrast (4.5:1 minimum)
    And all text should be readable

  Scenario: Reduced motion support
    Given I have "prefers-reduced-motion" enabled
    When a tour transitions between steps
    Then animations should be disabled
    And transitions should be instant or minimal
    And the tour should still function correctly

  # ============================================
  # Edge Cases & Error Handling
  # ============================================

  Scenario: Tour handles missing target element
    Given a tour step is configured to highlight element "#missing-button"
    And the element does not exist on the page
    When the tour reaches that step
    Then the tour should skip to the next valid step
    And a warning should be logged to console
    And the user should not see an error

  Scenario: Tour handles lazy-loaded content
    Given a tour step highlights a lazy-loaded component
    When the tour reaches that step
    Then it should wait for the component to load (max 3 seconds)
    And once loaded, the tour should proceed
    And if timeout occurs, skip to next step

  Scenario: Multiple tabs with active tour
    Given I have the dashboard tour active in Tab A
    When I open Tab B with the same page
    Then Tab B should not show the tour
    And closing Tab A should not affect Tab B
    And progress should remain consistent

  Scenario: Tour interrupted by navigation
    Given I am on step 3 of a tour
    When I navigate to a different page
    Then the tour should close
    And my progress should be saved
    And if I return to the page, I should be prompted to resume

  # ============================================
  # Integration with Existing Features
  # ============================================

  Scenario: Tour integrates with feedback widget
    Given I am viewing a tour
    When I click the feedback button (Ctrl+Shift+F)
    Then the tour should pause
    And the feedback widget should open
    And after closing feedback, the tour should resume

  Scenario: Tour integrates with help menu
    Given I am viewing a tour
    When I open the help menu
    Then I should see options to:
      | Option                | Action                        |
      | Pause Tour            | Pause and save progress       |
      | Restart Tour          | Start from step 1             |
      | Skip Tour             | Dismiss permanently           |
      | View All Tours        | Open settings/onboarding page |

  Scenario: Tour integrates with keyboard shortcuts help
    Given I press Shift+? to open keyboard shortcuts
    When the shortcuts panel appears
    Then the tour should pause
    And after closing the panel, the tour should resume

  # ============================================
  # Analytics & Tracking
  # ============================================

  Scenario: Track tour engagement metrics
    Given analytics tracking is enabled
    When a user interacts with a tour
    Then the following events should be tracked:
      | Event                | Data                                  |
      | tour_started         | tour_id, user_id, timestamp           |
      | tour_step_viewed     | tour_id, step_number, timestamp       |
      | tour_completed       | tour_id, duration, timestamp          |
      | tour_skipped         | tour_id, step_number, reason          |
      | tour_dismissed       | tour_id, step_number, method          |

  Scenario: Track tour effectiveness
    Given a user completes a tour
    When they perform the action taught in the tour
    Then an event should track "tour_action_completed"
    And it should include the tour_id and time_since_completion
    And this data should help measure tour effectiveness
