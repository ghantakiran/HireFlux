import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'AI Suggestions',
  description: 'Get AI-powered recommendations to improve your resumes, cover letters, and job search strategy.',
};

export default function AISuggestionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
