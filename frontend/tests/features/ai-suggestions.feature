# Feature: AI Suggestions & Recommendations (Issue #109)
#
# As a job seeker
# I want to receive AI-powered suggestions to improve my profile and job search
# So that I can increase my chances of getting hired

Feature: AI Suggestions & Recommendations

  Background:
    Given I am logged in as a job seeker
    And I have a complete profile

  # Core Functionality
  Scenario: View AI suggestions dashboard
    When I visit the AI suggestions page
    Then I should see contextual AI recommendations
    And suggestions should be grouped by category
    And each suggestion should show confidence score
    And each suggestion should show expected impact

  Scenario: View different suggestion types
    When I visit the AI suggestions page
    Then I should see suggestions for:
      | Category    | Example                          |
      | Skills      | Add missing technical skills     |
      | Experience  | Quantify achievements            |
      | Education   | Highlight relevant coursework    |
      | Profile     | Improve professional summary     |
      | Resume      | Optimize ATS compatibility       |
      | Jobs        | Apply to high-fit opportunities  |

  # Contextual Suggestions
  Scenario: Receive skill-based suggestions
    Given I have skills gaps in my profile
    When I view AI suggestions
    Then I should see skill recommendations
    And each skill should show:
      | Field              | Displayed |
      | Skill Name         | Yes       |
      | Why Recommended    | Yes       |
      | Jobs Requiring It  | Yes       |
      | Learning Resources | Yes       |

  Scenario: Receive experience-based suggestions
    Given I have work experience without metrics
    When I view AI suggestions
    Then I should see suggestions to quantify achievements
    And suggestions should include example metrics
    And suggestions should reference industry benchmarks

  Scenario: Receive resume optimization suggestions
    Given my resume has ATS compatibility issues
    When I view AI suggestions
    Then I should see formatting recommendations
    And I should see keyword optimization tips
    And I should see section organization advice

  # Confidence & Impact
  Scenario: View high-confidence suggestions
    Given AI has high confidence in a recommendation
    When I view that suggestion
    Then the confidence score should be >= 80%
    And the suggestion should be prioritized at the top
    And the reasoning should be data-backed

  Scenario: View medium-confidence suggestions
    Given AI has medium confidence in a recommendation
    When I view that suggestion
    Then the confidence score should be 50-79%
    And the suggestion should be clearly marked as "moderate confidence"
    And alternative approaches should be mentioned

  Scenario: View low-confidence suggestions
    Given AI has low confidence in a recommendation
    When I view that suggestion
    Then the confidence score should be < 50%
    And the suggestion should be marked as "experimental"
    And I should see a disclaimer about uncertainty

  Scenario: View high-impact suggestions
    Given a suggestion has high potential impact
    When I view that suggestion
    Then it should be marked as "High Impact"
    And it should show estimated improvement (e.g., "+25% match rate")
    And it should be visually emphasized

  # Accept/Reject Actions
  Scenario: Accept a suggestion
    Given I see a suggestion I want to implement
    When I click "Accept" on the suggestion
    Then I should be taken to the relevant edit page
    And the suggestion should be pre-filled (if applicable)
    And the suggestion should be marked as "Accepted"

  Scenario: Reject a suggestion
    Given I see a suggestion I don't want to implement
    When I click "Reject" on the suggestion
    Then the suggestion should be removed from my list
    And I should see a confirmation message
    And I should have an option to undo

  Scenario: Undo rejected suggestion
    Given I previously rejected a suggestion
    When I click "Undo" within 10 seconds
    Then the suggestion should reappear
    And the suggestion state should reset

  Scenario: Defer a suggestion
    Given I want to review a suggestion later
    When I click "Remind Me Later" on the suggestion
    Then the suggestion should be snoozed for 7 days
    And I should see when it will reappear

  # Rationale & Explanation
  Scenario: View suggestion rationale
    Given I see an AI suggestion
    When I expand the "Why this suggestion?" section
    Then I should see detailed reasoning
    And I should see data sources (e.g., "Based on 1,247 similar profiles")
    And I should see expected outcomes

  Scenario: View alternative approaches
    Given AI suggests one approach
    When I expand "Other options"
    Then I should see 2-3 alternative suggestions
    And each alternative should have pros/cons
    And I should be able to choose any approach

  # Skill Gap Analysis
  Scenario: View skill gap analysis
    Given I am targeting specific roles
    When I view the skill gap section
    Then I should see required skills I'm missing
    And I should see skills ranked by demand
    And I should see estimated time to learn each skill
    And I should see learning resource recommendations

  Scenario: Compare my skills to top candidates
    Given I want to understand my competitiveness
    When I view the skills comparison
    Then I should see my skills vs. top 10% of candidates
    And I should see which skills differentiate top candidates
    And I should see skill trends in my target industry

  # Job Recommendations
  Scenario: View job recommendation rationale
    Given AI recommends specific jobs
    When I view the job recommendations section
    Then each job should show why it's recommended
    And I should see fit index breakdown (skills/experience/location/etc.)
    And I should see comparison to jobs I've applied to

  Scenario: Filter job recommendations
    Given I have many job recommendations
    When I filter by:
      | Filter         | Options                    |
      | Fit Index      | 80%+, 70-80%, 60-70%      |
      | Location Type  | Remote, Hybrid, On-site   |
      | Company Size   | Startup, Mid, Enterprise  |
      | Urgency        | Closing soon, Active      |
    Then I should see only matching recommendations
    And the count should update dynamically

  # Profile Improvement Tracking
  Scenario: View profile improvement progress
    Given I have accepted and implemented suggestions
    When I view the progress section
    Then I should see profile strength score (0-100)
    And I should see improvement over time (chart)
    And I should see completed suggestions count
    And I should see projected impact of remaining suggestions

  Scenario: See before/after comparison
    Given I implemented a suggestion
    When I view the suggestion history
    Then I should see before/after comparison
    And I should see actual impact (e.g., "Fit index increased 12%")
    And I should see correlation with job search outcomes

  # Prioritization
  Scenario: View prioritized suggestions
    Given I have many suggestions
    When I view the AI suggestions page
    Then suggestions should be sorted by priority
    And priority should be based on:
      | Factor               | Weight |
      | Impact               | 40%    |
      | Confidence           | 30%    |
      | Ease of Implementation | 20%  |
      | Urgency              | 10%    |

  Scenario: Filter by implementation difficulty
    Given I want quick wins
    When I filter by "Easy to implement"
    Then I should see only suggestions requiring < 10 minutes
    And each should show estimated time
    And "Quick win" badge should be displayed

  # Mobile Responsiveness
  Scenario: View suggestions on mobile
    Given I am on a mobile device
    When I view the AI suggestions page
    Then suggestions should be in vertical cards
    And I should be able to swipe to accept/reject
    And rationale should be collapsible to save space

  # Empty States
  Scenario: View page with no suggestions
    Given my profile is optimized and I have no suggestions
    When I visit the AI suggestions page
    Then I should see a congratulatory message
    And I should see my profile strength score (high)
    And I should see an option to "Re-analyze profile"

  Scenario: View page while analysis is running
    Given AI is currently analyzing my profile
    When I visit the AI suggestions page
    Then I should see a loading state
    And I should see "Analyzing your profile..." message
    And I should see estimated time remaining

  # Real-Time Updates
  Scenario: Receive new suggestions
    Given I am on the AI suggestions page
    When AI generates a new suggestion (profile changed)
    Then I should see a notification
    And the new suggestion should appear at the top
    And the notification should be dismissible

  # Accessibility
  Scenario: Navigate suggestions with keyboard
    When I visit the AI suggestions page
    Then I should be able to tab through all suggestions
    And I should be able to expand rationale with Enter/Space
    And I should be able to accept/reject with keyboard

  Scenario: Use suggestions with screen reader
    Given I am using a screen reader
    When I visit the AI suggestions page
    Then each suggestion should be announced clearly
    And confidence scores should be verbalized (e.g., "High confidence, 85%")
    And impact levels should be announced
    And accept/reject buttons should have clear labels

  # Performance
  Scenario: Load suggestions quickly
    Given I have 50+ suggestions
    When I visit the AI suggestions page
    Then the page should load in < 2 seconds
    And suggestions should be virtualized (lazy loaded)
    And I should see initial 10 suggestions immediately

  # Notifications
  Scenario: Receive new suggestion notification
    Given I have enabled notifications
    When AI generates a high-priority suggestion
    Then I should receive a notification
    And the notification should include the suggestion title
    And clicking the notification should take me to the suggestion

  # Integration with Other Features
  Scenario: Navigate from suggestion to implementation
    Given I accept a "Add TypeScript skill" suggestion
    When I click "Add Skill"
    Then I should be taken to the Skills section
    And the skill form should be pre-filled with "TypeScript"
    And I should be able to save it immediately

  Scenario: View suggestion impact on applications
    Given I implemented a resume suggestion
    When I view my application tracking dashboard
    Then I should see if the change improved my fit index
    And I should see correlation with response rates
