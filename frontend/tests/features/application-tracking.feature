# Feature: Application Tracking Dashboard (Issue #106)
#
# As a job seeker
# I want to track all my job applications in one place
# So that I can manage my job search effectively

Feature: Application Tracking Dashboard

  Background:
    Given I am logged in as a job seeker
    And I have submitted applications to various jobs

  # Core Functionality
  Scenario: View application pipeline overview
    Given I have 15 applications across different stages
    When I visit the application tracking dashboard
    Then I should see all 8 pipeline stages
    And I should see my applications grouped by stage
    And I should see the count for each stage

  Scenario: View application cards with details
    When I visit the application tracking dashboard
    Then each application card should display:
      | Field          | Visible |
      | Job Title      | Yes     |
      | Company Name   | Yes     |
      | Applied Date   | Yes     |
      | Current Stage  | Yes     |
      | Fit Index      | Yes     |

  Scenario: Filter applications by status
    Given I have applications in multiple stages
    When I filter by "Interview" stage
    Then I should only see applications in the Interview stage
    And the application count should update

  Scenario: Sort applications by date
    Given I have applications from different dates
    When I sort by "Newest First"
    Then applications should be ordered by most recent first
    When I sort by "Oldest First"
    Then applications should be ordered by oldest first

  Scenario: View application timeline
    Given I have an application with status updates
    When I click on an application card
    Then I should see a detailed timeline showing:
      | Event               | Date/Time |
      | Application Sent    | Timestamp |
      | Viewed by Employer  | Timestamp |
      | Moved to Screening  | Timestamp |
      | Interview Scheduled | Timestamp |

  # Empty States
  Scenario: View dashboard with no applications
    Given I have 0 applications
    When I visit the application tracking dashboard
    Then I should see an empty state message
    And I should see a call-to-action to "Find Jobs"

  Scenario: View stage with no applications
    Given I have applications but none in "Offer" stage
    When I view the Offer stage column
    Then I should see "No applications" in that column

  # Analytics & Insights
  Scenario: View application statistics
    Given I have a history of applications
    When I visit the application tracking dashboard
    Then I should see statistics showing:
      | Metric                  | Displayed |
      | Total Applications      | Yes       |
      | Response Rate           | Yes       |
      | Average Response Time   | Yes       |
      | Interview Success Rate  | Yes       |

  Scenario: View application chart over time
    Given I have applications from the past 3 months
    When I view the analytics section
    Then I should see a chart showing applications over time
    And the chart should show weekly or monthly trends

  # Rejection Feedback
  Scenario: View rejection with feedback
    Given I have a rejected application with employer feedback
    When I view that application
    Then I should see the rejection reason
    And I should see constructive feedback (if provided)
    And I should see AI suggestions for improvement

  Scenario: View rejection without feedback
    Given I have a rejected application without feedback
    When I view that application
    Then I should see a generic rejection message
    And I should see AI-generated insights based on my profile

  # Interview Preparation
  Scenario: Access interview preparation for upcoming interview
    Given I have an application in "Interview" stage
    And an interview is scheduled
    When I click "Prepare for Interview"
    Then I should be taken to the Interview Coach
    And it should be pre-loaded with the job details

  # Mobile Responsiveness
  Scenario: View dashboard on mobile
    Given I am on a mobile device
    When I visit the application tracking dashboard
    Then the pipeline should display as a vertical list
    And each stage should be collapsible/expandable
    And application cards should be full-width

  # Real-Time Updates
  Scenario: Receive real-time status update
    Given I have the dashboard open
    When an employer updates my application status
    Then I should see a notification
    And the application card should move to the new stage
    And the stage counts should update

  # Quick Actions
  Scenario: Withdraw application
    Given I have an active application
    When I click the "..." menu on an application card
    And I select "Withdraw Application"
    Then I should see a confirmation dialog
    When I confirm withdrawal
    Then the application should move to "Withdrawn" stage
    And I should see a success message

  Scenario: View job posting from application
    Given I am viewing my applications
    When I click "View Job" on an application card
    Then I should see the original job posting
    And it should show if the job is still active

  # Accessibility
  Scenario: Navigate dashboard with keyboard
    When I visit the application tracking dashboard
    Then I should be able to tab through all application cards
    And I should be able to activate filters using keyboard
    And I should be able to open application details with Enter key

  Scenario: Use dashboard with screen reader
    Given I am using a screen reader
    When I visit the application tracking dashboard
    Then each stage should have a proper ARIA label
    And application cards should announce their content
    And status changes should be announced

  # Performance
  Scenario: Load dashboard with many applications
    Given I have 200+ applications
    When I visit the application tracking dashboard
    Then the page should load in under 2 seconds
    And scrolling should be smooth
    And only visible applications should be rendered (virtual scrolling)

  # Error Handling
  Scenario: Handle failed application fetch
    Given the API is temporarily unavailable
    When I visit the application tracking dashboard
    Then I should see an error message
    And I should see a "Retry" button
    When I click "Retry"
    Then it should attempt to fetch applications again

  Scenario: Handle stale data
    Given I have been on the dashboard for 10 minutes
    When new applications are submitted via another device
    Then I should see a "New applications available" notification
    When I click "Refresh"
    Then the dashboard should update with new data
