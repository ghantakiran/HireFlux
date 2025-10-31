/**
 * Billing React Query Hooks
 *
 * Custom hooks for billing and subscription-related API calls with React Query.
 * Provides automatic caching, refetching, and state management.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, cacheInvalidation } from '../react-query';
import axios from 'axios';
import { toast } from 'sonner';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

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
      const token = localStorage.getItem('access_token');
      const response = await axios.get<{ data: Subscription }>(
        `${API_BASE_URL}/billing/subscription`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
      const token = localStorage.getItem('access_token');
      const response = await axios.get<{ data: CreditBalance }>(
        `${API_BASE_URL}/billing/credits`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
      const token = localStorage.getItem('access_token');
      const response = await axios.get<{ data: CreditUsage[] }>(
        `${API_BASE_URL}/billing/credits/usage`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
      const token = localStorage.getItem('access_token');
      const response = await axios.get<{ data: Invoice[] }>(
        `${API_BASE_URL}/billing/invoices`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
      const token = localStorage.getItem('access_token');
      const response = await axios.post<{ data: { checkout_url: string } }>(
        `${API_BASE_URL}/billing/subscription/upgrade`,
        { plan },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API_BASE_URL}/billing/subscription/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API_BASE_URL}/billing/subscription/reactivate`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
      const token = localStorage.getItem('access_token');
      const response = await axios.post<{ data: { checkout_url: string } }>(
        `${API_BASE_URL}/billing/credits/purchase`,
        { amount },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
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
      const token = localStorage.getItem('access_token');
      const response = await axios.post<{ data: { setup_url: string } }>(
        `${API_BASE_URL}/billing/payment-method/update`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      // Redirect to Stripe setup page
      window.location.href = data.setup_url;
    },
  });
}
