import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Skills Assessment',
  description: 'Complete skills assessments to showcase your expertise and improve your candidate profile.',
};

export default function AssessmentsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
