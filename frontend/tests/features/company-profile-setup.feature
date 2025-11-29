# Feature: Company Profile Setup (Issue #113)
#
# As an employer
# I want to create and manage my company profile
# So that job seekers can learn about my company and I can attract better candidates

Feature: Company Profile Setup

  Background:
    Given I am logged in as an employer
    And I have an employer account

  # Company Information Form
  Scenario: Access company profile setup
    Given I am on the employer dashboard
    When I navigate to "Company Profile" or "Settings"
    Then I should see the company profile setup form
    And I should see sections for basic info, logo, culture, locations, and social

  Scenario: Fill basic company information
    Given I am on the company profile setup page
    When I enter company name "TechCorp Inc"
    And I select industry "Technology"
    And I select company size "51-200 employees"
    And I enter company website "https://techcorp.com"
    And I enter company description "We build innovative software solutions"
    Then all fields should be saved automatically or on submit
    And I should see a success message

  Scenario: Require company name
    Given I am on the company profile setup page
    When I try to save without entering a company name
    Then I should see an error "Company name is required"
    And the form should not be submitted

  Scenario: Validate website URL format
    Given I am on the company profile setup page
    When I enter an invalid website "not-a-url"
    Then I should see an error "Please enter a valid URL"
    When I enter a valid website "https://example.com"
    Then the error should disappear

  Scenario: Character limit on company description
    Given I am on the company profile setup page
    When I enter a company description
    Then I should see a character count (e.g., "250/500")
    And the count should update as I type

  Scenario: Warn when approaching character limit
    Given I am on the company profile setup page
    When I have entered 480 characters in the description
    Then I should see a warning "20 characters remaining"
    When I reach 500 characters
    Then I should not be able to type more

  # Logo Upload
  Scenario: Upload company logo
    Given I am on the company profile setup page
    When I click "Upload Logo" or the logo upload area
    Then I should see a file picker
    When I select a valid image file (PNG, JPG)
    Then the logo should be uploaded
    And I should see a preview of the logo
    And I should see a success message "Logo uploaded successfully"

  Scenario: Preview logo before uploading
    Given I am on the company profile setup page
    When I select a logo file
    Then I should see a preview of the image
    And I should see options to "Upload" or "Cancel"

  Scenario: Logo file size validation
    Given I am on the company profile setup page
    When I try to upload a file larger than 5MB
    Then I should see an error "File size must be less than 5MB"
    And the file should not be uploaded

  Scenario: Logo file type validation
    Given I am on the company profile setup page
    When I try to upload an invalid file type (e.g., PDF, TXT)
    Then I should see an error "Only PNG, JPG, and JPEG files are allowed"
    And the file should not be uploaded

  Scenario: Replace existing logo
    Given I have already uploaded a logo
    When I upload a new logo
    Then the old logo should be replaced
    And I should see the new logo preview
    And I should see a confirmation "Logo updated successfully"

  Scenario: Remove logo
    Given I have uploaded a logo
    When I click "Remove Logo" or the delete icon
    Then I should see a confirmation dialog "Are you sure you want to remove the logo?"
    When I confirm
    Then the logo should be removed
    And I should see the default placeholder

  # Culture & Benefits
  Scenario: Add company culture description
    Given I am on the company profile setup page
    When I navigate to the "Culture & Benefits" section
    And I enter company values "Innovation, Collaboration, Growth"
    And I enter company culture description "We foster a creative and inclusive workplace"
    Then the information should be saved
    And I should see a success message

  Scenario: Add company benefits
    Given I am on the company profile setup page
    When I navigate to the "Culture & Benefits" section
    And I click "Add Benefit"
    And I enter benefit "Health Insurance"
    And I click "Add Benefit" again
    And I enter benefit "Remote Work"
    And I enter benefit "401(k) Matching"
    Then I should see 3 benefits listed
    And each benefit should have a remove option

  Scenario: Remove a benefit
    Given I have added 3 benefits
    When I click "Remove" on the second benefit
    Then that benefit should be removed from the list
    And I should see 2 benefits remaining

  Scenario: Reorder benefits (drag and drop)
    Given I have added multiple benefits
    When I drag the first benefit to the third position
    Then the order should be updated
    And the changes should be saved

  Scenario: Limit number of benefits
    Given I have added 15 benefits
    When I try to add a 16th benefit
    Then I should see a message "Maximum 15 benefits allowed"
    And the add button should be disabled

  # Office Locations
  Scenario: Add office location
    Given I am on the company profile setup page
    When I navigate to the "Office Locations" section
    And I click "Add Location"
    Then I should see a location form
    When I enter address "123 Main St, San Francisco, CA 94105"
    And I mark it as "Headquarters"
    And I click "Save Location"
    Then the location should be added to the list
    And I should see it marked as "Headquarters"

  Scenario: Add multiple office locations
    Given I am on the company profile setup page
    When I add location "123 Main St, San Francisco, CA 94105" as "Headquarters"
    And I add location "456 Market St, New York, NY 10001" as "Office"
    And I add location "789 Tech Blvd, Austin, TX 78701" as "Office"
    Then I should see 3 locations listed
    And only one should be marked as "Headquarters"

  Scenario: Edit office location
    Given I have added 2 office locations
    When I click "Edit" on the first location
    Then I should see the location form pre-filled
    When I change the address to "999 New St, Seattle, WA 98101"
    And I click "Save Location"
    Then the location should be updated
    And I should see the new address

  Scenario: Remove office location
    Given I have added 3 office locations
    When I click "Remove" on the second location
    Then I should see a confirmation dialog
    When I confirm
    Then that location should be removed
    And I should see 2 locations remaining

  Scenario: Mark different location as headquarters
    Given I have 3 office locations with SF as "Headquarters"
    When I edit the NY location and mark it as "Headquarters"
    Then the NY location should become "Headquarters"
    And the SF location should be marked as "Office"
    And only one "Headquarters" should exist

  Scenario: Validate address format
    Given I am adding a new office location
    When I enter an incomplete address "123 Main"
    Then I should see a suggestion to complete the address
    When I enter a complete address "123 Main St, San Francisco, CA 94105"
    Then the validation should pass

  # Social Media Links
  Scenario: Add social media links
    Given I am on the company profile setup page
    When I navigate to the "Social Media" section
    And I enter LinkedIn URL "https://linkedin.com/company/techcorp"
    And I enter Twitter URL "https://twitter.com/techcorp"
    And I enter Facebook URL "https://facebook.com/techcorp"
    And I enter Instagram URL "https://instagram.com/techcorp"
    Then all links should be saved
    And I should see a success message

  Scenario: Validate social media URL format
    Given I am on the social media section
    When I enter LinkedIn URL "not-a-url"
    Then I should see an error "Please enter a valid LinkedIn URL"
    When I enter LinkedIn URL "https://linkedin.com/company/techcorp"
    Then the error should disappear

  Scenario: Validate platform-specific URLs
    Given I am on the social media section
    When I enter LinkedIn URL "https://twitter.com/techcorp" (wrong platform)
    Then I should see an error "Please enter a valid LinkedIn URL"
    When I enter LinkedIn URL "https://linkedin.com/company/techcorp"
    Then the validation should pass

  Scenario: Social media links are optional
    Given I am on the company profile setup page
    When I skip the social media section
    And I save the profile
    Then the profile should be saved successfully
    And social media links should be empty

  # Form Validation & Auto-Save
  Scenario: Auto-save company profile changes
    Given I am editing the company profile
    When I change the company name to "TechCorp International"
    Then after 2 seconds, the change should be auto-saved
    And I should see an indicator "Saved"

  Scenario: Show unsaved changes warning
    Given I am editing the company profile
    And I have made changes that are not auto-saved yet
    When I try to navigate away from the page
    Then I should see a warning "You have unsaved changes. Are you sure you want to leave?"

  Scenario: Validate required fields on submit
    Given I am on the company profile setup page
    When I try to save with only company name filled
    Then I should see errors for missing required fields
    And the form should not be submitted

  # Industry Selection
  Scenario: Select industry from dropdown
    Given I am on the company profile setup page
    When I click the industry dropdown
    Then I should see a list of industries:
      | Industry                |
      | Technology              |
      | Finance                 |
      | Healthcare              |
      | Education               |
      | Manufacturing           |
      | Retail                  |
      | Consulting              |
      | Other                   |
    When I select "Technology"
    Then the industry should be saved

  Scenario: Search for industry
    Given I am on the company profile setup page
    When I click the industry dropdown
    And I type "Tech" in the search box
    Then I should see filtered industries containing "Tech"
    And I should see "Technology" as an option

  # Company Size Selection
  Scenario: Select company size
    Given I am on the company profile setup page
    When I click the company size dropdown
    Then I should see size options:
      | Size              |
      | 1-10 employees    |
      | 11-50 employees   |
      | 51-200 employees  |
      | 201-500 employees |
      | 501-1000 employees|
      | 1001-5000 employees|
      | 5001+ employees   |
    When I select "51-200 employees"
    Then the size should be saved

  # Public Profile Display
  Scenario: View public company profile
    Given I have completed my company profile
    When I click "View Public Profile" or navigate to the public URL
    Then I should see the company profile as job seekers see it
    And I should see company name, logo, description
    And I should see culture & benefits
    And I should see office locations
    And I should see social media links

  Scenario: Public profile shows complete information
    Given I have filled all profile sections
    When I view the public profile
    Then I should see:
      | Section          | Present |
      | Company Name     | Yes     |
      | Logo             | Yes     |
      | Industry         | Yes     |
      | Company Size     | Yes     |
      | Description      | Yes     |
      | Culture & Values | Yes     |
      | Benefits         | Yes     |
      | Office Locations | Yes     |
      | Social Media     | Yes     |

  Scenario: Public profile hides incomplete sections
    Given I have only filled basic company information
    And I have not added benefits or locations
    When I view the public profile
    Then I should see basic information
    But I should not see empty benefits or locations sections

  # Profile Completion Progress
  Scenario: View profile completion percentage
    Given I am on the company profile setup page
    Then I should see a progress indicator (e.g., "60% Complete")
    And I should see which sections are complete and incomplete

  Scenario: Profile completion increases with filled sections
    Given I have only filled basic information (20% complete)
    When I upload a logo
    Then the completion should increase to 40%
    When I add benefits
    Then the completion should increase to 60%
    When I add office locations
    Then the completion should increase to 80%
    When I add social media links
    Then the completion should increase to 100%

  Scenario: Prompt to complete profile
    Given my profile is only 40% complete
    When I navigate to create a job posting
    Then I should see a prompt "Complete your company profile to attract better candidates"
    And I should see a link to complete the profile

  # SEO Optimization
  Scenario: Company profile has SEO meta tags
    Given I have completed my company profile
    When I view the public profile page source
    Then I should see meta tags for title, description, and image
    And the title should include the company name
    And the description should be the company description (truncated to 160 chars)
    And the image should be the company logo

  Scenario: Company profile has structured data (JSON-LD)
    Given I have completed my company profile
    When I view the public profile page source
    Then I should see JSON-LD structured data
    And it should include Organization schema
    And it should include company name, logo, url, address, social media

  # Mobile Responsiveness
  Scenario: Company profile setup on mobile
    Given I am on a mobile device
    When I navigate to the company profile setup page
    Then the form should be mobile-optimized
    And all fields should be accessible
    And the logo upload should work on mobile

  Scenario: View public profile on mobile
    Given I am on a mobile device
    When I view a company's public profile
    Then the profile should be mobile-responsive
    And all sections should be readable
    And social media links should be tappable

  # Accessibility
  Scenario: Navigate company profile form with keyboard
    Given I am on the company profile setup page
    Then I should be able to tab through all form fields
    And I should be able to submit the form with Enter key
    And I should be able to navigate sections with keyboard

  Scenario: Screen reader support
    Given I am using a screen reader
    When I navigate the company profile setup page
    Then all form fields should have proper labels
    And all sections should be announced
    And all error messages should be read aloud

  # Error Handling
  Scenario: Handle logo upload failure
    Given I am uploading a company logo
    When the upload fails due to network error
    Then I should see an error message "Upload failed. Please try again."
    And I should see a "Retry" button

  Scenario: Handle form submission failure
    Given I am saving the company profile
    When the API request fails
    Then I should see an error message "Failed to save profile. Please try again."
    And my changes should be preserved
    And I should see a "Retry" button

  # Integration with Job Posting
  Scenario: Company profile auto-populates job posting
    Given I have completed my company profile
    When I create a new job posting
    Then the company name should be pre-filled
    And the company logo should be pre-filled
    And the office locations should be available for selection

  # Privacy Controls
  Scenario: Make profile private
    Given I have a completed company profile
    When I toggle "Make profile private"
    Then the public profile should not be accessible
    And I should see a message "Your profile is private and not visible to job seekers"

  Scenario: Make profile public again
    Given my profile is set to private
    When I toggle "Make profile public"
    Then the public profile should become accessible
    And I should see a message "Your profile is now public"

  # Draft Saving
  Scenario: Save incomplete profile as draft
    Given I have partially filled the company profile
    When I navigate away without completing
    Then my changes should be saved as a draft
    When I return to the profile setup page
    Then I should see my previous changes
    And I should see a message "Continue editing your profile"

  # Duplicate Detection
  Scenario: Warn about duplicate company name
    Given another company "TechCorp Inc" already exists
    When I enter company name "TechCorp Inc"
    Then I should see a warning "A company with this name already exists. Is this you?"
    And I should see an option to claim the existing profile

  # Multi-Language Support (Future)
  Scenario: Add company description in multiple languages
    Given I am on the company profile setup page
    When I click "Add Language"
    And I select "Spanish"
    And I enter Spanish description "Construimos soluciones de software innovadoras"
    Then the Spanish description should be saved
    And it should be displayed to Spanish-speaking job seekers
