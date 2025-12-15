/**
 * Offline detection hook
 * Issue #138: Error States & Recovery Flows
 */

'use client';

import { useState, useEffect } from 'react';
import { OfflineState, QueuedAction } from './types';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// OFFLINE HOOK
// ============================================================================

export function useOffline() {
  const [offlineState, setOfflineState] = useState<OfflineState>({
    isOffline: false,
    queuedActions: [],
  });

  useEffect(() => {
    // Initialize with current online status
    setOfflineState((prev) => ({
      ...prev,
      isOffline: !navigator.onLine,
    }));

    // Handle going offline
    const handleOffline = () => {
      setOfflineState((prev) => ({
        ...prev,
        isOffline: true,
        offlineSince: new Date(),
      }));
    };

    // Handle coming back online
    const handleOnline = () => {
      setOfflineState((prev) => ({
        ...prev,
        isOffline: false,
        onlineSince: new Date(),
      }));

      // Process queued actions when back online
      setTimeout(() => {
        processQueuedActions();
      }, 1000); // Small delay to ensure connection is stable
    };

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  /**
   * Queue an action to be executed when back online
   */
  const queueAction = (type: string, payload: any): string => {
    const action: QueuedAction = {
      id: uuidv4(),
      type,
      payload,
      queuedAt: new Date(),
      processed: false,
    };

    setOfflineState((prev) => ({
      ...prev,
      queuedActions: [...prev.queuedActions, action],
    }));

    // Save to localStorage for persistence
    saveQueueToStorage([...offlineState.queuedActions, action]);

    return action.id;
  };

  /**
   * Process all queued actions
   */
  const processQueuedActions = async () => {
    const queue = [...offlineState.queuedActions];

    for (const action of queue) {
      if (action.processed) continue;

      try {
        // Execute action based on type
        await executeAction(action);

        // Mark as processed
        setOfflineState((prev) => ({
          ...prev,
          queuedActions: prev.queuedActions.map((a) =>
            a.id === action.id ? { ...a, processed: true } : a
          ),
        }));
      } catch (error) {
        // Mark action with error
        setOfflineState((prev) => ({
          ...prev,
          queuedActions: prev.queuedActions.map((a) =>
            a.id === action.id ? { ...a, error: error as any } : a
          ),
        }));
      }
    }

    // Clean up processed actions after 1 minute
    setTimeout(() => {
      setOfflineState((prev) => ({
        ...prev,
        queuedActions: prev.queuedActions.filter((a) => !a.processed),
      }));
    }, 60000);
  };

  /**
   * Execute a queued action
   */
  const executeAction = async (action: QueuedAction): Promise<void> => {
    // This would be implemented based on your app's action handlers
    // For now, just dispatch a custom event that the app can listen to
    const event = new CustomEvent('offline-action-execute', {
      detail: action,
    });
    window.dispatchEvent(event);
  };

  /**
   * Clear all queued actions
   */
  const clearQueue = () => {
    setOfflineState((prev) => ({
      ...prev,
      queuedActions: [],
    }));
    localStorage.removeItem('offline-queue');
  };

  /**
   * Remove specific action from queue
   */
  const removeAction = (actionId: string) => {
    setOfflineState((prev) => ({
      ...prev,
      queuedActions: prev.queuedActions.filter((a) => a.id !== actionId),
    }));
  };

  return {
    isOffline: offlineState.isOffline,
    offlineSince: offlineState.offlineSince,
    onlineSince: offlineState.onlineSince,
    queuedActions: offlineState.queuedActions,
    queueAction,
    clearQueue,
    removeAction,
  };
}

// ============================================================================
// STORAGE HELPERS
// ============================================================================

function saveQueueToStorage(queue: QueuedAction[]) {
  try {
    localStorage.setItem('offline-queue', JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to save offline queue:', error);
  }
}

function loadQueueFromStorage(): QueuedAction[] {
  try {
    const stored = localStorage.getItem('offline-queue');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Failed to load offline queue:', error);
  }
  return [];
}
