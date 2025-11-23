Feature: Email Service Integration - Issue #52
  As a HireFlux platform
  I want to send professional transactional emails
  So that users stay informed and engaged

  Background:
    Given Resend API is configured
    And email templates are available
    And email delivery tracking is enabled

  # =========================================================================
  # Job Seeker Emails
  # =========================================================================

  Scenario: Send welcome email to new job seeker
    Given a new user registers as a job seeker
    When the registration is confirmed
    Then a welcome email should be sent
    And the email should include onboarding checklist
    And the email should have "Welcome to HireFlux" subject
    And delivery should be tracked

  Scenario: Send email verification
    Given a user has registered but not verified email
    When email verification is triggered
    Then a verification email should be sent
    And the email should contain a verification link
    And the link should expire in 24 hours
    And delivery should be tracked

  Scenario: Send password reset email
    Given a user requests password reset
    When the reset request is submitted
    Then a password reset email should be sent
    And the email should contain a reset link
    And the link should expire in 1 hour
    And delivery should be tracked

  Scenario: Send high-fit job match notification
    Given a job seeker has profile setup
    And a new job matches with >80% fit score
    When the job is published
    Then a job match email should be sent
    And the email should show fit score
    And the email should highlight why it matches
    And the email should have apply button
    And delivery should be tracked

  Scenario: Send application status update
    Given a job seeker has submitted an application
    When employer changes status to "Interview"
    Then a status update email should be sent
    And the email should show new status
    And the email should include next steps
    And delivery should be tracked

  Scenario: Send interview invitation
    Given a job seeker's application is at phone screen stage
    When employer schedules an interview
    Then an interview invitation email should be sent
    And the email should include interview details
    And the email should have calendar invite option
    And delivery should be tracked

  Scenario: Send weekly job digest
    Given a job seeker has opted in to weekly digest
    And it is Monday 9 AM
    When weekly digest job runs
    Then a digest email should be sent
    And the email should show top 5 job matches
    And the email should show application statistics
    And the email should have personalized recommendations
    And delivery should be tracked

  # =========================================================================
  # Employer Emails
  # =========================================================================

  Scenario: Send company registration confirmation
    Given a new company registers on the platform
    When the registration is approved
    Then a confirmation email should be sent
    And the email should include getting started guide
    And the email should have dashboard link
    And delivery should be tracked

  Scenario: Send new application notification to employer
    Given an employer has an active job posting
    When a candidate applies to the job
    Then an application notification email should be sent
    And the email should show candidate summary
    And the email should show fit score
    And the email should have review button
    And delivery should be tracked

  Scenario: Send team member invitation
    Given an employer wants to invite a team member
    When the invitation is sent
    Then an invitation email should be sent
    And the email should have accept invitation link
    And the link should expire in 7 days
    And delivery should be tracked

  Scenario: Send interview reminder to employer
    Given an interview is scheduled
    And it is 1 hour before the interview
    When reminder job runs
    Then a reminder email should be sent to interviewer
    And the email should show candidate details
    And the email should show interview time
    And delivery should be tracked

  Scenario: Send subscription status change notification
    Given an employer has an active subscription
    When the subscription is upgraded to Professional
    Then a notification email should be sent
    And the email should confirm new plan details
    And the email should show new limits
    And delivery should be tracked

  Scenario: Send weekly metrics summary to employer
    Given an employer has active job postings
    And it is Sunday 6 PM
    When weekly metrics job runs
    Then a metrics summary email should be sent
    And the email should show application counts
    And the email should show top performing jobs
    And the email should show conversion metrics
    And delivery should be tracked

  # =========================================================================
  # Transactional Emails
  # =========================================================================

  Scenario: Send payment receipt
    Given a user makes a payment for subscription
    When payment is confirmed
    Then a receipt email should be sent
    And the email should include invoice details
    And the email should have PDF attachment
    And delivery should be tracked

  Scenario: Send subscription renewal notice
    Given a user has an active subscription
    And subscription expires in 7 days
    When renewal reminder job runs
    Then a renewal notice email should be sent
    And the email should show renewal date
    And the email should show amount to be charged
    And delivery should be tracked

  Scenario: Send usage limit warning
    Given a user is on Plus plan
    And they have used 90% of monthly credits
    When credit usage is checked
    Then a usage warning email should be sent
    And the email should show remaining credits
    And the email should suggest upgrade
    And delivery should be tracked

  Scenario: Send system notification
    Given platform maintenance is scheduled
    When notification is triggered
    Then a system notification email should be sent
    And the email should show maintenance window
    And the email should show impact
    And delivery should be tracked

  # =========================================================================
  # Email Delivery & Webhooks
  # =========================================================================

  Scenario: Handle successful email delivery
    Given an email was sent via Resend
    When Resend webhook sends "delivered" event
    Then delivery status should be updated to "delivered"
    And delivery timestamp should be recorded
    And analytics should be updated

  Scenario: Handle email bounce (hard)
    Given an email was sent to invalid address
    When Resend webhook sends "bounced" event with permanent error
    Then delivery status should be updated to "bounced"
    And the email address should be marked as invalid
    And user should be notified via in-app notification
    And future emails to this address should be blocked

  Scenario: Handle email bounce (soft)
    Given an email was sent to valid address
    When Resend webhook sends "bounced" event with temporary error
    Then delivery status should be updated to "soft_bounced"
    And retry should be scheduled for 1 hour later
    And retry count should be incremented

  Scenario: Handle spam complaint
    Given an email was sent successfully
    When Resend webhook sends "complained" event
    Then delivery status should be updated to "complained"
    And the email address should be unsubscribed
    And analytics should track complaint rate
    And alert should be sent if complaint rate > 0.1%

  Scenario: Handle email open tracking
    Given an email was delivered
    When recipient opens the email
    Then Resend webhook sends "opened" event
    And open timestamp should be recorded
    And open count should be incremented
    And analytics should calculate open rate

  Scenario: Handle email click tracking
    Given an email was delivered with tracked links
    When recipient clicks a link
    Then Resend webhook sends "clicked" event
    And click timestamp should be recorded
    And clicked URL should be recorded
    And analytics should calculate click-through rate

  # =========================================================================
  # Email Preferences & Unsubscribe
  # =========================================================================

  Scenario: User updates email preferences
    Given a user is logged in
    When they visit email preferences page
    And they disable "weekly digest" emails
    And they click "Save Preferences"
    Then preferences should be saved
    And weekly digest emails should stop
    And confirmation message should be shown

  Scenario: User unsubscribes via email link
    Given a user receives a marketing email
    When they click "Unsubscribe" link in email
    Then they should land on unsubscribe confirmation page
    And one-click unsubscribe should work without login
    And unsubscribe should be confirmed
    And future marketing emails should not be sent
    And transactional emails should still be sent

  Scenario: User re-subscribes to emails
    Given a user previously unsubscribed
    When they visit email preferences page
    And they enable "job match notifications"
    And they click "Save Preferences"
    Then preferences should be updated
    And job match emails should resume
    And confirmation message should be shown

  # =========================================================================
  # Email Analytics
  # =========================================================================

  Scenario: Track email delivery rate
    Given 100 emails were sent in the past 24 hours
    And 99 were delivered successfully
    And 1 bounced
    When delivery rate is calculated
    Then delivery rate should be 99%
    And it should meet 99% SLA threshold

  Scenario: Track email open rate
    Given 100 emails were delivered
    And 35 were opened
    When open rate is calculated
    Then open rate should be 35%
    And it should meet 35% target for transactional emails

  Scenario: Track email click-through rate
    Given 100 emails were delivered
    And 35 were opened
    And 14 had links clicked
    When click-through rate is calculated
    Then click-through rate should be 14%
    And it should be above 10% baseline

  Scenario: Track unsubscribe rate
    Given 1000 marketing emails were sent this month
    And 8 users unsubscribed
    When unsubscribe rate is calculated
    Then unsubscribe rate should be 0.8%
    And it should be below 1% threshold

  # =========================================================================
  # Email Template System
  # =========================================================================

  Scenario: Render email template with variables
    Given a "welcome" email template exists
    And template has variables: user_name, verification_link
    When template is rendered with user data
    Then email HTML should contain user name
    And email HTML should contain verification link
    And email should be valid HTML
    And email should be mobile responsive

  Scenario: Fallback to plain text email
    Given a user's email client does not support HTML
    When an email is sent
    Then plain text version should be included
    And plain text should have same information as HTML
    And plain text should be readable without formatting

  Scenario: Use custom template for company
    Given a company has uploaded custom email templates
    When an application status email is sent
    Then custom company template should be used
    And company branding should be included
    And fallback to default template if custom not found

  # =========================================================================
  # Compliance
  # =========================================================================

  Scenario: GDPR compliance - explicit consent
    Given a new user registers
    When they submit the registration form
    Then they must explicitly opt-in to marketing emails
    And transactional emails should be enabled by default
    And consent should be recorded with timestamp

  Scenario: CAN-SPAM compliance - unsubscribe link
    Given any marketing email is sent
    When the email is rendered
    Then it must include unsubscribe link
    And unsubscribe should work within 10 business days
    And physical mailing address should be included

  Scenario: GDPR compliance - data deletion
    Given a user requests account deletion
    When deletion is processed
    Then all email preferences should be deleted
    And email addresses should be removed from Resend
    And email send history should be anonymized

  # =========================================================================
  # Error Handling & Retries
  # =========================================================================

  Scenario: Retry failed email send
    Given an email send fails with temporary error
    When first send attempt fails
    Then a retry should be scheduled for 5 minutes later
    And retry count should be tracked
    And max 3 retries should be attempted

  Scenario: Handle rate limiting
    Given Resend API rate limit is 10 emails/second
    When 50 emails are sent at once
    Then emails should be sent in batches
    And rate limit should be respected
    And all emails should be sent eventually

  Scenario: Handle API errors gracefully
    Given Resend API is temporarily unavailable
    When an email send is attempted
    Then error should be logged
    And user should see friendly error message
    And admin alert should be triggered
    And email should be queued for retry
