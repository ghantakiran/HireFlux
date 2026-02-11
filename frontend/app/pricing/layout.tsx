import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Choose the right HireFlux plan for your job search. Free, Plus, Pro, and Premium plans available.',
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
