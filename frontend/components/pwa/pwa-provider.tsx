'use client';

/**
 * PWA Provider Component
 * Issue #143: Progressive Web App Support
 *
 * Handles:
 * - Service worker registration
 * - Install prompt state
 * - Offline detection
 * - PWA context for children
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  registerServiceWorker,
  isPWA,
  isOnline,
  addConnectivityListeners,
  wasInstallPromptDismissed,
  markInstallPromptDismissed,
  markAppInstalled,
  trackPWAEvent,
  supportsInstallPrompt,
} from '@/lib/pwa-utils';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

interface PWAContextType {
  isOnline: boolean;
  isPWAMode: boolean;
  canInstall: boolean;
  showInstallPrompt: boolean;
  swUpdateAvailable: boolean;
  promptInstall: () => Promise<void>;
  dismissInstall: () => void;
  reloadForUpdate: () => void;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export function usePWA() {
  const context = useContext(PWAContext);
  if (!context) {
    throw new Error('usePWA must be used within PWAProvider');
  }
  return context;
}

interface PWAProviderProps {
  children: React.ReactNode;
}

export function PWAProvider({ children }: PWAProviderProps) {
  const [online, setOnline] = useState(true);
  const [isPWAMode, setIsPWAMode] = useState(false);
  const [canInstall, setCanInstall] = useState(false);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);
  const [swUpdateAvailable, setSwUpdateAvailable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  // Initialize
  useEffect(() => {
    // Check if running as PWA
    setIsPWAMode(isPWA());

    // Check initial online status
    setOnline(isOnline());

    // Register service worker
    registerServiceWorker();

    // Listen for connectivity changes
    const removeListeners = addConnectivityListeners(
      () => {
        setOnline(true);
        trackPWAEvent('connection_restored');
      },
      () => {
        setOnline(false);
        trackPWAEvent('connection_lost');
      }
    );

    // Listen for service worker updates
    const handleSWUpdate = () => {
      setSwUpdateAvailable(true);
      trackPWAEvent('sw_update_available');
    };

    window.addEventListener('sw-update-available', handleSWUpdate);

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
      setCanInstall(true);

      // Show install prompt if not dismissed recently
      if (!wasInstallPromptDismissed()) {
        setTimeout(() => {
          setShowInstallPrompt(true);
          trackPWAEvent('install_prompt_shown');
        }, 5000); // Show after 5 seconds
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Listen for app installed event
    const handleAppInstalled = () => {
      setCanInstall(false);
      setShowInstallPrompt(false);
      setDeferredPrompt(null);
      markAppInstalled();
      trackPWAEvent('app_installed');
    };

    window.addEventListener('appinstalled', handleAppInstalled);

    // Track PWA usage
    if (isPWA()) {
      trackPWAEvent('pwa_session_start');
    }

    // Cleanup
    return () => {
      removeListeners();
      window.removeEventListener('sw-update-available', handleSWUpdate);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  // Prompt install
  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) {
      console.warn('[PWA] No deferred install prompt available');
      return;
    }

    try {
      (window as any).installPromptTriggered = true;
      await deferredPrompt.prompt();

      const choiceResult = await deferredPrompt.userChoice;

      if (choiceResult.outcome === 'accepted') {
        trackPWAEvent('install_prompt_accepted');
      } else {
        trackPWAEvent('install_prompt_rejected');
      }

      setDeferredPrompt(null);
      setShowInstallPrompt(false);
    } catch (error) {
      console.error('[PWA] Install prompt failed:', error);
      trackPWAEvent('install_prompt_error', { error: String(error) });
    }
  }, [deferredPrompt]);

  // Dismiss install prompt
  const dismissInstall = useCallback(() => {
    setShowInstallPrompt(false);
    markInstallPromptDismissed();
    trackPWAEvent('install_prompt_dismissed');
  }, []);

  // Reload for service worker update
  const reloadForUpdate = useCallback(() => {
    trackPWAEvent('sw_update_accepted');
    window.location.reload();
  }, []);

  const value: PWAContextType = {
    isOnline: online,
    isPWAMode,
    canInstall,
    showInstallPrompt,
    swUpdateAvailable,
    promptInstall,
    dismissInstall,
    reloadForUpdate,
  };

  return <PWAContext.Provider value={value}>{children}</PWAContext.Provider>;
}
