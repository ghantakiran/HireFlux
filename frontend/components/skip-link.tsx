/**
 * Skip to Content Link (Issue #149)
 *
 * Allows keyboard users to skip navigation and jump directly to main content.
 * WCAG 2.1 AA Requirement: Bypass Blocks (2.4.1)
 */

'use client';

export function SkipLink() {
  const handleSkip = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();

    // Find the main content element
    const mainContent = document.getElementById('main-content');

    if (mainContent) {
      // Scroll to main content
      mainContent.scrollIntoView({ behavior: 'smooth', block: 'start' });

      // Set focus on main content
      mainContent.focus();
    }
  };

  return (
    <a
      href="#main-content"
      onClick={handleSkip}
      data-testid="skip-to-content"
      className="
        fixed left-4 top-4 z-[9999]
        -translate-y-32 focus:translate-y-0
        transition-transform duration-200
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
