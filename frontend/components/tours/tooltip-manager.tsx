/**
 * Tooltip Manager Component
 * Automatically renders contextual tooltips for the current page
 */

'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { ContextualTooltip } from './contextual-tooltip';
import { tooltipRegistry } from '@/lib/tours/tooltip-registry';
import { TourTooltipConfig } from '@/lib/tours/types';
import { useTour } from './tour-provider';

export function TooltipManager() {
  const pathname = usePathname();
  const [tooltips, setTooltips] = useState<TourTooltipConfig[]>([]);
  const { settings } = useTour();

  // Load tooltips for current page
  useEffect(() => {
    const pageTooltips = tooltipRegistry.getTooltipsForPage(pathname);
    setTooltips(pageTooltips);
  }, [pathname]);

  // Don't render if tooltips are disabled
  if (!settings.tooltipsEnabled) {
    return null;
  }

  return (
    <>
      {tooltips.map((tooltip, index) => (
        <ContextualTooltip
          key={`${tooltip.target}-${index}`}
          target={tooltip.target}
          config={tooltip}
          showBeacon={settings.showBeacons && !!tooltip.tourId}
        />
      ))}
    </>
  );
}
