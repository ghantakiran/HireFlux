import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dashboard Overview',
  description: 'Overview of your recruiting activity, active jobs, new applications, and key hiring metrics.',
};

export default function EmployerDashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
