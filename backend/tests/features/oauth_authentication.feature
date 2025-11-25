# Feature: OAuth Social Login Authentication
# Issue: #54 - [CRITICAL-GAP] OAuth Social Login - Google/LinkedIn/Apple
# Priority: CRITICAL-GAP
# Status: In Progress
#
# Business Value:
# - 40%+ higher signup completion with social login
# - One-click registration reduces friction
# - Pre-verified email addresses improve data quality
# - Professional context with LinkedIn
#
# Methodology: BDD (Behavior-Driven Development)
# Framework: Gherkin syntax for clear specifications

Feature: OAuth Social Login Authentication
  As a user (job seeker or employer)
  I want to sign in with my Google/LinkedIn/Apple account
  So that I can quickly access HireFlux without creating a new password

  Background:
    Given the OAuth providers are configured with valid credentials
    And the database is clean and ready for testing
    And all OAuth provider APIs are accessible

  # ============================================================================
  # GOOGLE OAUTH SCENARIOS
  # ============================================================================

  Scenario: Successful Google OAuth login for new user
    Given a user named "John Doe" with email "john.doe@gmail.com"
    And the user has never registered on HireFlux
    When the user initiates Google OAuth flow
    And Google returns a valid access token with user info:
      | field          | value                |
      | email          | john.doe@gmail.com   |
      | email_verified | true                 |
      | given_name     | John                 |
      | family_name    | Doe                  |
      | sub            | google-123456789     |
    And the user completes OAuth callback with the token
    Then a new user account should be created
    And the user profile should have:
      | field          | value                |
      | email          | john.doe@gmail.com   |
      | first_name     | John                 |
      | last_name      | Doe                  |
      | email_verified | true                 |
      | provider       | google               |
    And a JWT access token should be returned
    And a JWT refresh token should be returned
    And the user should be automatically logged in

  Scenario: Successful Google OAuth login for existing user
    Given an existing user with email "jane.smith@gmail.com"
    And the user previously registered via email/password
    When the user initiates Google OAuth flow
    And Google returns a valid access token for "jane.smith@gmail.com"
    Then the existing account should be linked to Google OAuth
    And the user should be logged in with existing account data
    And no duplicate account should be created

  Scenario: Google OAuth login with unverified email
    Given a user with email "unverified@gmail.com"
    When the user initiates Google OAuth flow
    And Google returns access token with email_verified=false
    Then the login should succeed
    But the account should be marked as email_unverified
    And an email verification should be sent
    And access to protected features should be limited

  Scenario: Google OAuth login failure - Invalid token
    Given a user attempting Google OAuth login
    When the user provides an invalid Google access token
    Then the API should return 401 Unauthorized
    And the error message should be "Invalid Google access token"
    And no user account should be created

  Scenario: Google OAuth login failure - API timeout
    Given a user attempting Google OAuth login
    When the Google userinfo API is unreachable
    Then the API should return 401 Unauthorized
    And the error message should contain "Failed to verify Google token"
    And the system should log the timeout error

  # ============================================================================
  # LINKEDIN OAUTH SCENARIOS
  # ============================================================================

  Scenario: Successful LinkedIn OAuth login for new professional user
    Given a professional user "Sarah Johnson"
    And the user has never registered on HireFlux
    When the user initiates LinkedIn OAuth flow
    And LinkedIn returns a valid access token with user info:
      | field          | value                       |
      | email          | sarah.johnson@company.com   |
      | email_verified | true                        |
      | given_name     | Sarah                       |
      | family_name    | Johnson                     |
      | sub            | linkedin-987654321          |
    Then a new user account should be created
    And the provider should be "linkedin"
    And the user should be logged in

  Scenario: LinkedIn OAuth login with missing email permission
    Given a user attempting LinkedIn OAuth login
    When LinkedIn returns user data without email field
    Then the API should return 400 Bad Request
    And the error message should be "Email permission not granted by LinkedIn user"
    And no user account should be created

  Scenario: LinkedIn OAuth login for existing employer
    Given an existing employer user with email "recruiter@company.com"
    When the user initiates LinkedIn OAuth flow
    And LinkedIn confirms the same email address
    Then the existing employer account should be linked
    And company data should be preserved
    And team member associations should remain intact

  # ============================================================================
  # APPLE SIGN IN SCENARIOS
  # ============================================================================

  Scenario: Successful Apple Sign In for new iOS user
    Given an iOS user "Alex Chen"
    And the user has never registered on HireFlux
    When the user initiates Apple Sign In flow
    And Apple returns a valid ID token with claims:
      | claim          | value                |
      | email          | alex.chen@icloud.com |
      | email_verified | true                 |
      | sub            | apple-111222333      |
    And the client provides user metadata:
      | field      | value |
      | first_name | Alex  |
      | last_name  | Chen  |
    Then a new user account should be created
    And the provider should be "apple"
    And the name should be set from client metadata
    And the user should be logged in

  Scenario: Apple Sign In with email relay (privacy)
    Given an iOS user concerned about privacy
    When the user initiates Apple Sign In
    And Apple returns a privaterelay email "xyz123@privaterelay.appleid.com"
    Then the account should be created with the relay email
    And the email should be marked as verified
    And future emails should be sent to the relay address

  Scenario: Apple Sign In failure - Invalid ID token signature
    Given a user attempting Apple Sign In
    When the user provides an ID token with invalid signature
    Then the API should return 401 Unauthorized
    And the error message should contain "Invalid Apple ID token"

  Scenario: Apple Sign In failure - Token expired
    Given a user attempting Apple Sign In
    When the user provides an expired Apple ID token
    Then the API should return 401 Unauthorized
    And the error message should contain "Token has expired"

  # ============================================================================
  # ACCOUNT LINKING SCENARIOS
  # ============================================================================

  Scenario: Link Google account to existing email/password account
    Given a user "Mike Brown" with existing account:
      | field     | value                |
      | email     | mike.brown@gmail.com |
      | provider  | email                |
    When Mike logs in with Google OAuth
    And Google confirms email "mike.brown@gmail.com"
    Then the existing account should be updated with:
      | field              | value        |
      | oauth_provider     | google       |
      | oauth_user_id      | google-id    |
      | email_verified     | true         |
    And both login methods (email/password and Google) should work

  Scenario: Prevent duplicate accounts from different OAuth providers
    Given a user registered via Google with email "user@example.com"
    When the same email tries to register via LinkedIn OAuth
    Then the system should detect the existing account
    And the LinkedIn OAuth should link to the existing account
    And no duplicate account should be created

  Scenario: Handle OAuth provider change (user switches providers)
    Given a user with Google OAuth linked
    When the user adds LinkedIn OAuth to the same account
    Then both OAuth providers should be linked
    And the user can login with either Google or LinkedIn
    And account data should remain consistent

  # ============================================================================
  # SECURITY SCENARIOS
  # ============================================================================

  Scenario: CSRF protection with state parameter
    Given a user initiating OAuth flow
    When the OAuth redirect URL is generated
    Then a unique state parameter should be included
    And the state should be stored in session/cookie
    When the OAuth callback is received
    Then the state parameter must match the stored value
    And requests with mismatched state should be rejected with 403

  Scenario: Secure token storage
    Given a successful OAuth login
    When access tokens are received from providers
    Then tokens should never be logged in plaintext
    And tokens should be encrypted in database
    And tokens should have expiration timestamps

  Scenario: OAuth token refresh for expired tokens
    Given a user with expired OAuth access token
    When the user attempts to access protected resources
    And the system has a valid refresh token
    Then the system should automatically refresh the access token
    And the user session should remain active

  Scenario: Rate limiting on OAuth endpoints
    Given a malicious actor attempting OAuth abuse
    When 10 OAuth requests are made within 1 minute
    Then subsequent requests should be rate limited
    And the API should return 429 Too Many Requests

  # ============================================================================
  # USER EXPERIENCE SCENARIOS
  # ============================================================================

  Scenario: OAuth flow completes within 3 seconds
    Given a user with good internet connection
    When the user completes OAuth login
    Then the total authentication time should be < 3 seconds
    And the user should be redirected to dashboard

  Scenario: OAuth error handling with user-friendly messages
    Given an OAuth flow that encounters an error
    When the provider returns an error code
    Then the user should see a human-readable error message
    And suggestions for resolution should be provided
    And the option to try again should be available

  Scenario: Mobile-optimized OAuth flow
    Given a user on mobile device (iOS or Android)
    When the user initiates OAuth login
    Then the OAuth flow should use native webview
    And the flow should redirect back to app correctly
    And the user experience should be seamless

  # ============================================================================
  # COMPLIANCE SCENARIOS (GDPR/CCPA)
  # ============================================================================

  Scenario: User consent tracking for OAuth data
    Given a user completing OAuth login
    When user data is imported from OAuth provider
    Then the system should record:
      | field                | value                       |
      | consent_timestamp    | current timestamp           |
      | data_source          | google/linkedin/apple       |
      | scopes_granted       | email, profile              |
    And the user should be able to revoke OAuth access

  Scenario: OAuth account deletion and data cleanup
    Given a user with OAuth-linked account
    When the user requests account deletion
    Then all OAuth tokens should be revoked
    And all user data should be deleted within 30 days
    And the OAuth provider should be notified (if supported)

  # ============================================================================
  # ANALYTICS & MONITORING SCENARIOS
  # ============================================================================

  Scenario: Track OAuth provider usage
    Given multiple users registering via different providers
    When analytics are reviewed
    Then the system should track:
      | metric                        | tracked |
      | registrations_per_provider    | yes     |
      | login_success_rate            | yes     |
      | oauth_error_rate              | yes     |
      | average_oauth_completion_time | yes     |

  Scenario: OAuth failure monitoring and alerts
    Given the OAuth system is in production
    When the OAuth error rate exceeds 5%
    Then an alert should be sent to engineering team
    And the error details should be logged
    And automatic rollback should be triggered if error rate > 20%

  # ============================================================================
  # EDGE CASES
  # ============================================================================

  Scenario: OAuth login with changed email on provider
    Given a user previously registered with "old.email@gmail.com"
    And the user changed their Google email to "new.email@gmail.com"
    When the user attempts OAuth login
    Then the system should detect the provider user ID match
    And should prompt user to confirm email change
    And should update email after user confirmation

  Scenario: Simultaneous OAuth logins from multiple devices
    Given a user logging in via Google on desktop
    When the same user logs in via Apple on mobile simultaneously
    Then both sessions should be valid
    And session tokens should be unique
    And each device should maintain separate session

  Scenario: OAuth login during provider outage
    Given Google OAuth API is experiencing downtime
    When a user attempts Google OAuth login
    Then the system should return a friendly error message
    And should suggest alternative login methods
    And should automatically retry up to 3 times
    And should log the outage for monitoring

# ============================================================================
# IMPLEMENTATION NOTES
# ============================================================================

# Backend API Endpoints Required:
# - POST /api/v1/auth/oauth/google
# - POST /api/v1/auth/oauth/linkedin
# - POST /api/v1/auth/oauth/apple
# - POST /api/v1/auth/oauth/link (for linking additional providers)
# - DELETE /api/v1/auth/oauth/{provider}/unlink

# Database Schema Updates:
# - users.oauth_provider (google|linkedin|apple|email)
# - users.oauth_user_id (provider's user ID)
# - oauth_tokens table (for secure token storage)
# - oauth_consents table (for GDPR compliance)

# Environment Variables Required:
# - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
# - LINKEDIN_CLIENT_ID, LINKEDIN_CLIENT_SECRET
# - APPLE_CLIENT_ID, APPLE_CLIENT_SECRET
# - OAUTH_REDIRECT_URI

# Success Criteria:
# - 100% OAuth login success rate (excluding user errors)
# - < 3 second average OAuth flow completion
# - 40%+ increase in signup conversion
# - Zero security vulnerabilities in OAuth implementation
