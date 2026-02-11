import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Job Templates',
  description: 'Create and manage reusable job description templates for faster posting.',
};

export default function EmployerTemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
