import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/auth/AuthProvider';
import { QueryClientProvider } from '@/components/providers/query-client-provider';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { ErrorBoundary } from '@/components/errors/error-boundary';
import { ErrorProvider } from '@/components/errors/error-provider';
// SkipLink removed from here - now handled by AppShell component
import { KeyboardShortcutsHelp } from '@/components/keyboard-shortcuts-help';
import { KeyboardNavigationProvider } from '@/components/providers/keyboard-navigation-provider';
import { WebVitalsReporter } from '@/components/web-vitals-reporter';
import { FeedbackProvider } from '@/components/feedback/feedback-provider';
import { TourProvider } from '@/components/tours/tour-provider';
import { TourOrchestrator } from '@/components/tours/tour-orchestrator';
import { TooltipManager } from '@/components/tours/tooltip-manager';
import { PageTransition } from '@/components/page-transition';
import { RouteAnnouncer } from '@/components/ui/route-announcer';
import { NotificationProvider } from '@/components/notifications/notification-provider';
import { PWAProvider } from '@/components/pwa/pwa-provider';
import { OfflineIndicator, OnlineIndicator } from '@/components/pwa/offline-indicator';
import { InstallPrompt } from '@/components/pwa/install-prompt';
import { UpdateNotification } from '@/components/pwa/update-notification';

// Optimized font loading with display: swap to prevent FOIT
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://hireflux.com'),
  title: {
    default: 'HireFlux - AI-Powered Job Application Copilot',
    template: '%s | HireFlux',
  },
  description:
    'Streamline your job search with AI-powered resume generation, job matching, and automated applications.',
  keywords: ['job search', 'resume builder', 'AI', 'career', 'job application', 'ATS optimization', 'cover letter generator', 'job matching'],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'HireFlux',
    title: 'HireFlux - AI-Powered Job Application Copilot',
    description:
      'Streamline your job search with AI-powered resume generation, job matching, and automated applications.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'HireFlux - AI-Powered Job Application Copilot',
    description:
      'Streamline your job search with AI-powered resume generation, job matching, and automated applications.',
  },
  robots: {
    index: true,
    follow: true,
  },
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

        {/* PWA Manifest - Issue #143 */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="HireFlux" />

        {/* Apple touch icons */}
        <link rel="apple-touch-icon" sizes="180x180" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icon-192.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/icon-192.png" />
      </head>
      <body className={inter.className}>
        <ThemeProvider>
          <ErrorBoundary componentName="RootLayout">
            <ErrorProvider>
              <QueryClientProvider>
                <KeyboardNavigationProvider>
                  <AuthProvider>
                    <NotificationProvider>
                      <PWAProvider>
                        <TourProvider>
                          <FeedbackProvider>
                            {/* SkipLink moved to AppShell component for consistency */}
                            {/* PWA offline/online indicators */}
                            <OfflineIndicator />
                            <OnlineIndicator />
                            {/* Main landmark provided by AppShell/MainContent - don't duplicate here */}
                            <PageTransition>
                              <div className="focus:outline-none">
                                {children}
                              </div>
                            </PageTransition>
                            <RouteAnnouncer />
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
                            {/* PWA components */}
                            <InstallPrompt />
                            <UpdateNotification />
                            <TourOrchestrator />
                            <TooltipManager />
                          </FeedbackProvider>
                        </TourProvider>
                      </PWAProvider>
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
