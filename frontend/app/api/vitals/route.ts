/**
 * API endpoint for collecting Core Web Vitals
 * Receives metrics from the client and logs them for analysis
 */

import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Use edge runtime for faster response

interface WebVitalMetric {
  metric: string;
  value: number;
  id: string;
  rating: string;
  navigationType: string;
  url: string;
  timestamp: number;
  userAgent: string;
  connection: string;
}

export async function POST(request: NextRequest) {
  try {
    const metric: WebVitalMetric = await request.json();

    // Log metric (in production, send to monitoring service)
    console.log('[Web Vitals]', {
      metric: metric.metric,
      value: metric.value,
      rating: metric.rating,
      url: metric.url,
      connection: metric.connection,
    });

    // Here you would send to your monitoring service:
    // - DataDog
    // - New Relic
    // - Custom analytics DB
    // - CloudWatch
    // etc.

    // Example: Send to external monitoring service
    // if (process.env.ANALYTICS_ENDPOINT) {
    //   await fetch(process.env.ANALYTICS_ENDPOINT, {
    //     method: 'POST',
    //     headers: { 'Content-Type': 'application/json' },
    //     body: JSON.stringify(metric),
    //   });
    // }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('[Web Vitals] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process metric' },
      { status: 500 }
    );
  }
}
