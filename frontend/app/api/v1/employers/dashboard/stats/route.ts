/**
 * Employer Dashboard Stats API Route (Mock for E2E Testing)
 * GET /api/v1/employers/dashboard/stats
 *
 * TODO: Replace with actual FastAPI backend integration
 * This is a mock implementation for E2E testing purposes
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock dashboard stats
const MOCK_DASHBOARD_STATS = {
  active_jobs: 5,
  new_applications_today: 12,
  avg_fit_index: 78.5,
  avg_time_to_fill: 18,
  total_applications: 145,
  applications_by_status: [
    { status: 'new', count: 23 },
    { status: 'screening', count: 18 },
    { status: 'interview', count: 15 },
    { status: 'offer', count: 8 },
    { status: 'hired', count: 12 },
    { status: 'rejected', count: 69 },
  ],
  top_jobs: [
    {
      job_id: 'job-001',
      job_title: 'Senior Software Engineer',
      total_applications: 45,
      avg_candidate_fit: 82.3,
    },
    {
      job_id: 'job-002',
      job_title: 'Product Manager',
      total_applications: 38,
      avg_candidate_fit: 75.8,
    },
    {
      job_id: 'job-003',
      job_title: 'UX Designer',
      total_applications: 32,
      avg_candidate_fit: 79.1,
    },
  ],
};

/**
 * GET /api/v1/employers/dashboard/stats
 * Return dashboard statistics for employer
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

    // In production, verify JWT token here
    // For now, return mock data

    return NextResponse.json(
      {
        success: true,
        data: MOCK_DASHBOARD_STATS,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Dashboard stats error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch dashboard stats',
      },
      { status: 500 }
    );
  }
}
