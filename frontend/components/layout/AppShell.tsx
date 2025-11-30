'use client';

import { useEffect, useRef } from 'react';
import { TopNav } from './TopNav';
import { LeftSidebar } from './LeftSidebar';
import { MobileHamburgerMenu, MobileBottomTabBar } from './MobileNav';

interface AppShellProps {
  children: React.ReactNode;
  role?: 'job_seeker' | 'employer';
}

/**
 * Skip to Main Content Link
 * Accessibility feature for keyboard navigation
 */
function SkipToMain() {
  const handleSkip = (e: React.MouseEvent) => {
    e.preventDefault();
    const main = document.getElementById('main-content');
    if (main) {
      main.focus();
      main.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleSkip}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-lg focus:bg-blue-600 focus:px-4 focus:py-2 focus:text-white focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
      data-skip-to-main
    >
      Skip to main content
    </a>
  );
}

/**
 * Main Content Wrapper with 12-column responsive grid
 */
interface MainContentProps {
  children: React.ReactNode;
}

function MainContent({ children }: MainContentProps) {
  const mainRef = useRef<HTMLElement>(null);

  return (
    <main
      id="main-content"
      ref={mainRef}
      role="main"
      aria-label="Main content"
      tabIndex={-1}
      className="min-h-screen focus:outline-none"
      data-main-content
    >
      {/* 12-column grid container with max-width */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Content spans all columns */}
          <div className="col-span-4 md:col-span-8 lg:col-span-12">
            {children}
          </div>
        </div>
      </div>
    </main>
  );
}

/**
 * App Shell - Complete layout with navigation, accessibility, and responsive grid
 *
 * Features:
 * - Desktop: TopNav + collapsible LeftSidebar
 * - Mobile: Hamburger menu + bottom tab bar
 * - Skip to main content link
 * - Proper ARIA landmarks
 * - 12-column responsive grid (4-col mobile, 8-col tablet, 12-col desktop)
 * - Max content width 1200px
 * - Persistent sidebar collapse state
 */
export function AppShell({ children, role = 'job_seeker' }: AppShellProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Skip to Main Content */}
      <SkipToMain />

      {/* Mobile Navigation */}
      <div className="lg:hidden">
        <MobileHamburgerMenu role={role} />
      </div>

      {/* Desktop Top Navigation */}
      <div className="hidden lg:block">
        <TopNav role={role} />
      </div>

      {/* Desktop Left Sidebar */}
      <LeftSidebar role={role} />

      {/* Main Content Area */}
      <div className="pt-16 lg:pt-16 lg:pl-60 transition-all duration-300" data-app-shell>
        <MainContent>{children}</MainContent>

        {/* Mobile Bottom Tab Bar */}
        <div className="h-16 lg:hidden" /> {/* Spacer for fixed bottom bar */}
        <MobileBottomTabBar role={role} />
      </div>
    </div>
  );
}
