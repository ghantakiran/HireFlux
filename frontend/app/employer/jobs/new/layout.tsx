import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Post New Job',
  description: 'Create a new job posting with AI-powered job description generation.',
};

export default function NewJobLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
