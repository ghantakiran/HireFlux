/**
 * Bug Report API Route
 * Handles bug report submissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, resetIn } = checkRateLimit(`bug-report:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(resetIn / 1000)) } }
    );
  }

  try {
    const formData = await request.formData();

    // Extract data
    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      stepsToReproduce: formData.get('stepsToReproduce'),
      expectedBehavior: formData.get('expectedBehavior'),
      actualBehavior: formData.get('actualBehavior'),
      severity: formData.get('severity'),
      url: formData.get('url'),
      userAgent: formData.get('userAgent'),
      errorId: formData.get('errorId'),
      screenshot: formData.get('screenshot'),
    };

    // TODO: Replace with actual database storage and email notification
    // For now, just log and return success
    console.log('[Bug Report]', data);

    // Generate tracking ID
    const trackingId = `BUG-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      tracking_id: trackingId,
      message: 'Bug report submitted successfully',
    });
  } catch (error) {
    console.error('Bug report API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit bug report',
      },
      { status: 500 }
    );
  }
}
