/**
 * PWA Installer Component
 * Registers service worker and provides install prompt
 */

'use client';

import { useEffect, useState } from 'react';

export function PWAInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallPrompt, setShowInstallPrompt] = useState(false);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registered:', registration);

          // Check for updates periodically
          setInterval(() => {
            registration.update();
          }, 60 * 60 * 1000); // Check every hour
        })
        .catch((error) => {
          console.error('Service Worker registration failed:', error);
        });
    }

    // Listen for install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
      // Show install button
      setShowInstallPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // Hide install button when already installed
    window.addEventListener('appinstalled', () => {
      setShowInstallPrompt(false);
      console.log('PWA was installed');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);

    // Clear the prompt
    setDeferredPrompt(null);
    setShowInstallPrompt(false);
  };

  // Install prompt UI (optional - can be customized)
  if (!showInstallPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 shadow-lg rounded-lg p-4 max-w-sm border border-gray-200 dark:border-gray-700 z-50">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
            Install HireFlux
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Install our app for a better experience with offline access and faster loading.
          </p>
        </div>
        <button
          onClick={() => setShowInstallPrompt(false)}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          aria-label="Close"
        >
          ×
        </button>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          onClick={handleInstallClick}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          Install
        </button>
        <button
          onClick={() => setShowInstallPrompt(false)}
          className="px-4 py-2 text-gray-600 dark:text-gray-300 text-sm font-medium"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
