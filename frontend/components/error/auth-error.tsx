/**
 * Authentication Error Components
 * Displays auth-related errors (session expired, invalid credentials, etc.)
 */

'use client';

import React from 'react';
import { Lock, LogIn, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Link from 'next/link';

export interface AuthErrorProps {
  type: 'session_expired' | 'invalid_credentials' | 'unauthorized';
  onSignIn?: () => void;
  redirectUrl?: string;
}

export function AuthError({ type, onSignIn, redirectUrl }: AuthErrorProps) {
  const getMessage = () => {
    switch (type) {
      case 'session_expired':
        return 'Your session has expired';
      case 'invalid_credentials':
        return 'Invalid email or password';
      case 'unauthorized':
        return 'Authentication required';
      default:
        return 'Authentication error';
    }
  };

  const getDescription = () => {
    switch (type) {
      case 'session_expired':
        return "For your security, you've been logged out. Please sign in again to continue.";
      case 'invalid_credentials':
        return 'The email or password you entered is incorrect. Please try again.';
      case 'unauthorized':
        return 'You need to sign in to access this page.';
      default:
        return 'Please sign in to continue.';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] p-8">
      <Alert variant="destructive" className="max-w-md" data-testid="auth-error">
        <Lock className="h-4 w-4" />
        <AlertTitle>{getMessage()}</AlertTitle>
        <AlertDescription>{getDescription()}</AlertDescription>

        <div className="mt-4 flex gap-2">
          {onSignIn ? (
            <Button onClick={onSignIn} size="sm">
              <LogIn className="mr-2 h-4 w-4" />
              Sign In
            </Button>
          ) : (
            <Button asChild size="sm">
              <Link href={`/signin${redirectUrl ? `?redirect=${encodeURIComponent(redirectUrl)}` : ''}`}>
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Link>
            </Button>
          )}

          {type === 'invalid_credentials' && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/forgot-password">
                <KeyRound className="mr-2 h-4 w-4" />
                Forgot Password?
              </Link>
            </Button>
          )}
        </div>
      </Alert>
    </div>
  );
}

/**
 * Session Expired Error
 */
export function SessionExpiredError({ onSignIn }: { onSignIn?: () => void }) {
  return <AuthError type="session_expired" onSignIn={onSignIn} redirectUrl={typeof window !== 'undefined' ? window.location.pathname : undefined} />;
}

/**
 * Invalid Credentials Error
 */
export function InvalidCredentialsError() {
  return <AuthError type="invalid_credentials" />;
}
