# Feature: Design Tokens and Theming (Issue #73)
#
# As a user of HireFlux
# I want a consistent design system with light and dark themes
# So that I can use the application comfortably in any environment
#
# Scope:
# - Design tokens (colors, spacing, typography, elevation)
# - Light/Dark theme support
# - Theme persistence (localStorage)
# - System preference detection (prefers-color-scheme)
# - WCAG 2.2 AA compliance for both themes
# - Theme switching UI component

Feature: Design Tokens and Theming

  # ============================================================================
  # 1. Design Tokens - Color System
  # ============================================================================

  Scenario: Primary color tokens are defined
    Given I am viewing the design system documentation
    Then I should see the following primary color tokens:
      | Token                | Light Mode Value | Dark Mode Value |
      | --color-primary-50   | #eff6ff          | #1e3a8a         |
      | --color-primary-100  | #dbeafe          | #1e40af         |
      | --color-primary-500  | #3b82f6          | #3b82f6         |
      | --color-primary-600  | #2563eb          | #60a5fa         |
      | --color-primary-900  | #1e3a8a          | #dbeafe         |
    And all primary colors should pass WCAG 2.2 AA contrast ratios

  Scenario: Neutral color tokens are defined
    Given I am viewing the design system documentation
    Then I should see neutral color tokens from 50 to 950
    And each neutral token should have light and dark mode values
    And neutral colors should be used for text, borders, and backgrounds

  Scenario: Semantic color tokens are defined
    Given I am viewing the design system documentation
    Then I should see the following semantic color tokens:
      | Token             | Purpose                  |
      | --color-success   | Success states, positive feedback |
      | --color-warning   | Warning states, caution messages  |
      | --color-error     | Error states, destructive actions |
      | --color-info      | Informational messages            |
    And all semantic colors should pass WCAG 2.2 AA for both themes

  Scenario: Background and surface colors are defined
    Given I am viewing the design system documentation
    Then I should see the following background tokens:
      | Token                  | Light Mode | Dark Mode |
      | --color-background     | #ffffff    | #0a0a0a   |
      | --color-surface        | #f9fafb    | #171717   |
      | --color-surface-raised | #ffffff    | #262626   |
    And surface colors should have appropriate elevation

  # ============================================================================
  # 2. Design Tokens - Spacing System
  # ============================================================================

  Scenario: Spacing scale is defined with consistent increments
    Given I am viewing the design system documentation
    Then I should see the following spacing tokens:
      | Token        | Value  | Pixels |
      | --space-0    | 0      | 0px    |
      | --space-1    | 0.25rem | 4px   |
      | --space-2    | 0.5rem  | 8px   |
      | --space-3    | 0.75rem | 12px  |
      | --space-4    | 1rem    | 16px  |
      | --space-6    | 1.5rem  | 24px  |
      | --space-8    | 2rem    | 32px  |
      | --space-12   | 3rem    | 48px  |
      | --space-16   | 4rem    | 64px  |
      | --space-24   | 6rem    | 96px  |
    And spacing should follow the 4px grid system

  Scenario: Layout spacing tokens are defined
    Given I am viewing the design system documentation
    Then I should see the following layout tokens:
      | Token                  | Value     | Usage                    |
      | --layout-gutter-mobile | 16px      | Mobile horizontal padding |
      | --layout-gutter-tablet | 24px      | Tablet horizontal padding |
      | --layout-gutter-desktop| 32px      | Desktop horizontal padding|
      | --layout-max-width     | 1200px    | Max content width         |
      | --layout-header-height | 64px      | Header/nav height         |

  # ============================================================================
  # 3. Design Tokens - Typography System
  # ============================================================================

  Scenario: Font family tokens are defined
    Given I am viewing the design system documentation
    Then I should see the following font tokens:
      | Token                | Value                                           |
      | --font-sans          | Inter, system-ui, sans-serif                    |
      | --font-mono          | 'Fira Code', Consolas, monospace                |
    And fonts should load with font-display: swap

  Scenario: Font size scale is defined
    Given I am viewing the design system documentation
    Then I should see the following font size tokens:
      | Token         | Size     | Line Height | Usage              |
      | --text-xs     | 0.75rem  | 1rem        | Labels, captions   |
      | --text-sm     | 0.875rem | 1.25rem     | Small text         |
      | --text-base   | 1rem     | 1.5rem      | Body text          |
      | --text-lg     | 1.125rem | 1.75rem     | Large text         |
      | --text-xl     | 1.25rem  | 1.75rem     | Section headings   |
      | --text-2xl    | 1.5rem   | 2rem        | Page headings      |
      | --text-3xl    | 1.875rem | 2.25rem     | Display headings   |
      | --text-4xl    | 2.25rem  | 2.5rem      | Hero headings      |
    And line heights should be optimized for readability

  Scenario: Font weight tokens are defined
    Given I am viewing the design system documentation
    Then I should see the following font weight tokens:
      | Token              | Value | Usage               |
      | --font-normal      | 400   | Body text           |
      | --font-medium      | 500   | Emphasized text     |
      | --font-semibold    | 600   | Headings, labels    |
      | --font-bold        | 700   | Strong emphasis     |

  # ============================================================================
  # 4. Design Tokens - Elevation System
  # ============================================================================

  Scenario: Shadow tokens are defined for elevation
    Given I am viewing the design system documentation
    Then I should see the following elevation tokens:
      | Token            | Light Mode Shadow                          | Dark Mode Shadow |
      | --shadow-sm      | 0 1px 2px rgba(0,0,0,0.05)                 | 0 1px 2px rgba(0,0,0,0.8) |
      | --shadow-md      | 0 4px 6px rgba(0,0,0,0.1)                  | 0 4px 6px rgba(0,0,0,0.9) |
      | --shadow-lg      | 0 10px 15px rgba(0,0,0,0.1)                | 0 10px 15px rgba(0,0,0,0.9) |
      | --shadow-xl      | 0 20px 25px rgba(0,0,0,0.15)               | 0 20px 25px rgba(0,0,0,0.95) |
    And shadows should be adjusted for dark mode visibility

  Scenario: Border radius tokens are defined
    Given I am viewing the design system documentation
    Then I should see the following radius tokens:
      | Token          | Value   | Usage                    |
      | --radius-none  | 0       | No rounding              |
      | --radius-sm    | 0.25rem | Subtle rounding          |
      | --radius-md    | 0.5rem  | Standard rounding        |
      | --radius-lg    | 0.75rem | Large rounding           |
      | --radius-full  | 9999px  | Fully rounded (pills)    |

  # ============================================================================
  # 5. Light Theme - Default State
  # ============================================================================

  Scenario: Application loads in light theme by default
    Given I am a new user visiting HireFlux for the first time
    And I have no theme preference saved in localStorage
    And my system is set to light mode
    When the application loads
    Then I should see the light theme applied
    And the document should have data-theme="light" attribute
    And background should be white (#ffffff)
    And text should be dark gray (#0a0a0a)

  Scenario: Light theme has proper text contrast
    Given I am viewing the application in light theme
    When I check the contrast ratios
    Then primary text on background should have contrast ratio >= 7:1 (AAA)
    And secondary text on background should have contrast ratio >= 4.5:1 (AA)
    And link colors should have contrast ratio >= 4.5:1 (AA)
    And disabled text should have contrast ratio >= 3:1

  Scenario: Light theme surface elevation is visible
    Given I am viewing the application in light theme
    When I view elevated surfaces (cards, modals, dropdowns)
    Then each surface should have a subtle shadow
    And surfaces should have distinct backgrounds from the page background
    And elevation should create clear visual hierarchy

  # ============================================================================
  # 6. Dark Theme - User Activation
  # ============================================================================

  Scenario: User can switch to dark theme manually
    Given I am viewing the application in light theme
    When I click the profile menu
    And I click the "Dark Mode" toggle
    Then the application should immediately switch to dark theme
    And the document should have data-theme="dark" attribute
    And background should be dark (#0a0a0a)
    And text should be light gray (#f5f5f5)
    And my preference should be saved to localStorage

  Scenario: Dark theme has proper text contrast
    Given I am viewing the application in dark theme
    When I check the contrast ratios
    Then primary text on background should have contrast ratio >= 7:1 (AAA)
    And secondary text on background should have contrast ratio >= 4.5:1 (AA)
    And link colors should have contrast ratio >= 4.5:1 (AA)
    And disabled text should have contrast ratio >= 3:1

  Scenario: Dark theme surface elevation is visible
    Given I am viewing the application in dark theme
    When I view elevated surfaces (cards, modals, dropdowns)
    Then each surface should be lighter than the background
    And surfaces should use subtle borders or lighter backgrounds
    And elevation should create clear visual hierarchy without heavy shadows

  # ============================================================================
  # 7. System Preference Detection
  # ============================================================================

  Scenario: Application respects system dark mode preference
    Given I am a new user visiting HireFlux for the first time
    And I have no theme preference saved in localStorage
    And my operating system is set to dark mode
    When the application loads
    Then the application should automatically use dark theme
    And the document should have data-theme="dark" attribute

  Scenario: Application respects system light mode preference
    Given I am a new user visiting HireFlux for the first time
    And I have no theme preference saved in localStorage
    And my operating system is set to light mode
    When the application loads
    Then the application should automatically use light theme
    And the document should have data-theme="light" attribute

  Scenario: Manual preference overrides system preference
    Given my operating system is set to dark mode
    And I have manually selected light theme in HireFlux
    When I reload the application
    Then the application should use light theme (my manual preference)
    And system preference should be ignored

  Scenario: Detect system theme changes in real-time
    Given I am viewing the application in light theme (matching system)
    And I have not manually set a theme preference
    When I change my operating system theme to dark mode
    Then the application should automatically switch to dark theme
    And the transition should be smooth without page reload

  # ============================================================================
  # 8. Theme Persistence
  # ============================================================================

  Scenario: Theme preference persists across sessions
    Given I have manually selected dark theme
    When I close the browser
    And I return to HireFlux the next day
    Then the application should load in dark theme
    And localStorage should contain theme: "dark"

  Scenario: Theme preference syncs across tabs
    Given I have two HireFlux tabs open
    And both are currently in light theme
    When I switch to dark theme in tab 1
    Then tab 2 should also switch to dark theme within 1 second
    And the sync should happen without page reload (via storage event)

  Scenario: Clear theme preference resets to system default
    Given I have manually set the theme to dark mode
    When I click "Reset to System Default" in theme settings
    Then my manual preference should be removed from localStorage
    And the application should use my system theme preference
    And future visits should respect system preference

  # ============================================================================
  # 9. Theme Switching UI Component
  # ============================================================================

  Scenario: Theme toggle is accessible in profile menu
    Given I am logged in
    When I click my profile avatar in the top navigation
    Then I should see a theme toggle option
    And the toggle should show the current theme (Light or Dark)
    And the toggle should have an icon (Sun for light, Moon for dark)

  Scenario: Theme toggle shows visual feedback
    Given I have opened the profile menu
    When I hover over the theme toggle
    Then I should see a hover state
    When I click the toggle
    Then I should see a brief animation/transition
    And the icon should change immediately
    And the theme should apply within 100ms

  Scenario: Keyboard navigation for theme toggle
    Given I am using keyboard navigation
    When I press Tab to focus the profile menu
    And I press Enter to open the menu
    And I press Down Arrow to the theme toggle
    And I press Enter
    Then the theme should switch
    And focus should remain on the toggle

  # ============================================================================
  # 10. Accessibility - WCAG 2.2 AA Compliance
  # ============================================================================

  Scenario: All text meets minimum contrast ratios in light theme
    Given I am viewing the application in light theme
    When I audit all text elements
    Then normal text (< 18px) should have contrast >= 4.5:1
    And large text (>= 18px or bold >= 14px) should have contrast >= 3:1
    And graphical objects should have contrast >= 3:1
    And there should be no contrast violations

  Scenario: All text meets minimum contrast ratios in dark theme
    Given I am viewing the application in dark theme
    When I audit all text elements
    Then normal text (< 18px) should have contrast >= 4.5:1
    And large text (>= 18px or bold >= 14px) should have contrast >= 3:1
    And graphical objects should have contrast >= 3:1
    And there should be no contrast violations

  Scenario: Focus indicators are visible in both themes
    Given I am navigating with keyboard
    When I Tab through interactive elements
    Then every focused element should have a visible focus ring
    And the focus ring should have contrast >= 3:1 with background in light mode
    And the focus ring should have contrast >= 3:1 with background in dark mode
    And the focus ring should be at least 2px thick

  Scenario: Color is not the only visual means of conveying information
    Given I am viewing the application in either theme
    When I check informational elements (success, error, warning)
    Then information should be conveyed with icons + text, not just color
    And status indicators should use shape or pattern in addition to color
    And links should be underlined or have other non-color indicators

  # ============================================================================
  # 11. Component Theming
  # ============================================================================

  Scenario: Buttons adapt to theme
    Given I am viewing buttons in light theme
    Then primary buttons should have high contrast
    And secondary buttons should have outlined style
    And button text should be readable (contrast >= 4.5:1)
    When I switch to dark theme
    Then buttons should automatically update colors
    And contrast ratios should remain compliant

  Scenario: Form inputs adapt to theme
    Given I am viewing form inputs in light theme
    Then inputs should have subtle borders
    And background should be white or very light gray
    And placeholder text should have contrast >= 4.5:1
    When I switch to dark theme
    Then inputs should have lighter borders
    And background should be dark with raised surface color
    And placeholder text should remain readable

  Scenario: Cards and surfaces adapt to theme
    Given I am viewing cards in light theme
    Then cards should have white backgrounds
    And subtle shadows for elevation
    When I switch to dark theme
    Then cards should have raised surface backgrounds (lighter than page)
    And use subtle borders or reduced shadows

  Scenario: Navigation components adapt to theme
    Given I am viewing the app shell in light theme
    Then top nav should have white background
    And sidebar should have light gray background
    When I switch to dark theme
    Then top nav should have dark background
    And sidebar should have darker surface background
    And active navigation items should remain highly visible

  # ============================================================================
  # 12. Performance
  # ============================================================================

  Scenario: Theme switch happens instantly without flash
    Given I am viewing the application in light theme
    When I click the theme toggle
    Then the theme should apply within 100ms
    And there should be no flash of unstyled content (FOUC)
    And there should be no flash of wrong theme
    And the transition should be smooth

  Scenario: Initial theme is applied before first paint
    Given I am loading HireFlux for the first time
    And my system is set to dark mode
    When the page renders
    Then dark theme should be applied before first contentful paint
    And there should be no flash of light theme
    And no layout shift should occur

  Scenario: Theme CSS is optimized for performance
    Given I am loading the application
    When I inspect the CSS
    Then theme CSS should use CSS custom properties (variables)
    And there should be minimal redundant styles
    And critical theme CSS should be inlined in <head>

  # ============================================================================
  # 13. Token Documentation
  # ============================================================================

  Scenario: Design tokens are documented in Storybook
    Given I am a developer working on HireFlux
    When I open the Storybook documentation
    Then I should see a "Design Tokens" section
    And I should see all color tokens with visual swatches
    And I should see all spacing tokens with visual rulers
    And I should see all typography tokens with samples
    And each token should show both light and dark mode values

  Scenario: Token usage examples are provided
    Given I am viewing the design token documentation
    When I click on a token (e.g., --color-primary-500)
    Then I should see code examples of how to use it
    And I should see which components use this token
    And I should see accessibility notes (if applicable)

  # ============================================================================
  # 14. Edge Cases
  # ============================================================================

  Scenario: Handle missing localStorage gracefully
    Given I am in a browser with localStorage disabled
    When I toggle the theme
    Then the theme should still apply for the current session
    And a console warning should be logged (not an error)
    And the application should not crash

  Scenario: Handle corrupted theme data in localStorage
    Given localStorage contains invalid theme data
    When the application loads
    Then it should fall back to system preference
    And it should clear the corrupted data
    And it should not crash or show errors to the user

  Scenario: Theme toggle works on slow connections
    Given I am on a slow 3G connection
    When I toggle the theme
    Then the UI should update immediately (client-side)
    And there should be no delay waiting for assets
    And the user should not see spinners or loading states

  # ============================================================================
  # 15. Testing & Quality
  # ============================================================================

  Scenario: Snapshot tests verify token structure
    Given I am running the test suite
    When I run snapshot tests for design tokens
    Then all color tokens should be present
    And all spacing tokens should be present
    And all typography tokens should be present
    And all elevation tokens should be present
    And the snapshot should match the expected structure

  Scenario: Visual regression tests for both themes
    Given I am running visual regression tests
    When I capture screenshots of key pages in light theme
    And I capture screenshots of the same pages in dark theme
    Then both sets of screenshots should match baselines
    And there should be no unexpected visual changes
    And all components should render correctly in both themes
