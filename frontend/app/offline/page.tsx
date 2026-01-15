'use client';

/**
 * Offline Page
 * Issue #143: Progressive Web App Support
 *
 * Fallback page shown when user is offline and page is not cached
 */

import { WifiOff } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  return (
    <div data-offline-page className="flex items-center justify-center min-h-screen p-6 bg-gray-50">
      <div className="text-center max-w-md">
        <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <WifiOff className="h-10 w-10 text-yellow-600" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-3">You&#39;re Offline</h1>

        <p className="text-gray-600 mb-6 leading-relaxed">
          It looks like you&#39;ve lost your internet connection. Please check your connection and try again.
        </p>

        <div className="space-y-3">
          <Button
            onClick={() => window.location.reload()}
            className="w-full"
          >
            Try Again
          </Button>

          <Button
            onClick={() => window.history.back()}
            variant="outline"
            className="w-full"
          >
            Go Back
          </Button>
        </div>

        <div className="mt-8 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-900">
            <strong>Tip:</strong> When you&#39;re online, HireFlux automatically caches pages so you can view them offline later.
          </p>
        </div>
      </div>
    </div>
  );
}
