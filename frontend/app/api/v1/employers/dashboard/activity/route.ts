/**
 * Employer Dashboard Activity API Route (Mock for E2E Testing)
 * GET /api/v1/employers/dashboard/activity
 *
 * TODO: Replace with actual FastAPI backend integration
 * This is a mock implementation for E2E testing purposes
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock activity data
const MOCK_ACTIVITY_DATA = {
  events: [
    {
      id: 'event-001',
      type: 'application_received',
      description: 'New application for Senior Software Engineer from John Doe',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      metadata: { job_id: 'job-001', candidate_name: 'John Doe' },
    },
    {
      id: 'event-002',
      type: 'interview_scheduled',
      description: 'Interview scheduled with Jane Smith for Product Manager role',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      metadata: { job_id: 'job-002', candidate_name: 'Jane Smith' },
    },
    {
      id: 'event-003',
      type: 'offer_sent',
      description: 'Offer sent to Michael Johnson for UX Designer position',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      metadata: { job_id: 'job-003', candidate_name: 'Michael Johnson' },
    },
    {
      id: 'event-004',
      type: 'application_rejected',
      description: '5 applications rejected for various positions',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      metadata: { count: 5 },
    },
    {
      id: 'event-005',
      type: 'job_published',
      description: 'New job posted: Backend Engineer',
      timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      metadata: { job_id: 'job-004', job_title: 'Backend Engineer' },
    },
  ],
  total: 5,
  has_more: false,
};

/**
 * GET /api/v1/employers/dashboard/activity
 * Return recent activity for employer
 */
export async function GET(request: NextRequest) {
  try {
    // Check authorization header
    const authHeader = request.headers.get('authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'Missing or invalid authorization token' },
        { status: 401 }
      );
    }

    // Get limit from query params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    // Slice events based on limit
    const limitedEvents = MOCK_ACTIVITY_DATA.events.slice(0, limit);

    return NextResponse.json(
      {
        success: true,
        data: {
          events: limitedEvents,
          total: limitedEvents.length,
          has_more: limit < MOCK_ACTIVITY_DATA.events.length,
        },
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Activity data error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch activity data',
      },
      { status: 500 }
    );
  }
}
