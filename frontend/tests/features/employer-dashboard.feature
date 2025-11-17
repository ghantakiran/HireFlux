# Feature: Employer Dashboard - Overview & Quick Actions
# Sprint 19-20 Week 40 Day 4 - Issue #22
#
# As a hiring manager
# I want to see hiring metrics at a glance
# So that I can track recruitment performance
#
# Dependencies: Issue #20 (Registration), Issue #21 (Company Profile)
#
# Business Rules:
# - Dashboard stats cached for 5 minutes (Redis TTL)
# - Real-time updates via polling every 30 seconds
# - Efficient SQL queries with proper indexes
# - Loading skeletons while fetching data
# - Infinite scroll for activity feed
# - Charts show data for last 30 days

Feature: Employer Dashboard Overview & Quick Actions

  Background:
    Given I am logged in as an employer (company owner)
    And my company has active job postings
    And my company has received applications

  # ============================================================================
  # Dashboard Overview Metrics
  # ============================================================================

  @dashboard @overview @happy-path
  Scenario: View dashboard overview metrics
    Given I navigate to "/employer/dashboard"
    When the dashboard loads
    Then I should see the following metric cards:
      | Metric               | Icon         | Description                          |
      | Active Jobs          | Briefcase    | Number of currently active postings  |
      | New Applications     | Users        | Applications received today          |
      | Avg Fit Index        | TrendingUp   | Average candidate match score        |
      | Avg Time to Fill     | Clock        | Average days from post to hire       |
    And each metric card should display:
      | Element       | Example                  |
      | Value         | "12"                     |
      | Label         | "Active Jobs"            |
      | Trend         | "+5% from last week"     |
      | Icon          | Briefcase icon           |

  @dashboard @metrics @calculation
  Scenario: Dashboard metrics calculated correctly
    Given my company has the following data:
      | Metric                    | Value |
      | Active jobs               | 5     |
      | Applications today        | 12    |
      | Applications this month   | 87    |
      | Avg fit index (30 days)   | 78.5  |
      | Avg time to fill (30 days)| 24    |
    When I load the dashboard
    Then the overview metrics should show:
      | Card             | Value  | Format        |
      | Active Jobs      | 5      | Integer       |
      | New Applications | 12     | Integer       |
      | Avg Fit Index    | 78.5   | Decimal (1dp) |
      | Avg Time to Fill | 24 days| Integer + unit|

  @dashboard @metrics @empty-state
  Scenario: Dashboard with no data shows zero states
    Given my company has no active jobs
    And my company has no applications
    When I load the dashboard
    Then the overview metrics should show:
      | Card             | Value | Message                        |
      | Active Jobs      | 0     | "No active jobs"               |
      | New Applications | 0     | "No applications today"        |
      | Avg Fit Index    | --    | "No data available"            |
      | Avg Time to Fill | --    | "No hires yet"                 |

  @dashboard @metrics @trend
  Scenario: Metric cards show percentage change from last period
    Given the "Active Jobs" metric was 10 last week
    And the "Active Jobs" metric is 12 this week
    When I view the dashboard
    Then the "Active Jobs" card should show trend "+20% from last week"
    And the trend should be displayed in green color
    And the trend should have an upward arrow icon

  @dashboard @metrics @negative-trend
  Scenario: Metric cards show negative trends
    Given the "New Applications" metric was 50 last week
    And the "New Applications" metric is 35 this week
    When I view the dashboard
    Then the "New Applications" card should show trend "-30% from last week"
    And the trend should be displayed in red color
    And the trend should have a downward arrow icon

  # ============================================================================
  # Applications Pipeline Chart
  # ============================================================================

  @dashboard @pipeline @chart
  Scenario: View applications pipeline chart
    Given my company has applications in various stages:
      | Stage       | Count |
      | New         | 45    |
      | Screening   | 32    |
      | Interview   | 18    |
      | Offer       | 7     |
      | Hired       | 12    |
      | Rejected    | 23    |
    When I view the dashboard
    Then I should see a pipeline chart
    And the chart should display 6 stages
    And the chart should show correct counts for each stage
    And the chart should use distinct colors for each stage

  @dashboard @pipeline @interactive
  Scenario: Applications pipeline chart is interactive
    Given I am viewing the dashboard pipeline chart
    When I hover over the "Screening" bar
    Then I should see a tooltip with:
      | Field            | Value                     |
      | Stage name       | "Screening"               |
      | Application count| "32"                      |
      | Percentage       | "23% of total pipeline"   |
    When I click on the "Screening" bar
    Then I should be navigated to "/employer/applications?stage=screening"

  @dashboard @pipeline @empty-state
  Scenario: Pipeline chart with no applications
    Given my company has no applications
    When I view the dashboard
    Then I should see a pipeline chart placeholder
    And the chart should display message "No applications yet"
    And there should be a "Post Your First Job" call-to-action button

  # ============================================================================
  # Top Performing Jobs Table
  # ============================================================================

  @dashboard @top-jobs @table
  Scenario: View top performing jobs table
    Given my company has 10 active jobs
    When I view the dashboard
    Then I should see a "Top Performing Jobs" section
    And the table should display up to 5 jobs
    And each job row should show:
      | Column          | Example                        |
      | Job Title       | "Senior Software Engineer"     |
      | Applications    | "23"                           |
      | Avg Fit Index   | "82.5"                         |
      | Status          | "Active" (green badge)         |
      | Posted Date     | "5 days ago"                   |
      | Actions         | "View" button                  |

  @dashboard @top-jobs @sorting
  Scenario: Sort top performing jobs table
    Given I am viewing the top performing jobs table
    When I click on the "Applications" column header
    Then the table should sort by application count descending
    And the sort indicator (down arrow) should appear on "Applications" header
    When I click on the "Applications" column header again
    Then the table should sort by application count ascending
    And the sort indicator (up arrow) should appear on "Applications" header

  @dashboard @top-jobs @empty-state
  Scenario: Top jobs table with no active jobs
    Given my company has no active jobs
    When I view the dashboard
    Then the "Top Performing Jobs" section should show empty state
    And I should see message "No active jobs yet"
    And there should be a "Post a Job" button

  @dashboard @top-jobs @navigation
  Scenario: Navigate to job details from top jobs table
    Given I am viewing the top performing jobs table
    When I click the "View" button for "Senior Software Engineer"
    Then I should be navigated to "/employer/jobs/[jobId]"
    And the job details page should load

  # ============================================================================
  # Recent Activity Feed
  # ============================================================================

  @dashboard @activity @feed
  Scenario: View recent activity feed
    Given my company has recent recruitment activity
    When I view the dashboard
    Then I should see a "Recent Activity" section
    And the feed should display recent events in reverse chronological order
    And each activity item should show:
      | Element       | Example                                   |
      | Icon          | User icon for "New Application"           |
      | Description   | "John Doe applied to Senior SWE"          |
      | Timestamp     | "2 hours ago"                             |
      | Action link   | "View Application"                        |

  @dashboard @activity @types
  Scenario: Activity feed shows different event types
    Given the following recent activities occurred:
      | Event Type         | Description                                |
      | New Application    | Candidate applied to job                   |
      | Stage Change       | Application moved to Interview stage       |
      | Job Posted         | New job posting published                  |
      | Offer Extended     | Offer sent to candidate                    |
      | Candidate Hired    | Candidate accepted offer and hired         |
      | Job Closed         | Job posting closed or filled               |
    When I view the recent activity feed
    Then I should see all 6 event types
    And each event type should have a distinct icon
    And events should be color-coded by type

  @dashboard @activity @infinite-scroll
  Scenario: Recent activity feed supports infinite scroll
    Given my company has 50+ recent activity events
    When I view the dashboard
    Then the activity feed should initially show 10 events
    When I scroll to the bottom of the activity feed
    Then the next 10 events should load automatically
    And a loading spinner should appear while loading
    When I reach the end of all events
    Then I should see "No more activities" message

  @dashboard @activity @empty-state
  Scenario: Activity feed with no recent activity
    Given my company has no recent activity
    When I view the dashboard
    Then the activity feed should show empty state
    And I should see message "No recent activity"

  @dashboard @activity @real-time
  Scenario: Activity feed updates in real-time
    Given I am viewing the dashboard
    And the dashboard is polling for updates every 30 seconds
    When a new application is submitted
    And 30 seconds pass
    Then the activity feed should automatically update
    And the new application event should appear at the top
    And a subtle highlight animation should indicate the new item

  # ============================================================================
  # Quick Actions
  # ============================================================================

  @dashboard @quick-actions @navigation
  Scenario: Quick actions provide shortcuts to key features
    Given I am viewing the dashboard
    Then I should see a "Quick Actions" section with buttons:
      | Button            | Icon        | Action                          |
      | Post a Job        | PlusCircle  | Navigate to /employer/jobs/new  |
      | View Applications | Inbox       | Navigate to /employer/applications |
      | Search Candidates | Search      | Navigate to /employer/candidates   |
      | Team Settings     | Users       | Navigate to /employer/team         |
      | Analytics         | BarChart    | Navigate to /employer/analytics    |

  @dashboard @quick-actions @post-job
  Scenario: Post a job from quick actions
    Given I am viewing the dashboard
    When I click the "Post a Job" quick action button
    Then I should be navigated to "/employer/jobs/new"
    And the job posting form should load

  @dashboard @quick-actions @view-applications
  Scenario: View applications from quick actions
    Given I am viewing the dashboard
    When I click the "View Applications" quick action button
    Then I should be navigated to "/employer/applications"
    And the applications list should load

  # ============================================================================
  # Loading States & Performance
  # ============================================================================

  @dashboard @loading @skeleton
  Scenario: Dashboard shows loading skeletons while fetching data
    Given I navigate to "/employer/dashboard"
    When the page is loading
    Then I should see loading skeleton placeholders for:
      | Section                | Skeleton Type    |
      | Overview Metrics       | 4 metric cards   |
      | Applications Pipeline  | Chart skeleton   |
      | Top Performing Jobs    | Table skeleton   |
      | Recent Activity        | List skeleton    |
    And the skeletons should have a shimmer animation
    When the data loads
    Then the skeletons should be replaced with actual content

  @dashboard @performance @caching
  Scenario: Dashboard stats are cached for performance
    Given I load the dashboard for the first time
    And the dashboard stats are calculated from the database
    And the stats are cached in Redis with TTL=5 minutes
    When I refresh the dashboard within 5 minutes
    Then the stats should be served from cache
    And the page should load faster (<100ms)
    When I refresh the dashboard after 5 minutes
    Then the stats should be recalculated from the database
    And the cache should be updated

  @dashboard @performance @polling
  Scenario: Dashboard polls for updates every 30 seconds
    Given I am viewing the dashboard
    When 30 seconds pass
    Then the dashboard should make an API call to fetch latest stats
    And if new data is available, the metrics should update
    And a subtle notification should indicate "Updated 0s ago"

  # ============================================================================
  # Error Handling
  # ============================================================================

  @dashboard @error @api-failure
  Scenario: Dashboard handles API errors gracefully
    Given the dashboard stats API is unavailable
    When I load the dashboard
    Then I should see an error message "Unable to load dashboard data"
    And there should be a "Retry" button
    When I click "Retry"
    Then the dashboard should attempt to reload

  @dashboard @error @partial-failure
  Scenario: Dashboard handles partial data load failures
    Given the overview metrics API succeeds
    But the recent activity API fails
    When I load the dashboard
    Then the overview metrics should display correctly
    And the recent activity section should show error state
    And there should be a "Retry" button for the activity feed only

  @dashboard @error @network-offline
  Scenario: Dashboard shows offline indicator when network is unavailable
    Given I am viewing the dashboard
    When the network connection is lost
    Then I should see an offline indicator banner
    And the dashboard should display last cached data
    When the network connection is restored
    Then the offline banner should disappear
    And the dashboard should refresh automatically

  # ============================================================================
  # Permissions & Access Control
  # ============================================================================

  @dashboard @permissions @owner
  Scenario: Company owner has full access to dashboard
    Given I am logged in as company owner
    When I view the dashboard
    Then I should see all dashboard sections
    And all quick actions should be visible
    And I should be able to navigate to all linked pages

  @dashboard @permissions @recruiter
  Scenario: Recruiter has limited access to dashboard
    Given I am logged in as a recruiter
    When I view the dashboard
    Then I should see all dashboard sections
    But the "Team Settings" quick action should be hidden
    And I should not be able to access company settings

  @dashboard @permissions @viewer
  Scenario: Viewer has read-only access to dashboard
    Given I am logged in as a viewer
    When I view the dashboard
    Then I should see overview metrics and charts
    But the "Post a Job" quick action should be hidden
    And I should not be able to post jobs or modify settings

  # ============================================================================
  # Responsive Design
  # ============================================================================

  @dashboard @responsive @mobile
  Scenario: Dashboard is responsive on mobile devices
    Given I am on a mobile device (viewport 375px)
    When I view the dashboard
    Then the metric cards should stack vertically
    And the pipeline chart should fit the mobile screen
    And the top jobs table should be horizontally scrollable
    And the activity feed should use full width
    And quick actions should be displayed in a grid (2 columns)

  @dashboard @responsive @tablet
  Scenario: Dashboard layout adjusts for tablet devices
    Given I am on a tablet device (viewport 768px)
    When I view the dashboard
    Then the metric cards should display in a 2x2 grid
    And the pipeline chart should use full width
    And the top jobs table should show all columns
    And quick actions should be displayed in a single row

  # ============================================================================
  # Accessibility
  # ============================================================================

  @dashboard @accessibility @keyboard
  Scenario: Dashboard is fully navigable with keyboard
    Given I am viewing the dashboard
    When I navigate using Tab key
    Then I should be able to focus all interactive elements:
      | Element                    | Accessible |
      | Quick action buttons       | Yes        |
      | Top jobs table rows        | Yes        |
      | Activity feed items        | Yes        |
      | Sort buttons               | Yes        |
      | Retry button (on error)    | Yes        |
    And pressing Enter should activate the focused element

  @dashboard @accessibility @screen-reader
  Scenario: Dashboard provides screen reader support
    Given I am using a screen reader
    When I navigate the dashboard
    Then all metric cards should have aria-labels
    And the pipeline chart should have a text alternative
    And the top jobs table should have proper table headers
    And the activity feed should announce new items

  # ============================================================================
  # Data Accuracy
  # ============================================================================

  @dashboard @data @accuracy
  Scenario: Dashboard metrics match actual database counts
    Given the database has the following records:
      | Table           | Company ID | Count |
      | jobs            | 123        | 8     |
      | applications    | 123        | 45    |
      | applications    | 123 (today)| 7     |
    When I load the dashboard for company 123
    Then the "Active Jobs" metric should show 8
    And the "New Applications" metric should show 7
    And the total pipeline count should be 45

  @dashboard @data @date-range
  Scenario: Dashboard respects date range filters
    Given the dashboard shows data for "Last 30 Days" by default
    When I change the date range to "Last 7 Days"
    Then the overview metrics should recalculate for 7 days
    And the pipeline chart should show 7-day data
    And the activity feed should show events from last 7 days
    And the cache key should change to reflect new date range

  # ============================================================================
  # Business Logic
  # ============================================================================

  @dashboard @business @time-to-fill
  Scenario: Time to fill calculation includes only hired candidates
    Given my company has the following jobs:
      | Job ID | Posted Date | Hired Date | Status   |
      | 1      | 2025-01-01  | 2025-01-25 | Filled   |
      | 2      | 2025-01-05  | 2025-01-30 | Filled   |
      | 3      | 2025-01-10  | null       | Active   |
    When I load the dashboard
    Then the "Avg Time to Fill" should calculate:
      | Job | Days to Fill |
      | 1   | 24 days      |
      | 2   | 25 days      |
    And the average should be 24.5 days (rounded to 25 days)
    And Job 3 should not be included (not yet filled)

  @dashboard @business @fit-index
  Scenario: Avg Fit Index excludes rejected applications
    Given my company has applications with fit indexes:
      | Application ID | Fit Index | Stage    |
      | 1              | 85        | Interview|
      | 2              | 92        | Offer    |
      | 3              | 45        | Rejected |
      | 4              | 78        | Screening|
    When I load the dashboard
    Then the "Avg Fit Index" should calculate from non-rejected apps only:
      | Include | Fit Index |
      | App 1   | 85        |
      | App 2   | 92        |
      | App 4   | 78        |
    And the average should be 85.0
    And App 3 should be excluded (rejected)

# ============================================================================
# End-to-End Scenarios
# ============================================================================

@dashboard @e2e @complete-workflow
Scenario: Complete employer dashboard workflow
  Given I am a new company owner who just registered
  And I have posted 3 jobs in the last week
  And I have received 15 applications across those jobs
  When I navigate to "/employer/dashboard"
  Then I should see:
    | Section          | Status         |
    | Overview metrics | Loaded         |
    | Pipeline chart   | Showing 15 apps|
    | Top jobs table   | 3 jobs listed  |
    | Activity feed    | Recent events  |
    | Quick actions    | All buttons    |
  When I click "View Applications" quick action
  Then I should navigate to the applications page
  And I should see all 15 applications
  When I go back to the dashboard
  And I wait 30 seconds
  Then the dashboard should refresh with latest data

@dashboard @e2e @multi-user
Scenario: Dashboard shows company-wide data (not user-specific)
  Given Company "TechCorp" has 2 team members:
    | User   | Role      |
    | Alice  | Owner     |
    | Bob    | Recruiter |
  And Alice posted Job A with 10 applications
  And Bob posted Job B with 5 applications
  When Alice logs in and views the dashboard
  Then the "Active Jobs" metric should show 2 (both jobs)
  And the "New Applications" should show 15 (all applications)
  When Bob logs in and views the dashboard
  Then he should see the same metrics as Alice
  Because dashboard shows company-wide data, not user-specific

# ============================================================================
# Performance Benchmarks
# ============================================================================

@dashboard @performance @benchmark
Scenario: Dashboard meets performance targets
  Given my company has 100 active jobs and 1000 applications
  When I load the dashboard
  Then the page should load within 2 seconds
  And the stats API should respond within 300ms
  And the activity feed API should respond within 200ms
  And the database queries should use proper indexes
  And no N+1 query problems should occur

# ============================================================================
# Total Scenarios: 40+
# Coverage: Overview metrics, pipeline chart, top jobs, activity feed,
#           quick actions, loading states, caching, error handling,
#           permissions, responsive design, accessibility, data accuracy
# ============================================================================
