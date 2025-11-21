/**
 * Employer Login API Route (Mock for E2E Testing)
 * POST /api/v1/employer/auth/login
 *
 * TODO: Replace with actual FastAPI backend integration
 * This is a mock implementation for E2E testing purposes
 */

import { NextRequest, NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';

// Mock employer database
const MOCK_EMPLOYERS = [
  {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'employer@company.com',
    password_hash: '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5GyWUI7YY.tYS', // TestPassword123!
    company_id: 'test-company-001',
    company_name: 'Test Company Inc',
    user_type: 'employer',
    role: 'owner',
  },
];

// JWT secret (use environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-change-in-production';

/**
 * POST /api/v1/employer/auth/login
 * Authenticate employer and return JWT tokens
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required', message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Find employer
    const employer = MOCK_EMPLOYERS.find((e) => e.email === email);

    if (!employer) {
      return NextResponse.json(
        { error: 'Invalid credentials', message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // In production, use bcrypt.compare()
    // For now, accept the test password
    const isValidPassword = password === 'TestPassword123!';

    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid credentials', message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Generate JWT tokens
    const accessTokenPayload = {
      user_id: employer.id,
      email: employer.email,
      user_type: employer.user_type,
      company_id: employer.company_id,
      role: employer.role,
    };

    const accessToken = sign(accessTokenPayload, JWT_SECRET, {
      expiresIn: '1h',
    });

    const refreshToken = sign(
      { user_id: employer.id, type: 'refresh' },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    // Success response
    return NextResponse.json(
      {
        success: true,
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'bearer',
        expires_in: 3600,
        user: {
          id: employer.id,
          email: employer.email,
          user_type: employer.user_type,
          company_id: employer.company_id,
          company_name: employer.company_name,
          role: employer.role,
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
    console.error('Login error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Login failed',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/employer/auth/login
 * Return method not allowed
 */
export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'Use POST to login' },
    { status: 405 }
  );
}
