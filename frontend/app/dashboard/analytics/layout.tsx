import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Analytics',
  description: 'Track your job search performance with insights on applications, matches, and progress.',
};

export default function AnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
