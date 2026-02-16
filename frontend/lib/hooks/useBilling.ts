/**
 * Billing React Query Hooks
 *
 * Custom hooks for billing and subscription-related API calls with React Query.
 * Provides automatic caching, refetching, and state management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheInvalidation } from '../react-query';
import { createAuthAxios } from '../api-client';
import { toast } from 'sonner';

export interface Subscription {
  id: string;
  user_id: string;
  plan: 'free' | 'plus' | 'pro';
  status: 'active' | 'canceled' | 'past_due' | 'trialing';
  current_period_start: string;
  current_period_end: string;
  cancel_at_period_end: boolean;
  stripe_subscription_id?: string;
}

export interface CreditBalance {
  available: number;
  used: number;
  total_purchased: number;
  expires_at?: string;
}

export interface CreditUsage {
  id: string;
  amount: number;
  type: 'cover_letter' | 'auto_apply' | 'resume_generation';
  description: string;
  created_at: string;
}

export interface Invoice {
  id: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'uncollectible';
  invoice_pdf?: string;
  created_at: string;
}

/**
 * Hook to fetch current subscription
 */
export function useSubscription() {
  return useQuery({
    queryKey: queryKeys.billing.subscription(),
    queryFn: async () => {
      const response = await createAuthAxios().get<{ data: Subscription }>(
        '/billing/subscription',
      );
      return response.data.data;
    },
    staleTime: 1000 * 60 * 10, // 10 minutes - subscription doesn't change often
  });
}

/**
 * Hook to fetch credit balance
 */
export function useCredits() {
  return useQuery({
    queryKey: queryKeys.billing.credits(),
    queryFn: async () => {
      const response = await createAuthAxios().get<{ data: CreditBalance }>(
        '/billing/credits',
      );
      return response.data.data;
    },
    staleTime: 1000 * 30, // 30 seconds - credits change frequently
  });
}

/**
 * Hook to fetch credit usage history
 */
export function useCreditUsage() {
  return useQuery({
    queryKey: queryKeys.billing.usage(),
    queryFn: async () => {
      const response = await createAuthAxios().get<{ data: CreditUsage[] }>(
        '/billing/credits/usage',
      );
      return response.data.data;
    },
  });
}

/**
 * Hook to fetch invoices
 */
export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.billing.invoices(),
    queryFn: async () => {
      const response = await createAuthAxios().get<{ data: Invoice[] }>(
        '/billing/invoices',
      );
      return response.data.data;
    },
  });
}

/**
 * Hook to upgrade/change subscription plan
 */
export function useUpgradeSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (plan: 'plus' | 'pro') => {
      const response = await createAuthAxios().post<{ data: { checkout_url: string } }>(
        '/billing/subscription/upgrade',
        { plan },
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      window.location.href = data.checkout_url;
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to initiate upgrade';
      toast.error(message);
    },
  });
}

/**
 * Hook to cancel subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await createAuthAxios().post(
        '/billing/subscription/cancel',
        {},
      );
    },
    onSuccess: () => {
      cacheInvalidation.invalidateBilling(queryClient);
      toast.success('Subscription canceled. You will have access until the end of the billing period.');
    },
  });
}

/**
 * Hook to reactivate canceled subscription
 */
export function useReactivateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await createAuthAxios().post(
        '/billing/subscription/reactivate',
        {},
      );
    },
    onSuccess: () => {
      cacheInvalidation.invalidateBilling(queryClient);
      toast.success('Subscription reactivated successfully');
    },
  });
}

/**
 * Hook to purchase credits
 */
export function usePurchaseCredits() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (amount: number) => {
      const response = await createAuthAxios().post<{ data: { checkout_url: string } }>(
        '/billing/credits/purchase',
        { amount },
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe checkout
      window.location.href = data.checkout_url;
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : 'Failed to purchase credits';
      toast.error(message);
    },
  });
}

/**
 * Hook to update payment method
 */
export function useUpdatePaymentMethod() {
  return useMutation({
    mutationFn: async () => {
      const response = await createAuthAxios().post<{ data: { setup_url: string } }>(
        '/billing/payment-method/update',
        {},
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe setup page
      window.location.href = data.setup_url;
    },
  });
}
