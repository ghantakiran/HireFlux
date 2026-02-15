'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Check,
  Crown,
  Loader2,
  CreditCard,
  ExternalLink,
} from 'lucide-react';
import { ErrorBanner } from '@/components/ui/error-banner';
import { PageLoader } from '@/components/ui/page-loader';
import {
  useBillingStore,
  PLANS,
  type SubscriptionPlan,
  type BillingInterval,
} from '@/lib/stores/billing-store';
import { toast } from 'sonner';

export default function SubscriptionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    subscription,
    isLoadingSubscription,
    subscriptionError,
    isCreatingCheckout,
    fetchSubscription,
    createCheckoutSession,
    cancelSubscription,
    createBillingPortalSession,
    clearErrors,
  } = useBillingStore();

  const [billingInterval, setBillingInterval] = useState<BillingInterval>('monthly');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelImmediate, setCancelImmediate] = useState(false);

  // Fetch subscription on mount
  useEffect(() => {
    fetchSubscription();
  }, []);

  // Handle checkout success/cancel
  useEffect(() => {
    const checkoutStatus = searchParams.get('checkout');
    if (checkoutStatus === 'success') {
      toast.success('Subscription activated!', {
        description: 'Your payment was successful. Welcome to HireFlux!',
      });
      fetchSubscription();
      router.replace('/dashboard/settings/subscription');
    } else if (checkoutStatus === 'cancelled') {
      toast.error('Checkout cancelled', {
        description: 'You can try again anytime.',
      });
      router.replace('/dashboard/settings/subscription');
    }
  }, [searchParams]);

  const handleUpgrade = async (plan: 'plus' | 'pro') => {
    try {
      clearErrors();

      const checkoutData = await createCheckoutSession(plan, billingInterval);

      // Redirect to Stripe Checkout
      window.location.href = checkoutData.session_url;
    } catch (error) {
      toast.error('Failed to start checkout', {
        description: 'Please try again or contact support.',
      });
    }
  };

  const handleCancel = async () => {
    try {
      setIsCancelling(true);

      await cancelSubscription(cancelImmediate, cancelReason || undefined);

      toast.success(
        cancelImmediate ? 'Subscription cancelled' : 'Subscription will cancel at period end',
        {
          description: cancelImmediate
            ? 'Your subscription has been cancelled immediately.'
            : 'You can continue using your plan until the end of the billing period.',
        }
      );

      setCancelDialogOpen(false);
      setCancelReason('');
      await fetchSubscription();
    } catch (error) {
      toast.error('Failed to cancel subscription', {
        description: 'Please try again or contact support.',
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleManageBilling = async () => {
    try {
      const portalUrl = await createBillingPortalSession();
      window.location.href = portalUrl;
    } catch (error) {
      toast.error('Failed to open billing portal', {
        description: 'Please try again or contact support.',
      });
    }
  };

  const currentPlan: SubscriptionPlan = subscription?.plan || 'free';
  const isActive = subscription?.status === 'active';
  const isPastDue = subscription?.status === 'past_due';
  const willCancelAtPeriodEnd = subscription?.cancel_at_period_end || false;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusBadge = () => {
    if (!subscription || currentPlan === 'free') {
      return (
        <Badge variant="outline" className="bg-gray-100 text-gray-800">
          Free Plan
        </Badge>
      );
    }

    if (isPastDue) {
      return (
        <Badge variant="outline" className="bg-red-100 text-red-800">
          Payment Failed
        </Badge>
      );
    }

    if (willCancelAtPeriodEnd) {
      return (
        <Badge variant="outline" className="bg-orange-100 text-orange-800">
          Cancelling Soon
        </Badge>
      );
    }

    if (isActive) {
      return (
        <Badge variant="outline" className="bg-green-100 text-green-800">
          Active
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-gray-100 text-gray-800">
        {subscription.status}
      </Badge>
    );
  };

  // Loading state
  if (isLoadingSubscription && !subscription) {
    return (
      <div className="container mx-auto px-4 py-8">
        <PageLoader message="Loading subscription..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Subscription & Billing</h1>
        <p className="text-muted-foreground">
          Manage your subscription plan and billing information
        </p>
      </div>

      {/* Error Banner */}
      <ErrorBanner error={subscriptionError} onDismiss={clearErrors} />

      {/* Current Plan Card */}
      <Card className="mb-8 border-2 border-blue-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Current Plan</CardTitle>
              <CardDescription className="mt-1">
                {currentPlan === 'free' && 'Upgrade to unlock more features'}
                {currentPlan === 'plus' && 'You have access to all Plus features'}
                {currentPlan === 'pro' && 'You have access to all Pro features'}
              </CardDescription>
            </div>
            {getStatusBadge()}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Plan Details */}
            <div>
              <h3 className="font-semibold text-lg mb-4 capitalize flex items-center gap-2">
                {currentPlan === 'pro' && <Crown className="h-5 w-5 text-yellow-500" />}
                {currentPlan} Plan
              </h3>

              <div className="space-y-3 text-sm">
                {currentPlan !== 'free' && subscription && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium capitalize">{subscription.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billing Cycle</span>
                      <span className="font-medium capitalize">
                        {subscription.billing_interval}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Current Period</span>
                      <span className="font-medium">
                        {formatDate(subscription.current_period_start)} -{' '}
                        {formatDate(subscription.current_period_end)}
                      </span>
                    </div>
                    {willCancelAtPeriodEnd && (
                      <div className="flex justify-between text-orange-600">
                        <span>Cancels On</span>
                        <span className="font-medium">
                          {formatDate(subscription.current_period_end)}
                        </span>
                      </div>
                    )}
                  </>
                )}

                {currentPlan === 'free' && (
                  <p className="text-muted-foreground">
                    You're currently on the free plan. Upgrade to unlock unlimited features.
                  </p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col justify-center gap-3">
              {currentPlan !== 'free' && isActive && (
                <>
                  <Button onClick={handleManageBilling} variant="outline" className="w-full">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Manage Payment Methods
                  </Button>

                  {!willCancelAtPeriodEnd && (
                    <Button
                      onClick={() => setCancelDialogOpen(true)}
                      variant="outline"
                      className="w-full text-red-600 hover:text-red-700"
                    >
                      Cancel Subscription
                    </Button>
                  )}

                  {willCancelAtPeriodEnd && (
                    <Button onClick={handleManageBilling} className="w-full">
                      Reactivate Subscription
                    </Button>
                  )}
                </>
              )}

              {isPastDue && (
                <Button onClick={handleManageBilling} className="w-full">
                  Update Payment Method
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Billing Interval Toggle */}
      <div className="mb-6 flex items-center justify-center gap-4">
        <span className={billingInterval === 'monthly' ? 'font-semibold' : 'text-muted-foreground'}>
          Monthly
        </span>
        <Switch
          checked={billingInterval === 'yearly'}
          onCheckedChange={(checked) => setBillingInterval(checked ? 'yearly' : 'monthly')}
        />
        <span className={billingInterval === 'yearly' ? 'font-semibold' : 'text-muted-foreground'}>
          Yearly{' '}
          <Badge variant="secondary" className="ml-2">
            Save 17%
          </Badge>
        </span>
      </div>

      {/* Plans Grid */}
      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.plan;
          const canUpgrade =
            (currentPlan === 'free' && plan.plan !== 'free') ||
            (currentPlan === 'plus' && plan.plan === 'pro');
          const price =
            billingInterval === 'monthly' ? plan.price_monthly : plan.price_yearly;

          return (
            <Card
              key={plan.plan}
              className={`relative ${
                plan.popular ? 'border-2 border-blue-500' : ''
              } ${isCurrent ? 'bg-blue-50' : ''}`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <Badge className="bg-blue-600">Most Popular</Badge>
                </div>
              )}

              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {plan.plan === 'pro' && <Crown className="h-5 w-5 text-yellow-500" />}
                  {plan.name}
                </CardTitle>
                <CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold text-foreground">${price}</span>
                    <span className="text-muted-foreground">
                      /{billingInterval === 'monthly' ? 'mo' : 'yr'}
                    </span>
                  </div>
                  {billingInterval === 'yearly' && plan.plan !== 'free' && (
                    <p className="text-xs mt-1">
                      ${(price / 12).toFixed(2)}/mo billed annually
                    </p>
                  )}
                </CardDescription>
              </CardHeader>

              <CardContent>
                {/* Features List */}
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Action Button */}
                {isCurrent ? (
                  <Button disabled className="w-full">
                    Current Plan
                  </Button>
                ) : canUpgrade ? (
                  <Button
                    onClick={() => handleUpgrade(plan.plan as 'plus' | 'pro')}
                    disabled={isCreatingCheckout}
                    className="w-full"
                  >
                    {isCreatingCheckout ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      `Upgrade to ${plan.name}`
                    )}
                  </Button>
                ) : plan.plan === 'free' ? (
                  <Button variant="outline" disabled className="w-full">
                    Free Forever
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={handleManageBilling}
                    className="w-full"
                  >
                    Contact to Downgrade
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Cancel Subscription Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
            <AlertDialogDescription>
              We're sorry to see you go. Are you sure you want to cancel your subscription?
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="immediate"
                checked={cancelImmediate}
                onCheckedChange={setCancelImmediate}
              />
              <Label htmlFor="immediate" className="text-sm">
                Cancel immediately (otherwise cancels at period end)
              </Label>
            </div>

            <div>
              <Label htmlFor="reason" className="text-sm">
                Reason for cancellation (optional)
              </Label>
              <textarea
                id="reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="mt-2 w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Help us improve by telling us why you're leaving..."
              />
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCancelling}>Keep Subscription</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancel}
              disabled={isCancelling}
              className="bg-red-600 hover:bg-red-700"
            >
              {isCancelling ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Cancelling...
                </>
              ) : (
                'Cancel Subscription'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
