'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  redirectTo?: string;
  requireOnboarding?: boolean;
}

export function ProtectedRoute({
  children,
  redirectTo = '/signin',
  requireOnboarding = false,
}: ProtectedRouteProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { isAuthenticated, isLoading, isInitialized, user, initializeAuth } = useAuthStore();

  useEffect(() => {
    // Initialize auth on mount
    if (!isInitialized) {
      initializeAuth();
    }
  }, [isInitialized, initializeAuth]);

  useEffect(() => {
    // Once initialized, check authentication
    if (isInitialized && !isLoading) {
      if (!isAuthenticated) {
        // Save intended destination
        const returnUrl = pathname !== '/signin' && pathname !== '/signup' ? pathname : null;
        const destination = returnUrl
          ? `${redirectTo}?returnUrl=${encodeURIComponent(returnUrl)}`
          : redirectTo;

        router.push(destination);
      } else if (requireOnboarding && user && !user.onboarding_completed) {
        // Redirect to onboarding if required and not completed
        router.push('/onboarding');
      }
    }
  }, [
    isAuthenticated,
    isInitialized,
    isLoading,
    user,
    requireOnboarding,
    router,
    pathname,
    redirectTo,
  ]);

  // Show loading state while initializing or checking auth
  if (!isInitialized || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Show nothing while redirecting
  if (!isAuthenticated || (requireOnboarding && user && !user.onboarding_completed)) {
    return null;
  }

  // User is authenticated, render children
  return <>{children}</>;
}
