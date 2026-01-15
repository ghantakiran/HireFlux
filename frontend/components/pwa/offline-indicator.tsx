'use client';

/**
 * Offline Indicator Component
 * Issue #143: Progressive Web App Support
 *
 * Shows a banner when the user goes offline
 * - Auto-hides when back online
 * - ARIA live region for screen readers
 */

import React from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { usePWA } from './pwa-provider';

export function OfflineIndicator() {
  const { isOnline } = usePWA();

  if (isOnline) {
    return null;
  }

  return (
    <div
      data-offline-banner
      data-offline-indicator
      className="fixed top-0 left-0 right-0 z-50 bg-yellow-500 text-white px-4 py-2 animate-in slide-in-from-top"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <WifiOff className="h-4 w-4" />
        <span>You&#39;re offline. Some features may not be available.</span>
      </div>
    </div>
  );
}

export function OnlineIndicator() {
  const { isOnline } = usePWA();
  const [justCameOnline, setJustCameOnline] = React.useState(false);

  React.useEffect(() => {
    if (isOnline && justCameOnline) {
      const timer = setTimeout(() => {
        setJustCameOnline(false);
      }, 3000);

      return () => clearTimeout(timer);
    }

    if (isOnline && !justCameOnline) {
      // Check if we were offline before
      const wasOffline = sessionStorage.getItem('wasOffline') === 'true';
      if (wasOffline) {
        setJustCameOnline(true);
        sessionStorage.removeItem('wasOffline');
      }
    }

    if (!isOnline) {
      sessionStorage.setItem('wasOffline', 'true');
    }
  }, [isOnline, justCameOnline]);

  if (!justCameOnline) {
    return null;
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white px-4 py-2 animate-in slide-in-from-top"
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center justify-center gap-2 text-sm font-medium">
        <Wifi className="h-4 w-4" />
        <span>Back online</span>
      </div>
    </div>
  );
}
