Feature: Stripe Billing and Credit System
  As a user
  I want to manage my subscription and AI credits
  So that I can use HireFlux features according to my plan

  Background:
    Given the user is authenticated
    And Stripe is properly configured

  Scenario: Free tier user has limited credits
    Given the user has a "Free" plan
    When the user checks their credit balance
    Then the user should have 3 cover letter credits
    And the user should have 10 job suggestion credits per month
    And resume generation should be unlimited

  Scenario: User subscribes to Plus plan
    Given the user has a "Free" plan
    When the user subscribes to "Plus" plan at $19/month
    Then a Stripe checkout session should be created
    And the user should be redirected to Stripe payment page
    And upon successful payment the plan should be upgraded
    And the user should have unlimited resume/letter credits
    And the user should have 100 job suggestions per week

  Scenario: User subscribes to Pro plan
    Given the user has a "Free" plan
    When the user subscribes to "Pro" plan at $49/month
    Then a Stripe checkout session should be created
    And upon successful payment the plan should be upgraded
    And the user should have all Plus benefits
    And the user should have 50 auto-apply credits per month

  Scenario: Successful subscription payment webhook
    Given the user has initiated a Plus subscription
    When Stripe sends a "checkout.session.completed" webhook
    Then the system should verify the webhook signature
    And the subscription should be created in database
    And the user plan should be updated to Plus
    And credits should be allocated according to plan
    And the user should receive confirmation email

  Scenario: Subscription renewal payment
    Given the user has an active Plus subscription
    When Stripe sends a "invoice.payment_succeeded" webhook for renewal
    Then the subscription should remain active
    And monthly credits should be reset
    And the user should receive receipt email

  Scenario: Failed subscription payment
    Given the user has an active Plus subscription
    When Stripe sends a "invoice.payment_failed" webhook
    Then the subscription status should be updated to "past_due"
    And the user should receive payment failure notification
    And the user should have grace period of 7 days
    And features should remain active during grace period

  Scenario: Subscription cancellation
    Given the user has an active Plus subscription
    When the user cancels their subscription
    Then the cancellation should be processed via Stripe
    And the subscription should be marked for cancellation
    And features should remain active until period end
    And the user should receive cancellation confirmation

  Scenario: Immediate subscription cancellation
    Given the user has an active subscription
    When the subscription period ends after cancellation
    And Stripe sends "customer.subscription.deleted" webhook
    Then the user plan should revert to Free
    And remaining credits should be cleared
    And access to premium features should be revoked

  Scenario: Deduct credits for AI resume generation
    Given the user has 100 AI credits
    When the user generates an AI-optimized resume
    And the operation costs 15 credits
    Then 15 credits should be deducted from wallet
    And the transaction should be logged in ledger
    And the user should have 85 credits remaining

  Scenario: Deduct credits for cover letter generation
    Given the user has 50 cover letter credits
    When the user generates 3 cover letter variations
    And each variation costs 5 credits
    Then 15 credits should be deducted total
    And the user should have 35 credits remaining

  Scenario: Insufficient credits for operation
    Given the user has 5 AI credits
    When the user attempts an operation requiring 10 credits
    Then the operation should be blocked
    And the user should see "Insufficient credits" error
    And the user should be prompted to upgrade or purchase credits

  Scenario: Purchase additional credits (one-time)
    Given the user has a Plus plan
    When the user purchases 100 additional AI credits for $10
    Then a Stripe payment session should be created
    And upon successful payment credits should be added
    And the purchase should be logged
    And credits should not expire

  Scenario: Credit refund for failed auto-apply
    Given the user used 10 credits for auto-apply
    And the job application failed due to invalid JD
    When the refund is processed
    Then 10 credits should be returned to wallet
    And the refund should be logged in ledger
    And the user should be notified

  Scenario: Credit refund for below-threshold match
    Given the user used credits for auto-apply
    And the job match score was below 40%
    When the refund policy is applied
    Then credits should be refunded
    And the reason should be "Low match score"

  Scenario: Monthly credit reset for Plus plan
    Given the user has a Plus subscription
    And it's the billing cycle renewal date
    When the monthly reset job runs
    Then job suggestion credits should reset to 100/week
    And auto-apply credits should remain unused balance
    And the reset should be logged

  Scenario: Track credit usage history
    Given the user has made multiple AI operations
    When the user views credit history
    Then all transactions should be listed chronologically
    And each entry should show:
      | field       |
      | operation   |
      | credits     |
      | timestamp   |
      | description |
    And running balance should be displayed

  Scenario: Subscription upgrade from Plus to Pro
    Given the user has an active Plus subscription
    When the user upgrades to Pro plan
    Then the proration should be calculated
    And the user should pay the prorated difference
    And the plan should upgrade immediately
    And Pro credits should be allocated

  Scenario: Subscription downgrade from Pro to Plus
    Given the user has an active Pro subscription
    When the user downgrades to Plus plan
    Then the downgrade should be scheduled for period end
    And the user should keep Pro features until then
    And Plus plan should activate on next billing date
    And the user should receive confirmation

  Scenario: Handle webhook signature verification failure
    Given a webhook is received from external source
    When the Stripe signature verification fails
    Then the webhook should be rejected with 401
    And the event should not be processed
    And the security incident should be logged

  Scenario: Handle duplicate webhook events
    Given a webhook event has already been processed
    When the same event is received again (idempotency)
    Then the event should be detected as duplicate
    And no duplicate charges or credit allocations should occur
    And success response should be returned

  Scenario: Annual billing discount
    Given the user selects annual billing
    When the user subscribes to Plus annual at $190/year
    Then 2 months should be discounted (vs $228)
    And the user should pay upfront
    And credits should be allocated monthly
    And billing date should be 12 months from now

  Scenario: Free trial for new users
    Given a new user signs up
    When the user starts a 14-day Pro trial
    Then no payment should be required
    And Pro features should be activated
    And trial end date should be set to 14 days
    And the user should receive trial confirmation

  Scenario: Convert trial to paid subscription
    Given the user is on day 10 of Pro trial
    When the user subscribes to Pro before trial ends
    Then the trial should be converted to paid
    And billing should start from trial end date
    And trial credits should carry over

  Scenario: Trial expiration without conversion
    Given the user's 14-day trial has ended
    When the trial expiration job runs
    Then the user plan should revert to Free
    And Pro features should be deactivated
    And the user should receive trial ended email
    And the user should be prompted to subscribe

  Scenario: Prevent credit fraud
    Given the user has unusual credit activity
    When 100+ operations occur within 1 hour
    Then the account should be flagged for review
    And operations should be rate limited
    And admin should be notified
    And the user should receive security notice

  Scenario: Export billing invoices
    Given the user has an active subscription
    When the user requests billing history
    Then all Stripe invoices should be retrieved
    And invoices should be downloadable as PDF
    And invoice data should include:
      | field        |
      | invoice_id   |
      | amount       |
      | date         |
      | status       |
      | download_url |

  Scenario: Update payment method
    Given the user has an active subscription
    When the user updates their payment method
    Then a Stripe setup intent should be created
    And the new payment method should be attached
    And the subscription should use new method for future charges
    And old payment method should be kept as backup

  Scenario: Retry failed payment
    Given the user's payment failed
    And Stripe is configured for smart retries
    When the retry schedule runs (Day 3, 5, 7)
    Then payment should be reattempted automatically
    And the user should be notified before each retry
    And if all retries fail subscription should be cancelled

  Scenario: Apply promotional discount code
    Given the user is subscribing to Plus plan
    When the user enters promo code "EARLYBIRD50"
    Then the code should be validated with Stripe
    And 50% discount should be applied to first month
    And subsequent months should be full price
    And the discount should be shown in checkout

  Scenario: Gift subscription for another user
    Given the user wants to gift Pro plan
    When the user purchases 6-month Pro gift
    Then a gift code should be generated
    And the code should be emailed to recipient
    And recipient can redeem code for 6-month Pro
    And billing should not auto-renew after gift period

  Scenario: Refund subscription within 30 days
    Given the user subscribed less than 30 days ago
    When the user requests a refund
    Then admin should review refund request
    And upon approval Stripe refund should be processed
    And subscription should be cancelled
    And credits should be revoked
    And the user should receive refund confirmation

  Scenario: Credit wallet balance notification
    Given the user has 5 credits remaining
    When credits fall below 10
    Then the user should receive low balance notification
    And the user should be prompted to purchase more
    And notification should include pricing options

  Scenario: Integrate with accounting system
    Given billing transactions occur
    When the daily accounting job runs
    Then all transactions should be exported
    And revenue should be categorized by plan
    And data should be formatted for QuickBooks/Xero
    And finance team should receive daily report
