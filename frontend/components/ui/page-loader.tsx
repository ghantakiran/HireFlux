'use client';

import { Loader2 } from 'lucide-react';

interface PageLoaderProps {
  message?: string;
  fullScreen?: boolean;
  className?: string;
}

export function PageLoader({ message = 'Loading...', fullScreen = false, className = '' }: PageLoaderProps) {
  return (
    <div className={`flex ${fullScreen ? 'min-h-screen' : 'min-h-[400px]'} items-center justify-center ${className}`}>
      <div className="flex flex-col items-center gap-2">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        <p className="text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}
