/**
 * Tour Bottom Sheet Component (Mobile)
 * Mobile-optimized tour UI with bottom sheet and touch gestures
 */

'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { TourStep as TourStepType } from '@/lib/tours/types';
import { useTour } from './tour-provider';

export interface TourBottomSheetProps {
  step: TourStepType;
  stepNumber: number;
  totalSteps: number;
  isFirst: boolean;
  isLast: boolean;
  onNext: () => void;
  onPrevious: () => void;
  onSkip: () => void;
  onClose: () => void;
}

export function TourBottomSheet({
  step,
  stepNumber,
  totalSteps,
  isFirst,
  isLast,
  onNext,
  onPrevious,
  onSkip,
  onClose,
}: TourBottomSheetProps) {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [startY, setStartY] = useState(0);
  const sheetRef = useRef<HTMLDivElement>(null);
  const { settings } = useTour();

  // Touch gesture thresholds
  const SWIPE_THRESHOLD = 50; // px
  const DISMISS_THRESHOLD = 100; // px for swipe down to dismiss

  // Find and observe target element
  useEffect(() => {
    const findElement = () => {
      const element = document.querySelector(step.target) as HTMLElement;
      if (element) {
        setTargetElement(element);
        return true;
      }
      return false;
    };

    if (findElement()) return;

    if (step.waitForElement) {
      const timeout = setTimeout(() => {
        if (!findElement() && step.skipIfMissing) {
          onNext();
        }
      }, step.waitForElement);

      return () => clearTimeout(timeout);
    }
  }, [step.target, step.waitForElement, step.skipIfMissing, onNext]);

  // Scroll target into view
  useEffect(() => {
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'center',
      });

      targetElement.classList.add('tour-highlight');
      targetElement.setAttribute('data-tour-active', 'true');

      return () => {
        targetElement.classList.remove('tour-highlight');
        targetElement.removeAttribute('data-tour-active');
      };
    }
  }, [targetElement]);

  // Touch event handlers for swipe gestures
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsDragging(true);
    setStartY(e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startY;

    // Only allow dragging down
    if (diff > 0) {
      setDragY(diff);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!isDragging) return;

    const endY = e.changedTouches[0].clientY;
    const diff = endY - startY;

    // Swipe down to dismiss
    if (diff > DISMISS_THRESHOLD) {
      onClose();
    }
    // Swipe left/right for navigation
    else if (Math.abs(diff) < 20) {
      const startX = e.changedTouches[0].clientX;
      const touchStartX = (e.target as HTMLElement).getBoundingClientRect().left;
      const diffX = startX - touchStartX;

      if (diffX < -SWIPE_THRESHOLD && !isLast) {
        onNext();
      } else if (diffX > SWIPE_THRESHOLD && !isFirst) {
        onPrevious();
      }
    }

    setIsDragging(false);
    setDragY(0);
    setStartY(0);
  };

  const animationClass = settings.animationSpeed === 'none' ? '' : 'transition-transform duration-300 ease-out';

  return (
    <>
      {/* Spotlight Overlay */}
      {targetElement && (
        <div
          data-testid="tour-spotlight-mobile"
          className="fixed inset-0 z-[9998]"
          style={{
            background: `radial-gradient(circle at ${
              targetElement.getBoundingClientRect().left + targetElement.getBoundingClientRect().width / 2
            }px ${
              targetElement.getBoundingClientRect().top + targetElement.getBoundingClientRect().height / 2
            }px, transparent ${Math.max(
              targetElement.getBoundingClientRect().width,
              targetElement.getBoundingClientRect().height
            ) / 2 + 20}px, rgba(0,0,0,0.75) ${Math.max(
              targetElement.getBoundingClientRect().width,
              targetElement.getBoundingClientRect().height
            ) / 2 + 80}px)`,
          }}
        />
      )}

      {/* Dark Overlay */}
      <div
        className="fixed inset-0 bg-black/60 z-[9997]"
        onClick={onClose}
        data-testid="tour-overlay-mobile"
      />

      {/* Bottom Sheet */}
      <Card
        ref={sheetRef}
        data-testid="tour-bottom-sheet"
        className={`fixed bottom-0 left-0 right-0 z-[9999] rounded-t-2xl max-h-[80vh] overflow-y-auto ${animationClass}`}
        style={{
          transform: isDragging ? `translateY(${dragY}px)` : 'translateY(0)',
        }}
        role="dialog"
        aria-labelledby="tour-step-title"
        aria-describedby="tour-step-content"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="w-12 h-1 bg-gray-300 rounded-full"
            data-testid="drag-handle"
          />
        </div>

        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span
                  data-testid="tour-progress"
                  className="text-xs font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-full"
                >
                  {stepNumber} of {totalSteps}
                </span>
              </div>
              <h3 id="tour-step-title" className="text-xl font-semibold">
                {step.title}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              data-testid="tour-close-button"
              aria-label="Close tour"
              className="h-10 w-10"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Content */}
          <div id="tour-step-content" className="mb-6">
            <p className="text-base text-muted-foreground leading-relaxed">
              {step.content}
            </p>

            {step.image && (
              <div className="mt-4 rounded-lg overflow-hidden">
                <img src={step.image} alt={step.title} className="w-full" />
              </div>
            )}
          </div>

          {/* Swipe Hint (only show on first step) */}
          {stepNumber === 1 && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg text-center">
              <p className="text-xs text-blue-800">
                👆 Swipe left/right to navigate • Swipe down to close
              </p>
            </div>
          )}

          {/* Controls - Touch Optimized */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              {!isFirst && (
                <Button
                  variant="outline"
                  size="lg"
                  onClick={onPrevious}
                  aria-label="Previous step"
                  className="flex-1 min-h-[44px]"
                >
                  <ChevronLeft className="h-5 w-5 mr-1" />
                  Back
                </Button>
              )}

              {step.actionLabel ? (
                <Button
                  size="lg"
                  onClick={() => {
                    step.onAction?.();
                    onNext();
                  }}
                  className={`${!isFirst ? 'flex-1' : 'w-full'} min-h-[44px]`}
                >
                  {step.actionLabel}
                </Button>
              ) : (
                <Button
                  size="lg"
                  onClick={onNext}
                  className={`${!isFirst ? 'flex-1' : 'w-full'} min-h-[44px]`}
                >
                  {isLast ? 'Finish' : 'Next'}
                  {!isLast && <ChevronRight className="h-5 w-5 ml-1" />}
                </Button>
              )}
            </div>

            <Button
              variant="ghost"
              size="lg"
              onClick={onSkip}
              aria-label="Skip tour"
              className="w-full min-h-[44px]"
            >
              <SkipForward className="h-5 w-5 mr-1" />
              Skip Tour
            </Button>
          </div>
        </div>
      </Card>

      {/* Live region for screen readers */}
      <div
        id="tour-live-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      />
    </>
  );
}
