/**
 * Core Web Vitals Monitoring
 * Tracks and reports performance metrics to analytics
 *
 * Metrics tracked:
 * - LCP (Largest Contentful Paint): < 2.5s
 * - FID (First Input Delay): < 100ms
 * - CLS (Cumulative Layout Shift): < 0.1
 * - FCP (First Contentful Paint): < 1.8s
 * - TTFB (Time to First Byte): < 600ms
 * - INP (Interaction to Next Paint): < 200ms
 */

import { Metric } from 'web-vitals';

// Threshold scores based on Google's recommendations
export const WEB_VITALS_THRESHOLDS = {
  LCP: { good: 2500, needsImprovement: 4000 },
  FID: { good: 100, needsImprovement: 300 },
  CLS: { good: 0.1, needsImprovement: 0.25 },
  FCP: { good: 1800, needsImprovement: 3000 },
  TTFB: { good: 600, needsImprovement: 1500 },
  INP: { good: 200, needsImprovement: 500 },
} as const;

type MetricName = keyof typeof WEB_VITALS_THRESHOLDS;

/**
 * Determine performance rating
 */
function getMetricRating(name: MetricName, value: number): 'good' | 'needs-improvement' | 'poor' {
  const thresholds = WEB_VITALS_THRESHOLDS[name];
  if (value <= thresholds.good) return 'good';
  if (value <= thresholds.needsImprovement) return 'needs-improvement';
  return 'poor';
}

/**
 * Send metric to analytics service
 */
function sendToAnalytics(metric: Metric) {
  const { name, value, id, navigationType, rating } = metric;

  // Log to console in development
  if (process.env.NODE_ENV === 'development') {
    const metricRating = getMetricRating(name as MetricName, value);
    const emoji = metricRating === 'good' ? '✅' : metricRating === 'needs-improvement' ? '⚠️' : '❌';

    console.log(`${emoji} ${name}: ${Math.round(value)}${name === 'CLS' ? '' : 'ms'} (${metricRating})`);
  }

  // Send to Google Analytics if available
  if (typeof window !== 'undefined' && (window as any).gtag) {
    (window as any).gtag('event', name, {
      event_category: 'Web Vitals',
      value: Math.round(name === 'CLS' ? value * 1000 : value),
      event_label: id,
      non_interaction: true,
      navigation_type: navigationType,
      metric_rating: rating,
    });
  }

  // Send to custom analytics endpoint
  if (typeof window !== 'undefined' && navigator.sendBeacon) {
    const body = JSON.stringify({
      metric: name,
      value: value,
      id: id,
      rating: rating,
      navigationType: navigationType,
      url: window.location.href,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      connection: (navigator as any).connection?.effectiveType || 'unknown',
    });

    // Only send in production
    if (process.env.NODE_ENV === 'production') {
      navigator.sendBeacon('/api/vitals', body);
    }
  }

  // Send to Sentry for monitoring (if available)
  if (typeof window !== 'undefined' && (window as any).Sentry) {
    const Sentry = (window as any).Sentry;
    Sentry.captureMessage(`Web Vital: ${name}`, {
      level: 'info',
      tags: {
        metric: name,
        rating: rating,
      },
      extra: {
        value: value,
        id: id,
        navigationType: navigationType,
      },
    });
  }
}

/**
 * Initialize Core Web Vitals monitoring
 */
export async function reportWebVitals() {
  try {
    const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

    // Track all Core Web Vitals
    onLCP(sendToAnalytics);
    onCLS(sendToAnalytics);
    onFCP(sendToAnalytics);
    onTTFB(sendToAnalytics);
    onINP(sendToAnalytics);

    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Core Web Vitals monitoring initialized');
    }
  } catch (error) {
    console.error('Failed to initialize Web Vitals:', error);
  }
}

/**
 * Custom hook for tracking page-specific vitals
 */
export function useWebVitals(pageName: string) {
  if (typeof window !== 'undefined') {
    // Add page-specific context to vitals
    const originalSendToAnalytics = sendToAnalytics;
    return async () => {
      try {
        const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

        const sendWithPage = (metric: Metric) => {
          // Add page name to metric (cast to any to add custom property)
          const enhancedMetric = {
            ...metric,
            pageName,
          } as any;
          originalSendToAnalytics(enhancedMetric);
        };

        onLCP(sendWithPage);
        onCLS(sendWithPage);
        onFCP(sendWithPage);
        onTTFB(sendWithPage);
        onINP(sendWithPage);
      } catch (error) {
        console.error('Failed to track page vitals:', error);
      }
    };
  }
  return () => {};
}

/**
 * Get current vitals snapshot (for debugging)
 */
export async function getWebVitalsSnapshot() {
  try {
    const { onCLS, onFCP, onLCP, onTTFB, onINP } = await import('web-vitals');

    const vitals: Record<string, any> = {};

    const collect = (metric: Metric) => {
      vitals[metric.name] = {
        value: metric.value,
        rating: metric.rating,
        navigationType: metric.navigationType,
      };
    };

    onLCP(collect, { reportAllChanges: true });
    onCLS(collect, { reportAllChanges: true });
    onFCP(collect);
    onTTFB(collect);
    onINP(collect);

    // Wait a bit for metrics to be collected
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return vitals;
  } catch (error) {
    console.error('Failed to get vitals snapshot:', error);
    return {};
  }
}
