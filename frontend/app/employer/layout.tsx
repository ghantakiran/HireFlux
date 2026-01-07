import { EmployerDashboardLayout } from '@/components/layout/EmployerDashboardLayout';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Employer Dashboard | HireFlux',
  description: 'Manage job postings, track applicants, and find top talent with AI-powered recruiting tools.',
};

export default function EmployerLayout({ children }: { children: React.ReactNode }) {
  return <EmployerDashboardLayout>{children}</EmployerDashboardLayout>;
}
