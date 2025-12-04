'use client';

/**
 * Test page for Error Boundary (Issue #138)
 * This page intentionally throws an error to test the error boundary.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ErrorBoundaryTestPage() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error('Test error from error boundary test page');
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-bold mb-4">Error Boundary Test Page</h1>
      <p className="mb-4">
        This page is used to test the error boundary. Click the button below to trigger an error.
      </p>
      <Button onClick={() => setShouldThrow(true)} variant="destructive">
        Throw Error
      </Button>
    </div>
  );
}
