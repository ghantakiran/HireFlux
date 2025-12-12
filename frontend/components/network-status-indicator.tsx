'use client';

/**
 * Network Status Indicator Component (Issue #138)
 *
 * Shows a banner when the user goes offline and notifies
 * when they come back online.
 */

import { useOnlineStatus } from '@/hooks/use-online-status';
import { WifiOff, Wifi } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function NetworkStatusIndicator() {
  const { isOnline, isOffline, justCameOnline } = useOnlineStatus();

  // Show offline indicator
  if (isOffline) {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top"
        data-testid="offline-indicator"
      >
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <WifiOff className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium" data-testid="offline-message">You're offline.</span> Some features may be unavailable.
            We'll reconnect automatically when you're back online.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Show online message briefly after reconnecting
  if (justCameOnline) {
    return (
      <div
        className="fixed top-0 left-0 right-0 z-50 animate-in slide-in-from-top"
        data-testid="online-indicator"
      >
        <Alert className="rounded-none border-x-0 border-t-0 border-green-500 bg-green-50 text-green-900 dark:bg-green-900/20 dark:text-green-100">
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            <span className="font-medium">You're back online!</span> All features are now available.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return null;
}
