import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Keys',
  description: 'Manage API keys for integrating HireFlux with your existing recruiting tools and workflows.',
};

export default function ApiKeysLayout({ children }: { children: React.ReactNode }) {
  return children;
}
