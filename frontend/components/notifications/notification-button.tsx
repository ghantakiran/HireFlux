'use client';

/**
 * Notification Button
 * Issue #130: Notification Center (In-App)
 *
 * Button component with badge for triggering notification dropdown
 */

import React from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from './notification-provider';
import { NotificationDropdown } from './notification-dropdown';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function NotificationButton() {
  const { unreadCount, isOpen, toggleDropdown } = useNotifications();

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        data-notification-button
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
        aria-expanded={isOpen}
        onClick={toggleDropdown}
        className="relative"
      >
        <Bell className="h-5 w-5" />

        {/* Badge */}
        {unreadCount > 0 && (
          <Badge
            data-notification-badge
            variant="destructive"
            className="
              absolute -top-1 -right-1
              h-5 w-5 rounded-full p-0
              flex items-center justify-center
              text-[10px] font-semibold
              animate-pulse
            "
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </Badge>
        )}
      </Button>

      {/* Dropdown */}
      <NotificationDropdown />
    </div>
  );
}
