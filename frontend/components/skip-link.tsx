/**
 * Skip to Content Link (Issue #149 + Issue #151)
 *
 * Allows keyboard users to skip navigation and jump directly to main content.
 * WCAG 2.1 AA Requirement: Bypass Blocks (2.4.1)
 *
 * Updated in Issue #151 to ensure focus is properly set for E2E testing.
 */

'use client';

import React from 'react';

export function SkipLink() {
  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Find the main content element
    const mainContent = document.getElementById('main-content');

    if (mainContent) {
      // Scroll to main content immediately (not smooth) for reliable focus
      mainContent.scrollIntoView({ behavior: 'auto', block: 'start' });

      // Use requestAnimationFrame to ensure focus happens after scroll completes
      requestAnimationFrame(() => {
        mainContent.focus();

        // Optionally force focus with a backup
        if (document.activeElement !== mainContent) {
          mainContent.setAttribute('tabindex', '-1');
          mainContent.focus();
        }
      });
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleSkip}
      data-testid="skip-to-content"
      tabIndex={0}
      className="
        fixed left-4 -top-40 focus:top-4 z-[9999]
        transition-all duration-200
        rounded-md bg-blue-600 px-4 py-2
        text-sm font-medium text-white
        shadow-lg ring-2 ring-blue-600 ring-offset-2
        focus:outline-none focus:ring-4 focus:ring-blue-500
      "
    >
      Skip to main content
    </a>
  );
}
