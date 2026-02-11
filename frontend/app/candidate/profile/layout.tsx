import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Candidate Profile',
  description: 'Manage your public candidate profile to increase visibility with potential employers.',
};

export default function CandidateProfileLayout({ children }: { children: React.ReactNode }) {
  return children;
}
