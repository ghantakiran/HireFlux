import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cover Letters',
  description: 'Generate personalized, compelling cover letters for your job applications.',
};

export default function CoverLettersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
