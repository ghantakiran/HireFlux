/**
 * Query Client Provider Component
 *
 * Wraps the application with React Query's QueryClientProvider.
 * Provides caching, data fetching, and state management across the app.
 */

'use client';

import { QueryClientProvider as TanStackQueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, type ReactNode } from 'react';
import { createQueryClient } from '@/lib/react-query';

interface QueryClientProviderProps {
  children: ReactNode;
}

/**
 * Query Client Provider
 *
 * Provides React Query functionality to the entire application.
 * Creates a single QueryClient instance per request in Next.js App Router.
 */
export function QueryClientProvider({ children }: QueryClientProviderProps) {
  // Create QueryClient instance once per component mount
  // This prevents creating new instances on every render
  const [queryClient] = useState(() => createQueryClient());

  return (
    <TanStackQueryClientProvider client={queryClient}>
      {children}
      {/* Only show devtools in development */}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
        />
      )}
    </TanStackQueryClientProvider>
  );
}
