# Stripe Test Environment Setup Guide

This guide walks you through setting up Stripe for testing HireFlux's subscription and billing features.

## 1. Create a Stripe Account

1. Go to [https://stripe.com/](https://stripe.com/)
2. Click "Start now" and create an account
3. Confirm your email address
4. **Enable Test Mode** (toggle in the top-right corner)

## 2. Get API Keys

### Access API Keys
1. Navigate to **Developers** → **API keys** in the Stripe Dashboard
2. You'll see two sets of keys:
   - **Publishable key** (starts with `pk_test_`)
   - **Secret key** (starts with `sk_test_`)

### Add to Environment Variables
Edit your `.env` file in `backend/`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_PUBLISHABLE_KEY=pk_test_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

⚠️ **Never commit these keys to version control!**

## 3. Create Products and Prices

### Create Products via Dashboard
1. Go to **Products** → **Add product**

#### Plus Plan
- **Name**: HireFlux Plus
- **Description**: Unlimited resumes and cover letters, 100 weekly job suggestions
- **Pricing**:
  - Model: Recurring
  - Price: $19.00 USD
  - Billing period: Monthly
- Click "Save product"
- Copy the **Price ID** (starts with `price_`)

#### Pro Plan
- **Name**: HireFlux Pro
- **Description**: Plus plan + 50 auto-apply credits per month
- **Pricing**:
  - Model: Recurring
  - Price: $49.00 USD
  - Billing period: Monthly
- Click "Save product"
- Copy the **Price ID** (starts with `price_`)

### Add Price IDs to Environment
```bash
STRIPE_PLUS_PRICE_ID=price_XXXXXXXXXXXXXXXXXXXX
STRIPE_PRO_PRICE_ID=price_XXXXXXXXXXXXXXXXXXXX
```

## 4. Set Up Webhooks (Local Development)

### Install Stripe CLI
```bash
# macOS
brew install stripe/stripe-cli/stripe

# Or download from https://stripe.com/docs/stripe-cli
```

### Login to Stripe CLI
```bash
stripe login
```

### Forward Webhooks to Local Server
```bash
stripe listen --forward-to localhost:8000/api/v1/billing/webhook
```

This command will output a **webhook signing secret** (starts with `whsec_`). Add it to your `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### Test Webhook
In a separate terminal, trigger a test event:
```bash
stripe trigger checkout.session.completed
```

## 5. Configure Webhook Endpoints (Production)

When deploying to production:

1. Go to **Developers** → **Webhooks** → **Add endpoint**
2. **Endpoint URL**: `https://api.yourdomain.com/api/v1/billing/webhook`
3. **Events to listen to**:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
4. Copy the **Signing secret** and add to production environment variables

## 6. Test the Integration

### Test Cards
Stripe provides test cards for different scenarios:

| Card Number | Description |
|-------------|-------------|
| `4242 4242 4242 4242` | Successful payment |
| `4000 0000 0000 0002` | Card declined |
| `4000 0000 0000 9995` | Insufficient funds |
| `4000 0025 0000 3155` | Requires authentication (3D Secure) |

**Expiration**: Any future date
**CVC**: Any 3 digits
**ZIP**: Any 5 digits

### Test Subscription Flow

#### 1. Start the Backend
```bash
cd backend
source venv/bin/activate  # or venv\Scripts\activate on Windows
uvicorn app.main:app --reload
```

#### 2. Start Stripe CLI Webhook Forwarding
```bash
stripe listen --forward-to localhost:8000/api/v1/billing/webhook
```

#### 3. Test API Endpoints

##### Create Checkout Session (Plus Plan)
```bash
curl -X POST http://localhost:8000/api/v1/billing/subscribe \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "plan": "plus",
    "billing_interval": "monthly",
    "success_url": "http://localhost:3000/dashboard?subscription=success",
    "cancel_url": "http://localhost:3000/pricing?subscription=cancelled"
  }'
```

Response:
```json
{
  "session_id": "cs_test_...",
  "session_url": "https://checkout.stripe.com/c/pay/cs_test_...",
  "public_key": "pk_test_..."
}
```

##### Navigate to Checkout
Open the `session_url` in a browser and complete the checkout with a test card.

##### Verify Subscription
```bash
curl http://localhost:8000/api/v1/billing/subscription \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

##### Cancel Subscription
```bash
curl -X POST http://localhost:8000/api/v1/billing/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"immediate": false}'
```

## 7. Monitor Test Payments

### Stripe Dashboard
- **Payments** → View all test transactions
- **Subscriptions** → View active/cancelled subscriptions
- **Customers** → View customer records
- **Logs** → View webhook delivery logs

### Check Webhook Events
```bash
stripe events list --limit 10
```

### Retry Failed Webhook
```bash
stripe events resend evt_XXXXXXXXXXXXXXXXXXXX
```

## 8. Database Verification

Check that subscription data is correctly stored:

```sql
-- Check subscriptions
SELECT * FROM subscriptions WHERE user_id = 'your-user-id';

-- Check credit wallets
SELECT * FROM credit_wallets WHERE user_id = 'your-user-id';

-- Check credit ledger (transaction history)
SELECT * FROM credit_ledgers WHERE user_id = 'your-user-id' ORDER BY created_at DESC LIMIT 10;

-- Check webhook events
SELECT * FROM stripe_webhook_events ORDER BY created_at DESC LIMIT 10;
```

## 9. Testing Checklist

- [ ] Create checkout session for Plus plan
- [ ] Complete payment with test card `4242 4242 4242 4242`
- [ ] Verify subscription status in database
- [ ] Verify credit allocation in `credit_wallets`
- [ ] Cancel subscription (at period end)
- [ ] Verify `cancel_at_period_end` is set to `true`
- [ ] Test immediate cancellation
- [ ] Verify plan reverts to "free"
- [ ] Test failed payment with card `4000 0000 0000 0002`
- [ ] Verify subscription status changes to "past_due"
- [ ] Test webhook idempotency (replay same event twice)
- [ ] Verify second webhook is marked as "already_processed"

## 10. Common Issues & Solutions

### Issue: Webhook Secret Not Working
**Solution**: Ensure `STRIPE_WEBHOOK_SECRET` matches the output from `stripe listen` command.

### Issue: "No such price: price_xxx"
**Solution**: Verify `STRIPE_PLUS_PRICE_ID` and `STRIPE_PRO_PRICE_ID` are correct. Check Products → Pricing in Stripe Dashboard.

### Issue: Webhook Not Received
**Solution**:
1. Ensure `stripe listen` is running
2. Check webhook endpoint is accessible: `curl http://localhost:8000/api/v1/billing/webhook`
3. Check Stripe CLI logs for errors

### Issue: Subscription Not Activating
**Solution**:
1. Check webhook logs: `stripe events list`
2. Verify `checkout.session.completed` event was sent
3. Check `stripe_webhook_events` table for processing errors

## 11. Moving to Production

Before going live:

1. **Switch to Live Mode** in Stripe Dashboard
2. **Update API Keys** to live keys (start with `pk_live_` and `sk_live_`)
3. **Configure Production Webhook Endpoint**
4. **Add Production Webhook Secret** to environment variables
5. **Test with Real Card** (use a prepaid card with small amount)
6. **Enable Radar** (Stripe's fraud prevention) - recommended
7. **Set up email notifications** for failed payments
8. **Configure Stripe Tax** (if applicable)

## 12. Additional Resources

- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [Stripe Webhooks Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Stripe API Reference](https://stripe.com/docs/api)
- [Stripe CLI Documentation](https://stripe.com/docs/stripe-cli)

## 13. Security Best Practices

✅ **Do:**
- Store API keys in environment variables
- Use webhook signatures to verify events
- Implement idempotency for webhook processing
- Log all subscription changes
- Use HTTPS in production
- Rotate webhook secrets periodically

❌ **Don't:**
- Hardcode API keys in code
- Skip webhook signature verification
- Process webhooks without idempotency checks
- Expose secret keys in frontend code
- Use test keys in production

---

**Setup Complete!** You can now test subscription flows locally. For production deployment, follow section 11.
