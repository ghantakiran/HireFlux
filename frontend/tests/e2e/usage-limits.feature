# Feature: Usage Limit Enforcement - Subscription Plan Limits
# Issue #64: Critical for revenue protection
#
# Background: Prevent revenue loss from unlimited free tier usage
# Business Impact: $10K-50K/month revenue loss prevention

Feature: Usage Limit Enforcement
  As an employer using HireFlux
  I want to have my subscription limits enforced
  So that I upgrade when I reach my plan limits

  Background:
    Given the following subscription plans exist:
      | Plan         | Active Jobs | Candidate Views/Month | Team Members |
      | Starter      | 1          | 10                    | 1            |
      | Growth       | 10         | 100                   | 3            |
      | Professional | Unlimited  | Unlimited             | 10           |
      | Enterprise   | Unlimited  | Unlimited             | Unlimited    |

  # Job Posting Limits
  Scenario: Starter plan user cannot create more than 1 active job
    Given I am logged in as an employer with "Starter" plan
    And I have 1 active job posted
    When I attempt to create a new job
    Then I should see an error message "You've reached your job posting limit"
    And I should see an "Upgrade to Growth" modal
    And the job should not be created

  Scenario: Growth plan user can create up to 10 active jobs
    Given I am logged in as an employer with "Growth" plan
    And I have 9 active jobs posted
    When I create a new job
    Then the job should be created successfully
    And I should see a usage indicator showing "10/10 jobs"

  Scenario: Professional plan user has unlimited job postings
    Given I am logged in as an employer with "Professional" plan
    And I have 50 active jobs posted
    When I attempt to create a new job
    Then the job should be created successfully
    And I should not see any limit warnings

  Scenario: Draft jobs do not count against job posting limit
    Given I am logged in as an employer with "Starter" plan
    And I have 1 active job and 3 draft jobs
    When I view my job posting limit
    Then I should see "1/1 active jobs"
    And the drafts should not count against the limit

  # Candidate View Limits
  Scenario: Starter plan user cannot view more than 10 candidates per month
    Given I am logged in as an employer with "Starter" plan
    And I have viewed 10 candidate profiles this month
    When I attempt to view another candidate profile
    Then I should see a modal "Upgrade to view more candidates"
    And the candidate profile should not be displayed
    And I should see pricing for "Growth" plan

  Scenario: Growth plan user's candidate views reset monthly
    Given I am logged in as an employer with "Growth" plan
    And I viewed 100 candidates last month
    And today is the first day of my billing cycle
    When I view my usage statistics
    Then I should see "0/100 candidate views this month"
    And I should be able to view candidate profiles

  Scenario: Viewing the same candidate multiple times counts as one view
    Given I am logged in as an employer with "Growth" plan
    And I have viewed "John Doe" profile once
    When I view "John Doe" profile again
    Then my candidate view count should not increase
    And I should see "1/100 candidate views"

  # Team Member Limits
  Scenario: Starter plan user cannot add team members
    Given I am logged in as an employer with "Starter" plan
    When I attempt to invite a team member
    Then I should see an error "Upgrade to Growth to add team members"
    And the invitation should not be sent

  Scenario: Growth plan user can add up to 3 team members
    Given I am logged in as an employer with "Growth" plan
    And I have 2 team members (including owner)
    When I invite a new team member
    Then the invitation should be sent successfully
    And I should see "3/3 team members"

  Scenario: Growth plan user cannot exceed 3 team members
    Given I am logged in as an employer with "Growth" plan
    And I have 3 team members (including owner)
    When I attempt to invite another team member
    Then I should see "Upgrade to Professional for more seats"
    And the invitation should not be sent

  # Usage Warnings
  Scenario: Show warning at 80% usage for job postings
    Given I am logged in as an employer with "Growth" plan
    And I have 8 active jobs posted
    When I view the employer dashboard
    Then I should see a warning banner "You're using 8/10 job slots"
    And I should see a link "Upgrade to Professional"

  Scenario: Show warning at 80% usage for candidate views
    Given I am logged in as an employer with "Growth" plan
    And I have viewed 81 candidates this month
    When I navigate to candidate search
    Then I should see a notification "19 candidate views remaining this month"
    And I should see an "Upgrade" button

  # Upgrade Flow
  Scenario: User upgrades from Starter to Growth via job posting limit
    Given I am logged in as an employer with "Starter" plan
    And I have 1 active job posted
    When I attempt to create a new job
    And I see the "Upgrade to Growth" modal
    And I click "Upgrade Now for $99/month"
    Then I should be redirected to Stripe checkout
    And after completing payment, my plan should be "Growth"
    And I should be able to create the new job

  Scenario: User upgrades from Growth to Professional via candidate views limit
    Given I am logged in as an employer with "Growth" plan
    And I have viewed 100 candidates this month
    When I attempt to view another candidate
    And I click "Upgrade to Professional" in the modal
    Then I should see prorated pricing for the upgrade
    And after upgrading, I should have unlimited candidate views

  # Billing Cycle Reset
  Scenario: Candidate view count resets on billing cycle start
    Given I am logged in as an employer with "Growth" plan
    And my billing cycle starts on the 15th of each month
    And I viewed 50 candidates before the 15th
    When the date changes to the 15th
    Then my candidate view count should reset to 0
    And I should see "0/100 candidate views this month"

  # API Rate Limiting
  Scenario: Backend blocks job creation when limit reached
    Given I am logged in as an employer with "Starter" plan
    And I have 1 active job posted
    When I send a POST request to "/api/v1/employer/jobs"
    Then I should receive a 403 Forbidden response
    And the response should contain "Job posting limit reached"
    And the response should contain "upgradeRequired": true

  Scenario: Backend allows job creation when within limits
    Given I am logged in as an employer with "Growth" plan
    And I have 5 active jobs posted
    When I send a POST request to "/api/v1/employer/jobs"
    Then I should receive a 201 Created response
    And my usage count should increase to 6

  # Edge Cases
  Scenario: Deleting a job frees up a slot
    Given I am logged in as an employer with "Starter" plan
    And I have 1 active job posted
    When I delete the active job
    Then I should see "0/1 active jobs"
    And I should be able to create a new job

  Scenario: Moving job to draft frees up a slot
    Given I am logged in as an employer with "Growth" plan
    And I have 10 active jobs posted
    When I change one job status to "draft"
    Then I should see "9/10 active jobs"
    And I should be able to create a new job

  Scenario: Professional plan upgrade removes all limits
    Given I am logged in as an employer with "Growth" plan
    And I have used all my job posting slots
    When I upgrade to "Professional" plan
    Then I should see "Unlimited" for job postings
    And I should see "Unlimited" for candidate views
    And I should not see any usage warnings

  # Performance
  Scenario: Usage limit check completes in under 300ms
    Given I am logged in as an employer
    When I check my subscription limits
    Then the API response time should be less than 300ms
    And the response should include all usage metrics

  # Security
  Scenario: Cannot bypass limits via direct API calls
    Given I am logged in as an employer with "Starter" plan
    And I have 1 active job posted
    When I attempt to bypass the limit using direct API calls
    Then the backend should still enforce the limit
    And I should receive a 403 Forbidden response
    And the audit log should record the attempt
