'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { userApi } from '@/lib/api';
import { Loader2 } from 'lucide-react';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setTokens, setUser } = useAuthStore();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get tokens from URL query parameters
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const tokenType = searchParams.get('token_type');
        const errorParam = searchParams.get('error');
        const errorDescription = searchParams.get('error_description');

        // SECURITY: Clean URL first before any processing
        router.replace('/auth/callback', { scroll: false });

        // Check for OAuth errors
        if (errorParam) {
          const message = errorDescription || errorParam || 'OAuth authentication failed';
          setError(message);
          setTimeout(() => router.push('/signin'), 3000);
          return;
        }

        // Validate tokens
        if (!accessToken || !refreshToken || tokenType !== 'bearer') {
          setError('Invalid authentication response. Please try again.');
          setTimeout(() => router.push('/signin'), 3000);
          return;
        }

        // Store tokens
        setTokens(accessToken, refreshToken);

        // Fetch user information
        const response = await userApi.getMe();
        const user = response.data.data;
        setUser(user);

        // Check if onboarding is needed
        if (!user.onboarding_completed) {
          router.push('/onboarding');
        } else {
          // Check for return URL
          const returnUrl = sessionStorage.getItem('oauth_return_url');
          sessionStorage.removeItem('oauth_return_url');
          router.push(returnUrl || '/dashboard');
        }
      } catch (err: any) {
        console.error('OAuth callback error:', err);
        const errorMessage =
          err?.response?.data?.error?.message ||
          'Failed to complete authentication. Please try again.';
        setError(errorMessage);
        setTimeout(() => router.push('/signin'), 3000);
      }
    };

    handleCallback();
  }, [searchParams, router, setTokens, setUser]);

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg border border-red-200 bg-white p-8 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-red-100 p-3">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-gray-900">
            Authentication Failed
          </h1>
          <p className="mb-4 text-sm text-gray-600">{error}</p>
          <p className="text-xs text-gray-500">Redirecting to sign in...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
        <div className="mb-4 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
        <h1 className="mb-2 text-xl font-semibold text-gray-900">
          Completing authentication...
        </h1>
        <p className="text-sm text-gray-600">Please wait while we log you in</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md rounded-lg bg-white p-8 text-center shadow-sm">
          <div className="mb-4 flex justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
          <h1 className="mb-2 text-xl font-semibold text-gray-900">
            Loading...
          </h1>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
