'use client';

import { useEffect } from 'react';
import Script from 'next/script';

/**
 * PageTitle Component - Sets document title for WCAG 2.4.2 compliance
 *
 * This component ensures the page title is set correctly for accessibility.
 * It uses an inline script to set the title BEFORE React hydration, ensuring
 * accessibility scanners detect it during initial page load.
 *
 * Related: Issue #148 (WCAG 2.1 AA Compliance Audit)
 * WCAG Criterion: 2.4.2 Page Titled (Level A)
 *
 * @param title - The page title (will be appended with " | HireFlux")
 */
interface PageTitleProps {
  title: string;
}

export function PageTitle({ title }: PageTitleProps) {
  const fullTitle = `${title} | HireFlux`;

  // Set title via useEffect as well for client-side navigation
  useEffect(() => {
    document.title = fullTitle;
  }, [fullTitle]);

  // Use dangerouslySetInnerHTML to inject title-setting script immediately
  // This ensures the title is set before React hydrates
  return (
    <Script
      id="page-title-setter"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{
        __html: `document.title = "${fullTitle.replace(/"/g, '\\"')}";`,
      }}
    />
  );
}

/**
 * Custom hook for setting page title
 * Use this for simpler component integration
 */
export function usePageTitle(title: string) {
  useEffect(() => {
    const fullTitle = `${title} | HireFlux`;
    document.title = fullTitle;
  }, [title]);
}
