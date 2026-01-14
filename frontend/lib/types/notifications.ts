/**
 * Notification System Types
 * Issue #130: Notification Center (In-App)
 *
 * Type definitions for the notification system including:
 * - Notification structure
 * - Notification preferences
 * - Context and provider types
 */

export type NotificationType =
  | 'application'
  | 'message'
  | 'interview'
  | 'offer'
  | 'system'
  | 'reminder';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  read: boolean;
  timestamp: string; // ISO 8601 format
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
  userId: string;
}

export interface NotificationPreferences {
  // In-app notifications
  inApp: {
    enabled: boolean;
    types: {
      application: boolean;
      message: boolean;
      interview: boolean;
      offer: boolean;
      system: boolean;
      reminder: boolean;
    };
  };

  // Email notifications
  email: {
    enabled: boolean;
    types: {
      application: boolean;
      message: boolean;
      interview: boolean;
      offer: boolean;
      system: boolean;
      reminder: boolean;
    };
    digest: 'instant' | 'hourly' | 'daily' | 'weekly';
  };

  // Browser push notifications
  browser: {
    enabled: boolean;
    permission: 'default' | 'granted' | 'denied';
  };

  // Sound notifications
  sound: {
    enabled: boolean;
    volume: number; // 0-100
  };
}

export interface NotificationFilters {
  type?: NotificationType | 'all';
  read?: boolean;
  priority?: NotificationPriority;
  startDate?: string;
  endDate?: string;
}

export interface NotificationStats {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
  byPriority: Record<NotificationPriority, number>;
}

export interface NotificationContextType {
  // State
  notifications: Notification[];
  unreadCount: number;
  isOpen: boolean;
  isLoading: boolean;
  filters: NotificationFilters;
  preferences: NotificationPreferences;

  // Actions
  openDropdown: () => void;
  closeDropdown: () => void;
  toggleDropdown: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAsUnread: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAll: () => Promise<void>;
  clearRead: () => Promise<void>;
  setFilters: (filters: NotificationFilters) => void;
  updatePreferences: (preferences: Partial<NotificationPreferences>) => Promise<void>;

  // Real-time
  subscribeToNotifications: () => void;
  unsubscribeFromNotifications: () => void;
}

export interface NotificationEvent {
  type: 'new' | 'update' | 'delete';
  notification: Notification;
}

// Default preferences
export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inApp: {
    enabled: true,
    types: {
      application: true,
      message: true,
      interview: true,
      offer: true,
      system: true,
      reminder: true,
    },
  },
  email: {
    enabled: true,
    types: {
      application: true,
      message: true,
      interview: true,
      offer: true,
      system: false,
      reminder: true,
    },
    digest: 'instant',
  },
  browser: {
    enabled: false,
    permission: 'default',
  },
  sound: {
    enabled: true,
    volume: 50,
  },
};

// Notification type metadata
export const NOTIFICATION_TYPE_CONFIG = {
  application: {
    label: 'Applications',
    icon: 'Target',
    color: 'blue',
  },
  message: {
    label: 'Messages',
    icon: 'MessageSquare',
    color: 'green',
  },
  interview: {
    label: 'Interviews',
    icon: 'Video',
    color: 'purple',
  },
  offer: {
    label: 'Offers',
    icon: 'Gift',
    color: 'yellow',
  },
  system: {
    label: 'System',
    icon: 'Settings',
    color: 'gray',
  },
  reminder: {
    label: 'Reminders',
    icon: 'Bell',
    color: 'orange',
  },
} as const;

// Priority colors
export const NOTIFICATION_PRIORITY_CONFIG = {
  low: {
    label: 'Low',
    color: 'gray',
  },
  normal: {
    label: 'Normal',
    color: 'blue',
  },
  high: {
    label: 'High',
    color: 'orange',
  },
  urgent: {
    label: 'Urgent',
    color: 'red',
  },
} as const;
