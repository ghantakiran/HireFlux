Feature: Candidate Public Profile Opt-In System
  As a job seeker
  I want to control my profile visibility and completeness
  So that employers can discover me while respecting my privacy

  Background:
    Given I am logged in as a job seeker
    And I am on the profile settings page

  # =========================================================================
  # Profile Visibility Toggle
  # =========================================================================

  Scenario: Enable public profile visibility
    Given my profile visibility is "private"
    When I toggle profile visibility to "public"
    And I click "Save Changes"
    Then my profile should be publicly visible
    And I should see a success message "Your profile is now public"
    And I should see "Employers can now discover your profile"

  Scenario: Disable public profile visibility
    Given my profile visibility is "public"
    When I toggle profile visibility to "private"
    And I click "Save Changes"
    Then my profile should be private
    And I should see "Your profile is now private"
    And I should see "Only you can see your profile"

  Scenario: View profile completeness meter
    Given my profile visibility is "private"
    When I view the profile settings page
    Then I should see a profile completeness meter
    And the meter should show a percentage (0-100%)
    And I should see missing fields highlighted

  Scenario: Profile completeness at 0%
    Given I have a new empty profile
    When I view the completeness meter
    Then it should show "0% Complete"
    And I should see required fields:
      | Headline      |
      | Bio           |
      | Skills        |
      | Experience    |
      | Location      |

  Scenario: Profile completeness at 50%
    Given I have filled:
      | Headline      | Senior Software Engineer    |
      | Bio           | Experienced developer...    |
      | Skills        | Python, React, AWS          |
    When I view the completeness meter
    Then it should show "50% Complete" (approximately)
    And I should see encouragement "Add more details to reach 100%"

  Scenario: Profile completeness at 100%
    Given I have filled all required and optional fields
    When I view the completeness meter
    Then it should show "100% Complete"
    And I should see "🎉 Your profile is complete!"
    And I should see "Employers love complete profiles"

  # =========================================================================
  # Open to Work Status
  # =========================================================================

  Scenario: Enable "Open to Work" badge
    Given my profile is public
    When I toggle "Open to Work" to enabled
    And I select availability status "Actively Looking"
    And I set start date to "Available Immediately"
    And I click "Save Changes"
    Then I should see "Open to Work" badge on my profile
    And employers should see the badge when viewing my profile

  Scenario: Disable "Open to Work" badge
    Given my "Open to Work" badge is enabled
    When I toggle "Open to Work" to disabled
    And I click "Save Changes"
    Then the "Open to Work" badge should be hidden
    And my availability should show "Not Looking"

  Scenario: Set availability to "Open to Offers"
    Given my profile is public
    When I set availability status to "Open to Offers"
    And I set start date to "2 weeks notice"
    And I click "Save Changes"
    Then my availability should show "Open to Offers"
    And employers should see I need "2 weeks notice"

  # =========================================================================
  # Privacy Controls
  # =========================================================================

  Scenario: Hide salary expectations from public profile
    Given my profile is public
    And I have set expected salary: $120,000 - $150,000
    When I toggle "Show Salary Expectations" to off
    And I click "Save Changes"
    Then my salary should be hidden from employers
    But I should still see my salary in my settings

  Scenario: Hide contact information from public profile
    Given my profile is public
    And my email is "candidate@example.com"
    When I toggle "Show Email Address" to off
    And I click "Save Changes"
    Then my email should be hidden from employers
    And employers should see "Contact via HireFlux only"

  Scenario: Hide location from public profile
    Given my profile is public
    And my location is "San Francisco, CA"
    When I toggle "Show Location" to off
    And I click "Save Changes"
    Then my exact location should be hidden
    And employers should only see "United States" (country level)

  # =========================================================================
  # Profile Preview
  # =========================================================================

  Scenario: Preview profile as employer sees it
    Given I am editing my profile
    When I click "Preview Profile"
    Then I should see a modal showing my profile
    And the profile should show only publicly visible fields
    And hidden fields should not appear
    And I should see "This is how employers see your profile"

  Scenario: Preview shows completeness impact
    Given my profile is 60% complete
    When I click "Preview Profile"
    Then I should see a warning "Your profile is 60% complete"
    And I should see "Complete your profile to stand out"

  # =========================================================================
  # Portfolio Management
  # =========================================================================

  Scenario: Add GitHub portfolio item
    Given I am on the profile settings page
    When I click "Add Portfolio Item"
    And I select type "GitHub Repository"
    And I enter title "React Component Library"
    And I enter URL "https://github.com/user/react-components"
    And I enter description "Open source component library with 1K+ stars"
    And I click "Add"
    Then the portfolio item should appear in my profile
    And I should see it in the portfolio section

  Scenario: Add website portfolio item
    Given I am on the profile settings page
    When I click "Add Portfolio Item"
    And I select type "Personal Website"
    And I enter title "My Portfolio"
    And I enter URL "https://myportfolio.com"
    And I upload a thumbnail image
    And I click "Add"
    Then the portfolio item should appear with thumbnail
    And employers should see it on my public profile

  Scenario: Remove portfolio item
    Given I have 3 portfolio items
    When I click "Remove" on the second item
    And I confirm deletion
    Then the item should be removed
    And I should have 2 portfolio items remaining

  Scenario: Reorder portfolio items
    Given I have 4 portfolio items
    When I drag the 4th item to the 1st position
    And I click "Save Changes"
    Then the portfolio items should be reordered
    And the new order should be saved

  # =========================================================================
  # Validation & Error Handling
  # =========================================================================

  Scenario: Cannot make profile public with 0% completeness
    Given my profile is 0% complete
    When I try to toggle visibility to "public"
    Then I should see an error "Complete at least 50% of your profile to make it public"
    And the toggle should remain on "private"

  Scenario: Cannot make profile public without required fields
    Given my profile is missing required field "Headline"
    When I try to toggle visibility to "public"
    Then I should see an error "Please fill in required fields: Headline"
    And I should see the missing fields highlighted in red

  Scenario: Invalid portfolio URL
    Given I am adding a portfolio item
    When I enter an invalid URL "not-a-url"
    And I click "Add"
    Then I should see an error "Please enter a valid URL"
    And the item should not be added

  Scenario: Portfolio item limit
    Given I have 10 portfolio items (maximum)
    When I try to add an 11th item
    Then I should see an error "Maximum 10 portfolio items allowed"
    And the "Add Portfolio Item" button should be disabled

  # =========================================================================
  # Analytics
  # =========================================================================

  Scenario: View profile views count
    Given my profile is public
    And employers have viewed my profile 15 times
    When I view the profile settings page
    Then I should see "15 profile views in the last 30 days"

  Scenario: View invites received count
    Given my profile is public
    And employers have sent me 3 job invites
    When I view the profile settings page
    Then I should see "3 invites received"
    And I should see a "View Invites" link

  # =========================================================================
  # Mobile Responsive
  # =========================================================================

  Scenario: Toggle visibility on mobile
    Given I am using a mobile device (375px width)
    When I navigate to profile settings
    Then the visibility toggle should be easily tappable
    And the completeness meter should fit the screen
    And all controls should be accessible

  # =========================================================================
  # Accessibility
  # =========================================================================

  Scenario: Screen reader announces visibility change
    Given I am using a screen reader
    When I toggle visibility to "public"
    Then I should hear "Profile visibility changed to public"
    And I should hear "Employers can now discover your profile"

  Scenario: Keyboard navigation for profile settings
    Given I am using keyboard navigation
    When I tab through the profile settings page
    Then I should be able to reach all toggles and inputs
    And I can press Space to toggle switches
    And I can press Enter to save changes
