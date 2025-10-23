import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'HireFlux - AI-Powered Job Application Copilot',
  description:
    'Streamline your job search with AI-powered resume generation, job matching, and automated applications.',
  keywords: ['job search', 'resume builder', 'AI', 'career', 'job application'],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
