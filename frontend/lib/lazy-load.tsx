/**
 * Lazy Loading Utilities
 *
 * Utilities for code splitting with React.lazy and Suspense.
 * Provides consistent loading states and error boundaries.
 */

'use client';

import { lazy, Suspense, ComponentType } from 'react';
import { ComponentLoadingSpinner, PageLoadingSpinner } from '@/components/ui/loading-spinner';

/**
 * Lazy load a component with error boundary and loading state
 *
 * @param importFunc - Dynamic import function
 * @param fallback - Optional custom loading component
 * @returns Lazy loaded component wrapped with Suspense
 */
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);

  return function LazyLoadedComponent(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback || <ComponentLoadingSpinner />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Lazy load a page component with full-page loading state
 *
 * @param importFunc - Dynamic import function
 * @returns Lazy loaded page component
 */
export function lazyLoadPage<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return lazyLoad(importFunc, <PageLoadingSpinner />);
}

/**
 * Preload a lazy component
 *
 * Useful for prefetching on hover or route change
 *
 * @param importFunc - Dynamic import function
 */
export function preloadComponent(importFunc: () => Promise<any>) {
  importFunc();
}
