import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Candidate Search',
  description: 'Search and discover qualified candidates for your open positions.',
};

export default function CandidatesLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
