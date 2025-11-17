# Feature: Employer Registration & Authentication
# Issue: #20 [P0-CRITICAL]
# Sprint: 3-4 (Weeks 5-8)

@employer-registration @critical
Feature: Employer Registration & Authentication System
  As a hiring manager
  I want to create a company account
  So that I can post jobs and find candidates

  Background:
    Given I am on the employer registration page "/employer/register"
    And the registration system is available

  # Step 1: Email Entry & Verification
  @email-verification @happy-path
  Scenario: Successfully register with email verification
    When I enter a valid company email "hiring@techcorp.com"
    And I click "Continue with Email"
    Then I should see the email verification screen
    And I should receive a 6-digit verification code at "hiring@techcorp.com"
    When I enter the correct verification code
    Then I should proceed to the password creation step

  @email-verification @validation
  Scenario: Invalid email format is rejected
    When I enter an invalid email "not-an-email"
    And I click "Continue with Email"
    Then I should see an error "Please enter a valid email address"
    And I should remain on the email entry step

  @email-verification @duplicate
  Scenario: Existing company email is detected
    Given a company already exists with email "existing@company.com"
    When I enter the email "existing@company.com"
    And I click "Continue with Email"
    Then I should see an error "This email is already registered. Please sign in."
    And I should see a link to the employer sign-in page

  @email-verification @rate-limit
  Scenario: Rate limiting on email verification attempts
    Given I have already requested 3 verification codes in the last hour
    When I request another verification code
    Then I should see an error "Too many attempts. Please try again in 60 minutes."
    And the "Continue" button should be disabled

  # Step 2: Email Verification Code Entry
  @verification-code @happy-path
  Scenario: Enter valid 6-digit verification code
    Given I am on the email verification step
    And I have received verification code "123456"
    When I enter the code "123456"
    Then the code should auto-submit
    And I should proceed to the password creation step

  @verification-code @invalid
  Scenario: Invalid verification code is rejected
    Given I am on the email verification step
    When I enter an incorrect code "999999"
    Then I should see an error "Invalid verification code. Please try again."
    And I should remain on the verification step
    And I should have 2 attempts remaining

  @verification-code @expired
  Scenario: Expired verification code is rejected
    Given I am on the email verification step
    And my verification code has expired (>10 minutes old)
    When I enter the expired code
    Then I should see an error "Verification code expired. Please request a new one."
    And I should see a "Resend Code" button

  @verification-code @resend
  Scenario: Resend verification code
    Given I am on the email verification step
    When I click "Resend Code"
    Then I should receive a new 6-digit code
    And I should see a message "New code sent to your email"
    And the "Resend Code" button should be disabled for 60 seconds

  # Step 3: Password Creation
  @password @happy-path
  Scenario: Create strong password
    Given I am on the password creation step
    When I enter password "SecurePass123!"
    And I confirm password "SecurePass123!"
    And I click "Continue"
    Then I should proceed to the company details step

  @password @strength-validation
  Scenario Outline: Password strength validation
    Given I am on the password creation step
    When I enter password "<password>"
    Then I should see password strength indicator as "<strength>"
    And the continue button should be <button_state>

    Examples:
      | password      | strength | button_state |
      | weak          | Weak     | disabled     |
      | Medium1       | Medium   | disabled     |
      | Strong123!    | Strong   | enabled      |
      | VeryStr0ng!@# | Strong   | enabled      |

  @password @mismatch
  Scenario: Password confirmation mismatch
    Given I am on the password creation step
    When I enter password "SecurePass123!"
    And I confirm password "DifferentPass123!"
    And I click "Continue"
    Then I should see an error "Passwords do not match"
    And I should remain on the password step

  # Step 4: Company Details
  @company-details @happy-path
  Scenario: Enter complete company details
    Given I am on the company details step
    When I fill in the following company information:
      | Field         | Value                    |
      | Company Name  | TechCorp Inc.           |
      | Industry      | Technology              |
      | Company Size  | 51-200 employees        |
      | Location      | San Francisco, CA       |
      | Website       | https://techcorp.com    |
    And I click "Continue"
    Then I should proceed to the plan selection step

  @company-details @domain-validation
  Scenario: Company domain uniqueness check
    Given a company already exists with domain "existingcorp.com"
    When I enter company name "Existing Corp"
    And I enter website "https://existingcorp.com"
    Then I should see a warning "A company with this domain already exists"
    And I should be prompted to join the existing company instead

  @company-details @optional-fields
  Scenario: Register with minimum required fields
    Given I am on the company details step
    When I fill in only required fields:
      | Field         | Value                    |
      | Company Name  | Startup Inc.            |
      | Industry      | Technology              |
    And I leave optional fields blank
    And I click "Continue"
    Then I should proceed to the plan selection step
    And the company profile should be created with defaults

  # Step 5: Plan Selection
  @plan-selection @free-plan
  Scenario: Select Starter (Free) plan
    Given I am on the plan selection step
    When I select the "Starter (Free)" plan
    And I click "Continue"
    Then I should skip payment details
    And I should proceed to the onboarding checklist
    And my account should have plan limits:
      | Limit                  | Value |
      | Active Jobs            | 1     |
      | Candidate Views/month  | 10    |
      | Team Seats             | 1     |

  @plan-selection @paid-plan
  Scenario: Select Growth ($99/mo) plan
    Given I am on the plan selection step
    When I select the "Growth ($99/mo)" plan
    And I click "Continue"
    Then I should proceed to the payment details step
    And I should see Stripe payment form

  @plan-selection @comparison
  Scenario: Compare plan features
    Given I am on the plan selection step
    When I click "Compare Plans"
    Then I should see a detailed comparison table
    And I should see features for Starter, Growth, and Professional plans
    And I should be able to toggle between monthly and annual billing

  # Step 6: Payment Details (for paid plans)
  @payment @stripe-integration
  Scenario: Enter valid payment details for Growth plan
    Given I am on the payment details step for "Growth" plan
    When I enter valid Stripe card details:
      | Field      | Value           |
      | Card       | 4242424242424242 |
      | Expiry     | 12/25           |
      | CVC        | 123             |
      | ZIP        | 94102           |
    And I click "Subscribe & Complete Registration"
    Then Stripe should process the payment successfully
    And I should receive a subscription confirmation
    And I should proceed to the onboarding checklist

  @payment @card-declined
  Scenario: Handle declined card
    Given I am on the payment details step
    When I enter a card that will be declined
    And I click "Subscribe & Complete Registration"
    Then I should see an error "Payment declined. Please try another card."
    And I should remain on the payment step
    And my account should not be activated

  @payment @promo-code
  Scenario: Apply promotional code
    Given I am on the payment details step for "Professional" plan
    When I click "Have a promo code?"
    And I enter promo code "LAUNCH50"
    And I click "Apply"
    Then I should see "50% discount applied"
    And the total should show "$149.50/month" instead of "$299/month"

  # Step 7: Onboarding Checklist
  @onboarding @first-login
  Scenario: View onboarding checklist after registration
    Given I have just completed registration
    When I am redirected to the employer dashboard
    Then I should see the onboarding checklist with 0% progress:
      | Task                          | Status    |
      | Post first job               | Incomplete |
      | Customize company profile    | Incomplete |
      | Invite team member           | Incomplete |
      | Set up notifications         | Incomplete |

  @onboarding @task-completion
  Scenario: Complete onboarding tasks
    Given I am logged in as a new employer
    And my onboarding progress is 0%
    When I post my first job
    Then my onboarding progress should be 25%
    When I customize my company profile
    Then my onboarding progress should be 50%
    When I invite a team member
    Then my onboarding progress should be 75%
    When I set up my notification preferences
    Then my onboarding progress should be 100%
    And I should see a congratulations message

  # Authentication & Session
  @authentication @jwt-token
  Scenario: JWT token includes employer user type
    Given I have completed registration as an employer
    When I inspect my authentication token
    Then the JWT should contain:
      | Claim     | Value     |
      | user_type | employer  |
      | email     | hiring@techcorp.com |
    And the token should expire in 7 days

  @authentication @protected-routes
  Scenario: Access employer-only routes after registration
    Given I have completed registration
    When I navigate to "/employer/dashboard"
    Then I should have access
    When I navigate to "/dashboard" (job seeker dashboard)
    Then I should be redirected to "/employer/dashboard"

  # Security
  @security @csrf-protection
  Scenario: CSRF token validation on registration
    Given I am submitting the registration form
    When the CSRF token is missing or invalid
    Then the request should be rejected with error "Invalid CSRF token"

  @security @sql-injection
  Scenario: SQL injection attempt is blocked
    Given I am on the company details step
    When I enter malicious SQL in company name "'; DROP TABLE companies; --"
    And I submit the form
    Then the input should be sanitized
    And no SQL should be executed
    And the company should be created with the literal string

  # Edge Cases
  @edge-case @browser-refresh
  Scenario: Browser refresh during registration
    Given I am on step 3 (company details)
    When I refresh the browser
    Then I should remain on step 3
    And my previous inputs should be preserved in session

  @edge-case @back-navigation
  Scenario: Navigate back during registration
    Given I am on step 4 (plan selection)
    When I click the browser back button
    Then I should go to step 3 (company details)
    And my previously entered data should be shown

  @edge-case @duplicate-submission
  Scenario: Prevent duplicate registration on double-click
    Given I am on the final registration step
    When I click "Complete Registration" multiple times rapidly
    Then only one registration should be processed
    And I should see a loading state preventing additional clicks

  # Mobile Responsiveness
  @mobile @responsive
  Scenario: Complete registration on mobile device
    Given I am on a mobile device (viewport 375px)
    When I go through the entire registration flow
    Then all steps should be mobile-responsive
    And the Stripe payment form should work on mobile
    And I should be able to complete registration successfully

  # Accessibility
  @accessibility @screen-reader
  Scenario: Registration flow is screen reader accessible
    Given I am using a screen reader
    When I navigate through the registration form
    Then each form field should have proper labels
    And error messages should be announced
    And progress through steps should be announced

  @accessibility @keyboard-navigation
  Scenario: Complete registration using only keyboard
    Given I am using only keyboard navigation
    When I tab through the registration form
    Then I should be able to fill all fields
    And I should be able to submit using Enter key
    And focus indicators should be visible
