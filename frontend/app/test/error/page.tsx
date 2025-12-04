/**
 * Test page for Error Recovery UI (Issue #138)
 * Simulates various error scenarios for testing.
 */

import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function ErrorTestPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-bold">Error Recovery Test Page</h1>

      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold mb-2">Test Error Scenarios:</h2>
          <div className="flex flex-col gap-2">
            <Button
              asChild
              variant="outline"
              data-testid="retry-button"
            >
              <Link href="/test/error">Refresh Page (Retry)</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              data-testid="back-button"
            >
              <Link href="/dashboard">Go Back to Dashboard</Link>
            </Button>

            <Button
              asChild
              variant="outline"
              data-testid="contact-support"
            >
              <Link href="/support">Contact Support</Link>
            </Button>
          </div>
        </div>

        <div>
          <p className="text-muted-foreground">
            This page is used to test error recovery flows. The buttons above simulate
            the recovery actions available in error states.
          </p>
        </div>
      </div>
    </div>
  );
}
