/**
 * Tour Orchestrator Component
 * Manages the tour flow: welcome modal → active tour → completion
 */

'use client';

import React, { useEffect, useState } from 'react';
import { useTour } from './tour-provider';
import { TourModal } from './tour-modal';
import { TourStep } from './tour-step';
import { toast } from 'sonner';

export function TourOrchestrator() {
  const {
    activeTour,
    currentStepIndex,
    nextStep,
    previousStep,
    skipTour,
    stopTour,
    completeTour,
  } = useTour();

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [tourJustStarted, setTourJustStarted] = useState(false);

  // Show welcome modal when tour becomes active
  useEffect(() => {
    if (activeTour && activeTour.showWelcomeModal && !tourJustStarted) {
      setShowWelcomeModal(true);
    }
  }, [activeTour, tourJustStarted]);

  if (!activeTour) return null;

  const currentStep = activeTour.steps[currentStepIndex];

  const handleStart = () => {
    setShowWelcomeModal(false);
    setTourJustStarted(true);
  };

  const handleSkipFromModal = () => {
    setShowWelcomeModal(false);
    skipTour();
  };

  const handleSkipFromStep = () => {
    skipTour();
    toast.info('Tour skipped. You can replay it anytime from Settings.');
  };

  const handleClose = () => {
    stopTour();
    toast.info('Tour paused. Resume anytime from Help menu.');
  };

  const handleNext = () => {
    if (currentStepIndex === activeTour.steps.length - 1) {
      completeTour();
      toast.success('Tour completed! 🎉');
    } else {
      nextStep();
    }
  };

  // Show welcome modal or active tour step
  if (showWelcomeModal) {
    return (
      <TourModal
        isOpen={true}
        title={activeTour.welcomeTitle || `Welcome to ${activeTour.name}`}
        description={activeTour.welcomeContent || activeTour.description}
        tourName={activeTour.name}
        stepCount={activeTour.steps.length}
        onStart={handleStart}
        onSkip={handleSkipFromModal}
      />
    );
  }

  if (currentStep) {
    return (
      <TourStep
        step={currentStep}
        stepNumber={currentStepIndex + 1}
        totalSteps={activeTour.steps.length}
        isFirst={currentStepIndex === 0}
        isLast={currentStepIndex === activeTour.steps.length - 1}
        onNext={handleNext}
        onPrevious={previousStep}
        onSkip={handleSkipFromStep}
        onClose={handleClose}
      />
    );
  }

  return null;
}
