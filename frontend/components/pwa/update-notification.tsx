'use client';

/**
 * Service Worker Update Notification
 * Issue #143: Progressive Web App Support
 *
 * Notifies user when a new version is available
 * - Allows user to update immediately or dismiss
 */

import React from 'react';
import { RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from './pwa-provider';

export function UpdateNotification() {
  const { swUpdateAvailable, reloadForUpdate } = usePWA();
  const [dismissed, setDismissed] = React.useState(false);

  if (!swUpdateAvailable || dismissed) {
    return null;
  }

  return (
    <div
      data-sw-update-notification
      className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 lg:left-auto lg:right-4 lg:w-96"
    >
      <div className="bg-blue-600 text-white rounded-lg shadow-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
            <RefreshCw className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold mb-1">Update Available</h3>
            <p className="text-sm text-blue-100 mb-3">
              A new version of HireFlux is available. Reload to get the latest features and fixes.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={reloadForUpdate}
                variant="secondary"
                size="sm"
                className="flex-1"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Now
              </Button>
              <Button
                onClick={() => setDismissed(true)}
                variant="ghost"
                size="sm"
                className="text-white hover:bg-blue-700"
              >
                Later
              </Button>
            </div>
          </div>
          <Button
            onClick={() => setDismissed(true)}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-white hover:bg-blue-700 -mt-1 -mr-1"
            aria-label="Dismiss update notification"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
