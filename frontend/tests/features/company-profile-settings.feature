Feature: Company Profile Management & Settings
  As a company owner or admin
  I want to customize our company profile and settings
  So that candidates see our branding and we receive relevant notifications

  Background:
    Given I am logged in as a company owner
    And I have completed employer registration

  # ===== COMPANY PROFILE MANAGEMENT =====

  @company-profile @happy-path
  Scenario: View existing company profile
    Given I navigate to "/employer/settings/profile"
    Then I should see the company profile form
    And I should see existing company information pre-filled
    And I should see sections for "Identity", "Details", "Social Links", and "Settings"

  @company-profile @update @happy-path
  Scenario: Successfully update company profile
    Given I am on the company profile settings page
    When I update the company name to "TechCorp Inc."
    And I update the website to "https://techcorp.com"
    And I update the industry to "Technology"
    And I update the company size to "51-200"
    And I update the location to "San Francisco, CA"
    And I update the description to "We are an innovative tech company"
    And I click "Save Changes"
    Then I should see a success message "Profile updated successfully"
    And the changes should be persisted to the database
    And I should remain on the profile page

  @company-profile @validation
  Scenario: Required fields validation
    Given I am on the company profile settings page
    When I clear the company name field
    And I click "Save Changes"
    Then I should see an error "Company name is required"
    And the form should not be submitted

  @company-profile @validation @website
  Scenario: Invalid website URL format
    Given I am on the company profile settings page
    When I enter website URL "not-a-valid-url"
    And I click "Save Changes"
    Then I should see an error "Please enter a valid URL (e.g., https://example.com)"
    And the form should not be submitted

  @company-profile @unsaved-changes
  Scenario: Warn user about unsaved changes
    Given I am on the company profile settings page
    When I update the company name to "New Company Name"
    And I attempt to navigate away without saving
    Then I should see a warning dialog "You have unsaved changes. Are you sure you want to leave?"
    And I should have options to "Stay" or "Leave"

  @company-profile @unsaved-changes @confirm-leave
  Scenario: User confirms leaving with unsaved changes
    Given I am on the company profile settings page
    And I have made unsaved changes
    When I attempt to navigate away
    And I click "Leave" in the warning dialog
    Then I should be navigated away from the page
    And my changes should not be saved

  # ===== LOGO UPLOAD =====

  @logo-upload @happy-path
  Scenario: Successfully upload company logo
    Given I am on the company profile settings page
    When I click "Upload Logo"
    And I select a valid PNG file "company-logo.png" (2MB)
    Then I should see a preview of the uploaded logo
    And the logo should be auto-resized to 400x400px
    And I should see an "Upload" button to confirm
    When I click "Upload"
    Then I should see a success message "Logo uploaded successfully"
    And the logo should be displayed in the profile
    And the logo URL should be saved to the database

  @logo-upload @file-size-validation
  Scenario: Reject logo upload exceeding size limit
    Given I am on the company profile settings page
    When I attempt to upload a logo file "large-logo.png" (7MB)
    Then I should see an error "File size must be under 5MB"
    And the upload should be rejected
    And no file should be uploaded to S3

  @logo-upload @file-format-validation
  Scenario Outline: Logo format validation
    Given I am on the company profile settings page
    When I attempt to upload a logo file with format "<format>"
    Then I should see <result>

    Examples:
      | format | result                                           |
      | PNG    | preview and upload successfully                  |
      | JPG    | preview and upload successfully                  |
      | JPEG   | preview and upload successfully                  |
      | SVG    | preview and upload successfully                  |
      | GIF    | error "Only PNG, JPG, and SVG formats are allowed" |
      | BMP    | error "Only PNG, JPG, and SVG formats are allowed" |

  @logo-upload @preview
  Scenario: Preview logo before uploading
    Given I am on the company profile settings page
    When I select a logo file "logo.png"
    Then I should see a preview modal
    And the preview should show the logo at 400x400px
    And I should see options to "Cancel" or "Upload"

  @logo-upload @delete
  Scenario: Delete existing company logo
    Given I am on the company profile settings page
    And I have an existing logo uploaded
    When I click "Delete Logo"
    Then I should see a confirmation dialog "Are you sure you want to delete the logo?"
    When I confirm deletion
    Then I should see a success message "Logo deleted successfully"
    And the logo should be removed from S3
    And the logo_url should be set to null in the database
    And the placeholder logo should be displayed

  @logo-upload @replace
  Scenario: Replace existing logo with new one
    Given I am on the company profile settings page
    And I have an existing logo uploaded
    When I upload a new logo "new-logo.png"
    Then the old logo should be deleted from S3
    And the new logo should be uploaded
    And the logo_url should be updated in the database

  # ===== COMPANY DESCRIPTION =====

  @company-description @rich-text
  Scenario: Edit company description with rich text editor
    Given I am on the company profile settings page
    When I click on the description field
    Then I should see a rich text editor
    And I should have options for Bold, Italic, Underline
    And I should have options for Bullet List, Numbered List
    And I should have options for Headers (H1, H2, H3)
    When I format text with bold and bullet points
    And I click "Save Changes"
    Then the formatted description should be saved
    And the formatting should be preserved when viewing

  @company-description @character-limit
  Scenario: Description character limit validation
    Given I am on the company profile settings page
    When I enter a description with 5001 characters
    Then I should see an error "Description must be under 5000 characters (currently 5001)"
    And the save button should be disabled

  # ===== INDUSTRY & LOCATION =====

  @industry @searchable-dropdown
  Scenario: Select industry from searchable dropdown
    Given I am on the company profile settings page
    When I click on the industry dropdown
    Then I should see a list of industries
    And the list should include "Technology", "Healthcare", "Finance", "Education"
    When I type "Tech" in the search box
    Then I should see filtered results containing "Technology"
    When I select "Technology"
    Then the industry field should be set to "Technology"

  @location @autocomplete
  Scenario: Use location autocomplete with Google Places API
    Given I am on the company profile settings page
    When I click on the location field
    And I type "San Fran"
    Then I should see autocomplete suggestions from Google Places
    And suggestions should include "San Francisco, CA, USA"
    When I select "San Francisco, CA, USA"
    Then the location field should be set to "San Francisco, CA, USA"

  @location @manual-entry
  Scenario: Enter location manually without autocomplete
    Given I am on the company profile settings page
    When I type "Remote" in the location field
    And I do not select any autocomplete suggestion
    And I click "Save Changes"
    Then the location should be saved as "Remote"

  # ===== SOCIAL LINKS =====

  @social-links @validation
  Scenario Outline: Social link URL validation
    Given I am on the company profile settings page
    When I enter "<url>" in the "<platform>" field
    And I click "Save Changes"
    Then I should see <result>

    Examples:
      | platform | url                                   | result                                     |
      | LinkedIn | https://linkedin.com/company/techcorp | success message "Profile updated successfully" |
      | Twitter  | https://twitter.com/techcorp          | success message "Profile updated successfully" |
      | LinkedIn | not-a-valid-url                       | error "Please enter a valid URL"           |
      | Twitter  | http://example.com                    | error "Twitter URL must start with https://twitter.com" |

  # ===== NOTIFICATION SETTINGS =====

  @notification-settings @email
  Scenario: Configure email notification preferences
    Given I am on the company profile settings page
    And I navigate to the "Notification Settings" section
    When I enable "New Application" email notifications
    And I enable "Stage Change" email notifications
    And I disable "Weekly Digest" email notifications
    And I click "Save Changes"
    Then I should see a success message "Notification settings updated"
    And my email preferences should be saved
    And I should receive emails for "New Application" and "Stage Change"
    And I should not receive "Weekly Digest" emails

  @notification-settings @in-app
  Scenario: Configure in-app notification preferences
    Given I am on the company profile settings page
    And I navigate to the "Notification Settings" section
    When I enable "New Application" in-app notifications
    And I enable "Team Activity" in-app notifications
    And I click "Save Changes"
    Then I should see a success message "Notification settings updated"
    And I should receive in-app notifications for "New Application" and "Team Activity"

  @notification-settings @toggle-all
  Scenario: Toggle all notifications on/off
    Given I am on the company profile settings page
    And I navigate to the "Notification Settings" section
    When I click "Enable All Notifications"
    Then all notification toggles should be turned on
    When I click "Disable All Notifications"
    Then all notification toggles should be turned off

  # ===== TIMEZONE SETTINGS =====

  @settings @timezone
  Scenario: Set company timezone
    Given I am on the company profile settings page
    And I navigate to the "Settings" section
    When I select timezone "America/Los_Angeles (PST/PDT)"
    And I click "Save Changes"
    Then I should see a success message "Settings updated successfully"
    And the timezone should be saved to the database
    And all timestamps should be displayed in PST/PDT

  # ===== DEFAULT TEMPLATES =====

  @settings @default-templates
  Scenario: Set default job posting template
    Given I am on the company profile settings page
    And I navigate to the "Settings" section
    When I select "Software Engineering Template" as the default job template
    And I click "Save Changes"
    Then I should see a success message "Settings updated successfully"
    And new job postings should default to "Software Engineering Template"

  # ===== ACCESSIBILITY =====

  @accessibility @keyboard-navigation
  Scenario: Navigate profile form using only keyboard
    Given I am on the company profile settings page
    When I use Tab to navigate through form fields
    Then I should be able to reach all input fields
    And I should be able to reach all buttons
    And focus indicators should be clearly visible
    When I press Enter on the "Save Changes" button
    Then the form should be submitted

  @accessibility @screen-reader
  Scenario: Profile form is accessible to screen readers
    Given I am on the company profile settings page
    Then all form fields should have proper ARIA labels
    And error messages should be announced to screen readers
    And success messages should be announced to screen readers

  # ===== MOBILE RESPONSIVENESS =====

  @mobile @responsive
  Scenario: View and edit profile on mobile device
    Given I am on a mobile device (viewport 375px)
    When I navigate to "/employer/settings/profile"
    Then the profile form should be responsive
    And all sections should be stacked vertically
    And buttons should be touch-friendly (min 44px height)
    When I update the company name on mobile
    And I tap "Save Changes"
    Then the changes should be saved successfully

  # ===== ERROR HANDLING =====

  @error-handling @network-error
  Scenario: Handle network error gracefully
    Given I am on the company profile settings page
    And the network connection is lost
    When I click "Save Changes"
    Then I should see an error "Unable to save changes. Please check your connection and try again."
    And my changes should be preserved in the form
    And I should be able to retry saving

  @error-handling @server-error
  Scenario: Handle server error gracefully
    Given I am on the company profile settings page
    When the server returns a 500 error
    And I click "Save Changes"
    Then I should see an error "Something went wrong. Please try again later."
    And I should have an option to "Retry"

  @error-handling @unauthorized
  Scenario: Handle unauthorized access
    Given I am logged in as a company member with "Viewer" role
    When I navigate to "/employer/settings/profile"
    Then I should see an error "You don't have permission to edit company settings"
    And all form fields should be read-only
    And the "Save Changes" button should be disabled

  # ===== PERFORMANCE =====

  @performance @auto-save-draft
  Scenario: Auto-save changes as draft
    Given I am on the company profile settings page
    When I update the company description
    And I wait for 3 seconds
    Then my changes should be auto-saved as a draft
    And I should see a message "Draft saved"
    When I refresh the page
    Then my draft changes should be restored

  @performance @lazy-load
  Scenario: Lazy load company settings sections
    Given I am on the company profile settings page
    Then the "Identity" section should load immediately
    And the "Notification Settings" section should load when I scroll to it
    And the page should not block while loading sections
