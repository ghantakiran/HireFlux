# Feature: Subscription Plans & Upgrade Flow (Issue #110)
#
# As a job seeker
# I want to view and upgrade to paid subscription plans
# So that I can access premium features like unlimited resumes, auto-apply, and interview coaching

Feature: Subscription Plans & Upgrade Flow

  Background:
    Given I am logged in as a job seeker
    And I am on the Free plan

  # Plan Comparison Page
  Scenario: View subscription plans page
    Given I navigate to the pricing page
    Then I should see the page title "Subscription Plans" or "Choose Your Plan"
    And I should see a plan comparison table
    And I should see at least 4 plan options
    And I should see billing cycle toggle (Monthly/Annual)

  Scenario: View all plan details
    Given I am on the pricing page
    Then I should see the following plans:
      | Plan      | Price (Monthly) | Price (Annual) |
      | Free      | $0/month        | $0/year        |
      | Plus      | $19/month       | $190/year      |
      | Pro       | $49/month       | $490/year      |
      | Premium   | $99/month       | $990/year      |

  Scenario: View plan features comparison
    Given I am on the pricing page
    Then each plan should display:
      | Feature Type          | Present |
      | Feature list          | Yes     |
      | Price                 | Yes     |
      | Billing cycle         | Yes     |
      | CTA button            | Yes     |
      | Current plan badge    | Maybe   |

  Scenario: Compare Free plan features
    Given I am on the pricing page
    When I view the Free plan
    Then I should see the following features:
      | Feature                        |
      | 3 cover letters per month      |
      | 10 job suggestions per month   |
      | Basic resume builder           |
      | Manual job applications        |

  Scenario: Compare Plus plan features
    Given I am on the pricing page
    When I view the Plus plan
    Then I should see the following features:
      | Feature                         |
      | Unlimited resumes               |
      | Unlimited cover letters         |
      | 100 weekly job suggestions      |
      | Priority matching               |
      | Email support                   |

  Scenario: Compare Pro plan features
    Given I am on the pricing page
    When I view the Pro plan
    Then I should see the following features:
      | Feature                         |
      | Everything in Plus              |
      | 50 auto-apply credits/month     |
      | Interview coach access          |
      | Priority support                |
      | Advanced analytics              |

  Scenario: Compare Premium plan features
    Given I am on the pricing page
    When I view the Premium plan
    Then I should see the following features:
      | Feature                         |
      | Everything in Pro               |
      | Unlimited auto-apply            |
      | Unlimited interview coaching    |
      | Dedicated success manager       |
      | White-glove service             |

  # Billing Cycle Toggle
  Scenario: Toggle billing cycle to Annual
    Given I am on the pricing page
    And the billing cycle is set to "Monthly"
    When I click the "Annual" billing cycle toggle
    Then all plan prices should update to annual pricing
    And I should see annual savings badges (e.g., "Save 20%")

  Scenario: Annual billing shows discount
    Given I am on the pricing page
    When I select "Annual" billing
    Then the Plus plan should show "$190/year" with "Save $38"
    And the Pro plan should show "$490/year" with "Save $98"
    And the Premium plan should show "$990/year" with "Save $198"

  Scenario: Toggle billing cycle to Monthly
    Given I am on the pricing page
    And the billing cycle is set to "Annual"
    When I click the "Monthly" billing cycle toggle
    Then all plan prices should update to monthly pricing
    And savings badges should be hidden

  # Current Plan Indication
  Scenario: Highlight current plan
    Given I am on the Free plan
    When I view the pricing page
    Then the Free plan should be marked as "Current Plan"
    And the Free plan button should say "Current Plan" or be disabled
    And other plan buttons should say "Upgrade"

  Scenario: Show upgrade CTAs for higher plans
    Given I am on the Free plan
    When I view the pricing page
    Then the Plus plan button should say "Upgrade to Plus"
    And the Pro plan button should say "Upgrade to Pro"
    And the Premium plan button should say "Upgrade to Premium"

  # Upgrade Flow - From Pricing Page
  Scenario: Click upgrade from pricing page
    Given I am on the Free plan
    And I am on the pricing page
    When I click "Upgrade to Plus" on the Plus plan
    Then I should see a plan preview modal or checkout page
    And the modal should show the Plus plan details
    And I should see the monthly price "$19/month"
    And I should see a "Continue to Checkout" button

  Scenario: View plan change preview
    Given I click "Upgrade to Pro" from the pricing page
    Then I should see a plan change preview
    And the preview should show:
      | Detail                | Present |
      | Current plan (Free)   | Yes     |
      | New plan (Pro)        | Yes     |
      | Price difference      | Yes     |
      | Billing cycle         | Yes     |
      | Features comparison   | Yes     |

  Scenario: Confirm upgrade and proceed to Stripe
    Given I see the plan change preview for Pro plan
    When I click "Continue to Checkout"
    Then I should be redirected to Stripe Checkout
    And the Stripe session should be for the Pro plan
    And the amount should be $49 (monthly) or $490 (annual)

  # Upgrade CTAs Throughout App
  Scenario: See upgrade CTA on limited feature
    Given I am on the Free plan
    And I have used 3 cover letters this month
    When I try to generate a 4th cover letter
    Then I should see an upgrade prompt
    And the prompt should say "Upgrade to Plus for unlimited cover letters"
    And I should see an "Upgrade Now" button

  Scenario: See upgrade CTA on auto-apply feature
    Given I am on the Free plan
    When I try to access auto-apply
    Then I should see a feature lock message
    And the message should say "Auto-apply is available on Pro plan and above"
    And I should see an "View Plans" button

  Scenario: See upgrade CTA on interview coach
    Given I am on the Free plan
    When I try to access the interview coach
    Then I should see a feature lock message
    And the message should say "Interview coaching is available on Pro plan and above"
    And I should see an "Upgrade to Pro" button

  Scenario: Click upgrade CTA from feature lock
    Given I see an upgrade prompt for auto-apply
    When I click "Upgrade to Pro"
    Then I should be taken to the pricing page
    And the Pro plan should be highlighted
    Or I should see the upgrade checkout flow

  Scenario: Upgrade banner in dashboard
    Given I am on the Free plan
    When I am on my dashboard
    Then I should see an upgrade banner or card
    And the banner should highlight key premium features
    And the banner should have a "View Plans" button

  # Stripe Checkout Flow
  Scenario: Initiate Stripe checkout for Plus plan
    Given I click "Upgrade to Plus" and confirm
    When Stripe Checkout loads
    Then I should see the Stripe payment form
    And the form should show:
      | Field               | Required |
      | Email               | Yes      |
      | Card number         | Yes      |
      | Expiry date         | Yes      |
      | CVC                 | Yes      |
      | Cardholder name     | Yes      |
      | Billing address     | Yes      |

  Scenario: Complete Stripe checkout successfully
    Given I am in Stripe Checkout for Plus plan
    When I enter valid payment details
    And I click "Subscribe"
    Then the payment should be processed
    And I should be redirected back to the app
    And I should see a success message "Successfully upgraded to Plus!"
    And my plan should now be "Plus"

  Scenario: Stripe checkout failure handling
    Given I am in Stripe Checkout for Pro plan
    When I enter invalid payment details
    And I click "Subscribe"
    Then I should see an error message from Stripe
    And I should remain on the Stripe Checkout page
    And I should be able to retry with different payment details

  Scenario: Cancel Stripe checkout
    Given I am in Stripe Checkout
    When I click the browser back button or close tab
    Then the checkout should be cancelled
    And I should return to the pricing page
    And my plan should remain "Free"

  # Post-Upgrade Experience
  Scenario: Redirect to success page after upgrade
    Given I successfully completed Stripe checkout for Plus
    When I am redirected back to the app
    Then I should land on a success page
    And the page should say "Welcome to Plus!"
    And I should see my new plan features listed
    And I should see a "Get Started" button

  Scenario: Update plan display after upgrade
    Given I have upgraded to Plus
    When I view my account settings
    Then my current plan should show "Plus"
    And I should see my billing cycle (Monthly or Annual)
    And I should see my next billing date
    And I should see a "Manage Subscription" button

  Scenario: Access premium features after upgrade
    Given I have upgraded to Pro
    When I try to use auto-apply
    Then I should have access without any upgrade prompts
    And my auto-apply credits should be available (50/month)

  Scenario: Remove upgrade CTAs after upgrade
    Given I have upgraded to Plus
    When I navigate through the app
    Then I should not see upgrade CTAs for Plus plan
    But I should see upgrade CTAs for Pro and Premium plans

  # Plan Management
  Scenario: View subscription details
    Given I am on the Plus plan
    When I navigate to "Account Settings" > "Subscription"
    Then I should see:
      | Detail                  | Present |
      | Current plan (Plus)     | Yes     |
      | Billing cycle           | Yes     |
      | Next billing date       | Yes     |
      | Amount                  | Yes     |
      | Payment method          | Yes     |
      | Manage subscription link| Yes     |

  Scenario: Manage subscription via Stripe portal
    Given I am on a paid plan
    When I click "Manage Subscription"
    Then I should be redirected to Stripe Customer Portal
    And I should be able to update payment method
    And I should be able to view invoices
    And I should be able to cancel subscription

  # Plan Upgrade (Change to Higher Plan)
  Scenario: Upgrade from Plus to Pro
    Given I am on the Plus plan
    When I click "Upgrade to Pro" from pricing page
    Then I should see a plan change preview
    And the preview should show prorated pricing
    And I should see "You will be charged $XX today (prorated)"

  Scenario: Immediate upgrade with proration
    Given I am on Plus plan (paid $19 on Jan 1)
    And today is Jan 15 (halfway through billing period)
    When I upgrade to Pro plan
    Then I should be charged a prorated amount
    And the prorated amount should account for unused Plus time
    And I should immediately have Pro plan access

  # Plan Downgrade
  Scenario: Downgrade from Pro to Plus
    Given I am on the Pro plan
    When I try to change to Plus plan
    Then I should see a downgrade warning
    And the warning should list features I will lose
    And I should see "Change will take effect at end of billing period"

  Scenario: Confirm downgrade
    Given I see the downgrade warning
    When I confirm the downgrade
    Then I should see "Your plan will change to Plus on [date]"
    And I should retain Pro features until the billing period ends
    And I should see a "Cancel Downgrade" option

  Scenario: Cancel scheduled downgrade
    Given I have a scheduled downgrade to Plus
    When I click "Cancel Downgrade"
    Then the downgrade should be cancelled
    And I should remain on Pro plan
    And I should see "Downgrade cancelled"

  # Cancellation
  Scenario: Cancel subscription
    Given I am on the Plus plan
    When I go to Stripe Customer Portal
    And I click "Cancel Subscription"
    Then I should see a cancellation confirmation dialog
    And the dialog should warn about losing access
    And I should see "Access continues until [end of billing period]"

  Scenario: Confirm cancellation
    Given I see the cancellation dialog
    When I confirm cancellation
    Then my subscription should be marked for cancellation
    And I should retain Plus features until billing period ends
    And I should see a "Reactivate Subscription" button

  Scenario: Reactivate cancelled subscription
    Given I have cancelled my Plus subscription
    And the billing period has not ended
    When I click "Reactivate Subscription"
    Then my subscription should be reactivated
    And I should see "Subscription reactivated"
    And I should continue being billed normally

  # Annual to Monthly Switch
  Scenario: Switch from Annual to Monthly billing
    Given I am on Plus Annual plan
    When I try to switch to Monthly billing
    Then I should see a warning
    And the warning should say "Switch will take effect at end of current annual term"
    And I should see the effective date

  # Free Trial (Future Enhancement)
  Scenario: Start free trial
    Given I am on the Free plan
    And a free trial is available for Plus plan
    When I click "Start Free Trial"
    Then I should see trial details (e.g., "7 days free, then $19/month")
    And I should be able to start trial without payment
    Or I should enter payment details for trial

  # Billing History
  Scenario: View billing history
    Given I am on a paid plan
    When I navigate to "Account Settings" > "Billing History"
    Then I should see a list of past invoices
    And each invoice should show:
      | Field         | Present |
      | Date          | Yes     |
      | Amount        | Yes     |
      | Plan          | Yes     |
      | Status        | Yes     |
      | Download link | Yes     |

  Scenario: Download invoice
    Given I am viewing billing history
    When I click "Download" on an invoice
    Then a PDF invoice should be downloaded
    And the PDF should contain invoice details

  # Payment Method Management
  Scenario: Update payment method
    Given I am on a paid plan
    When I click "Update Payment Method"
    Then I should be redirected to Stripe Customer Portal
    And I should be able to add a new card
    And I should be able to remove old cards
    And I should be able to set a default payment method

  Scenario: Payment failure handling
    Given my payment method fails (e.g., card expired)
    When the monthly billing occurs
    Then I should receive an email notification
    And I should see a banner in the app "Payment Failed - Update Payment Method"
    And I should have a grace period to update payment
    And my access should not be immediately revoked

  # Plan Limits & Usage
  Scenario: View plan limits and current usage
    Given I am on the Plus plan
    When I navigate to my account settings
    Then I should see my plan limits:
      | Limit                    | Usage   |
      | Cover letters            | ∞       |
      | Job suggestions          | 100/wk  |
      | Auto-apply credits       | N/A     |
    And usage should update in real-time

  Scenario: Approaching plan limit warning
    Given I am on the Free plan
    And I have used 2 out of 3 cover letters
    When I generate my 2nd cover letter
    Then I should see a warning "1 cover letter remaining this month"
    And I should see an "Upgrade" button

  # Mobile Responsiveness
  Scenario: View pricing page on mobile
    Given I am on a mobile device
    When I navigate to the pricing page
    Then the plan comparison should be mobile-optimized
    And I should be able to scroll horizontally through plans
    Or plans should stack vertically
    And all features should be readable
    And buttons should be easy to tap

  Scenario: Complete checkout on mobile
    Given I am on a mobile device
    And I am in Stripe Checkout
    When I enter payment details
    Then the Stripe form should be mobile-responsive
    And I should be able to complete payment
    And I should be redirected back to the app

  # Accessibility
  Scenario: Navigate pricing page with keyboard
    Given I am on the pricing page
    Then I should be able to tab through all plans
    And I should be able to activate billing cycle toggle with keyboard
    And I should be able to click upgrade buttons with Enter key

  Scenario: Screen reader support
    Given I am using a screen reader
    When I navigate the pricing page
    Then all plan details should be announced
    And prices should be readable
    And feature lists should be accessible
    And buttons should have clear labels

  # Error Handling
  Scenario: Handle Stripe API errors
    Given Stripe Checkout fails to load
    When I try to upgrade
    Then I should see an error message
    And the message should say "Unable to load checkout. Please try again."
    And I should see a "Retry" button
    And I should see a "Contact Support" link

  Scenario: Handle network errors during upgrade
    Given I lose internet connection
    When I try to upgrade
    Then I should see a network error message
    And I should be able to retry when connection is restored
    And my plan should not change unless payment succeeds

  # SEO & Marketing
  Scenario: View pricing page as guest
    Given I am not logged in
    When I visit the pricing page
    Then I should see all plans and pricing
    And I should see "Sign Up" buttons instead of "Upgrade"
    And clicking a plan should prompt me to sign up or log in

  Scenario: Compare plans before signing up
    Given I am a guest on the pricing page
    Then I should be able to compare all plan features
    And I should see clear value propositions
    And I should see social proof (testimonials, user count)

  # Grandfathered Plans
  Scenario: User on grandfathered plan
    Given I am on a grandfathered "Legacy Pro" plan
    When I view my subscription details
    Then I should see my custom plan name and price
    And I should see a note "Legacy plan - no longer available"
    And I should be able to keep my plan
    Or I should be prompted to migrate to current plans

  # Enterprise/Custom Plans
  Scenario: Request enterprise plan
    Given I am on the pricing page
    When I click "Enterprise" or "Contact Sales"
    Then I should see a contact form
    And the form should ask for:
      | Field               | Required |
      | Company name        | Yes      |
      | Email               | Yes      |
      | Company size        | Yes      |
      | Use case            | No       |

  # Referral & Discounts
  Scenario: Apply discount code at checkout
    Given I am in the upgrade flow
    When I enter a valid discount code "SAVE20"
    Then I should see the discounted price
    And the discount should be applied to the first billing cycle
    Or the discount should be applied to all billing cycles

  Scenario: Invalid discount code
    Given I am in the upgrade flow
    When I enter an invalid discount code
    Then I should see an error "Invalid discount code"
    And the original price should remain

  # Plan Recommendation
  Scenario: Get plan recommendation
    Given I am on the pricing page
    When I click "Help me choose" or take a plan quiz
    Then I should answer questions about my job search
    And I should receive a recommended plan
    And the recommendation should explain why it fits my needs

  # Confirmation Emails
  Scenario: Receive upgrade confirmation email
    Given I successfully upgrade to Plus
    Then I should receive a confirmation email
    And the email should include:
      | Content                      | Present |
      | Plan name (Plus)             | Yes     |
      | Billing amount               | Yes     |
      | Next billing date            | Yes     |
      | Features list                | Yes     |
      | Manage subscription link     | Yes     |

  Scenario: Receive downgrade confirmation email
    Given I downgrade from Pro to Plus
    Then I should receive a downgrade confirmation email
    And the email should show the effective date
    And the email should list features I will lose

  Scenario: Receive cancellation confirmation email
    Given I cancel my subscription
    Then I should receive a cancellation confirmation email
    And the email should show access end date
    And the email should offer to reactivate
