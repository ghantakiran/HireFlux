Feature: Domain Verification
  As a company owner or admin
  I want to verify my company domain
  So that I can build trust with candidates and prevent impersonation

  Background:
    Given I am logged in as a company owner
    And my company has a domain set to "testcompany.com"

  Scenario: View domain verification page
    When I navigate to the domain verification page
    Then I should see the page title "Domain Verification"
    And I should see "Why verify your domain?" section
    And I should see three verification method tabs: Email, DNS, and File

  Scenario: Initiate email verification
    Given I am on the domain verification page
    And the domain is not yet verified
    When I select the "Email" verification method
    And I click "Send Verification Email"
    Then I should see a success message "Verification emails sent"
    And I should see emails were sent to "admin@testcompany.com"
    And I should see emails were sent to "postmaster@testcompany.com"
    And I should see emails were sent to "webmaster@testcompany.com"
    And I should see a "Resend Email" button

  Scenario: Resend verification email
    Given I have initiated email verification
    When I click "Resend Email"
    Then I should see "Verification emails resent successfully"

  Scenario: Initiate DNS verification
    Given I am on the domain verification page
    When I select the "DNS" verification method
    And I click "Generate DNS Record"
    Then I should see the TXT record name displayed
    And I should see the TXT record value displayed
    And I should see a "Copy" button for the TXT record
    And I should see a "Copy" button for the TXT value
    And I should see a "Verify DNS Record" button

  Scenario: Copy DNS verification values
    Given I have initiated DNS verification
    When I click the "Copy" button for TXT record
    Then the TXT record should be copied to clipboard
    And I should see "Copied to clipboard!" message

  Scenario: Verify DNS record (success)
    Given I have added the DNS TXT record to my domain
    And I am on the domain verification page with DNS method
    When I click "Verify DNS Record"
    Then I should see "Domain verified successfully"
    And I should see a green "Verified" badge
    And the verification card should show as verified

  Scenario: Verify DNS record (failure - record not found)
    Given I have not added the DNS TXT record yet
    When I click "Verify DNS Record"
    Then I should see an error message "DNS TXT record not found"

  Scenario: Initiate file verification
    Given I am on the domain verification page
    When I select the "File" verification method
    And I click "Generate Verification File"
    Then I should see the filename "hireflux-verification.txt"
    And I should see the file content displayed
    And I should see upload instructions for "https://testcompany.com/hireflux-verification.txt"
    And I should see a "Copy" button for file content
    And I should see a "Verify File" button

  Scenario: Verify file upload (success)
    Given I have uploaded the verification file to my website
    When I click "Verify File"
    Then I should see "Domain verified successfully"
    And I should see a green "Verified" badge

  Scenario: View already verified domain
    Given my domain is already verified
    When I navigate to the domain verification page
    Then I should see a "Verified" badge
    And I should see "Your domain testcompany.com has been verified"
    And I should see the verification method used
    And I should see the verification date

  Scenario: Rate limiting - too many attempts
    Given I have made 5 verification attempts in the last 24 hours
    When I try to initiate another verification
    Then I should see an error "You've reached the maximum verification attempts"
    And the initiate button should be disabled
    And I should see "Please try again later"

  Scenario: Rate limiting - approaching limit
    Given I have made 3 verification attempts
    When I am on the domain verification page
    Then I should see "2 verification attempts remaining today"

  Scenario: Missing company domain
    Given my company does not have a domain set
    When I navigate to the domain verification page
    Then I should see "Please set your company domain in profile settings first"
    And the verification buttons should be disabled

  Scenario: Insufficient permissions (not owner/admin)
    Given I am logged in as a company viewer
    When I try to access the domain verification page
    Then I should see a 403 Forbidden error
    Or I should see "Insufficient permissions" message

  Scenario: Verified badge displays on company profile
    Given my domain is verified
    When I view my company profile
    Then I should see a green "Verified" badge next to my company name
    And hovering over the badge should show verification date

  Scenario: Verified badge displays on job postings
    Given my domain is verified
    When I create a new job posting
    Then candidates should see a "Verified" badge next to the company name
    And this should increase application confidence

  Scenario: Token expiration
    Given I initiated email verification 25 hours ago
    When I try to resend the verification email
    Then I should see "Verification token expired"
    And I should be prompted to "initiate new verification"

  Scenario: Switch verification methods
    Given I initiated DNS verification
    When I switch to "Email" method
    Then I should see the email verification UI
    And I should be able to initiate email verification
    And my previous DNS verification should still be active
