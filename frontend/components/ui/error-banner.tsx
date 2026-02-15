'use client';

import { AlertCircle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorBannerProps {
  error: string | null;
  onDismiss?: () => void;
  title?: string;
  className?: string;
}

export function ErrorBanner({ error, onDismiss, title = 'Error', className = '' }: ErrorBannerProps) {
  if (!error) return null;

  return (
    <div
      className={`mb-6 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 ${className}`}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
        <div className="flex-1">
          <h3 className="font-medium text-red-800 dark:text-red-300">{title}</h3>
          <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
        </div>
        {onDismiss && (
          <Button variant="ghost" size="sm" onClick={onDismiss} aria-label="Dismiss error">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
