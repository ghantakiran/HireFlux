'use client';

/**
 * Not Found Page for Next.js App Router (Issue #138)
 *
 * Displayed when a route is not found (404 error).
 */

import { Button } from '@/components/ui/button';
import { Home, Search, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-6 text-center">
        {/* 404 Illustration */}
        <div className="space-y-4">
          <h1 className="text-9xl font-bold text-primary/20">404</h1>
          <h2 className="text-2xl font-bold tracking-tight">Page Not Found</h2>
          <p className="text-muted-foreground">
            Sorry, we couldn't find the page you're looking for. It might have been moved,
            deleted, or never existed.
          </p>
        </div>

        {/* Suggestions */}
        <div className="rounded-md bg-muted/50 p-4 text-sm">
          <p className="font-medium">What you can do:</p>
          <ul className="mt-2 space-y-1 text-left text-muted-foreground">
            <li>• Check the URL for typos</li>
            <li>• Go back to the previous page</li>
            <li>• Start from the homepage</li>
            <li>• Search for what you need</li>
          </ul>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3">
          <Button asChild className="w-full">
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              Go to Homepage
            </Link>
          </Button>

          <Button variant="outline" asChild className="w-full">
            <Link href="/jobs">
              <Search className="mr-2 h-4 w-4" />
              Browse Jobs
            </Link>
          </Button>

          <Button
            variant="ghost"
            onClick={() => window.history.back()}
            className="w-full"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Go Back
          </Button>
        </div>
      </div>
    </div>
  );
}
