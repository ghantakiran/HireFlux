/**
 * Feature Request API Route
 * Handles feature request submissions
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const data = {
      title: formData.get('title'),
      description: formData.get('description'),
      useCase: formData.get('useCase'),
      priority: formData.get('priority'),
      mockups: [] as File[],
    };

    // Extract mockups
    for (let i = 0; i < 3; i++) {
      const mockup = formData.get(`mockup_${i}`);
      if (mockup instanceof File) {
        data.mockups.push(mockup);
      }
    }

    // TODO: Replace with actual database storage
    console.log('[Feature Request]', data);

    const trackingId = `FEAT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;

    return NextResponse.json({
      success: true,
      tracking_id: trackingId,
      message: 'Feature request submitted successfully',
    });
  } catch (error) {
    console.error('Feature request API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to submit feature request',
      },
      { status: 500 }
    );
  }
}
