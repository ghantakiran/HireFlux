# ============================================================================
# Feature: AI Candidate Ranking - Fit Index Calculation (Issue #26)
# ============================================================================
# Priority: P0-CRITICAL
# Sprint: 7-8 (Weeks 13-16)
# Dependencies: #18 (Database), #23 (Job Posting)
#
# Multi-factor AI ranking system with weighted scoring:
# - Skills match (30%) - Embeddings similarity
# - Experience level (20%) - Years vs. requirement
# - Location match (15%) - Remote/hybrid/onsite compatibility
# - Salary expectation (10%) - Within budget range
# - Culture fit (15%) - Resume tone analysis
# - Availability (10%) - Start date alignment
# ============================================================================

@P0-CRITICAL @employer @ai-ranking @sprint-7-8
Feature: AI Candidate Ranking - Fit Index Calculation

  As a hiring manager
  I want candidates automatically ranked by fit index
  So that I can focus on the best matches first

  Background:
    Given I am logged in as an employer
    And I have an active job posting for "Senior Software Engineer"
    And the job requires:
      | Field               | Value                          |
      | Skills              | React, TypeScript, Node.js     |
      | Experience Level    | Senior (5-10 years)            |
      | Location Type       | Hybrid                         |
      | Location            | San Francisco, CA              |
      | Salary Range        | $140,000 - $180,000            |
      | Start Date          | Within 30 days                 |

  # ========================================================================
  # Scenario Group 1: Ranked Applicant List Display
  # ========================================================================

  @critical @ranking-display
  Scenario: View applicants ranked by fit index
    Given I have received 20 applications for the job
    When I navigate to the job's applicant list
    Then I should see all applicants sorted by fit index descending
    And each applicant card should display their fit index badge
    And fit index should be color-coded:
      | Fit Index Range | Color  | Label         |
      | 80-100          | Green  | Excellent fit |
      | 60-79           | Yellow | Good fit      |
      | 40-59           | Orange | Fair fit      |
      | 0-39            | Red    | Poor fit      |

  @critical @ranking-display
  Scenario: Fit index badges use consistent color coding
    Given I am viewing the applicant list
    And there are applicants with various fit scores
    When I see an applicant with fit index 87
    Then their badge should be green
    And the label should say "Excellent fit"
    When I see an applicant with fit index 65
    Then their badge should be yellow
    And the label should say "Good fit"
    When I see an applicant with fit index 52
    Then their badge should be orange
    And the label should say "Fair fit"
    When I see an applicant with fit index 35
    Then their badge should be red
    And the label should say "Poor fit"

  @critical @ranking-display @default-sort
  Scenario: Applicants are sorted by fit index by default
    Given I navigate to a job's applicant list for the first time
    Then the sort option should be "Fit Index (High to Low)"
    And the first applicant should have the highest fit index
    And the last applicant should have the lowest fit index

  @ranking-display @filter
  Scenario: Filter applicants by minimum fit index
    Given I am viewing the applicant list
    And there are 20 applicants with fit indices ranging from 35 to 95
    When I set the minimum fit index filter to 70
    And I click "Apply Filters"
    Then I should only see applicants with fit index >= 70
    And I should see a filter badge showing "Min Fit: 70"
    And the count should show "Showing 8 of 20 applicants"

  @ranking-display @sort
  Scenario: Sort applicants by different criteria
    Given I am viewing the applicant list
    When I select sort by "Application Date (Newest)"
    Then applicants should be sorted by application date descending
    But fit index badges should still be visible on each card
    When I select sort by "Fit Index (High to Low)"
    Then applicants should be sorted by fit index descending again

  # ========================================================================
  # Scenario Group 2: Fit Index Calculation - Skills Match (30%)
  # ========================================================================

  @critical @skills-matching @calculation
  Scenario: Calculate skills match with perfect overlap
    Given an applicant has skills: "React, TypeScript, Node.js, GraphQL, AWS"
    And the job requires skills: "React, TypeScript, Node.js"
    When the fit index is calculated
    Then the skills match score should be >= 90
    And the overall fit index should reflect 30% weight for skills
    And the strengths should include "100% skills match (React, TypeScript, Node.js)"

  @critical @skills-matching @calculation
  Scenario: Calculate skills match with partial overlap
    Given an applicant has skills: "React, JavaScript, Python"
    And the job requires skills: "React, TypeScript, Node.js"
    When the fit index is calculated
    Then the skills match score should be between 40 and 70
    And the concerns should include "Missing skills: TypeScript, Node.js"

  @skills-matching @calculation
  Scenario: Calculate skills match with no overlap
    Given an applicant has skills: "Java, Spring, Oracle"
    And the job requires skills: "React, TypeScript, Node.js"
    When the fit index is calculated
    Then the skills match score should be < 30
    And the concerns should include "Significant skill gaps"
    And the overall fit index should be < 50

  # ========================================================================
  # Scenario Group 3: Fit Index Calculation - Experience Level (20%)
  # ========================================================================

  @critical @experience-matching @calculation
  Scenario: Calculate experience match for perfect level
    Given an applicant has 7 years of experience
    And the job requires "Senior" level (5-10 years)
    When the fit index is calculated
    Then the experience score should be >= 90
    And the strengths should include "7 years experience (Matches Senior requirement)"

  @experience-matching @calculation
  Scenario: Calculate experience match for under-qualified candidate
    Given an applicant has 3 years of experience
    And the job requires "Senior" level (5-10 years)
    When the fit index is calculated
    Then the experience score should be between 40 and 70
    And the concerns should include "Only 3 years experience (requires 5+)"

  @experience-matching @calculation
  Scenario: Calculate experience match for over-qualified candidate
    Given an applicant has 15 years of experience
    And the job requires "Senior" level (5-10 years)
    When the fit index is calculated
    Then the experience score should be >= 70
    And there should be no major concerns about experience
    # Note: Slight penalty for over-qualification, but not a major concern

  # ========================================================================
  # Scenario Group 4: Fit Index Calculation - Location Match (15%)
  # ========================================================================

  @critical @location-matching @calculation
  Scenario: Calculate location match for remote job
    Given the job is "Remote" type
    And an applicant is located in "New York, NY"
    When the fit index is calculated
    Then the location score should be >= 95
    And the strengths should include "Remote role, location flexible"

  @location-matching @calculation
  Scenario: Calculate location match for local hybrid candidate
    Given the job is "Hybrid" type in "San Francisco, CA"
    And an applicant is located in "San Francisco, CA"
    When the fit index is calculated
    Then the location score should be >= 90
    And the strengths should include "Based in San Francisco (local for hybrid role)"

  @location-matching @calculation
  Scenario: Calculate location match for non-local on-site job
    Given the job is "Onsite" type in "San Francisco, CA"
    And an applicant is located in "Austin, TX"
    When the fit index is calculated
    Then the location score should be < 60
    And the concerns should include "Located in Austin, TX, job is in San Francisco, CA (onsite)"

  # ========================================================================
  # Scenario Group 5: Fit Index Calculation - Salary Expectation (10%)
  # ========================================================================

  @critical @salary-matching @calculation
  Scenario: Calculate salary match with perfect overlap
    Given the job offers $140,000 - $180,000
    And an applicant expects $150,000 - $170,000
    When the fit index is calculated
    Then the salary score should be >= 90
    And the strengths should include salary expectation within range

  @salary-matching @calculation
  Scenario: Calculate salary match with partial overlap
    Given the job offers $140,000 - $180,000
    And an applicant expects $170,000 - $200,000
    When the fit index is calculated
    Then the salary score should be between 50 and 80
    # Partial overlap but candidate expectations are high

  @salary-matching @calculation
  Scenario: Calculate salary match with no overlap (candidate too expensive)
    Given the job offers $140,000 - $180,000
    And an applicant expects $200,000 - $250,000
    When the fit index is calculated
    Then the salary score should be < 40
    And the concerns should include salary expectations above budget

  # ========================================================================
  # Scenario Group 6: Fit Index Explanation - Strengths & Concerns
  # ========================================================================

  @critical @explanation @strengths-concerns
  Scenario: View detailed fit index explanation for high-fit candidate
    Given an applicant has a fit index of 87
    When I click on the applicant's fit index badge
    Then I should see a modal with the explanation
    And the modal should show:
      | Section        | Content                                   |
      | Overall Score  | 87 - Excellent fit                        |
      | Breakdown      | Skills: 92, Experience: 85, Location: 95  |
      | Strengths      | At least 3 strength points                |
      | Concerns       | 0-2 minor concerns                        |

  @critical @explanation @breakdown
  Scenario: View fit index breakdown with individual factor scores
    Given an applicant with fit index 75
    When I click "View Fit Explanation"
    Then I should see the breakdown table:
      | Factor             | Score | Weight |
      | Skills Match       | 82    | 30%    |
      | Experience Level   | 90    | 20%    |
      | Location Match     | 85    | 15%    |
      | Culture Fit        | 70    | 15%    |
      | Salary Expectation | 60    | 10%    |
      | Availability       | 55    | 10%    |
    And the weighted total should equal 75

  @explanation @strengths
  Scenario: Display strengths for excellent candidate
    Given an applicant with high scores across all factors
    When I view the fit explanation
    Then the strengths section should list:
      | Strength                                                        |
      | 100% skills match (React, TypeScript, Node.js)                  |
      | 7 years experience (Matches Senior requirement)                 |
      | Based in San Francisco (Local for hybrid role)                  |
      | Salary expectation $150,000-$170,000 within range               |

  @explanation @concerns
  Scenario: Display concerns for problematic candidate
    Given an applicant with low scores in multiple areas
    When I view the fit explanation
    Then the concerns section should list:
      | Concern                                                         |
      | Missing skills: TypeScript, Node.js                             |
      | Only 3 years experience (requires 5+)                           |
      | Start date: 90 days (You prefer 30 days)                        |

  @explanation @close
  Scenario: Close fit explanation modal
    Given I have opened the fit explanation modal
    When I click the close button
    Or I press the Escape key
    Or I click outside the modal
    Then the modal should close
    And I should be back at the applicant list

  # ========================================================================
  # Scenario Group 7: Force Recalculation of Fit Index
  # ========================================================================

  @recalculation @manual-trigger
  Scenario: Manually trigger fit index recalculation
    Given I am viewing an applicant's detail page
    And the fit index was calculated 3 days ago
    When I click "Recalculate Fit Index"
    Then I should see a loading indicator
    And the fit index should recalculate within 2 seconds
    And the updated fit index should be displayed
    And a success message should show "Fit index updated"

  @recalculation @job-update
  Scenario: Fit index recalculates when job requirements change
    Given I have 15 applicants for a job
    And all have calculated fit indices
    When I edit the job and change required skills
    And I save the job changes
    Then a background job should queue fit index recalculation
    And I should see a notice "Recalculating fit scores for 15 applicants"
    And within 30 seconds all fit indices should be updated

  # ========================================================================
  # Scenario Group 8: Performance Requirements
  # ========================================================================

  @critical @performance @calculation-speed
  Scenario: Fit index calculation completes within performance target
    Given I have just received a new application
    When the fit index calculation starts
    Then it should complete within 2 seconds (p95)
    And the fit index should be visible on the applicant card

  @performance @batch-calculation
  Scenario: Batch fit index calculation for multiple applicants
    Given I receive 20 applications simultaneously
    When the batch fit index calculation runs
    Then all 20 fit indices should be calculated within 10 seconds
    And calculations should happen asynchronously (non-blocking)

  # ========================================================================
  # Scenario Group 9: Caching & Optimization
  # ========================================================================

  @caching @embeddings
  Scenario: Skills embeddings are cached to reduce API costs
    Given an applicant applies to 3 different jobs
    When fit indices are calculated for all 3 applications
    Then the candidate's skills embedding should be generated only once
    And reused for all 3 calculations
    And I should see "Cached" in the calculation log

  @caching @redis
  Scenario: Fit index results are cached for 1 hour
    Given an applicant's fit index was calculated 30 minutes ago
    When I refresh the applicant list
    Then the fit index should load from cache
    And no new calculation should be triggered
    When I refresh again after 90 minutes
    Then a new fit index calculation should occur

  # ========================================================================
  # Scenario Group 10: Error Handling & Edge Cases
  # ========================================================================

  @error-handling @missing-data
  Scenario: Handle candidate with incomplete profile
    Given an applicant has no skills listed
    And the applicant has no salary expectation
    When the fit index is calculated
    Then skills match score should default to 0
    And salary score should default to 50 (neutral)
    And the fit index should still calculate
    And concerns should include "Profile incomplete"

  @error-handling @api-failure
  Scenario: Handle OpenAI API failure gracefully
    Given the OpenAI embeddings API is down
    When a new application is submitted
    Then the system should fall back to keyword matching
    And the fit index should be marked as "Estimated"
    And a notice should show "AI ranking temporarily unavailable"

  @error-handling @timeout
  Scenario: Handle calculation timeout
    Given a fit index calculation exceeds 5 seconds
    When the timeout threshold is reached
    Then the calculation should be queued for retry
    And the UI should show "Calculating..." with a spinner
    And the fit index should appear when ready

  # ========================================================================
  # Scenario Group 11: Mobile Responsiveness
  # ========================================================================

  @mobile @ranking-display
  Scenario: View fit index on mobile device
    Given I am using a mobile device (375px width)
    And I am viewing the applicant list
    Then fit index badges should be visible on applicant cards
    And badges should be responsive and not overflow
    When I tap on a fit index badge
    Then the fit explanation modal should open
    And the modal should be mobile-optimized

  # ========================================================================
  # Scenario Group 12: Accessibility
  # ========================================================================

  @a11y @screen-reader
  Scenario: Fit index is accessible to screen readers
    Given I am using a screen reader
    When I navigate to an applicant card
    Then the fit index should be announced as "Fit index: 87 out of 100, Excellent fit"
    And color coding should be supplemented with text labels
    And the explanation modal should have proper ARIA labels

  @a11y @keyboard-navigation
  Scenario: Navigate fit index explanation with keyboard
    Given I am on the applicant list
    When I tab to a fit index badge
    And I press Enter
    Then the explanation modal should open
    When I press Tab
    Then focus should move to the first interactive element in the modal
    When I press Escape
    Then the modal should close

  # ========================================================================
  # Scenario Group 13: Analytics & Tracking
  # ========================================================================

  @analytics @fit-index-usage
  Scenario: Track fit index filter usage
    Given I set the minimum fit index to 70
    And I apply the filter
    Then an analytics event should be logged:
      | Event Name          | Properties                |
      | FitIndexFilterUsed  | minFit: 70, job_id: UUID  |

  @analytics @explanation-views
  Scenario: Track fit explanation modal views
    Given I click on a fit index badge
    Then an analytics event should be logged:
      | Event Name              | Properties                       |
      | FitExplanationViewed    | applicant_id: UUID, fit_index: 87|
