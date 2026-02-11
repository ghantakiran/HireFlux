'use client';

/**
 * Notification Dropdown
 * Issue #130: Notification Center (In-App)
 *
 * Dropdown component displaying notifications with filtering and actions
 */

import React, { useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  X,
  Settings,
  Target,
  MessageSquare,
  Video,
  Gift,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { useNotifications } from './notification-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Notification, NotificationType } from '@/lib/types/notifications';
import { formatDistanceToNow } from 'date-fns';

// Notification type icons
const NOTIFICATION_ICONS: Record<NotificationType, React.ElementType> = {
  application: Target,
  message: MessageSquare,
  interview: Video,
  offer: Gift,
  system: AlertCircle,
  reminder: Clock,
};

// Notification type colors
const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  application: 'text-blue-600',
  message: 'text-green-600',
  interview: 'text-purple-600',
  offer: 'text-yellow-600',
  system: 'text-gray-600 dark:text-gray-400',
  reminder: 'text-orange-600',
};

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onMarkUnread: (id: string) => void;
  onClick: (notification: Notification) => void;
}

function NotificationItem({
  notification,
  onMarkRead,
  onMarkUnread,
  onClick,
}: NotificationItemProps) {
  const Icon = NOTIFICATION_ICONS[notification.type];
  const iconColor = NOTIFICATION_COLORS[notification.type];

  return (
    <li
      role="listitem"
      data-notification-item
      data-notification-id={notification.id}
      data-notification-type={notification.type}
      data-read={notification.read ? 'true' : 'false'}
      data-action-url={notification.actionUrl || ''}
      className={`
        group
        relative px-4 py-3 border-b border-gray-100 dark:border-gray-800
        transition-colors duration-200
        hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer
        ${!notification.read ? 'bg-blue-50/50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900'}
      `}
      onClick={() => onClick(notification)}
    >
      <div className="flex gap-3">
        {/* Icon */}
        <div className={`flex-shrink-0 ${iconColor}`}>
          <Icon className="h-5 w-5" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p
              data-notification-title
              className={`text-sm font-medium text-gray-900 dark:text-gray-100 ${
                !notification.read ? 'font-semibold' : ''
              }`}
            >
              {notification.title}
            </p>

            {/* Unread indicator */}
            {!notification.read && (
              <div className="flex-shrink-0 w-2 h-2 rounded-full bg-blue-600" />
            )}
          </div>

          <p
            data-notification-message
            className="mt-1 text-sm text-gray-600 dark:text-gray-400 line-clamp-2"
          >
            {notification.message}
          </p>

          <time
            data-notification-timestamp
            dateTime={notification.timestamp}
            className="mt-1 text-xs text-gray-500 dark:text-gray-400"
          >
            {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
          </time>
        </div>

        {/* Actions (visible on hover) */}
        <div
          className="
            absolute right-2 top-2
            opacity-0 group-hover:opacity-100
            transition-opacity duration-200
          "
        >
          {notification.read ? (
            <Button
              size="sm"
              variant="ghost"
              data-mark-unread-button
              onClick={(e) => {
                e.stopPropagation();
                onMarkUnread(notification.id);
              }}
              className="h-6 w-6 p-0"
              title="Mark as unread"
            >
              <Check className="h-3 w-3" />
            </Button>
          ) : (
            <Button
              size="sm"
              variant="ghost"
              data-mark-read-button
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
              className="h-6 w-6 p-0"
              title="Mark as read"
            >
              <CheckCheck className="h-3 w-3" />
            </Button>
          )}
        </div>
      </div>
    </li>
  );
}

interface NotificationDropdownProps {
  className?: string;
}

export function NotificationDropdown({ className }: NotificationDropdownProps) {
  const {
    notifications,
    isOpen,
    closeDropdown,
    markAsRead,
    markAsUnread,
    markAllAsRead,
    filters,
    setFilters,
  } = useNotifications();

  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Filter notifications
  const filteredNotifications = notifications.filter((n) => {
    if (filters.type && filters.type !== 'all' && n.type !== filters.type) {
      return false;
    }
    if (filters.read !== undefined && n.read !== filters.read) {
      return false;
    }
    return true;
  });

  // Count by type
  const countByType = {
    all: notifications.length,
    application: notifications.filter((n) => n.type === 'application').length,
    message: notifications.filter((n) => n.type === 'message').length,
    interview: notifications.filter((n) => n.type === 'interview').length,
    offer: notifications.filter((n) => n.type === 'offer').length,
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, closeDropdown]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        closeDropdown();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeDropdown]);

  // Handle notification click
  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate if has action URL
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      closeDropdown();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      ref={dropdownRef}
      data-notification-dropdown
      className={`
        absolute right-0 mt-2 w-96 max-w-[calc(100vw-2rem)]
        bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700
        z-50 overflow-hidden
        animate-in fade-in slide-in-from-top-2 duration-200
        ${className}
      `}
    >
      {/* Header */}
      <div
        data-header
        className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950"
      >
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notifications</h2>

        <div className="flex items-center gap-2">
          {/* Mark all as read */}
          {notifications.some((n) => !n.read) && (
            <Button
              size="sm"
              variant="ghost"
              data-mark-all-read
              onClick={markAllAsRead}
              className="text-xs"
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}

          {/* Settings */}
          <Link href="/dashboard/settings/notifications">
            <Button
              size="sm"
              variant="ghost"
              data-notification-settings
              className="h-8 w-8 p-0"
              title="Notification settings"
            >
              <Settings className="h-4 w-4" />
            </Button>
          </Link>

          {/* Close button */}
          <Button
            size="sm"
            variant="ghost"
            data-notification-close
            onClick={closeDropdown}
            className="h-8 w-8 p-0"
            title="Close"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div
        data-notification-filters
        className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto"
      >
        {[
          { key: 'all', label: 'All', count: countByType.all },
          { key: 'application', label: 'Applications', count: countByType.application },
          { key: 'message', label: 'Messages', count: countByType.message },
          { key: 'interview', label: 'Interviews', count: countByType.interview },
          { key: 'offer', label: 'Offers', count: countByType.offer },
        ].map((filter) => (
          <button
            key={filter.key}
            data-filter-tab={filter.key}
            data-active={filters.type === filter.key ? 'true' : 'false'}
            onClick={() => setFilters({ ...filters, type: filter.key as any })}
            className={`
              flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
              transition-colors duration-200 whitespace-nowrap
              ${
                filters.type === filter.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }
            `}
          >
            {filter.label}
            <span
              data-tab-count
              className={`
                px-1.5 py-0.5 rounded-full text-[10px] font-semibold
                ${
                  filters.type === filter.key
                    ? 'bg-blue-500 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }
              `}
            >
              {filter.count}
            </span>
          </button>
        ))}

        {/* Unread only toggle */}
        <button
          data-unread-only-toggle
          onClick={() =>
            setFilters({
              ...filters,
              read: filters.read === false ? undefined : false,
            })
          }
          className={`
            ml-auto flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium
            transition-colors duration-200 whitespace-nowrap
            ${
              filters.read === false
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }
          `}
        >
          Unread only
        </button>
      </div>

      {/* Notification List */}
      <div className="h-96 overflow-y-auto">
        {filteredNotifications.length > 0 ? (
          <ul
            role="list"
            aria-label="Notifications"
            data-notification-list
            className="divide-y divide-gray-100 dark:divide-gray-800"
          >
            {filteredNotifications.slice(0, 10).map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onMarkRead={markAsRead}
                onMarkUnread={markAsUnread}
                onClick={handleNotificationClick}
              />
            ))}
          </ul>
        ) : (
          <div
            data-notification-empty
            className="flex flex-col items-center justify-center h-64 text-center px-4"
          >
            <Bell className="h-12 w-12 text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">No notifications</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              You're all caught up! We'll notify you when something new happens.
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      {filteredNotifications.length > 0 && (
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-950">
          <Link
            href="/dashboard/notifications"
            data-view-all-notifications
            onClick={closeDropdown}
            className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
          >
            View all notifications →
          </Link>
        </div>
      )}
    </div>
  );
}
