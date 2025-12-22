import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login',
  description: 'Sign in to your HireFlux employer account to manage assessments and recruiting.',
};

export default function EmployerLoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
