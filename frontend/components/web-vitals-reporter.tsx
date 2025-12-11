/**
 * Web Vitals Reporter Component
 * Client-side component that initializes Core Web Vitals monitoring
 */

'use client';

import { useEffect } from 'react';
import { reportWebVitals } from '@/lib/web-vitals';

export function WebVitalsReporter() {
  useEffect(() => {
    // Initialize web vitals monitoring on client side
    if (typeof window !== 'undefined') {
      reportWebVitals();
    }
  }, []);

  // This component doesn't render anything
  return null;
}
