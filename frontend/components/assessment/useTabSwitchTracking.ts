/**
 * useTabSwitchTracking Hook - Sprint 19-20 Week 38 Day 2
 *
 * Tracks tab switching and full-screen exit events for assessment anti-cheating.
 * Calls backend API to log suspicious behavior.
 */

'use client';

import { useEffect, useRef, useCallback } from 'react';
import { candidateAssessmentApi } from '@/lib/api';
import { toast } from 'sonner';

export interface TabSwitchTrackingOptions {
  /** Assessment attempt ID */
  attemptId: string | null;
  /** Whether tracking is enabled (only when assessment is in progress) */
  enabled: boolean;
  /** Callback when tab switch is detected */
  onTabSwitch?: () => void;
  /** Callback when full-screen exit is detected */
  onFullScreenExit?: () => void;
  /** Callback when suspicious behavior is detected */
  onSuspiciousBehavior?: (eventType: string) => void;
}

export function useTabSwitchTracking({
  attemptId,
  enabled,
  onTabSwitch,
  onFullScreenExit,
  onSuspiciousBehavior,
}: TabSwitchTrackingOptions) {
  const tabSwitchCount = useRef(0);
  const fullScreenExitCount = useRef(0);
  const lastVisibilityChange = useRef<number>(0);

  const trackEvent = useCallback(
    async (
      eventType: 'tab_switch' | 'copy_paste' | 'ip_change' | 'full_screen_exit' | 'suspicious_behavior',
      details?: Record<string, any>
    ) => {
      if (!attemptId || !enabled) return;

      try {
        await candidateAssessmentApi.trackEvent(attemptId, {
          event_type: eventType,
          details: {
            ...details,
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
          },
        });
      } catch (error) {
        console.error('Failed to track event:', error);
        // Don't show error to user - silent tracking
      }
    },
    [attemptId, enabled]
  );

  // Track tab visibility changes (tab switches)
  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      const now = Date.now();

      // Prevent rapid-fire events (debounce by 1 second)
      if (now - lastVisibilityChange.current < 1000) return;
      lastVisibilityChange.current = now;

      if (document.hidden) {
        // User switched away from tab
        tabSwitchCount.current += 1;

        // Track event
        trackEvent('tab_switch', {
          count: tabSwitchCount.current,
          hidden: true,
        });

        // Show warning after 3rd switch
        if (tabSwitchCount.current === 3) {
          toast.warning('Tab switching is being monitored', {
            duration: 5000,
          });
        }

        // Callback
        onTabSwitch?.();

        // Flag as suspicious after 5 switches
        if (tabSwitchCount.current >= 5) {
          onSuspiciousBehavior?.('excessive_tab_switching');
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled, trackEvent, onTabSwitch, onSuspiciousBehavior]);

  // Track full-screen exit
  useEffect(() => {
    if (!enabled) return;

    const handleFullScreenChange = () => {
      if (!document.fullscreenElement) {
        // User exited full screen
        fullScreenExitCount.current += 1;

        // Track event
        trackEvent('full_screen_exit', {
          count: fullScreenExitCount.current,
        });

        // Show warning
        toast.warning('Please stay in full-screen mode during the assessment', {
          duration: 5000,
        });

        // Callback
        onFullScreenExit?.();

        // Flag as suspicious after 3 exits
        if (fullScreenExitCount.current >= 3) {
          onSuspiciousBehavior?.('excessive_fullscreen_exit');
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullScreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullScreenChange);
    };
  }, [enabled, trackEvent, onFullScreenExit, onSuspiciousBehavior]);

  // Track copy/paste attempts (optional - can be disabled if too intrusive)
  useEffect(() => {
    if (!enabled) return;

    const handleCopyPaste = (event: ClipboardEvent) => {
      const eventType = event.type as 'copy' | 'paste';

      trackEvent('copy_paste', {
        type: eventType,
        length: event.clipboardData?.getData('text').length || 0,
      });

      // Only warn on paste (copying is usually fine)
      if (eventType === 'paste') {
        // Don't block - just track
        // Could implement stricter rules if needed
      }
    };

    document.addEventListener('copy', handleCopyPaste as EventListener);
    document.addEventListener('paste', handleCopyPaste as EventListener);

    return () => {
      document.removeEventListener('copy', handleCopyPaste as EventListener);
      document.removeEventListener('paste', handleCopyPaste as EventListener);
    };
  }, [enabled, trackEvent]);

  // Track suspicious mouse/keyboard patterns (e.g., rapid clicking)
  useEffect(() => {
    if (!enabled) return;

    let clickCount = 0;
    let clickTimer: NodeJS.Timeout;

    const handleClick = () => {
      clickCount += 1;

      clearTimeout(clickTimer);

      // Check for rapid clicking (10+ clicks in 2 seconds)
      clickTimer = setTimeout(() => {
        if (clickCount >= 10) {
          trackEvent('suspicious_behavior', {
            type: 'rapid_clicking',
            count: clickCount,
          });
          onSuspiciousBehavior?.('rapid_clicking');
        }
        clickCount = 0;
      }, 2000);
    };

    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('click', handleClick);
      clearTimeout(clickTimer);
    };
  }, [enabled, trackEvent, onSuspiciousBehavior]);

  return {
    tabSwitchCount: tabSwitchCount.current,
    fullScreenExitCount: fullScreenExitCount.current,
  };
}
