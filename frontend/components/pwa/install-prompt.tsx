'use client';

/**
 * Install Prompt Component
 * Issue #143: Progressive Web App Support
 *
 * Shows a custom install prompt for PWA
 * - Dismissible
 * - iOS-specific instructions
 * - Analytics tracking
 */

import React, { useState, useEffect } from 'react';
import { X, Download, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from './pwa-provider';
import { isIOS } from '@/lib/pwa-utils';

export function InstallPrompt() {
  const { showInstallPrompt, promptInstall, dismissInstall, canInstall } = usePWA();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const [isIOSDevice, setIsIOSDevice] = useState(false);

  useEffect(() => {
    setIsIOSDevice(isIOS());
  }, []);

  if (!showInstallPrompt || !canInstall) {
    return null;
  }

  const handleInstall = async () => {
    if (isIOSDevice) {
      setShowIOSInstructions(true);
    } else {
      await promptInstall();
    }
  };

  return (
    <div
      data-install-prompt
      className="fixed bottom-20 left-4 right-4 z-50 animate-in slide-in-from-bottom-5 lg:left-auto lg:right-4 lg:w-96"
    >
      <div className="bg-white dark:bg-gray-900 rounded-lg shadow-2xl border border-gray-200 dark:border-gray-700 p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center flex-shrink-0">
              <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-gray-100">Install HireFlux</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get quick access from your home screen</p>
            </div>
          </div>
          <Button
            data-dismiss-install
            variant="ghost"
            size="icon"
            onClick={dismissInstall}
            className="h-8 w-8 -mt-1 -mr-1"
            aria-label="Dismiss install prompt"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* iOS Instructions */}
        {showIOSInstructions && isIOSDevice ? (
          <div data-ios-install-instructions className="space-y-3 animate-in fade-in">
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">To install on iOS:</p>
            <ol className="text-sm text-gray-600 dark:text-gray-400 space-y-2 list-decimal list-inside">
              <li className="flex items-start gap-2">
                <span className="flex-1">
                  Tap the <Share className="inline h-4 w-4 mx-1" /> Share button in Safari
                </span>
              </li>
              <li>Scroll down and tap &quot;Add to Home Screen&quot;</li>
              <li>Tap &quot;Add&quot; in the top right corner</li>
            </ol>
            <Button
              onClick={() => setShowIOSInstructions(false)}
              variant="outline"
              className="w-full"
            >
              Got it
            </Button>
          </div>
        ) : (
          <div className="flex gap-2">
            <Button
              data-install-app-button
              onClick={handleInstall}
              className="flex-1"
              aria-label="Install HireFlux app"
            >
              <Download className="h-4 w-4 mr-2" />
              Install App
            </Button>
            <Button
              data-dismiss-install
              onClick={dismissInstall}
              variant="outline"
              aria-label="Not now"
            >
              Not Now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
