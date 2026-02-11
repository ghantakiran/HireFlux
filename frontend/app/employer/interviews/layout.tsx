import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interviews',
  description: 'Schedule and manage candidate interviews across your hiring pipeline.',
};

export default function EmployerInterviewsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
