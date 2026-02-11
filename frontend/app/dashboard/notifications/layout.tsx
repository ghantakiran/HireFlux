import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Notifications',
  description: 'Stay updated on new job matches, application status changes, and important alerts.',
};

export default function NotificationsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
