import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Company Profile',
  description: 'Manage your company profile, branding, and public-facing information for candidates.',
};

export default function CompanyProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
