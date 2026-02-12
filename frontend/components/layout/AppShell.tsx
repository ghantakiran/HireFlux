'use client';

import { useEffect, useRef, useState } from 'react';
import { TopNav } from './TopNav';
import { LeftSidebar } from './LeftSidebar';
import { MobileHamburgerMenu, MobileBottomTabBar } from './MobileNav';
import { SkipLink } from '../skip-link';
import { KeyboardShortcutsModal } from '../keyboard-shortcuts-modal';
import { GlobalSearchModal } from '../global-search-modal';
import { CommandPalette } from '../command-palette';
import { useKeyboardShortcuts, createGlobalShortcuts } from '../../hooks/useKeyboardShortcuts';
import { AutoBreadcrumbs } from './AutoBreadcrumbs';

interface AppShellProps {
  children: React.ReactNode;
  role?: 'job_seeker' | 'employer';
}

// Skip link removed - now using centralized SkipLink component

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
      tabIndex={-1} // WCAG 2.4.1: tabIndex={-1} is correct for skip-link target - allows programmatic focus without adding to tab order
      className="min-h-screen focus:outline-none"
      data-main-content
    >
      {/* 12-column grid container with max-width */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-4 md:gap-6">
          {/* Content spans all columns */}
          <div className="col-span-4 md:col-span-8 lg:col-span-12">
            <AutoBreadcrumbs />
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
 * - Global keyboard shortcuts (Issue #149)
 * - Proper ARIA landmarks
 * - 12-column responsive grid (4-col mobile, 8-col tablet, 12-col desktop)
 * - Max content width 1200px
 * - Persistent sidebar collapse state
 */
export function AppShell({ children, role = 'job_seeker' }: AppShellProps) {
  // Modal state management
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);

  // Set up global keyboard shortcuts
  const shortcuts = createGlobalShortcuts({
    onOpenSearch: () => setIsSearchOpen(true),
    onOpenCommandPalette: () => setIsCommandPaletteOpen(true),
    onOpenShortcutsHelp: () => setIsShortcutsOpen(true),
  });

  useKeyboardShortcuts({
    shortcuts,
    disableInInputs: true,
    enabled: true,
  });

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Skip to Main Content */}
      <SkipLink />

      {/* Keyboard Modals */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
      />
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        role={role}
      />
      <KeyboardShortcutsModal
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

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
