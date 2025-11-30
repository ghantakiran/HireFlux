# Feature: App Shell - Global Navigation & Responsive Layout (Issue #72)
#
# As a user of HireFlux (job seeker or employer)
# I want a consistent, accessible navigation experience across all devices
# So that I can easily access all features regardless of screen size
#
# Scope:
# - Desktop navigation (top nav + collapsible left sidebar)
# - Mobile navigation (bottom tab bar + hamburger menu)
# - Accessibility (keyboard navigation, ARIA landmarks, focus states)
# - Responsive layout system (12-column desktop, 4-column mobile)
# - Content width constraints (max 1200px)

Feature: App Shell - Global Navigation & Responsive Layout

  # ============================================================================
  # 1. Desktop Navigation - Top Navigation Bar
  # ============================================================================

  Scenario: Display top navigation on desktop
    Given I am on a desktop device (width >= 1024px)
    When I view any page in the application
    Then I should see a top navigation bar
    And the top nav should contain:
      | HireFlux logo      |
      | Search bar         |
      | Notifications icon |
      | User profile menu  |
    And the top nav should be fixed to the top of the viewport
    And the top nav height should be 64px

  Scenario: Top navigation logo links to dashboard
    Given I am viewing the top navigation on desktop
    When I click the HireFlux logo
    Then I should be redirected to my role-specific dashboard
    And if I am a job seeker, I go to "/dashboard"
    And if I am an employer, I go to "/employer/dashboard"

  Scenario: Top navigation search bar
    Given I am viewing the top navigation on desktop
    When I click the search bar
    Then the search input should receive focus
    And I should see a search placeholder "Search jobs, candidates, or companies..."
    When I type "Software Engineer" and press Enter
    Then I should be taken to search results page

  Scenario: Top navigation notifications icon
    Given I am viewing the top navigation on desktop
    When I have 3 unread notifications
    Then I should see a badge with "3" on the notifications icon
    When I click the notifications icon
    Then I should see a notifications dropdown
    And the dropdown should display my recent notifications

  Scenario: Top navigation user profile menu
    Given I am viewing the top navigation on desktop
    When I click my profile avatar
    Then I should see a dropdown menu with:
      | Profile Settings   |
      | Billing            |
      | Help & Support     |
      | Sign Out           |
    When I click "Sign Out"
    Then I should be logged out and redirected to "/login"

  # ============================================================================
  # 2. Desktop Navigation - Left Sidebar
  # ============================================================================

  Scenario: Display left sidebar navigation on desktop
    Given I am on a desktop device (width >= 1024px)
    And I am logged in as a job seeker
    When I view the dashboard
    Then I should see a left sidebar navigation
    And the sidebar should be 240px wide
    And the sidebar should contain navigation items:
      | Dashboard       |
      | Job Search      |
      | Applications    |
      | Resumes         |
      | Cover Letters   |
      | Interview Prep  |
      | Profile         |

  Scenario: Display employer-specific sidebar items
    Given I am on a desktop device
    And I am logged in as an employer
    When I view the employer dashboard
    Then the left sidebar should contain:
      | Dashboard       |
      | Jobs            |
      | Candidates      |
      | Applications    |
      | Team            |
      | Analytics       |
      | Company Profile |

  Scenario: Highlight active navigation item
    Given I am viewing the left sidebar
    When I am on the "/dashboard" page
    Then the "Dashboard" nav item should be highlighted
    And the highlight should use the primary color
    When I navigate to "/jobs" page
    Then the "Job Search" nav item should be highlighted
    And the "Dashboard" item should no longer be highlighted

  Scenario: Collapse left sidebar on desktop
    Given I am viewing the left sidebar in expanded state (240px)
    When I click the collapse button
    Then the sidebar should collapse to 64px width
    And I should see only icons (no text labels)
    And the page content should expand to fill available space
    When I hover over a collapsed nav item
    Then I should see a tooltip with the item name

  Scenario: Persist sidebar collapse state
    Given I have collapsed the left sidebar
    When I refresh the page
    Then the sidebar should remain collapsed
    When I navigate to a different page
    Then the sidebar should remain collapsed

  # ============================================================================
  # 3. Mobile Navigation - Bottom Tab Bar
  # ============================================================================

  Scenario: Display bottom tab bar on mobile
    Given I am on a mobile device (width < 768px)
    When I view any page in the application
    Then I should see a bottom tab bar
    And the bottom tab bar should be fixed to the bottom of the viewport
    And the tab bar height should be 64px
    And the tab bar should contain 5 tabs:
      | Home (Dashboard icon) |
      | Search (Search icon)  |
      | Activity (Bell icon)  |
      | Messages (Chat icon)  |
      | More (Menu icon)      |

  Scenario: Navigate using bottom tab bar
    Given I am viewing the bottom tab bar on mobile
    When I tap the "Search" tab
    Then I should be taken to the job search page
    And the "Search" tab should be highlighted
    When I tap the "Activity" tab
    Then I should be taken to my activity feed
    And the "Activity" tab should be highlighted

  Scenario: Show notification badge on mobile tabs
    Given I have 5 unread notifications
    When I view the bottom tab bar on mobile
    Then I should see a badge with "5" on the "Activity" tab
    When I tap the "Activity" tab and view notifications
    Then the badge should disappear

  Scenario: Tap target size for mobile tabs
    Given I am viewing the bottom tab bar on mobile
    Then each tab should have a tap target of at least 48px × 48px
    And tabs should have visual feedback on tap (ripple effect)

  # ============================================================================
  # 4. Mobile Navigation - Hamburger Menu
  # ============================================================================

  Scenario: Display hamburger menu on mobile
    Given I am on a mobile device (width < 768px)
    When I view the top of the page
    Then I should see a hamburger menu icon in the top-left corner
    And I should see the HireFlux logo in the center
    And I should see a user avatar in the top-right corner

  Scenario: Open hamburger menu on mobile
    Given I am viewing the hamburger menu icon on mobile
    When I tap the hamburger icon
    Then a navigation drawer should slide in from the left
    And the drawer should cover 80% of the screen width
    And the drawer should display all navigation items:
      | Dashboard       |
      | Job Search      |
      | Applications    |
      | Resumes         |
      | Cover Letters   |
      | Interview Prep  |
      | Profile         |
      | Settings        |
      | Help & Support  |
      | Sign Out        |

  Scenario: Close hamburger menu
    Given the hamburger menu is open on mobile
    When I tap outside the drawer
    Then the drawer should close with a slide-out animation
    When I open the drawer again and tap a navigation item
    Then the drawer should close
    And I should navigate to the selected page

  Scenario: Swipe to close hamburger menu
    Given the hamburger menu is open on mobile
    When I swipe left on the drawer
    Then the drawer should close with a swipe animation

  # ============================================================================
  # 5. Accessibility - Keyboard Navigation
  # ============================================================================

  Scenario: Navigate with Tab key on desktop
    Given I am on the homepage using a keyboard
    When I press Tab
    Then focus should move to the "Skip to main content" link
    When I press Tab again
    Then focus should move to the HireFlux logo
    When I continue pressing Tab
    Then focus should move through all navigation items in order:
      | Search bar         |
      | Notifications icon |
      | Profile menu       |
      | Sidebar nav items  |

  Scenario: Skip to main content link
    Given I am on any page using a keyboard
    When I press Tab to focus the "Skip to main content" link
    And I press Enter
    Then focus should jump to the main content area
    And the page should scroll to show the main content

  Scenario: Keyboard navigation in sidebar
    Given I am viewing the left sidebar on desktop
    When I press Tab to focus the first sidebar item
    And I press the Down Arrow key
    Then focus should move to the next sidebar item
    When I press the Up Arrow key
    Then focus should move to the previous sidebar item
    When I press Enter on a focused item
    Then I should navigate to that page

  Scenario: Keyboard navigation in mobile menu
    Given the hamburger menu is open on mobile
    When I press Tab
    Then focus should move through menu items sequentially
    When I press Escape
    Then the menu should close
    And focus should return to the hamburger button

  Scenario: Visible focus indicators
    Given I am navigating with a keyboard
    When any interactive element receives focus
    Then I should see a visible focus ring
    And the focus ring should be at least 2px wide
    And the focus ring should have sufficient contrast (3:1 ratio)

  # ============================================================================
  # 6. Accessibility - ARIA Landmarks
  # ============================================================================

  Scenario: Proper ARIA landmarks on the page
    Given I am viewing any page in the application
    When I inspect the page structure
    Then I should find the following landmarks:
      | <header> with role="banner"      |
      | <nav> with role="navigation"     |
      | <main> with role="main"          |
      | <footer> with role="contentinfo" |
    And each landmark should have a descriptive aria-label

  Scenario: Screen reader announces navigation changes
    Given I am using a screen reader
    When I click a navigation item
    Then the screen reader should announce "Navigating to [Page Name]"
    When the new page loads
    Then the screen reader should announce the page title
    And the screen reader should announce the main content heading

  Scenario: ARIA attributes on navigation items
    Given I am inspecting the navigation items
    Then each nav item should have aria-label or aria-labelledby
    And the active nav item should have aria-current="page"
    And expandable menus should have aria-expanded="true" or "false"
    And dropdown menus should have aria-haspopup="true"

  # ============================================================================
  # 7. Responsive Layout System
  # ============================================================================

  Scenario: 12-column grid on desktop
    Given I am on a desktop device (width >= 1024px)
    When I view the main content area
    Then the layout should use a 12-column grid system
    And the grid should have 24px gutters
    And the maximum content width should be 1200px
    And content should be centered when viewport exceeds 1200px

  Scenario: 4-column grid on mobile
    Given I am on a mobile device (width < 768px)
    When I view the main content area
    Then the layout should use a 4-column grid system
    And the grid should have 16px gutters
    And content should span edge-to-edge with 16px padding

  Scenario: Tablet breakpoint behavior
    Given I am on a tablet device (width 768px - 1023px)
    When I view the application
    Then I should see the mobile hamburger menu
    And I should see the bottom tab bar
    And the main content should use an 8-column grid
    And the grid should have 20px gutters

  Scenario: Content width constraints
    Given I am on a desktop device with 1920px width
    When I view any page
    Then the main content width should not exceed 1200px
    And there should be equal whitespace on left and right
    When I resize the window to 1024px
    Then the content should occupy most of the viewport
    And side margins should be 24px

  # ============================================================================
  # 8. Responsive Breakpoints
  # ============================================================================

  Scenario: Mobile breakpoint (< 768px)
    Given I resize my browser to 375px width
    Then I should see:
      | Bottom tab bar              |
      | Hamburger menu icon         |
      | No left sidebar             |
      | 4-column grid layout        |
      | Full-width content sections |

  Scenario: Tablet breakpoint (768px - 1023px)
    Given I resize my browser to 800px width
    Then I should see:
      | Bottom tab bar       |
      | Hamburger menu icon  |
      | No left sidebar      |
      | 8-column grid layout |

  Scenario: Desktop breakpoint (>= 1024px)
    Given I resize my browser to 1280px width
    Then I should see:
      | Top navigation bar    |
      | Left sidebar (240px)  |
      | No bottom tab bar     |
      | No hamburger menu     |
      | 12-column grid layout |
      | Max content 1200px    |

  Scenario: Extra large desktop (>= 1920px)
    Given I resize my browser to 2560px width
    Then the layout should remain at 1200px max width
    And navigation elements should not stretch beyond 1200px container
    And equal whitespace should fill both sides

  # ============================================================================
  # 9. Navigation State Management
  # ============================================================================

  Scenario: Maintain scroll position on navigation
    Given I am on a page scrolled 500px down
    When I click the browser back button
    Then the previous page should load
    And the scroll position should be restored

  Scenario: Loading states during navigation
    Given I click a navigation item
    When the page is loading
    Then I should see a loading indicator
    And the navigation item should be marked as active
    When the page finishes loading
    Then the loading indicator should disappear

  Scenario: Navigation during slow network
    Given I am on a slow 3G connection
    When I click a navigation item
    Then I should see immediate visual feedback (highlighted state)
    And a progress bar should appear at the top
    When the page loads
    Then the progress bar should complete and fade out

  # ============================================================================
  # 10. Profile Menu & User Actions
  # ============================================================================

  Scenario: Display user information in profile menu
    Given I am logged in as "John Doe" with email "john@example.com"
    When I open the profile menu
    Then I should see my name "John Doe"
    And I should see my email "john@example.com"
    And I should see my profile avatar

  Scenario: Access profile settings from menu
    Given I have opened the profile menu
    When I click "Profile Settings"
    Then I should be taken to "/settings/profile"
    And the profile menu should close

  Scenario: Access billing from menu (subscription users)
    Given I am a paid subscriber
    When I open the profile menu
    Then I should see "Billing" option
    When I click "Billing"
    Then I should be taken to "/settings/billing"

  Scenario: Sign out from profile menu
    Given I am logged in
    When I open the profile menu and click "Sign Out"
    Then I should see a confirmation "Are you sure you want to sign out?"
    When I confirm sign out
    Then I should be logged out
    And I should be redirected to "/login"
    And my session should be cleared

  # ============================================================================
  # 11. Search Functionality
  # ============================================================================

  Scenario: Global search in top navigation
    Given I am viewing the top navigation
    When I click the search bar
    Then the search input should expand (if collapsed)
    And I should see a placeholder based on my role:
      | Job Seeker: "Search jobs, companies..."           |
      | Employer: "Search candidates, applications..."    |

  Scenario: Search suggestions on typing
    Given I have focused the search bar
    When I type "Soft"
    Then I should see search suggestions:
      | Software Engineer           |
      | Software Developer          |
      | Software Architect          |
    When I press Down Arrow
    Then the first suggestion should be highlighted
    When I press Enter
    Then I should search for the highlighted suggestion

  Scenario: Recent searches
    Given I have previously searched for "React Developer" and "Product Manager"
    When I click the search bar without typing
    Then I should see my recent searches
    And I should see a "Clear recent searches" option

  # ============================================================================
  # 12. Notifications Panel
  # ============================================================================

  Scenario: Display notifications panel
    Given I have 5 notifications (3 unread, 2 read)
    When I click the notifications icon
    Then I should see a notifications panel
    And I should see "3 unread notifications" as a header
    And unread notifications should have a blue dot indicator
    And read notifications should appear dimmed

  Scenario: Mark notification as read
    Given I have opened the notifications panel with unread notifications
    When I click on an unread notification
    Then the notification should be marked as read
    And the blue dot should disappear
    And the badge count should decrease by 1

  Scenario: Notification types and icons
    Given I have various notification types
    Then I should see appropriate icons:
      | Application status: Briefcase icon |
      | New message: Chat icon             |
      | Interview: Calendar icon           |
      | Job match: Star icon               |

  Scenario: Mark all as read
    Given I have 5 unread notifications
    When I click "Mark all as read" in the notifications panel
    Then all notifications should be marked as read
    And the badge should disappear

  # ============================================================================
  # 13. Mobile Touch Interactions
  # ============================================================================

  Scenario: Touch-friendly tap targets on mobile
    Given I am on a mobile device
    Then all interactive elements should have tap targets >= 48px
    And there should be at least 8px spacing between tap targets
    And buttons should provide visual feedback on tap

  Scenario: Swipe gestures on mobile
    Given I am viewing content on mobile
    When I swipe right from the left edge
    Then the hamburger menu should open
    When the menu is open and I swipe left
    Then the menu should close

  Scenario: Pull to refresh on mobile
    Given I am on the dashboard on mobile
    When I pull down from the top of the page
    Then I should see a refresh indicator
    And the page should reload with fresh data

  # ============================================================================
  # 14. Dark Mode Support (Future Enhancement)
  # ============================================================================

  Scenario: Respect system dark mode preference
    Given my device is set to dark mode
    When I open the application
    Then the app shell should render in dark mode
    And the top navigation should have a dark background
    And text should be light-colored for readability

  Scenario: Toggle dark mode manually
    Given I am in light mode
    When I open the profile menu and click "Dark Mode"
    Then the app should switch to dark mode immediately
    And my preference should be saved
    When I refresh the page
    Then dark mode should persist

  # ============================================================================
  # 15. Performance & Optimization
  # ============================================================================

  Scenario: Fast navigation transitions
    Given I am on the dashboard
    When I click a navigation item
    Then the transition should complete within 300ms
    And animations should be smooth (60fps)

  Scenario: Lazy load navigation menu items
    Given I am viewing the hamburger menu on mobile
    When I open the menu for the first time
    Then menu items should load quickly (< 100ms)
    And subsequent opens should be instant (cached)

  Scenario: Reduce layout shift on page load
    Given I am loading a page
    Then navigation elements should render immediately
    And there should be no layout shift (CLS < 0.1)
    And the sidebar width should be reserved during load

  # ============================================================================
  # 16. Role-Based Navigation
  # ============================================================================

  Scenario: Job seeker navigation items
    Given I am logged in as a job seeker
    When I view the navigation
    Then I should see job seeker-specific items:
      | Dashboard       |
      | Job Search      |
      | Applications    |
      | Resumes         |
      | Cover Letters   |
      | Interview Prep  |
      | Profile         |
    And I should NOT see employer items like "Candidates" or "Team"

  Scenario: Employer navigation items
    Given I am logged in as an employer
    When I view the navigation
    Then I should see employer-specific items:
      | Dashboard       |
      | Jobs            |
      | Candidates      |
      | Applications    |
      | Team            |
      | Analytics       |
      | Company Profile |
    And I should NOT see job seeker items like "Resumes" or "Interview Prep"

  Scenario: Admin navigation items
    Given I am logged in as an admin user
    When I view the navigation
    Then I should see all standard items PLUS admin items:
      | Admin Dashboard |
      | User Management |
      | System Settings |
      | Analytics       |

  # ============================================================================
  # 17. Error Handling & Offline
  # ============================================================================

  Scenario: Handle navigation errors gracefully
    Given I am navigating to a page
    When the page fails to load (500 error)
    Then I should see an error message
    And I should see a "Retry" button
    And the navigation should remain functional

  Scenario: Offline navigation behavior
    Given I am offline
    When I try to navigate to a new page
    Then I should see an offline indicator
    And I should see "You are offline" message
    And previously visited pages should load from cache

  # ============================================================================
  # 18. Analytics & Tracking
  # ============================================================================

  Scenario: Track navigation events
    Given analytics is enabled
    When I click a navigation item
    Then a navigation event should be tracked with:
      | source_page      |
      | destination_page |
      | navigation_type  |
      | timestamp        |

  Scenario: Track sidebar collapse state
    Given analytics is enabled
    When I collapse the sidebar
    Then a "sidebar_collapsed" event should be tracked
    When I expand the sidebar
    Then a "sidebar_expanded" event should be tracked
