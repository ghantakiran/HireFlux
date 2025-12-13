/**
 * Tour Trigger Hook
 * Automatically starts tours on first visit to pages
 */

'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useTour } from '@/components/tours/tour-provider';
import { tourRegistry } from './tour-registry';

export function useTourTrigger(tourId: string) {
  const pathname = usePathname();
  const { startTour, getTourProgress, isTourActive, settings } = useTour();

  useEffect(() => {
    // Don't auto-start if tours are disabled or another tour is active
    if (!settings.autoStartTours || isTourActive) return;

    // Check if this tour has been started before
    const progress = getTourProgress(tourId);

    // Only auto-start if tour has never been started
    if (!progress) {
      const tour = tourRegistry.getTourById(tourId);
      if (tour && tour.autoStart) {
        // Small delay to ensure page is fully loaded
        const timer = setTimeout(() => {
          startTour(tourId);
        }, 1000);

        return () => clearTimeout(timer);
      }
    }
  }, [tourId, pathname, startTour, getTourProgress, isTourActive, settings.autoStartTours]);
}
