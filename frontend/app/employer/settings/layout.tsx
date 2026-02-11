import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Employer Settings',
  description: 'Manage your company account settings, billing, verification, and integrations.',
};

export default function EmployerSettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
