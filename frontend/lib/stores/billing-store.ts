import { create } from 'zustand';
import { billingApi } from '@/lib/api';

// Types
export type SubscriptionPlan = 'free' | 'plus' | 'pro';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
export type BillingInterval = 'monthly' | 'yearly';

export interface Subscription {
  id: string;
  user_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billing_interval: BillingInterval;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  trial_end: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreditWallet {
  user_id: string;
  ai_credits: number;
  cover_letter_credits: number;
  auto_apply_credits: number;
  job_suggestion_credits: number;
  total_earned: number;
  total_spent: number;
  last_reset: string | null;
}

export interface CreditTransaction {
  id: string;
  user_id: string;
  credit_type: 'ai' | 'cover_letter' | 'auto_apply' | 'job_suggestion';
  amount: number;
  operation: 'add' | 'subtract';
  reason: string;
  metadata: Record<string, any> | null;
  created_at: string;
}

export interface CheckoutSessionResponse {
  session_id: string;
  session_url: string;
  public_key: string;
}

export interface PlanInfo {
  name: string;
  plan: SubscriptionPlan;
  price_monthly: number;
  price_yearly: number;
  features: string[];
  limits: {
    resumes: number | 'unlimited';
    cover_letters: number | 'unlimited';
    job_suggestions: number;
    auto_apply: number;
  };
  popular?: boolean;
}

interface BillingState {
  // Subscription state
  subscription: Subscription | null;
  isLoadingSubscription: boolean;
  subscriptionError: string | null;

  // Credits state
  credits: CreditWallet | null;
  creditHistory: CreditTransaction[];
  isLoadingCredits: boolean;
  creditsError: string | null;

  // Checkout state
  isCreatingCheckout: boolean;
  checkoutError: string | null;

  // Actions - Subscription
  fetchSubscription: () => Promise<void>;
  createCheckoutSession: (
    plan: 'plus' | 'pro',
    billingInterval: BillingInterval,
    promoCode?: string
  ) => Promise<CheckoutSessionResponse>;
  cancelSubscription: (immediate: boolean, reason?: string) => Promise<void>;
  createBillingPortalSession: () => Promise<string>;

  // Actions - Credits
  fetchCredits: () => Promise<void>;
  fetchCreditHistory: (creditType?: string, limit?: number) => Promise<void>;
  purchaseCredits: (amount: number) => Promise<CheckoutSessionResponse>;
  checkCredits: (creditType: string, amount: number) => Promise<boolean>;

  // Actions - Utilities
  clearErrors: () => void;
  clearSubscription: () => void;
  clearCredits: () => void;
}

// Plan configurations
export const PLANS: PlanInfo[] = [
  {
    name: 'Free',
    plan: 'free',
    price_monthly: 0,
    price_yearly: 0,
    features: [
      '3 AI cover letters per month',
      '10 job suggestions per month',
      'Basic resume builder',
      'Application tracking',
      'Email support',
    ],
    limits: {
      resumes: 'unlimited',
      cover_letters: 3,
      job_suggestions: 10,
      auto_apply: 0,
    },
  },
  {
    name: 'Plus',
    plan: 'plus',
    price_monthly: 19,
    price_yearly: 190, // ~$15.83/month
    features: [
      'Unlimited AI cover letters',
      'Unlimited resumes',
      '100 weekly job suggestions',
      'Advanced ATS optimization',
      'Priority email support',
      'Interview preparation tips',
    ],
    limits: {
      resumes: 'unlimited',
      cover_letters: 'unlimited',
      job_suggestions: 100,
      auto_apply: 0,
    },
    popular: true,
  },
  {
    name: 'Pro',
    plan: 'pro',
    price_monthly: 49,
    price_yearly: 490, // ~$40.83/month
    features: [
      'Everything in Plus',
      '50 auto-apply credits per month',
      'AI-powered interview coach',
      'Unlimited job suggestions',
      'Salary negotiation guide',
      'Priority support (24/7)',
      'Resume review by experts',
    ],
    limits: {
      resumes: 'unlimited',
      cover_letters: 'unlimited',
      job_suggestions: 'unlimited' as any,
      auto_apply: 50,
    },
  },
];

// Helper function to get auth token
const getAuthToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('access_token');
};

export const useBillingStore = create<BillingState>((set, get) => ({
  // Initial state
  subscription: null,
  isLoadingSubscription: false,
  subscriptionError: null,

  credits: null,
  creditHistory: [],
  isLoadingCredits: false,
  creditsError: null,

  isCreatingCheckout: false,
  checkoutError: null,

  // Fetch current subscription
  fetchSubscription: async () => {
    try {
      set({ isLoadingSubscription: true, subscriptionError: null });

      const response = await billingApi.getCurrentSubscription();
      const subscription = response.data.data;

      set({
        subscription,
        isLoadingSubscription: false,
      });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error?.message || 'Failed to fetch subscription';
      set({
        subscriptionError: errorMessage,
        isLoadingSubscription: false,
      });
      throw error;
    }
  },

  // Create Stripe checkout session
  createCheckoutSession: async (
    plan: 'plus' | 'pro',
    billingInterval: BillingInterval,
    promoCode?: string
  ) => {
    try {
      set({ isCreatingCheckout: true, checkoutError: null });

      const frontendUrl = window.location.origin;
      const response = await billingApi.createCheckoutSession({
        plan,
        billing_interval: billingInterval,
        success_url: `${frontendUrl}/dashboard/settings/subscription?checkout=success`,
        cancel_url: `${frontendUrl}/dashboard/settings/subscription?checkout=cancelled`,
        promo_code: promoCode,
      });

      const checkoutData = response.data.data;

      set({ isCreatingCheckout: false });

      return checkoutData;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error?.message || 'Failed to create checkout session';
      set({
        checkoutError: errorMessage,
        isCreatingCheckout: false,
      });
      throw error;
    }
  },

  // Cancel subscription
  cancelSubscription: async (immediate: boolean, reason?: string) => {
    try {
      set({ isLoadingSubscription: true, subscriptionError: null });

      await billingApi.cancelSubscription({
        immediate,
        reason,
      });

      // Refresh subscription data
      await get().fetchSubscription();

      set({ isLoadingSubscription: false });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error?.message || 'Failed to cancel subscription';
      set({
        subscriptionError: errorMessage,
        isLoadingSubscription: false,
      });
      throw error;
    }
  },

  // Create billing portal session
  createBillingPortalSession: async () => {
    try {
      const frontendUrl = window.location.origin;
      const response = await billingApi.createBillingPortalSession({
        return_url: `${frontendUrl}/dashboard/settings/subscription`,
      });

      return response.data.data.url;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error?.message || 'Failed to create billing portal session';
      set({ subscriptionError: errorMessage });
      throw error;
    }
  },

  // Fetch credits
  fetchCredits: async () => {
    try {
      set({ isLoadingCredits: true, creditsError: null });

      const response = await billingApi.getCredits();
      const credits = response.data.data;

      set({
        credits,
        isLoadingCredits: false,
      });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error?.message || 'Failed to fetch credits';
      set({
        creditsError: errorMessage,
        isLoadingCredits: false,
      });
      throw error;
    }
  },

  // Fetch credit history
  fetchCreditHistory: async (creditType?: string, limit: number = 50) => {
    try {
      set({ isLoadingCredits: true, creditsError: null });

      const response = await billingApi.getCreditHistory({
        credit_type: creditType,
        limit,
      });

      const history = Array.isArray(response.data.data) ? response.data.data : [];

      set({
        creditHistory: history,
        isLoadingCredits: false,
      });
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error?.message || 'Failed to fetch credit history';
      set({
        creditsError: errorMessage,
        isLoadingCredits: false,
      });
      throw error;
    }
  },

  // Purchase credits
  purchaseCredits: async (amount: number) => {
    try {
      set({ isCreatingCheckout: true, checkoutError: null });

      const frontendUrl = window.location.origin;
      const response = await billingApi.purchaseCredits({
        amount,
        success_url: `${frontendUrl}/dashboard/settings/credits?purchase=success`,
        cancel_url: `${frontendUrl}/dashboard/settings/credits?purchase=cancelled`,
      });

      const checkoutData = response.data.data;

      set({ isCreatingCheckout: false });

      return checkoutData;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.error?.message || 'Failed to purchase credits';
      set({
        checkoutError: errorMessage,
        isCreatingCheckout: false,
      });
      throw error;
    }
  },

  // Check if user has sufficient credits
  checkCredits: async (creditType: string, amount: number) => {
    try {
      const response = await billingApi.checkCredits(creditType, amount);
      return response.data.data.sufficient;
    } catch (error: any) {
      console.error('Failed to check credits:', error);
      return false;
    }
  },

  // Clear errors
  clearErrors: () => {
    set({
      subscriptionError: null,
      creditsError: null,
      checkoutError: null,
    });
  },

  // Clear subscription
  clearSubscription: () => {
    set({
      subscription: null,
      subscriptionError: null,
    });
  },

  // Clear credits
  clearCredits: () => {
    set({
      credits: null,
      creditHistory: [],
      creditsError: null,
    });
  },
}));
