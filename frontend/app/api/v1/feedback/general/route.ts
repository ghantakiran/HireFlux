/**
 * General Feedback API Route
 * Handles general feedback submissions
 */

import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const { allowed, resetIn } = checkRateLimit(`general-feedback:${ip}`, 5, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many requests. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(Math.ceil(resetIn / 1000)) } }
    );
  }

  try {
    const data = await request.json();

    // TODO: Replace with actual database storage
    console.log('[General Feedback]', data);

    // Customize message based on rating
    let message = 'Thank you for your feedback!';
    if (data.rating >= 4) {
      message = "Thank you for your positive feedback! We're glad you're enjoying HireFlux.";
    } else if (data.rating <= 2) {
      message = "We appreciate your feedback and will work to improve. Would you like someone from our team to follow up with you?";
    }

    return NextResponse.json({
      success: true,
      message,
      follow_up_offered: data.rating <= 2,
    });
  } catch (error) {
    console.error('General feedback API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit feedback',
      },
      { status: 500 }
    );
  }
}
