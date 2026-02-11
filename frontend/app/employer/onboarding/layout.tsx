import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Employer Setup',
  description: 'Complete your employer profile setup to start posting jobs and finding candidates.',
};

export default function EmployerOnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
