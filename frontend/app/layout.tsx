import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { QueryClientProvider } from '@/components/providers/query-client-provider';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ErrorBoundary } from '@/components/errors/error-boundary';
import { ErrorProvider } from '@/components/errors/error-provider';
import { OfflineBanner } from '@/components/errors/offline-banner';
// SkipLink removed from here - now handled by AppShell component
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help';
import { KeyboardNavigationProvider } from '@/components/providers/keyboard-navigation-provider';
import { WebVitalsReporter } from '@/components/web-vitals-reporter';
import { PWAInstaller } from '@/components/pwa-installer';
import { FeedbackProvider } from '@/components/feedback/feedback-provider';
import { TourProvider } from '@/components/tours/tour-provider';
import { TourOrchestrator } from '@/components/tours/tour-orchestrator';
import { TooltipManager } from '@/components/tours/tooltip-manager';
import { PageTransition } from '@/components/page-transition';
import { NotificationProvider } from '@/components/notifications/notification-provider';

// Optimized font loading with display: swap to prevent FOIT
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
});

export const metadata: Metadata = {
  title: {
    default: 'HireFlux - AI-Powered Job Application Copilot',
    template: '%s | HireFlux',
  },
  description:
    'Streamline your job search with AI-powered resume generation, job matching, and automated applications.',
  keywords: ['job search', 'resume builder', 'AI', 'career', 'job application'],
  // Performance hints
  other: {
    'format-detection': 'telephone=no',
  },
};

// Viewport configuration moved to separate export (Next.js 14+ requirement)
// Issue #140: Added viewport-fit=cover for iOS safe area support
export function generateViewport() {
  return {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    viewportFit: 'cover', // Enable iOS safe area insets
  };
}

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

        {/* Preload critical fonts (Issue #144: Performance Optimization) */}
        <link
          rel="preload"
          href="/_next/static/media/inter-latin-ext.woff2"
          as="font"
          type="font/woff2"
          crossOrigin="anonymous"
        />

        {/* Preload critical CSS for faster FCP/LCP */}
        <link rel="preload" href="/_next/static/css/app.css" as="style" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#3b82f6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="HireFlux" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ErrorBoundary componentName="RootLayout">
            <ErrorProvider>
              <QueryClientProvider>
                <KeyboardNavigationProvider>
                  <AuthProvider>
                    <NotificationProvider>
                      <TourProvider>
                        <FeedbackProvider>
                          {/* SkipLink moved to AppShell component for consistency */}
                          <OfflineBanner position="top" />
                          {/* Main landmark provided by AppShell/MainContent - don't duplicate here */}
                          <PageTransition>
                            <div className="focus:outline-none">
                              {children}
                            </div>
                          </PageTransition>
                        <Toaster
                          position="top-right"
                          richColors
                          toastOptions={{
                            className: 'animate-slide-down',
                            duration: 4000,
                          }}
                        />
                        <KeyboardShortcutsHelp />
                        <WebVitalsReporter />
                        <PWAInstaller />
                        <TourOrchestrator />
                        <TooltipManager />
                        </FeedbackProvider>
                      </TourProvider>
                    </NotificationProvider>
                  </AuthProvider>
                </KeyboardNavigationProvider>
              </QueryClientProvider>
            </ErrorProvider>
          </ErrorBoundary>
        </ThemeProvider>
      </body>
    </html>
  );
}
