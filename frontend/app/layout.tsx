import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { QueryClientProvider } from '@/components/providers/query-client-provider';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ErrorBoundary } from '@/components/error-boundary';
import { NetworkStatusIndicator } from '@/components/network-status-indicator';

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
      <body className={inter.className}>
        <ThemeProvider>
          <ErrorBoundary>
            <QueryClientProvider>
              <AuthProvider>
                <NetworkStatusIndicator />
                {children}
                <Toaster position="top-right" richColors />
              </AuthProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
