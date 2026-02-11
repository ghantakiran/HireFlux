import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Assessments',
  description: 'Create and manage skills assessments to evaluate candidates for your open positions.',
};

export default function EmployerAssessmentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
