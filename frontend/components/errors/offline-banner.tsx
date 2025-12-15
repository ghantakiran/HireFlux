/**
 * Offline Banner Component
 * Issue #138: Error States & Recovery Flows
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useOffline } from '@/lib/errors/use-offline';
import { WifiOff, Wifi, X, CloudOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion, AnimatePresence } from 'framer-motion';

// ============================================================================
// TYPES
// ============================================================================

interface OfflineBannerProps {
  /** Position of the banner */
  position?: 'top' | 'bottom';

  /** Whether banner is dismissible */
  dismissible?: boolean;

  /** Show queued actions count */
  showQueueCount?: boolean;

  /** Custom className */
  className?: string;
}

// ============================================================================
// COMPONENT
// ============================================================================

export function OfflineBanner({
  position = 'top',
  dismissible = true,
  showQueueCount = true,
  className = '',
}: OfflineBannerProps) {
  const { isOffline, queuedActions } = useOffline();
  const [dismissed, setDismissed] = useState(false);
  const [showOnlineMessage, setShowOnlineMessage] = useState(false);
  const [wasOffline, setWasOffline] = useState(false);

  // Handle offline/online state changes
  useEffect(() => {
    if (isOffline) {
      setWasOffline(true);
      setDismissed(false); // Reset dismissed state when going offline
    } else if (wasOffline) {
      // Just came back online
      setShowOnlineMessage(true);

      // Auto-hide online message after 3 seconds
      const timeout = setTimeout(() => {
        setShowOnlineMessage(false);
        setWasOffline(false);
      }, 3000);

      return () => clearTimeout(timeout);
    }
  }, [isOffline, wasOffline]);

  const handleDismiss = () => {
    setDismissed(true);
  };

  const handleDismissOnlineMessage = () => {
    setShowOnlineMessage(false);
    setWasOffline(false);
  };

  const positionClasses = position === 'top'
    ? 'top-0 left-0 right-0'
    : 'bottom-0 left-0 right-0';

  return (
    <>
      {/* Offline Banner */}
      <AnimatePresence>
        {isOffline && !dismissed && (
          <motion.div
            initial={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed ${positionClasses} z-50 ${className}`}
            data-testid="offline-banner"
          >
            <div className="bg-yellow-500 dark:bg-yellow-600 text-yellow-950 dark:text-yellow-50 shadow-lg">
              <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <WifiOff className="h-5 w-5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="font-medium text-sm sm:text-base">
                        You're offline
                      </p>
                      <p className="text-xs sm:text-sm opacity-90 mt-0.5">
                        Some features may be unavailable
                        {showQueueCount && queuedActions.length > 0 && (
                          <span className="ml-2">
                            ({queuedActions.length} action{queuedActions.length !== 1 ? 's' : ''} queued)
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {dismissible && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleDismiss}
                      className="text-yellow-950 dark:text-yellow-50 hover:bg-yellow-600 dark:hover:bg-yellow-700"
                      data-testid="offline-banner-dismiss"
                      aria-label="Dismiss offline banner"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Online Success Message */}
      <AnimatePresence>
        {showOnlineMessage && !isOffline && (
          <motion.div
            initial={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: position === 'top' ? -100 : 100, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className={`fixed ${positionClasses} z-50 ${className}`}
            data-testid="online-success-message"
          >
            <div className="bg-green-500 dark:bg-green-600 text-green-950 dark:text-green-50 shadow-lg">
              <div className="max-w-7xl mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <Wifi className="h-5 w-5 flex-shrink-0" />
                    <p className="font-medium text-sm sm:text-base">
                      You're back online
                    </p>
                  </div>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleDismissOnlineMessage}
                    className="text-green-950 dark:text-green-50 hover:bg-green-600 dark:hover:bg-green-700"
                    aria-label="Dismiss online message"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// ============================================================================
// OFFLINE INDICATOR (Header/Status Bar)
// ============================================================================

interface OfflineIndicatorProps {
  /** Show text or icon only */
  mode?: 'full' | 'icon';

  /** Custom className */
  className?: string;
}

export function OfflineIndicator({ mode = 'full', className = '' }: OfflineIndicatorProps) {
  const { isOffline } = useOffline();

  if (!isOffline) return null;

  return (
    <div
      className={`flex items-center gap-2 px-2 py-1 rounded-full bg-yellow-100 dark:bg-yellow-900 text-yellow-900 dark:text-yellow-100 ${className}`}
      data-testid="offline-indicator"
      title="Offline - some features unavailable"
    >
      <CloudOff className="h-4 w-4" />
      {mode === 'full' && (
        <span className="text-xs font-medium">Offline</span>
      )}
    </div>
  );
}

// ============================================================================
// QUEUED ACTIONS DISPLAY
// ============================================================================

export function QueuedActionsDisplay() {
  const { queuedActions, removeAction } = useOffline();

  if (queuedActions.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-sm" data-testid="queued-actions-display">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            Queued Actions ({queuedActions.length})
          </h3>
        </div>

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {queuedActions.map((action) => (
            <div
              key={action.id}
              className="flex items-center justify-between gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded text-xs"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-gray-100 truncate">
                  {action.type}
                </p>
                <p className="text-gray-500 dark:text-gray-400 text-xs">
                  {action.processed ? 'Processed' : 'Pending'}
                </p>
              </div>
              {!action.processed && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => removeAction(action.id)}
                  className="h-6 w-6 p-0"
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
