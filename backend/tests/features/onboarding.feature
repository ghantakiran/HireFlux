Feature: User Onboarding
  As a new user
  I want to complete my profile setup
  So that I can get personalized job recommendations

  Background:
    Given a new user has registered with email "newuser@example.com"
    And the user has received authentication tokens

  Scenario: User completes basic profile information
    Given the user is on the onboarding page
    When the user fills in their profile with:
      | field      | value           |
      | first_name | John            |
      | last_name  | Doe             |
      | phone      | +1234567890     |
      | location   | New York, NY    |
    Then the profile should be saved successfully
    And the user should see step 2 of onboarding

  Scenario: User sets job preferences
    Given the user has completed basic profile information
    When the user sets their job preferences:
      | field         | value                              |
      | target_titles | ["Software Engineer", "Developer"] |
      | salary_min    | 80000                              |
      | salary_max    | 150000                             |
      | industries    | ["Technology", "Finance"]          |
    Then the job preferences should be saved successfully
    And the user should see step 3 of onboarding

  Scenario: User adds skills
    Given the user has completed basic profile and job preferences
    When the user adds their skills:
      | skill       | proficiency |
      | Python      | Expert      |
      | JavaScript  | Advanced    |
      | React       | Intermediate|
      | AWS         | Intermediate|
    Then the skills should be saved successfully
    And the user should see step 4 of onboarding

  Scenario: User sets work preferences
    Given the user has completed basic profile, job preferences, and skills
    When the user sets their work preferences:
      | preference      | value |
      | remote          | true  |
      | visa_friendly   | true  |
      | relocation      | false |
      | contract        | false |
    Then the work preferences should be saved successfully
    And the onboarding should be marked as complete
    And the user should be redirected to the dashboard

  Scenario: User skips optional steps
    Given the user has completed basic profile information
    When the user clicks "Skip" on job preferences
    Then the user should see step 3 of onboarding
    And the job preferences should remain empty

  Scenario: User edits profile during onboarding
    Given the user is on step 2 of onboarding
    When the user goes back to step 1
    And the user updates their first name to "Jane"
    Then the profile should be updated with the new information
    And the user should remain on step 1

  Scenario: User retrieves current onboarding progress
    Given the user has completed step 1 and step 2
    When the user requests their onboarding progress
    Then the response should show:
      | field                | value |
      | current_step         | 3     |
      | onboarding_complete  | false |
      | profile_completed    | true  |
      | preferences_completed| true  |
      | skills_completed     | false |

  Scenario: Incomplete onboarding blocks certain features
    Given the user has not completed onboarding
    When the user tries to access job recommendations
    Then the user should receive an error "Please complete onboarding first"
    And the user should be redirected to onboarding

  Scenario: User completes entire onboarding flow
    Given the user starts onboarding
    When the user completes all onboarding steps:
      | step | data                                              |
      | 1    | Basic profile information                         |
      | 2    | Job preferences with target titles and salary     |
      | 3    | Skills with proficiency levels                    |
      | 4    | Work preferences for remote, visa, relocation     |
    Then the onboarding_complete flag should be true
    And the user should have access to all platform features
    And the user should see a welcome message on the dashboard
