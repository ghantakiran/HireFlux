import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Employer Analytics',
  description: 'Track sourcing, pipeline, time-to-hire, and cost metrics for your recruiting efforts.',
};

export default function EmployerAnalyticsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
