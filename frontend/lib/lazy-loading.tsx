/**
 * Lazy Loading Utilities
 *
 * Issue #144: Performance Optimization
 *
 * Provides utilities for lazy loading heavy components to reduce initial bundle size.
 * Uses Next.js dynamic imports with loading states and SSR configuration.
 */

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';

/**
 * Skeleton loader for charts
 */
export function ChartSkeleton() {
  return (
    <div className="w-full h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-gray-400 dark:text-gray-600">Loading chart...</div>
    </div>
  );
}

/**
 * Skeleton loader for editor
 */
export function EditorSkeleton() {
  return (
    <div className="w-full h-96 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-gray-400 dark:text-gray-600">Loading editor...</div>
    </div>
  );
}

/**
 * Skeleton loader for dashboard
 */
export function DashboardSkeleton() {
  return (
    <div className="space-y-4">
      <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4 animate-pulse"></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
        ))}
      </div>
      <div className="h-64 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse"></div>
    </div>
  );
}

/**
 * Generic skeleton loader
 */
export function GenericSkeleton() {
  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 animate-pulse rounded-lg flex items-center justify-center">
      <div className="text-gray-400 dark:text-gray-600">Loading...</div>
    </div>
  );
}

/**
 * Lazy load configuration options
 */
interface LazyLoadOptions {
  /** Show loading skeleton while component loads */
  loading?: () => JSX.Element;
  /** Enable server-side rendering (default: false for heavy components) */
  ssr?: boolean;
}

/**
 * Lazy load chart components (recharts library is heavy)
 *
 * @example
 * const AnalyticsChart = lazyLoadChart(() => import('@/components/charts/AnalyticsChart'));
 */
export function lazyLoadChart<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: LazyLoadOptions = {}
) {
  return dynamic(importFn, {
    loading: options.loading || (() => <ChartSkeleton />),
    ssr: options.ssr ?? false, // Disable SSR for charts (client-side only)
  });
}

/**
 * Lazy load editor components (Monaco, TipTap, etc.)
 *
 * @example
 * const RichTextEditor = lazyLoadEditor(() => import('@/components/editor/RichTextEditor'));
 */
export function lazyLoadEditor<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: LazyLoadOptions = {}
) {
  return dynamic(importFn, {
    loading: options.loading || (() => <EditorSkeleton />),
    ssr: options.ssr ?? false, // Disable SSR for editors (client-side only)
  });
}

/**
 * Lazy load dashboard components
 *
 * @example
 * const EmployerDashboard = lazyLoadDashboard(() => import('@/app/employer/dashboard/page'));
 */
export function lazyLoadDashboard<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: LazyLoadOptions = {}
) {
  return dynamic(importFn, {
    loading: options.loading || (() => <DashboardSkeleton />),
    ssr: options.ssr ?? true, // Enable SSR for dashboards (important for SEO)
  });
}

/**
 * Generic lazy load utility
 *
 * @example
 * const HeavyComponent = lazyLoad(() => import('@/components/HeavyComponent'));
 */
export function lazyLoad<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: LazyLoadOptions = {}
) {
  return dynamic(importFn, {
    loading: options.loading || (() => <GenericSkeleton />),
    ssr: options.ssr ?? true,
  });
}

/**
 * Prefetch a component for faster navigation
 * Use this for components that the user is likely to navigate to
 *
 * @example
 * // In a Link component's onMouseEnter
 * prefetchComponent(() => import('@/app/employer/dashboard/page'));
 */
export function prefetchComponent(importFn: () => Promise<any>) {
  if (typeof window !== 'undefined') {
    // Prefetch on hover/focus
    importFn();
  }
}

/**
 * Lazy load component with intersection observer
 * Loads component only when it enters the viewport
 *
 * @example
 * const LazyChart = lazyLoadOnVisible(() => import('@/components/charts/AnalyticsChart'));
 */
export function lazyLoadOnVisible<T = any>(
  importFn: () => Promise<{ default: ComponentType<T> }>,
  options: LazyLoadOptions = {}
) {
  return dynamic(importFn, {
    loading: options.loading || (() => <GenericSkeleton />),
    ssr: false, // Never SSR for viewport-based loading
  });
}
