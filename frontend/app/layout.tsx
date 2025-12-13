import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { QueryClientProvider } from '@/components/providers/query-client-provider';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ErrorBoundary } from '@/components/error/error-boundary';
import { NetworkStatusIndicator } from '@/components/network-status-indicator';
// SkipLink removed from here - now handled by AppShell component
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help';
import { KeyboardNavigationProvider } from '@/components/providers/keyboard-navigation-provider';
import { WebVitalsReporter } from '@/components/web-vitals-reporter';
import { PWAInstaller } from '@/components/pwa-installer';
import { FeedbackProvider } from '@/components/feedback/feedback-provider';

// Optimized font loading with display: swap to prevent FOIT
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: 'HireFlux - AI-Powered Job Application Copilot',
  description:
    'Streamline your job search with AI-powered resume generation, job matching, and automated applications.',
  keywords: ['job search', 'resume builder', 'AI', 'career', 'job application'],
  // Viewport optimization for mobile
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
  },
  // Performance hints
  other: {
    'format-detection': 'telephone=no',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        {/* Preconnect to critical origins for faster resource loading */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* DNS prefetch for external resources */}
        <link rel="dns-prefetch" href="https://storage.hireflux.com" />
        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HireFlux" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ErrorBoundary>
            <QueryClientProvider>
              <KeyboardNavigationProvider>
                <AuthProvider>
                  <FeedbackProvider>
                    {/* SkipLink moved to AppShell component for consistency */}
                    <NetworkStatusIndicator />
                    <div id="main-content">
                      {children}
                    </div>
                    <Toaster position="top-right" richColors />
                    <KeyboardShortcutsHelp />
                    <WebVitalsReporter />
                    <PWAInstaller />
                  </FeedbackProvider>
                </AuthProvider>
              </KeyboardNavigationProvider>
            </QueryClientProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
