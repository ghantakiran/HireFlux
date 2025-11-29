/**
 * Email Verification Page (Issue #112)
 *
 * Email verification step for employer onboarding
 * - Verification message display
 * - Resend verification email
 * - Token validation
 * - Auto-redirect on success
 * - Mobile responsive
 */

'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, CheckCircle2, AlertCircle, RefreshCcw } from 'lucide-react';

export default function EmployerVerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const [isVerifying, setIsVerifying] = useState(!!token);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [verificationError, setVerificationError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState('');

  // ============================================================================
  // Auto-verify if token is present
  // ============================================================================

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token]);

  const verifyToken = async (verificationToken: string) => {
    setIsVerifying(true);
    setVerificationError('');

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Check for expired token (mock)
      if (verificationToken === 'expired-token') {
        setVerificationError('Verification link has expired. Please request a new one.');
        setIsVerifying(false);
        return;
      }

      // Success
      setVerificationSuccess(true);
      setIsVerifying(false);

      // Redirect to onboarding after 2 seconds
      setTimeout(() => {
        router.push('/employer/onboarding');
      }, 2000);
    } catch (error) {
      setVerificationError('An error occurred during verification. Please try again.');
      setIsVerifying(false);
    }
  };

  // ============================================================================
  // Resend Verification Email
  // ============================================================================

  const handleResendEmail = async () => {
    setIsResending(true);
    setResendError('');
    setResendSuccess(false);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Success
      setResendSuccess(true);
      setIsResending(false);
    } catch (error) {
      setResendError('Failed to resend verification email. Please try again.');
      setIsResending(false);
    }
  };

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div data-verification-page className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {verificationSuccess ? (
              <div className="w-16 h-16 bg-green-600 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-white" />
              </div>
            ) : verificationError ? (
              <div className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-white" />
              </div>
            ) : (
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
                <Mail className="w-8 h-8 text-white" />
              </div>
            )}
          </div>

          {verificationSuccess ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Email Verified!</h1>
              <p className="text-gray-600">Your account has been successfully verified.</p>
            </>
          ) : verificationError ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Verification Failed</h1>
              <p className="text-gray-600">We couldn't verify your email address.</p>
            </>
          ) : isVerifying ? (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Verifying...</h1>
              <p className="text-gray-600">Please wait while we verify your email.</p>
            </>
          ) : (
            <>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Verify Your Email</h1>
              <p className="text-gray-600">We've sent a verification link to your email</p>
            </>
          )}
        </div>

        {/* Main Content Card */}
        <div className="bg-white shadow-lg rounded-lg p-8 space-y-6">
          {/* Success Message */}
          {verificationSuccess && (
            <div data-success-message className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-green-800 text-sm">
                  Your email has been verified successfully. Redirecting you to complete your onboarding...
                </p>
              </div>
            </div>
          )}

          {/* Verification Error */}
          {verificationError && (
            <div data-error-message className="space-y-4">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <p className="text-red-800 text-sm">{verificationError}</p>
              </div>
            </div>
          )}

          {/* Email Sent Message (no token) */}
          {!token && !verificationError && (
            <div data-email-sent-message className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
                <Mail className="w-5 h-5 text-blue-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-blue-800 text-sm font-medium mb-1">
                    Verification email sent
                  </p>
                  {email && (
                    <p className="text-blue-700 text-sm">
                      We've sent a verification link to <span className="font-medium">{email}</span>
                    </p>
                  )}
                  <p className="text-blue-700 text-sm mt-2">
                    Click the link in the email to verify your account and continue with onboarding.
                  </p>
                </div>
              </div>

              <div className="text-sm text-gray-600 space-y-2">
                <p className="font-medium">Didn't receive the email?</p>
                <ul className="list-disc list-inside space-y-1 text-gray-500">
                  <li>Check your spam or junk folder</li>
                  <li>Make sure you entered the correct email address</li>
                  <li>Wait a few minutes and check again</li>
                </ul>
              </div>
            </div>
          )}

          {/* Resend Success Message */}
          {resendSuccess && (
            <div data-resend-success className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
              <p className="text-green-800 text-sm">
                Verification email has been resent successfully. Please check your inbox.
              </p>
            </div>
          )}

          {/* Resend Error */}
          {resendError && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <p className="text-red-800 text-sm">{resendError}</p>
            </div>
          )}

          {/* Resend Button */}
          {!verificationSuccess && (
            <button
              data-resend-button
              onClick={handleResendEmail}
              disabled={isResending || isVerifying}
              className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-gray-100 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCcw className={`w-5 h-5 ${isResending ? 'animate-spin' : ''}`} />
              {isResending ? 'Resending...' : 'Resend Verification Email'}
            </button>
          )}
        </div>

        {/* Sign In Link */}
        {!verificationSuccess && (
          <p className="text-center text-sm text-gray-600">
            Already verified?{' '}
            <Link href="/employer/signin" className="text-blue-600 hover:text-blue-700 font-medium">
              Sign in
            </Link>
          </p>
        )}
      </div>
    </div>
  );
}
