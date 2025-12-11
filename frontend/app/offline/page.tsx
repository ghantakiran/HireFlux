/**
 * Offline Page
 * Shown when user is offline and tries to navigate
 */

'use client';

import { WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4">
      <div className="max-w-md w-full text-center">
        <WifiOff className="h-24 w-24 text-gray-400 mx-auto mb-6" />

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-3">
          You're Offline
        </h1>

        <p className="text-gray-600 dark:text-gray-300 mb-8">
          It looks like you've lost your internet connection. Check your connection and try again.
        </p>

        <Button onClick={handleRetry} size="lg" className="w-full sm:w-auto">
          <RefreshCw className="mr-2 h-5 w-5" />
          Try Again
        </Button>

        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            <strong>Tip:</strong> Some features may still work offline thanks to our PWA technology.
            You can browse cached pages and view previously loaded data.
          </p>
        </div>
      </div>
    </div>
  );
}
