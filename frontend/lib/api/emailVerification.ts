/**
 * Email Verification API Service
 * Sprint 19-20 Week 39 Day 3 - Issue #20
 *
 * Client-side API integration for employer email verification
 */

import { API_BASE_URL } from './client';

export interface SendCodeResponse {
  success: boolean;
  data: {
    message: string;
    code_id: string;
    expires_in_seconds: number;
  };
}

export interface VerifyCodeResponse {
  success: boolean;
  data: {
    message: string;
    email: string;
  };
}

export interface ResendCodeResponse {
  success: boolean;
  data: {
    message: string;
    code_id: string;
    expires_in_seconds: number;
  };
}

export interface ApiError {
  success: false;
  detail: string;
}

/**
 * Send 6-digit verification code to email
 *
 * @param email - Email address to send code to
 * @returns Promise with code_id and expiration time
 * @throws Error with detail message on failure
 */
export async function sendVerificationCode(email: string): Promise<SendCodeResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/email-verification/send-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to send verification code');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to send verification code');
  }
}

/**
 * Verify 6-digit code for email
 *
 * @param email - Email address being verified
 * @param code - 6-digit verification code
 * @returns Promise with verification success
 * @throws Error with detail message on failure
 */
export async function verifyCode(email: string, code: string): Promise<VerifyCodeResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/email-verification/verify-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, code }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Invalid verification code');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to verify code');
  }
}

/**
 * Resend verification code (generates new code)
 *
 * @param email - Email address to resend code to
 * @returns Promise with new code_id and expiration time
 * @throws Error with detail message on failure
 */
export async function resendVerificationCode(email: string): Promise<ResendCodeResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/email-verification/resend-code`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || 'Failed to resend verification code');
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Failed to resend verification code');
  }
}
