import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Interview Coach',
  description: 'Practice mock interviews with AI feedback using the STAR framework to improve your interview skills.',
};

export default function InterviewBuddyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
