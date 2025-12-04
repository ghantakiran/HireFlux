'use client';

/**
 * Online Status Hook (Issue #138)
 *
 * Detects when the user goes offline/online and provides
 * real-time connection status updates.
 */

import { useState, useEffect } from 'react';

interface OnlineStatusState {
  isOnline: boolean;
  wasOffline: boolean;
}

export function useOnlineStatus() {
  const [status, setStatus] = useState<OnlineStatusState>({
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    wasOffline: false,
  });

  useEffect(() => {
    // Check if we're in the browser
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => {
      setStatus(prev => ({
        isOnline: true,
        wasOffline: !prev.isOnline, // Track if we just came back online
      }));
    };

    const handleOffline = () => {
      setStatus({
        isOnline: false,
        wasOffline: false,
      });
    };

    // Add event listeners
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Cleanup
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return status;
}

/**
 * Hook to queue actions when offline and execute when back online
 */
export function useOfflineQueue<T = any>() {
  const { isOnline, wasOffline } = useOnlineStatus();
  const [queue, setQueue] = useState<Array<() => Promise<T>>>([]);

  useEffect(() => {
    // When coming back online, execute queued actions
    if (isOnline && wasOffline && queue.length > 0) {
      const executeQueue = async () => {
        for (const action of queue) {
          try {
            await action();
          } catch (error) {
            console.error('Failed to execute queued action:', error);
          }
        }
        // Clear queue after execution
        setQueue([]);
      };

      executeQueue();
    }
  }, [isOnline, wasOffline, queue]);

  const addToQueue = (action: () => Promise<T>) => {
    if (!isOnline) {
      setQueue(prev => [...prev, action]);
      return { queued: true };
    } else {
      // Execute immediately if online
      action();
      return { queued: false };
    }
  };

  return {
    isOnline,
    queueLength: queue.length,
    addToQueue,
  };
}
