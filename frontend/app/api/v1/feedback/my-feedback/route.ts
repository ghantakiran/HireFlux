/**
 * My Feedback API Route
 * Returns user's feedback history
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // TODO: Replace with actual database query
    // Mock data for testing
    const mockFeedback = [
      {
        id: 'BUG-123456',
        type: 'bug_report',
        title: 'Login button not working',
        status: 'in_progress',
        created_at: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      },
      {
        id: 'FEAT-789012',
        type: 'feature_request',
        title: 'Dark mode support',
        status: 'under_review',
        created_at: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        feedback: mockFeedback,
      },
    });
  } catch (error) {
    console.error('My feedback API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch feedback',
      },
      { status: 500 }
    );
  }
}
