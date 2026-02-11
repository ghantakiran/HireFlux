import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Auto Apply',
  description: 'Configure and manage automated job applications with AI-powered matching and consent controls.',
};

export default function AutoApplyLayout({ children }: { children: React.ReactNode }) {
  return children;
}
