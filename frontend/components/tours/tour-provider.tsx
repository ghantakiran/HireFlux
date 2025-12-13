/**
 * Tour Provider Component
 * Manages global tour state, progress tracking, and localStorage persistence
 */

'use client';

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import {
  TourConfig,
  TourContextType,
  TourProgress,
  TourSettings,
  TourStatus,
} from '@/lib/tours/types';
import { tourRegistry } from '@/lib/tours/tour-registry';

const TourContext = createContext<TourContextType | undefined>(undefined);

const STORAGE_PREFIX = 'tour-';
const SETTINGS_KEY = 'tour-settings';

const defaultSettings: TourSettings = {
  tooltipsEnabled: true,
  tooltipDelay: 500,
  showBeacons: true,
  autoStartTours: true,
  confirmFirstDismissal: true,
  animationSpeed: 'normal',
};

interface TourProviderProps {
  children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
  const [activeTour, setActiveTour] = useState<TourConfig | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [settings, setSettings] = useState<TourSettings>(defaultSettings);

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (savedSettings) {
      try {
        setSettings({ ...defaultSettings, ...JSON.parse(savedSettings) });
      } catch (error) {
        console.error('Failed to parse tour settings:', error);
      }
    }
  }, []);

  // Save tour progress to localStorage
  const saveTourProgress = useCallback((tourId: string, step: number, status: TourStatus) => {
    const progress: TourProgress = {
      tourId,
      currentStep: step,
      status,
      updatedAt: new Date().toISOString(),
      ...(status === 'completed' && { completedAt: new Date().toISOString() }),
    };

    localStorage.setItem(`${STORAGE_PREFIX}${tourId}-progress`, String(step));
    localStorage.setItem(`${STORAGE_PREFIX}${tourId}-status`, status);
    localStorage.setItem(`${STORAGE_PREFIX}${tourId}-updated`, progress.updatedAt);
    if (progress.completedAt) {
      localStorage.setItem(`${STORAGE_PREFIX}${tourId}-completed`, progress.completedAt);
    }
  }, []);

  // Get tour progress from localStorage
  const getTourProgress = useCallback((tourId: string): TourProgress | null => {
    const step = localStorage.getItem(`${STORAGE_PREFIX}${tourId}-progress`);
    const status = localStorage.getItem(`${STORAGE_PREFIX}${tourId}-status`) as TourStatus | null;
    const updatedAt = localStorage.getItem(`${STORAGE_PREFIX}${tourId}-updated`);
    const completedAt = localStorage.getItem(`${STORAGE_PREFIX}${tourId}-completed`);

    if (!status) return null;

    return {
      tourId,
      currentStep: step ? parseInt(step, 10) : 0,
      status,
      updatedAt: updatedAt || new Date().toISOString(),
      ...(completedAt && { completedAt }),
    };
  }, []);

  // Get all tour progress
  const getAllProgress = useCallback((): TourProgress[] => {
    const allTours = tourRegistry.getAllTours();
    return allTours
      .map((tour) => getTourProgress(tour.id))
      .filter((progress): progress is TourProgress => progress !== null);
  }, [getTourProgress]);

  // Start a tour
  const startTour = useCallback(
    (tourId: string, fromStep: number = 0) => {
      const tour = tourRegistry.getTourById(tourId);
      if (!tour) {
        console.error(`Tour not found: ${tourId}`);
        return;
      }

      setActiveTour(tour);
      setCurrentStepIndex(fromStep);
      saveTourProgress(tourId, fromStep, 'in-progress');

      // Announce to screen readers
      const announcement = `Starting ${tour.name} tour, step ${fromStep + 1} of ${tour.steps.length}`;
      announceToScreenReader(announcement);
    },
    [saveTourProgress]
  );

  // Stop tour
  const stopTour = useCallback(() => {
    if (activeTour) {
      // Save progress before stopping
      saveTourProgress(activeTour.id, currentStepIndex, 'in-progress');
    }
    setActiveTour(null);
    setCurrentStepIndex(0);
  }, [activeTour, currentStepIndex, saveTourProgress]);

  // Next step
  const nextStep = useCallback(() => {
    if (!activeTour) return;

    const nextIndex = currentStepIndex + 1;

    if (nextIndex >= activeTour.steps.length) {
      // Tour completed
      completeTour();
      return;
    }

    setCurrentStepIndex(nextIndex);
    saveTourProgress(activeTour.id, nextIndex, 'in-progress');

    // Announce to screen readers
    const announcement = `Step ${nextIndex + 1} of ${activeTour.steps.length}: ${activeTour.steps[nextIndex].title}`;
    announceToScreenReader(announcement);
  }, [activeTour, currentStepIndex, saveTourProgress]);

  // Previous step
  const previousStep = useCallback(() => {
    if (!activeTour || currentStepIndex === 0) return;

    const prevIndex = currentStepIndex - 1;
    setCurrentStepIndex(prevIndex);
    saveTourProgress(activeTour.id, prevIndex, 'in-progress');

    // Announce to screen readers
    const announcement = `Step ${prevIndex + 1} of ${activeTour.steps.length}: ${activeTour.steps[prevIndex].title}`;
    announceToScreenReader(announcement);
  }, [activeTour, currentStepIndex, saveTourProgress]);

  // Skip tour
  const skipTour = useCallback(() => {
    if (!activeTour) return;

    saveTourProgress(activeTour.id, currentStepIndex, 'skipped');
    setActiveTour(null);
    setCurrentStepIndex(0);

    announceToScreenReader(`${activeTour.name} tour skipped`);
  }, [activeTour, currentStepIndex, saveTourProgress]);

  // Complete tour
  const completeTour = useCallback(() => {
    if (!activeTour) return;

    saveTourProgress(activeTour.id, activeTour.steps.length - 1, 'completed');
    setActiveTour(null);
    setCurrentStepIndex(0);

    announceToScreenReader(`${activeTour.name} tour completed!`);
  }, [activeTour, saveTourProgress]);

  // Reset a specific tour
  const resetTour = useCallback((tourId: string) => {
    localStorage.removeItem(`${STORAGE_PREFIX}${tourId}-progress`);
    localStorage.removeItem(`${STORAGE_PREFIX}${tourId}-status`);
    localStorage.removeItem(`${STORAGE_PREFIX}${tourId}-updated`);
    localStorage.removeItem(`${STORAGE_PREFIX}${tourId}-completed`);

    if (activeTour?.id === tourId) {
      setActiveTour(null);
      setCurrentStepIndex(0);
    }
  }, [activeTour]);

  // Reset all tours
  const resetAllTours = useCallback(() => {
    const keys = Object.keys(localStorage).filter((key) => key.startsWith(STORAGE_PREFIX));
    keys.forEach((key) => localStorage.removeItem(key));

    setActiveTour(null);
    setCurrentStepIndex(0);
  }, []);

  // Update settings
  const updateSettings = useCallback((newSettings: Partial<TourSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  const contextValue: TourContextType = {
    startTour,
    stopTour,
    nextStep,
    previousStep,
    skipTour,
    completeTour,
    getTourProgress,
    getAllProgress,
    resetTour,
    resetAllTours,
    activeTour,
    currentStepIndex,
    isTourActive: activeTour !== null,
    settings,
    updateSettings,
  };

  return <TourContext.Provider value={contextValue}>{children}</TourContext.Provider>;
}

export function useTour() {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within TourProvider');
  }
  return context;
}

// Helper function to announce to screen readers
function announceToScreenReader(message: string) {
  const liveRegion = document.getElementById('tour-live-region');
  if (liveRegion) {
    liveRegion.textContent = message;
    setTimeout(() => {
      liveRegion.textContent = '';
    }, 1000);
  }
}
