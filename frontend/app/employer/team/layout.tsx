import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Team Management',
  description: 'Manage your hiring team members, roles, and permissions for collaborative recruiting.',
};

export default function EmployerTeamLayout({ children }: { children: React.ReactNode }) {
  return children;
}
