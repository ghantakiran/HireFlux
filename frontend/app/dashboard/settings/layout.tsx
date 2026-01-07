import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Settings | HireFlux',
  description: 'Manage your account settings, preferences, and subscription.',
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
