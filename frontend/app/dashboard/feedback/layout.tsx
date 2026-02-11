import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Feedback',
  description: 'Share your feedback to help us improve HireFlux and your job search experience.',
};

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return children;
}
