/**
 * Employer Dashboard Pipeline API Route (Mock for E2E Testing)
 * GET /api/v1/employers/dashboard/pipeline
 *
 * TODO: Replace with actual FastAPI backend integration
 * This is a mock implementation for E2E testing purposes
 */

import { NextRequest, NextResponse } from 'next/server';

// Mock pipeline data
const MOCK_PIPELINE_DATA = {
  new: 23,
  screening: 18,
  interview: 15,
  offer: 8,
  hired: 12,
  rejected: 69,
  total: 145,
};

/**
 * GET /api/v1/employers/dashboard/pipeline
 * Return pipeline data for employer
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

    return NextResponse.json(
      {
        success: true,
        data: MOCK_PIPELINE_DATA,
      },
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('Pipeline data error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Failed to fetch pipeline data',
      },
      { status: 500 }
    );
  }
}
