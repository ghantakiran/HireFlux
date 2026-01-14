/**
 * Mock Notification Data
 * Issue #130: Notification Center (In-App)
 *
 * Mock notifications for development and testing
 */

import type { Notification } from '../types/notifications';

export const MOCK_NOTIFICATIONS: Notification[] = [
  // Application notifications
  {
    id: 'notif-001',
    type: 'application',
    priority: 'high',
    title: 'Application Status Updated',
    message: 'Your application for Senior Software Engineer at TechCorp has been reviewed',
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(), // 5 minutes ago
    actionUrl: '/dashboard/applications/app-001',
    actionLabel: 'View Application',
    userId: 'user-001',
  },
  {
    id: 'notif-002',
    type: 'application',
    priority: 'normal',
    title: 'New Job Match',
    message: '5 new jobs match your preferences: React Developer, Frontend Engineer, and more',
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 minutes ago
    actionUrl: '/jobs',
    actionLabel: 'View Jobs',
    userId: 'user-001',
  },
  {
    id: 'notif-003',
    type: 'application',
    priority: 'low',
    title: 'Application Submitted',
    message: 'Your application for Full Stack Developer at StartupXYZ has been submitted successfully',
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    actionUrl: '/dashboard/applications/app-002',
    actionLabel: 'View Application',
    userId: 'user-001',
  },

  // Interview notifications
  {
    id: 'notif-004',
    type: 'interview',
    priority: 'urgent',
    title: 'Interview Scheduled Tomorrow',
    message: 'Your interview with TechCorp is scheduled for tomorrow at 2:00 PM',
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
    actionUrl: '/dashboard/interviews/int-001',
    actionLabel: 'View Details',
    metadata: {
      interviewDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
      company: 'TechCorp',
      position: 'Senior Software Engineer',
    },
    userId: 'user-001',
  },
  {
    id: 'notif-005',
    type: 'interview',
    priority: 'high',
    title: 'Interview Reminder',
    message: 'Interview prep materials are ready for your upcoming interview',
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5 hours ago
    actionUrl: '/dashboard/interview-prep',
    actionLabel: 'Start Prep',
    userId: 'user-001',
  },

  // Message notifications
  {
    id: 'notif-006',
    type: 'message',
    priority: 'normal',
    title: 'New Message from Recruiter',
    message: 'Jane Smith from TechCorp sent you a message about your application',
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 6).toISOString(), // 6 hours ago
    actionUrl: '/messages/conv-001',
    actionLabel: 'Read Message',
    metadata: {
      from: 'Jane Smith',
      fromCompany: 'TechCorp',
    },
    userId: 'user-001',
  },
  {
    id: 'notif-007',
    type: 'message',
    priority: 'normal',
    title: 'Message Reply',
    message: 'Your question about the position has been answered',
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 12).toISOString(), // 12 hours ago
    actionUrl: '/messages/conv-002',
    actionLabel: 'View Conversation',
    userId: 'user-001',
  },

  // Offer notifications
  {
    id: 'notif-008',
    type: 'offer',
    priority: 'urgent',
    title: 'Job Offer Received! 🎉',
    message: 'Congratulations! You received an offer for Senior Software Engineer at TechCorp',
    read: false,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    actionUrl: '/dashboard/offers/offer-001',
    actionLabel: 'View Offer',
    metadata: {
      company: 'TechCorp',
      position: 'Senior Software Engineer',
      salary: '$150,000',
    },
    userId: 'user-001',
  },

  // System notifications
  {
    id: 'notif-009',
    type: 'system',
    priority: 'low',
    title: 'Profile Completed',
    message: 'Your profile is now 100% complete. Great job!',
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(), // 2 days ago
    actionUrl: '/settings/profile',
    actionLabel: 'View Profile',
    userId: 'user-001',
  },
  {
    id: 'notif-010',
    type: 'system',
    priority: 'normal',
    title: 'Security Update',
    message: 'Your password was changed successfully',
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 72).toISOString(), // 3 days ago
    userId: 'user-001',
  },

  // Reminder notifications
  {
    id: 'notif-011',
    type: 'reminder',
    priority: 'normal',
    title: 'Follow Up Reminder',
    message: "Don't forget to follow up on your application at StartupXYZ",
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 96).toISOString(), // 4 days ago
    actionUrl: '/dashboard/applications/app-002',
    actionLabel: 'Follow Up',
    userId: 'user-001',
  },
  {
    id: 'notif-012',
    type: 'reminder',
    priority: 'normal',
    title: 'Resume Update',
    message: "It's been 30 days since you updated your resume",
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 120).toISOString(), // 5 days ago
    actionUrl: '/dashboard/resumes',
    actionLabel: 'Update Resume',
    userId: 'user-001',
  },

  // Additional application notifications (older)
  {
    id: 'notif-013',
    type: 'application',
    priority: 'normal',
    title: 'Application Viewed',
    message: 'Your application for Backend Developer at CloudCo was viewed by the hiring team',
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 168).toISOString(), // 1 week ago
    actionUrl: '/dashboard/applications/app-003',
    userId: 'user-001',
  },
  {
    id: 'notif-014',
    type: 'application',
    priority: 'low',
    title: 'Application Received',
    message: 'CloudCo received your application for Backend Developer',
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 336).toISOString(), // 2 weeks ago
    userId: 'user-001',
  },
  {
    id: 'notif-015',
    type: 'message',
    priority: 'low',
    title: 'Connection Request',
    message: 'John Doe wants to connect with you on HireFlux',
    read: true,
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 504).toISOString(), // 3 weeks ago
    userId: 'user-001',
  },
];

// Helper function to generate new notification
export function createNotification(
  partial: Partial<Notification> & Pick<Notification, 'type' | 'title' | 'message' | 'userId'>
): Notification {
  return {
    id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    priority: 'normal',
    read: false,
    timestamp: new Date().toISOString(),
    ...partial,
  };
}

// Helper function to get notifications by type
export function getNotificationsByType(
  notifications: Notification[],
  type: string
): Notification[] {
  if (type === 'all') return notifications;
  return notifications.filter((n) => n.type === type);
}

// Helper function to get unread notifications
export function getUnreadNotifications(notifications: Notification[]): Notification[] {
  return notifications.filter((n) => !n.read);
}

// Helper function to get notifications by date range
export function getNotificationsByDateRange(
  notifications: Notification[],
  startDate: Date,
  endDate: Date
): Notification[] {
  return notifications.filter((n) => {
    const timestamp = new Date(n.timestamp);
    return timestamp >= startDate && timestamp <= endDate;
  });
}

// Helper function to sort notifications by timestamp (newest first)
export function sortNotificationsByTimestamp(
  notifications: Notification[]
): Notification[] {
  return [...notifications].sort((a, b) => {
    return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
  });
}

// Helper function to group notifications by date
export function groupNotificationsByDate(
  notifications: Notification[]
): Record<string, Notification[]> {
  const groups: Record<string, Notification[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const thisWeekStart = new Date(today);
  thisWeekStart.setDate(thisWeekStart.getDate() - 7);

  notifications.forEach((notification) => {
    const timestamp = new Date(notification.timestamp);
    const notificationDate = new Date(
      timestamp.getFullYear(),
      timestamp.getMonth(),
      timestamp.getDate()
    );

    if (notificationDate.getTime() === today.getTime()) {
      groups.today.push(notification);
    } else if (notificationDate.getTime() === yesterday.getTime()) {
      groups.yesterday.push(notification);
    } else if (notificationDate >= thisWeekStart) {
      groups.thisWeek.push(notification);
    } else {
      groups.older.push(notification);
    }
  });

  return groups;
}
