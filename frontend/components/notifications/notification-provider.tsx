'use client';

/**
 * Notification Provider
 * Issue #130: Notification Center (In-App)
 *
 * React Context provider for managing notification state and actions
 * Includes real-time updates, persistence, and preferences
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type {
  Notification,
  NotificationFilters,
  NotificationPreferences,
  NotificationContextType,
} from '@/lib/types/notifications';
import { DEFAULT_NOTIFICATION_PREFERENCES } from '@/lib/types/notifications';
import { MOCK_NOTIFICATIONS } from '@/lib/mock-data/notifications';

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

interface NotificationProviderProps {
  children: React.ReactNode;
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  // State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<NotificationFilters>({ type: 'all' });
  const [preferences, setPreferences] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  // Computed values
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Initialize notifications from localStorage or mock data
  useEffect(() => {
    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        // Try to load from localStorage first
        const stored = localStorage.getItem('notifications');
        if (stored) {
          const parsed = JSON.parse(stored);
          setNotifications(parsed);
        } else {
          // Use mock data
          setNotifications(MOCK_NOTIFICATIONS);
          localStorage.setItem('notifications', JSON.stringify(MOCK_NOTIFICATIONS));
        }

        // Load preferences
        const storedPrefs = localStorage.getItem('notification-preferences');
        if (storedPrefs) {
          setPreferences(JSON.parse(storedPrefs));
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
        setNotifications(MOCK_NOTIFICATIONS);
      } finally {
        setIsLoading(false);
      }
    };

    loadNotifications();
  }, []);

  // Persist notifications to localStorage whenever they change
  useEffect(() => {
    if (!isLoading && notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications, isLoading]);

  // Listen for new notifications (custom event)
  useEffect(() => {
    const handleNewNotification = (event: CustomEvent) => {
      const newNotification = event.detail as Notification;

      // Add to notifications
      setNotifications((prev) => [newNotification, ...prev]);

      // Play sound if enabled
      if (preferences.sound.enabled) {
        playNotificationSound();
      }

      // Show browser notification if enabled and permission granted
      if (preferences.browser.enabled && preferences.browser.permission === 'granted') {
        showBrowserNotification(newNotification);
      }
    };

    window.addEventListener('new-notification', handleNewNotification as EventListener);

    return () => {
      window.removeEventListener('new-notification', handleNewNotification as EventListener);
    };
  }, [preferences]);

  // Dropdown actions
  const openDropdown = useCallback(() => {
    setIsOpen(true);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  // Mark notifications as read/unread
  const markAsRead = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  }, []);

  const markAsUnread = useCallback(async (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: false } : n))
    );
  }, []);

  const markAllAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }, []);

  // Delete notifications
  const deleteNotification = useCallback(async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  const deleteAll = useCallback(async () => {
    setNotifications([]);
    localStorage.removeItem('notifications');
  }, []);

  const clearRead = useCallback(async () => {
    setNotifications((prev) => prev.filter((n) => !n.read));
  }, []);

  // Update preferences
  const updatePreferences = useCallback(
    async (newPreferences: Partial<NotificationPreferences>) => {
      const updated = { ...preferences, ...newPreferences };
      setPreferences(updated);
      localStorage.setItem('notification-preferences', JSON.stringify(updated));

      // Request browser notification permission if enabling
      if (newPreferences.browser?.enabled && Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        setPreferences((prev) => ({
          ...prev,
          browser: { ...prev.browser, permission },
        }));
      }
    },
    [preferences]
  );

  // Real-time subscription (placeholder for WebSocket/SSE)
  const subscribeToNotifications = useCallback(() => {
    // TODO: Implement WebSocket or Server-Sent Events connection
  }, []);

  const unsubscribeFromNotifications = useCallback(() => {
    // TODO: Clean up WebSocket/SSE connection
  }, []);

  // Helper: Play notification sound
  const playNotificationSound = () => {
    try {
      const audio = new Audio('/sounds/notification.mp3');
      audio.volume = preferences.sound.volume / 100;
      audio.play().catch((error) => {
        console.error('Error playing notification sound:', error);
      });
    } catch (error) {
      console.error('Error creating audio:', error);
    }
  };

  // Helper: Show browser notification
  const showBrowserNotification = (notification: Notification) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(notification.title, {
          body: notification.message,
          icon: '/icon-192.png',
          badge: '/icon-72.png',
          tag: notification.id,
        });
      } catch (error) {
        console.error('Error showing browser notification:', error);
      }
    }
  };

  const value: NotificationContextType = {
    // State
    notifications,
    unreadCount,
    isOpen,
    isLoading,
    filters,
    preferences,

    // Actions
    openDropdown,
    closeDropdown,
    toggleDropdown,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    deleteNotification,
    deleteAll,
    clearRead,
    setFilters,
    updatePreferences,

    // Real-time
    subscribeToNotifications,
    unsubscribeFromNotifications,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
}

// Custom hook to use notification context
export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
}
