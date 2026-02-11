import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Get Started',
  description: 'Set up your HireFlux profile to start your AI-powered job search journey.',
};

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children;
}
