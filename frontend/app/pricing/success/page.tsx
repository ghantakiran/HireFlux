'use client';

/**
 * Subscription Success Page (Issue #110)
 *
 * Shows after successful upgrade/payment
 * - Welcome message with new plan
 * - List of unlocked features
 * - CTA to get started
 */

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Check, Sparkles } from 'lucide-react';

type PlanTier = 'free' | 'plus' | 'pro' | 'premium';

const PLAN_FEATURES: { [key in PlanTier]: string[] } = {
  free: [
    '3 cover letters per month',
    '10 job suggestions per month',
    'Basic resume builder',
    'Community support',
  ],
  plus: [
    'Unlimited resumes',
    'Unlimited cover letters',
    '100 weekly job suggestions',
    'Priority matching',
    'Email support',
    'ATS optimization',
  ],
  pro: [
    'Everything in Plus',
    '50 auto-apply credits/month',
    'Interview coach access',
    'Priority support',
    'Advanced analytics',
    'Application tracking',
  ],
  premium: [
    'Everything in Pro',
    'Unlimited auto-apply',
    'Unlimited interview coaching',
    'Dedicated success manager',
    'White-glove service',
    'Custom integrations',
  ],
};

const PLAN_NAMES: { [key in PlanTier]: string } = {
  free: 'Free',
  plus: 'Plus',
  pro: 'Pro',
  premium: 'Premium',
};

export default function SubscriptionSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [plan, setPlan] = useState<PlanTier | null>(null);

  useEffect(() => {
    const planParam = searchParams.get('plan') as PlanTier | null;
    if (planParam && ['free', 'plus', 'pro', 'premium'].includes(planParam)) {
      setPlan(planParam);
    } else {
      // No valid plan, redirect to pricing
      router.push('/pricing');
    }
  }, [searchParams, router]);

  if (!plan) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const planName = PLAN_NAMES[plan];
  const features = PLAN_FEATURES[plan];

  return (
    <div data-success-page className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-white rounded-lg shadow-lg p-8">
        {/* Success Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <Check className="w-10 h-10 text-green-600" />
          </div>
        </div>

        {/* Success Message */}
        <div data-success-message className="text-center mb-8">
          <h1 data-success-title className="text-3xl font-bold mb-2">
            Welcome to {planName}!
          </h1>
          <p data-success-subtitle className="text-gray-600">
            Your subscription has been activated successfully
          </p>
        </div>

        {/* Features List */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-blue-600" />
            Your new features
          </h2>
          <div data-new-features-list className="bg-gray-50 rounded-lg p-6">
            <ul className="space-y-3">
              {features.map((feature, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  <span className="text-gray-900">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            data-get-started-button
            onClick={() => router.push('/dashboard')}
            className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold"
          >
            Get Started
          </button>
          <button
            onClick={() => router.push('/dashboard/account')}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-semibold"
          >
            View Subscription
          </button>
        </div>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Need help getting started?{' '}
            <a href="/support" className="text-blue-600 hover:text-blue-700 underline">
              Contact Support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
