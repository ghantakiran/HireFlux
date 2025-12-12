/**
 * Error Boundary Component
 * Catches and handles React errors gracefully
 */

'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to Sentry
    if (typeof window !== 'undefined' && (window as any).Sentry) {
      (window as any).Sentry.captureException(error, {
        contexts: {
          react: {
            componentStack: errorInfo.componentStack,
          },
        },
        tags: {
          errorBoundary: true,
          errorId: this.state.errorId,
        },
      });
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error Boundary caught an error:', error, errorInfo);
    }

    this.setState({
      errorInfo,
    });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: '',
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  handleContactSupport = () => {
    const errorDetails = `
Error ID: ${this.state.errorId}
Error: ${this.state.error?.message}
Stack: ${this.state.error?.stack}
Component Stack: ${this.state.errorInfo?.componentStack}
URL: ${window.location.href}
User Agent: ${navigator.userAgent}
    `.trim();

    // Open support form with pre-filled error details
    const supportUrl = `/support?error_id=${this.state.errorId}&details=${encodeURIComponent(
      errorDetails
    )}`;
    window.location.href = supportUrl;
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div
          className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4"
          data-testid="error-boundary"
        >
          <div className="max-w-md w-full">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8">
              {/* Error Icon */}
              <div className="flex justify-center mb-6">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                </div>
              </div>

              {/* Error Message */}
              <h1
                className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-2"
                data-testid="error-message"
              >
                Something went wrong
              </h1>

              <p
                className="text-center text-gray-600 dark:text-gray-300 mb-6"
                data-testid="error-description"
              >
                We're sorry, but something unexpected happened. Our team has been notified and is
                working on a fix.
              </p>

              {/* Error Reference */}
              {this.state.errorId && (
                <div
                  className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3 mb-6"
                  data-testid="error-reference"
                >
                  <p className="text-xs text-gray-600 dark:text-gray-400 text-center">
                    Error Reference: <code className="font-mono">{this.state.errorId}</code>
                  </p>
                </div>
              )}

              {/* Error Details (Development Only) */}
              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mb-6">
                  <summary className="cursor-pointer text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Technical Details
                  </summary>
                  <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-xs font-mono overflow-auto max-h-40">
                    <p className="text-red-600 dark:text-red-400 mb-2">
                      {this.state.error.message}
                    </p>
                    <pre className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {this.state.error.stack}
                    </pre>
                  </div>
                </details>
              )}

              {/* Recovery Actions */}
              <div className="space-y-3" data-testid="error-actions">
                <Button onClick={this.handleReset} className="w-full" size="lg">
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Try Again
                </Button>

                <Button onClick={this.handleReload} variant="outline" className="w-full" size="lg">
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Reload Page
                </Button>

                <Button onClick={this.handleGoHome} variant="outline" className="w-full" size="lg">
                  <Home className="mr-2 h-5 w-5" />
                  Go to Dashboard
                </Button>

                <Button
                  onClick={this.handleContactSupport}
                  variant="ghost"
                  className="w-full"
                  size="lg"
                >
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Contact Support
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
