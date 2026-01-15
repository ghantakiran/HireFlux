'use client';

/**
 * Install Button Component
 * Issue #143: Progressive Web App Support
 *
 * Small install button that can be placed in nav/header
 */

import React from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWA } from './pwa-provider';

export function InstallButton() {
  const { canInstall, promptInstall, isPWAMode } = usePWA();

  // Don't show if already installed or can't install
  if (isPWAMode || !canInstall) {
    return null;
  }

  return (
    <Button
      data-install-trigger
      onClick={promptInstall}
      variant="outline"
      size="sm"
      className="gap-2"
      aria-label="Install HireFlux app"
    >
      <Download className="h-4 w-4" />
      <span className="hidden sm:inline">Install App</span>
    </Button>
  );
}
