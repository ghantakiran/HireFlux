/**
 * PWA Utilities
 * Issue #143: Progressive Web App Support
 *
 * Utilities for:
 * - Service worker registration
 * - Install prompt handling
 * - Offline detection
 * - Push notification subscription
 */

/**
 * Register service worker
 * Returns registration object or null if not supported
 */
export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[PWA] Service workers not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service worker registered:', registration);

    // Check for updates every hour
    setInterval(() => {
      registration.update();
    }, 60 * 60 * 1000);

    // Handle updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            console.log('[PWA] New service worker available');
            (window as any).swUpdateAvailable = true;

            // Dispatch custom event
            window.dispatchEvent(new CustomEvent('sw-update-available'));
          }
        });
      }
    });

    return registration;
  } catch (error) {
    console.error('[PWA] Service worker registration failed:', error);
    (window as any).swRegistrationError = error;
    return null;
  }
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration) {
      const success = await registration.unregister();
      console.log('[PWA] Service worker unregistered:', success);
      return success;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Service worker unregistration failed:', error);
    return false;
  }
}

/**
 * Check if app is running as PWA (standalone mode)
 */
export function isPWA(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    (window.navigator as any).standalone === true // iOS
  );
}

/**
 * Check if device is iOS
 */
export function isIOS(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return (
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

/**
 * Check if device is Android
 */
export function isAndroid(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return /Android/i.test(navigator.userAgent);
}

/**
 * Check if browser supports install prompt
 */
export function supportsInstallPrompt(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  // iOS doesn't support beforeinstallprompt
  if (isIOS()) {
    return false;
  }

  return 'BeforeInstallPromptEvent' in window || 'onbeforeinstallprompt' in window;
}

/**
 * Request notification permission
 */
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }

  if (Notification.permission === 'granted') {
    return 'granted';
  }

  if (Notification.permission === 'denied') {
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (error) {
    console.error('[PWA] Notification permission request failed:', error);
    return 'denied';
  }
}

/**
 * Subscribe to push notifications
 */
export async function subscribeToPushNotifications(
  vapidPublicKey: string
): Promise<PushSubscription | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      throw new Error('Service worker not registered');
    }

    const permission = await requestNotificationPermission();
    if (permission !== 'granted') {
      throw new Error('Notification permission denied');
    }

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as BufferSource,
    });

    console.log('[PWA] Push subscription created:', subscription);
    return subscription;
  } catch (error) {
    console.error('[PWA] Push subscription failed:', error);
    return null;
  }
}

/**
 * Unsubscribe from push notifications
 */
export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      return false;
    }

    const subscription = await registration.pushManager.getSubscription();
    if (subscription) {
      const success = await subscription.unsubscribe();
      console.log('[PWA] Push subscription removed:', success);
      return success;
    }

    return false;
  } catch (error) {
    console.error('[PWA] Push unsubscription failed:', error);
    return false;
  }
}

/**
 * Helper: Convert VAPID key to Uint8Array
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }

  return outputArray;
}

/**
 * Check online/offline status
 */
export function isOnline(): boolean {
  if (typeof window === 'undefined') {
    return true; // Assume online on server
  }

  return navigator.onLine;
}

/**
 * Add online/offline event listeners
 */
export function addConnectivityListeners(
  onOnline: () => void,
  onOffline: () => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  window.addEventListener('online', onOnline);
  window.addEventListener('offline', onOffline);

  return () => {
    window.removeEventListener('online', onOnline);
    window.removeEventListener('offline', onOffline);
  };
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (typeof window === 'undefined' || !('caches' in window)) {
    return;
  }

  try {
    const cacheNames = await caches.keys();
    await Promise.all(cacheNames.map((cacheName) => caches.delete(cacheName)));
    console.log('[PWA] All caches cleared');
  } catch (error) {
    console.error('[PWA] Cache clearing failed:', error);
  }
}

/**
 * Get service worker version
 */
export async function getServiceWorkerVersion(): Promise<string | null> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration || !registration.active) {
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version || null);
      };

      const activeWorker = registration.active;
      if (activeWorker) {
        activeWorker.postMessage({ type: 'GET_VERSION' }, [messageChannel.port2]);
      }

      // Timeout after 1 second
      setTimeout(() => resolve(null), 1000);
    });
  } catch (error) {
    console.error('[PWA] Failed to get SW version:', error);
    return null;
  }
}

/**
 * Skip waiting and reload to activate new service worker
 */
export async function skipWaitingAndReload(): Promise<void> {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    if (registration && registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });

      // Reload page when new SW takes control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        window.location.reload();
      });
    }
  } catch (error) {
    console.error('[PWA] Skip waiting failed:', error);
  }
}

/**
 * Analytics tracking helpers
 */
export function trackPWAEvent(eventType: string, eventData?: Record<string, any>): void {
  if (typeof window === 'undefined') {
    return;
  }

  // Initialize analytics array if not exists
  if (!(window as any).analyticsEvents) {
    (window as any).analyticsEvents = [];
  }

  const event = {
    type: eventType,
    timestamp: new Date().toISOString(),
    isPWA: isPWA(),
    ...eventData,
  };

  (window as any).analyticsEvents.push(event);

  // Also dispatch custom event for external listeners
  window.dispatchEvent(new CustomEvent('pwa-event', { detail: event }));

  console.log('[PWA Analytics]', event);
}

/**
 * Check if install prompt was dismissed
 */
export function wasInstallPromptDismissed(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  const dismissed = localStorage.getItem('installPromptDismissed');
  const dismissedAt = localStorage.getItem('installPromptDismissedAt');

  if (!dismissed || !dismissedAt) {
    return false;
  }

  // Show again after 7 days
  const dismissedTime = parseInt(dismissedAt, 10);
  const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;

  if (Date.now() - dismissedTime > sevenDaysInMs) {
    localStorage.removeItem('installPromptDismissed');
    localStorage.removeItem('installPromptDismissedAt');
    return false;
  }

  return true;
}

/**
 * Mark install prompt as dismissed
 */
export function markInstallPromptDismissed(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem('installPromptDismissed', 'true');
  localStorage.setItem('installPromptDismissedAt', Date.now().toString());
}

/**
 * Check if app was installed
 */
export function wasAppInstalled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }

  return localStorage.getItem('appInstalled') === 'true';
}

/**
 * Mark app as installed
 */
export function markAppInstalled(): void {
  if (typeof window === 'undefined') {
    return;
  }

  localStorage.setItem('appInstalled', 'true');
  trackPWAEvent('app_installed');
}
