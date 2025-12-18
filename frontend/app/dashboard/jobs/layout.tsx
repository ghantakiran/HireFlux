import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Job Matches',
  description: 'Discover AI-matched job opportunities tailored to your skills and preferences.',
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
