import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Resume Builder',
  description: 'Create ATS-optimized resumes with AI-powered suggestions and multiple templates.',
};

export default function ResumesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
