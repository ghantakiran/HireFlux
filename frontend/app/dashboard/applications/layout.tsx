import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'My Applications | HireFlux',
  description: 'Track and manage all your job applications in one place.',
};

export default function ApplicationsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
