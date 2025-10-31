/**
 * React Query Setup Tests
 *
 * Tests the React Query configuration and setup.
 * Following TDD approach.
 *
 * Test Scenarios:
 * 1. QueryClient provider exists
 * 2. QueryClient has correct default options
 * 3. React Query DevTools are available in development
 * 4. Cache persistence works correctly
 */

import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { createQueryClient } from '@/lib/react-query';

describe('React Query Setup', () => {
  describe('Given QueryClient is configured', () => {
    test('When QueryClient is created, Then it should have correct default options', () => {
      // Given: QueryClient is created
      const queryClient = createQueryClient();

      // When: Checking default options
      const defaultOptions = queryClient.getDefaultOptions();

      // Then: Should have correct caching and retry configuration
      expect(defaultOptions.queries?.staleTime).toBe(1000 * 60 * 5); // 5 minutes
      expect(defaultOptions.queries?.gcTime).toBe(1000 * 60 * 30); // 30 minutes
      expect(defaultOptions.queries?.retry).toBe(3);
      expect(defaultOptions.queries?.refetchOnWindowFocus).toBe(false);
    });

    test('When QueryClient is created, Then it should have error handling', () => {
      // Given: QueryClient is created
      const queryClient = createQueryClient();

      // When: Checking mutation options
      const defaultOptions = queryClient.getDefaultOptions();

      // Then: Should have error handlers configured
      expect(defaultOptions.mutations?.onError).toBeDefined();
    });
  });

  describe('Given QueryClientProvider wrapper', () => {
    test('When component uses useQuery, Then it should fetch data successfully', async () => {
      // Given: A test component using useQuery
      const TestComponent = () => {
        const { data, isLoading, isError } = useQuery({
          queryKey: ['test'],
          queryFn: async () => {
            return { message: 'Success' };
          },
        });

        if (isLoading) return <div>Loading...</div>;
        if (isError) return <div>Error occurred</div>;
        return <div>Data: {data?.message}</div>;
      };

      const queryClient = createQueryClient();

      // When: Rendering component with QueryClientProvider
      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );

      // Then: Should show loading state initially
      expect(screen.getByText('Loading...')).toBeInTheDocument();

      // And: Should show data after fetch completes
      await waitFor(() => {
        expect(screen.getByText('Data: Success')).toBeInTheDocument();
      });
    });

    test('When query fails, Then it should handle errors correctly', async () => {
      // Given: A test component with failing query
      const TestComponent = () => {
        const { isError, error } = useQuery({
          queryKey: ['test-error'],
          queryFn: async () => {
            throw new Error('Test error');
          },
          retry: 0, // Disable retries for this test
        });

        if (isError) return <div>Error: {(error as Error).message}</div>;
        return <div>Success</div>;
      };

      const queryClient = createQueryClient();

      // When: Rendering component with failing query
      render(
        <QueryClientProvider client={queryClient}>
          <TestComponent />
        </QueryClientProvider>
      );

      // Then: Should show error message
      await waitFor(() => {
        expect(screen.getByText('Error: Test error')).toBeInTheDocument();
      });
    });
  });

  describe('Given React Query caching', () => {
    test('When same query is called twice, Then it should use cache', async () => {
      // Given: A query function with call tracking
      let callCount = 0;
      const TestComponent = ({ queryKey }: { queryKey: string[] }) => {
        const { data } = useQuery({
          queryKey,
          queryFn: async () => {
            callCount++;
            return { count: callCount };
          },
        });

        return <div>Call count: {data?.count}</div>;
      };

      const queryClient = createQueryClient();

      // When: Rendering same component twice with same query key
      const { rerender } = render(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['cache-test']} />
        </QueryClientProvider>
      );

      await waitFor(() => {
        expect(screen.getByText('Call count: 1')).toBeInTheDocument();
      });

      // And: Rerendering with same query key
      rerender(
        <QueryClientProvider client={queryClient}>
          <TestComponent queryKey={['cache-test']} />
        </QueryClientProvider>
      );

      // Then: Should use cached data (call count still 1)
      await waitFor(() => {
        expect(screen.getByText('Call count: 1')).toBeInTheDocument();
        expect(callCount).toBe(1);
      });
    });
  });

  describe('Given React Query DevTools', () => {
    test('When in development mode, Then DevTools should be available', () => {
      // Given: Development environment
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';

      // When: Checking DevTools component
      // Then: DevTools component should be exportable
      expect(ReactQueryDevtools).toBeDefined();

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });
  });
});
