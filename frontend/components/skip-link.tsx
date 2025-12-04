/**
 * Skip to Content Link (Issue #149)
 *
 * Allows keyboard users to skip navigation and jump directly to main content.
 * WCAG 2.1 AA Requirement: Bypass Blocks (2.4.1)
 */

export function SkipLink() {
  return (
    <a
      href="#main-content"
      data-testid="skip-to-content"
      className="
        fixed left-4 top-4 z-[9999]
        -translate-y-32 focus:translate-y-0
        transition-transform duration-200
        rounded-md bg-primary px-4 py-2
        text-sm font-medium text-primary-foreground
        shadow-lg ring-2 ring-ring ring-offset-2
        focus:outline-none focus:ring-4
      "
    >
      Skip to main content
    </a>
  );
}
