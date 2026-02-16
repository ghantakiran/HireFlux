'use client';

/**
 * Notifications History Page
 * Issue #130: Notification Center (In-App)
 *
 * Full notification history with:
 * - Search functionality
 * - Date grouping
 * - Bulk actions
 * - Pagination/infinite scroll
 * - All test data attributes
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { format, isToday, isYesterday } from 'date-fns';
import { formatRelativeTime } from '@/lib/utils';
import {
  Bell,
  Trash2,
  CheckCheck,
  Check,
  Target,
  MessageSquare,
  Video,
  Gift,
  AlertCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { SearchInput } from '@/components/ui/search-input';
import { FilterBar } from '@/components/ui/filter-bar';
import { PageLoader } from '@/components/ui/page-loader';
import { useSearch } from '@/hooks/useSearch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Pagination } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/usePagination';
import { EmptyState } from '@/components/ui/empty-state';
import type { Notification, NotificationType } from '@/lib/types/notifications';
import { MOCK_NOTIFICATIONS } from '@/lib/mock-data/notifications';
import { toast } from 'sonner';

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
  system: 'text-gray-600',
  reminder: 'text-orange-600',
};

// Filter tabs
const FILTER_TABS = [
  { key: 'all', label: 'All' },
  { key: 'application', label: 'Applications' },
  { key: 'message', label: 'Messages' },
  { key: 'interview', label: 'Interviews' },
  { key: 'offer', label: 'Offers' },
];

// Group notifications by date
function groupByDate(notifications: Notification[]) {
  const groups: { date: string; label: string; notifications: Notification[] }[] = [];

  notifications.forEach((notification) => {
    const date = new Date(notification.timestamp);
    let label: string;
    let dateKey: string;

    if (isToday(date)) {
      label = 'Today';
      dateKey = 'today';
    } else if (isYesterday(date)) {
      label = 'Yesterday';
      dateKey = 'yesterday';
    } else {
      label = format(date, 'MMMM d, yyyy');
      dateKey = format(date, 'yyyy-MM-dd');
    }

    const existingGroup = groups.find((g) => g.date === dateKey);
    if (existingGroup) {
      existingGroup.notifications.push(notification);
    } else {
      groups.push({
        date: dateKey,
        label,
        notifications: [notification],
      });
    }
  });

  return groups;
}

export default function NotificationsHistoryPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { query: searchQuery, debouncedQuery, setQuery: setSearchQuery } = useSearch();
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showClearReadDialog, setShowClearReadDialog] = useState(false);

  // Load notifications on mount
  useEffect(() => {
    document.title = 'Notifications | HireFlux';

    const loadNotifications = async () => {
      setIsLoading(true);
      try {
        // Try to load from localStorage first
        const stored = localStorage.getItem('notifications');
        if (stored) {
          setNotifications(JSON.parse(stored));
        } else {
          setNotifications(MOCK_NOTIFICATIONS);
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

  // Persist notifications to localStorage
  useEffect(() => {
    if (!isLoading && notifications.length > 0) {
      localStorage.setItem('notifications', JSON.stringify(notifications));
    }
  }, [notifications, isLoading]);

  // Filter notifications
  const filteredNotifications = useMemo(() => {
    let result = notifications;

    // Filter by type
    if (activeFilter !== 'all') {
      result = result.filter((n) => n.type === activeFilter);
    }

    // Filter by search query
    if (debouncedQuery.trim()) {
      const query = debouncedQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.message.toLowerCase().includes(query)
      );
    }

    return result;
  }, [notifications, activeFilter, debouncedQuery]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems: paginatedNotifications,
    pageInfo,
  } = usePagination({
    items: filteredNotifications,
    itemsPerPage: 20,
  });

  // Group filtered notifications by date
  const groupedNotifications = useMemo(() => {
    return groupByDate(paginatedNotifications);
  }, [paginatedNotifications]);

  // Stats
  const stats = useMemo(() => {
    return {
      total: notifications.length,
      unread: notifications.filter((n) => !n.read).length,
      thisWeek: notifications.filter((n) => {
        const date = new Date(n.timestamp);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return date >= weekAgo;
      }).length,
    };
  }, [notifications]);

  // Count by type
  const countByType = useMemo(() => {
    return {
      all: filteredNotifications.length,
      application: notifications.filter((n) => n.type === 'application').length,
      message: notifications.filter((n) => n.type === 'message').length,
      interview: notifications.filter((n) => n.type === 'interview').length,
      offer: notifications.filter((n) => n.type === 'offer').length,
    };
  }, [notifications, filteredNotifications]);

  // Handle selection
  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const selectAll = () => {
    if (selectedIds.size === filteredNotifications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
    }
  };

  // Actions
  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAsUnread = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: false } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    toast.success('All notifications marked as read');
  };

  const deleteSelected = () => {
    const count = selectedIds.size;
    setNotifications((prev) =>
      prev.filter((n) => !selectedIds.has(n.id))
    );
    setSelectedIds(new Set());
    setShowDeleteDialog(false);
    toast.success(`${count} notification${count !== 1 ? 's' : ''} deleted`);
  };

  const clearReadNotifications = () => {
    setNotifications((prev) => prev.filter((n) => !n.read));
    setShowClearReadDialog(false);
    toast.success('All read notifications cleared');
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate if has action URL
    if (notification.actionUrl) {
      router.push(notification.actionUrl);
    }
  };

  if (isLoading) {
    return (
      <div data-notification-loading>
        <PageLoader message="Loading notifications..." />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Notifications</h1>
        <p className="text-muted-foreground">
          Stay updated on your job search progress
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{stats.unread}</div>
            <div className="text-sm text-muted-foreground">Unread</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{stats.total}</div>
            <div className="text-sm text-muted-foreground">Total</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{stats.thisWeek}</div>
            <div className="text-sm text-muted-foreground">This Week</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search notifications..."
            data-testid="notification-search"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-2">
          {selectedIds.size > 0 && (
            <Button
              variant="outline"
              data-bulk-delete
              onClick={() => setShowDeleteDialog(true)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete ({selectedIds.size})
            </Button>
          )}

          {notifications.some((n) => n.read) && (
            <Button
              variant="outline"
              data-clear-read-notifications
              onClick={() => setShowClearReadDialog(true)}
            >
              Clear Read
            </Button>
          )}

          {notifications.some((n) => !n.read) && (
            <Button variant="outline" data-mark-all-read onClick={markAllAsRead}>
              <CheckCheck className="h-4 w-4 mr-2" />
              Mark All Read
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <FilterBar
        filters={[
          {
            type: 'button-group',
            key: 'type',
            options: FILTER_TABS.map((tab) => ({
              value: tab.key,
              label: `${tab.label} (${countByType[tab.key as keyof typeof countByType] || 0})`,
            })),
            'data-testid': 'notification-filters',
          },
        ]}
        values={{ type: activeFilter }}
        onChange={(_key, val) => setActiveFilter(val)}
        showClearButton={false}
        className="mb-6 overflow-x-auto pb-2"
      />

      {/* Notification List */}
      {filteredNotifications.length > 0 ? (
        <>
          <ul
            role="list"
            aria-label="Notifications"
            data-notification-list
            className="space-y-6"
          >
            {groupedNotifications.map((group) => (
              <li key={group.date}>
                {/* Date Header */}
                <h3
                  data-date-header={group.date}
                  className="text-sm font-semibold text-muted-foreground mb-3 px-1"
                >
                  {group.label}
                </h3>

                {/* Notifications for this date */}
                <div className="space-y-2">
                  {group.notifications.map((notification) => {
                    const Icon = NOTIFICATION_ICONS[notification.type];
                    const iconColor = NOTIFICATION_COLORS[notification.type];

                    return (
                      <Card
                        key={notification.id}
                        role="listitem"
                        data-notification-item
                        data-notification-id={notification.id}
                        data-notification-type={notification.type}
                        data-read={notification.read ? 'true' : 'false'}
                        data-action-url={notification.actionUrl || ''}
                        className={`
                          group cursor-pointer transition-all duration-200
                          hover:shadow-md
                          ${!notification.read ? 'border-l-4 border-l-blue-500 bg-blue-50/50' : ''}
                        `}
                        onClick={() => handleNotificationClick(notification)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            {/* Checkbox */}
                            <div
                              className="flex-shrink-0 pt-0.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Checkbox
                                data-notification-checkbox
                                checked={selectedIds.has(notification.id)}
                                onChange={() => toggleSelection(notification.id)}
                              />
                            </div>

                            {/* Icon */}
                            <div className={`flex-shrink-0 ${iconColor}`}>
                              <Icon className="h-5 w-5" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <h4
                                    data-notification-title
                                    className={`font-medium ${!notification.read ? 'font-semibold' : ''}`}
                                  >
                                    {notification.title}
                                  </h4>
                                  {!notification.read && (
                                    <Badge variant="secondary" className="text-xs ml-2">
                                      New
                                    </Badge>
                                  )}
                                </div>

                                {/* Actions */}
                                <div
                                  className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {notification.read ? (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      data-mark-unread-button
                                      onClick={() => markAsUnread(notification.id)}
                                      className="h-7 w-7 p-0"
                                      title="Mark as unread"
                                    >
                                      <Check className="h-3 w-3" />
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      data-mark-read-button
                                      onClick={() => markAsRead(notification.id)}
                                      className="h-7 w-7 p-0"
                                      title="Mark as read"
                                    >
                                      <CheckCheck className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              </div>

                              <p
                                data-notification-message
                                className="text-sm text-muted-foreground mt-1 line-clamp-2"
                              >
                                {notification.message}
                              </p>

                              <time
                                data-notification-timestamp
                                dateTime={notification.timestamp}
                                className="text-xs text-muted-foreground mt-2 block"
                              >
                                {formatRelativeTime(notification.timestamp, true)}
                              </time>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </li>
            ))}
          </ul>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={pageInfo.totalItems}
            itemsPerPage={20}
          />
        </>
      ) : (
        /* Empty State */
        <EmptyState
          icon={Bell}
          title="No notifications"
          description={
            searchQuery
              ? `No notifications matching "${searchQuery}"`
              : "You're all caught up! Notifications for job matches, application updates, and messages will appear here."
          }
        />
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Notifications</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {selectedIds.size} notification
              {selectedIds.size !== 1 ? 's' : ''}? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-confirm-delete
              onClick={deleteSelected}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Clear Read Confirmation Dialog */}
      <Dialog open={showClearReadDialog} onOpenChange={setShowClearReadDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Clear Read Notifications</DialogTitle>
            <DialogDescription>
              Are you sure you want to clear all read notifications? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowClearReadDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              data-confirm-clear
              onClick={clearReadNotifications}
            >
              Clear Read
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
