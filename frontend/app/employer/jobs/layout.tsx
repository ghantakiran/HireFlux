import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Job Postings',
  description: 'Manage your job postings and attract top talent with AI-powered job descriptions.',
};

export default function JobsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
