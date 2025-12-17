Feature: WCAG 2.1 AA Compliance Audit
  As a user with disabilities
  I want the application to be fully accessible
  So that I can use all features regardless of my abilities

  Background:
    Given the application is running
    And I am on the main page

  # ===================================================================
  # PRINCIPLE 1: PERCEIVABLE
  # Information and user interface components must be presentable to users in ways they can perceive
  # ===================================================================

  Scenario: 1.1.1 Non-text Content (Level A)
    Given I am on any page with images
    Then all images should have alt text
    And decorative images should have alt="" or role="presentation"
    And informative images should have meaningful alt text
    And functional images should describe their purpose
    And complex images should have extended descriptions

  Scenario: 1.2.1 Audio-only and Video-only (Prerecorded) (Level A)
    Given I am viewing prerecorded audio or video content
    Then prerecorded audio-only content should have text transcripts
    And prerecorded video-only content should have audio descriptions or transcripts

  Scenario: 1.2.2 Captions (Prerecorded) (Level A)
    Given I am watching prerecorded video with audio
    Then captions should be provided for all prerecorded audio content in synchronized media

  Scenario: 1.2.3 Audio Description or Media Alternative (Prerecorded) (Level A)
    Given I am watching prerecorded video content
    Then an alternative for time-based media or audio description should be provided

  Scenario: 1.2.4 Captions (Live) (Level AA)
    Given I am watching live audio content in synchronized media
    Then captions should be provided for all live audio content

  Scenario: 1.2.5 Audio Description (Prerecorded) (Level AA)
    Given I am watching prerecorded video content
    Then audio description should be provided for all prerecorded video content

  Scenario: 1.3.1 Info and Relationships (Level A)
    Given I am on any page
    Then information, structure, and relationships should be programmatically determined
    And semantic HTML should be used (headings, lists, tables, forms)
    And ARIA roles should be used when semantic HTML is insufficient
    And form labels should be programmatically associated with inputs

  Scenario: 1.3.2 Meaningful Sequence (Level A)
    Given I am using assistive technology
    Then the reading and navigation order should be logical and intuitive
    And the visual order should match the DOM order
    And CSS positioning should not disrupt reading order

  Scenario: 1.3.3 Sensory Characteristics (Level A)
    Given instructions are provided for understanding content
    Then instructions should not rely solely on sensory characteristics
    And shape, color, size, visual location, orientation, or sound should not be the only way to understand instructions

  Scenario: 1.3.4 Orientation (Level AA)
    Given I am using the application on a mobile device
    Then content should not be restricted to a single display orientation
    And the application should support both portrait and landscape

  Scenario: 1.3.5 Identify Input Purpose (Level AA)
    Given I am filling out a form
    Then the purpose of each input field should be programmatically determinable
    And autocomplete attributes should be used for common fields (name, email, address, etc.)

  Scenario: 1.4.1 Use of Color (Level A)
    Given I am viewing content that uses color
    Then color should not be the only visual means of conveying information
    And links should be distinguished by more than color alone
    And form validation errors should use icons or text in addition to color

  Scenario: 1.4.2 Audio Control (Level A)
    Given audio plays automatically for more than 3 seconds
    Then a mechanism should be available to pause, stop, or control volume

  Scenario: 1.4.3 Contrast (Minimum) (Level AA) - Critical
    Given I am viewing text content
    Then normal text should have a contrast ratio of at least 4.5:1
    And large text (18pt+ or 14pt+ bold) should have a contrast ratio of at least 3:1
    And UI components and graphical objects should have a contrast ratio of at least 3:1

  Scenario: 1.4.4 Resize Text (Level AA)
    Given I am viewing text content
    Then text should be resizable up to 200% without loss of content or functionality
    And the layout should not break when text is zoomed

  Scenario: 1.4.5 Images of Text (Level AA)
    Given I am viewing text content
    Then images of text should be avoided except for logos or when essential
    And actual text should be used instead of images of text

  Scenario: 1.4.10 Reflow (Level AA)
    Given I am viewing content at 400% zoom
    Then content should reflow to avoid horizontal scrolling
    And two-dimensional layouts (maps, diagrams) are exempt
    And content should be readable at 320px viewport width

  Scenario: 1.4.11 Non-text Contrast (Level AA)
    Given I am viewing UI components and graphical objects
    Then UI components should have a contrast ratio of at least 3:1
    And graphical objects should have a contrast ratio of at least 3:1
    And focus indicators should have sufficient contrast

  Scenario: 1.4.12 Text Spacing (Level AA)
    Given I adjust text spacing
    Then content should be readable with the following adjustments:
      | Property         | Value  |
      | line-height      | 1.5x   |
      | paragraph spacing| 2x     |
      | letter-spacing   | 0.12x  |
      | word-spacing     | 0.16x  |

  Scenario: 1.4.13 Content on Hover or Focus (Level AA)
    Given additional content appears on hover or focus
    Then the content should be dismissible without moving focus
    And the content should be hoverable
    And the content should persist until dismissed or no longer relevant

  # ===================================================================
  # PRINCIPLE 2: OPERABLE
  # User interface components and navigation must be operable
  # ===================================================================

  Scenario: 2.1.1 Keyboard (Level A) - Critical
    Given I am using only a keyboard
    Then all functionality should be available via keyboard
    And no keyboard traps should exist
    And custom controls should be keyboard accessible

  Scenario: 2.1.2 No Keyboard Trap (Level A) - Critical
    Given I am navigating with a keyboard
    Then I should be able to move focus away from any component using keyboard alone
    And if a trap is intentional, instructions should be provided to escape

  Scenario: 2.1.3 Keyboard (No Exception) (Level AAA)
    Given I am using only a keyboard
    Then all functionality should be available via keyboard with no exceptions

  Scenario: 2.1.4 Character Key Shortcuts (Level A)
    Given keyboard shortcuts use only character keys
    Then the shortcut should be able to be turned off, remapped, or only active on focus

  Scenario: 2.2.1 Timing Adjustable (Level A)
    Given content has time limits
    Then the user should be able to turn off, adjust, or extend the time limit
    And exceptions exist for real-time events, essential timing, or > 20 hours

  Scenario: 2.2.2 Pause, Stop, Hide (Level A)
    Given content is moving, blinking, scrolling, or auto-updating
    Then the user should be able to pause, stop, or hide it
    And this applies to content that starts automatically and lasts more than 5 seconds

  Scenario: 2.3.1 Three Flashes or Below Threshold (Level A)
    Given content contains flashing
    Then content should not flash more than 3 times per second
    Or flashing should be below the general flash and red flash thresholds

  Scenario: 2.4.1 Bypass Blocks (Level A) - Critical
    Given I am navigating repetitive content
    Then a mechanism should be available to bypass blocks of repeated content
    And skip links should be provided
    And landmark roles should be used

  Scenario: 2.4.2 Page Titled (Level A)
    Given I am on any page
    Then each page should have a descriptive and unique title
    And the title should identify the page's purpose

  Scenario: 2.4.3 Focus Order (Level A) - Critical
    Given I am navigating with keyboard
    Then the focus order should be logical and intuitive
    And the tab order should follow visual order
    And hidden elements should not receive focus

  Scenario: 2.4.4 Link Purpose (In Context) (Level A)
    Given I encounter a link
    Then the purpose of the link should be determinable from link text alone
    Or from link text together with its programmatically determined context

  Scenario: 2.4.5 Multiple Ways (Level AA)
    Given I want to find a page
    Then more than one way should be provided to locate pages
    And options include search, sitemap, navigation menu, or related links

  Scenario: 2.4.6 Headings and Labels (Level AA)
    Given I am viewing content with headings and labels
    Then headings should describe topics or purposes
    And labels should describe inputs or controls
    And both should be clear and descriptive

  Scenario: 2.4.7 Focus Visible (Level AA) - Critical
    Given I am navigating with keyboard
    Then keyboard focus should be clearly visible
    And focus indicators should have sufficient contrast
    And focus should never be invisible

  Scenario: 2.5.1 Pointer Gestures (Level A)
    Given functionality requires multipoint or path-based gestures
    Then single-pointer alternatives should be available
    Unless the gesture is essential

  Scenario: 2.5.2 Pointer Cancellation (Level A)
    Given I interact with controls using a pointer
    Then activation should occur on up-event
    Or down-event can be aborted or undone
    Or up-event reverses down-event
    Or completing down-event is essential

  Scenario: 2.5.3 Label in Name (Level A)
    Given I am using voice control
    Then the accessible name of UI components should include the visible label text
    And the visible label should match or be contained in the accessible name

  Scenario: 2.5.4 Motion Actuation (Level A)
    Given functionality is triggered by device motion or user motion
    Then it should also be operable by UI components
    And a mechanism should be available to disable motion activation

  # ===================================================================
  # PRINCIPLE 3: UNDERSTANDABLE
  # Information and operation of user interface must be understandable
  # ===================================================================

  Scenario: 3.1.1 Language of Page (Level A)
    Given I am on any page
    Then the default language should be programmatically determined
    And the lang attribute should be set on the html element

  Scenario: 3.1.2 Language of Parts (Level AA)
    Given I am viewing content in multiple languages
    Then the language of each passage should be programmatically determined
    And lang attributes should be used for language changes

  Scenario: 3.2.1 On Focus (Level A)
    Given an element receives focus
    Then it should not initiate a change of context
    Unless the user has been advised beforehand

  Scenario: 3.2.2 On Input (Level A)
    Given I change the setting of a UI component
    Then it should not automatically cause a change of context
    Unless the user has been advised beforehand

  Scenario: 3.2.3 Consistent Navigation (Level AA)
    Given I am navigating the application
    Then navigation mechanisms should be consistent across pages
    And the order of navigation should remain the same

  Scenario: 3.2.4 Consistent Identification (Level AA)
    Given components have the same functionality
    Then they should be identified consistently across the application

  Scenario: 3.3.1 Error Identification (Level A)
    Given input errors are detected
    Then the error should be identified to the user
    And the error should be described in text
    And the error location should be identified

  Scenario: 3.3.2 Labels or Instructions (Level A)
    Given I am filling out a form
    Then labels or instructions should be provided for user input
    And required fields should be clearly indicated
    And format requirements should be stated

  Scenario: 3.3.3 Error Suggestion (Level AA)
    Given input errors are detected and suggestions are known
    Then suggestions should be provided to help correct the error
    Unless it would jeopardize security or purpose

  Scenario: 3.3.4 Error Prevention (Legal, Financial, Data) (Level AA)
    Given I am submitting legal, financial, or data commitments
    Then one of the following should be true:
      - Submissions are reversible
      - Data is checked for errors and corrected
      - A mechanism to review and confirm before submission is available

  # ===================================================================
  # PRINCIPLE 4: ROBUST
  # Content must be robust enough to be interpreted by a wide variety of user agents, including assistive technologies
  # ===================================================================

  Scenario: 4.1.1 Parsing (Level A) - Deprecated in WCAG 2.2
    Given I am using assistive technology
    Then markup should be valid according to specifications
    And elements should have complete start and end tags
    And elements should be properly nested
    And duplicate IDs should not exist

  Scenario: 4.1.2 Name, Role, Value (Level A) - Critical
    Given I am using assistive technology
    Then all UI components should have programmatically determined names
    And all UI components should have programmatically determined roles
    And states, properties, and values should be programmatically determinable
    And notification of changes should be available to user agents

  Scenario: 4.1.3 Status Messages (Level AA)
    Given status messages are presented to the user
    Then they should be programmatically determinable through role or properties
    And they should be available to assistive technologies without receiving focus
    And ARIA live regions should be used for dynamic status messages

  # ===================================================================
  # AUTOMATED TESTING WITH AXE-CORE
  # ===================================================================

  Scenario: Automated Accessibility Scan - Homepage
    Given I am on the homepage
    When I run an automated accessibility scan
    Then there should be 0 critical accessibility violations
    And there should be 0 serious accessibility violations
    And the axe-core audit should pass WCAG 2.1 AA standards

  Scenario: Automated Accessibility Scan - Dashboard
    Given I am logged in as a job seeker
    And I am on the dashboard page
    When I run an automated accessibility scan
    Then there should be 0 critical accessibility violations
    And there should be 0 serious accessibility violations

  Scenario: Automated Accessibility Scan - Job Matching
    Given I am logged in as a job seeker
    And I am on the job matching page
    When I run an automated accessibility scan
    Then there should be 0 critical accessibility violations
    And there should be 0 serious accessibility violations

  Scenario: Automated Accessibility Scan - Resume Builder
    Given I am logged in as a job seeker
    And I am on the resume builder page
    When I run an automated accessibility scan
    Then there should be 0 critical accessibility violations
    And there should be 0 serious accessibility violations

  Scenario: Automated Accessibility Scan - Cover Letter Generator
    Given I am logged in as a job seeker
    And I am on the cover letter generator page
    When I run an automated accessibility scan
    Then there should be 0 critical accessibility violations
    And there should be 0 serious accessibility violations

  Scenario: Automated Accessibility Scan - Employer Dashboard
    Given I am logged in as an employer
    And I am on the employer dashboard page
    When I run an automated accessibility scan
    Then there should be 0 critical accessibility violations
    And there should be 0 serious accessibility violations

  Scenario: Automated Accessibility Scan - Job Posting
    Given I am logged in as an employer
    And I am on the job posting page
    When I run an automated accessibility scan
    Then there should be 0 critical accessibility violations
    And there should be 0 serious accessibility violations

  Scenario: Automated Accessibility Scan - Applicant Tracking
    Given I am logged in as an employer
    And I am on the applicant tracking page
    When I run an automated accessibility scan
    Then there should be 0 critical accessibility violations
    And there should be 0 serious accessibility violations

  # ===================================================================
  # MANUAL TESTING REQUIREMENTS
  # ===================================================================

  Scenario: Screen Reader Testing - NVDA
    Given I am using NVDA screen reader on Windows
    Then I should be able to navigate all content
    And I should be able to access all functionality
    And all interactive elements should announce their purpose
    And all dynamic content changes should be announced

  Scenario: Screen Reader Testing - JAWS
    Given I am using JAWS screen reader on Windows
    Then I should be able to navigate all content
    And I should be able to access all functionality
    And all interactive elements should announce their purpose
    And all dynamic content changes should be announced

  Scenario: Screen Reader Testing - VoiceOver (macOS)
    Given I am using VoiceOver on macOS
    Then I should be able to navigate all content with keyboard
    And I should be able to navigate all content with trackpad gestures
    And all interactive elements should announce their purpose
    And all dynamic content changes should be announced

  Scenario: Screen Reader Testing - VoiceOver (iOS)
    Given I am using VoiceOver on iOS
    Then I should be able to navigate all content with swipe gestures
    And I should be able to access all functionality
    And all interactive elements should announce their purpose
    And all dynamic content changes should be announced

  Scenario: Screen Reader Testing - TalkBack (Android)
    Given I am using TalkBack on Android
    Then I should be able to navigate all content with swipe gestures
    And I should be able to access all functionality
    And all interactive elements should announce their purpose
    And all dynamic content changes should be announced

  Scenario: High Contrast Mode Testing
    Given I enable high contrast mode in my operating system
    Then all content should remain visible and usable
    And focus indicators should be clearly visible
    And UI components should have sufficient contrast
    And no information should be lost

  Scenario: Keyboard-Only Navigation Testing
    Given I am using only a keyboard
    Then I should be able to access all pages
    And I should be able to complete all workflows
    And focus order should be logical
    And no keyboard traps should exist
    And skip links should work correctly

  # ===================================================================
  # ACCEPTANCE CRITERIA (From Issue #148)
  # ===================================================================

  Scenario: Acceptance Criteria - 100% AA Compliant
    Given the application has been audited
    Then it should be 100% WCAG 2.1 AA compliant
    And all Level A criteria should be met
    And all Level AA criteria should be met

  Scenario: Acceptance Criteria - Axe-core Passes
    Given I run axe-core on all major pages
    Then there should be 0 critical violations
    And there should be 0 serious violations
    And the accessibility score should be 100%

  Scenario: Acceptance Criteria - Screen Reader Works
    Given I use a screen reader (NVDA, JAWS, or VoiceOver)
    Then all content should be accessible
    And all interactive elements should be announced correctly
    And all dynamic updates should be communicated
    And navigation should be efficient

  Scenario: Acceptance Criteria - Keyboard Complete
    Given I use only a keyboard
    Then all functionality should be available
    And all interactive elements should be reachable
    And focus indicators should be visible
    And tab order should be logical
    And no keyboard traps should exist

  # ===================================================================
  # REGRESSION TESTING
  # ===================================================================

  Scenario: Accessibility Regression Prevention
    Given a new feature is added to the application
    Then automated accessibility tests should run in CI/CD
    And any new violations should fail the build
    And developers should be notified of accessibility issues
    And the accessibility score should not decrease

  Scenario: Continuous Accessibility Monitoring
    Given the application is in production
    Then accessibility should be monitored continuously
    And automated scans should run regularly
    And violations should be reported to the team
    And a compliance dashboard should be maintained
