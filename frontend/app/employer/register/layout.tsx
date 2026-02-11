import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Employer Registration',
  description: 'Create your employer account on HireFlux to start hiring with AI-powered recruiting tools.',
};

export default function EmployerRegisterLayout({ children }: { children: React.ReactNode }) {
  return children;
}
