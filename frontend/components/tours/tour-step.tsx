/**
 * Tour Step Component
 * Displays a single tour step with spotlight and controls
 */

'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { X, ChevronLeft, ChevronRight, SkipForward } from 'lucide-react';
import { TourStep as TourStepType, TourStepPlacement } from '@/lib/tours/types';
import { useTour } from './tour-provider';
import { OptimizedImage } from '@/components/ui/optimized-image';

export interface TourStepProps {
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

export function TourStep({
  step,
  stepNumber,
  totalSteps,
  isFirst,
  isLast,
  onNext,
  onPrevious,
  onSkip,
  onClose,
}: TourStepProps) {
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const cardRef = useRef<HTMLDivElement>(null);
  const { settings } = useTour();

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

    // Try to find element immediately
    if (findElement()) return;

    // Wait for element if configured
    if (step.waitForElement) {
      const timeout = setTimeout(() => {
        if (!findElement() && step.skipIfMissing) {
          onNext(); // Skip if element still not found
        }
      }, step.waitForElement);

      return () => clearTimeout(timeout);
    }
  }, [step.target, step.waitForElement, step.skipIfMissing, onNext]);

  // Calculate tooltip position
  useEffect(() => {
    if (!targetElement || !cardRef.current) return;

    const calculatePosition = () => {
      const targetRect = targetElement.getBoundingClientRect();
      const cardRect = cardRef.current!.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = 0;
      let left = 0;

      const placement = step.placement || 'bottom';
      const gap = 20;

      switch (placement) {
        case 'top':
          top = targetRect.top - cardRect.height - gap;
          left = targetRect.left + targetRect.width / 2 - cardRect.width / 2;
          break;
        case 'bottom':
          top = targetRect.bottom + gap;
          left = targetRect.left + targetRect.width / 2 - cardRect.width / 2;
          break;
        case 'left':
          top = targetRect.top + targetRect.height / 2 - cardRect.height / 2;
          left = targetRect.left - cardRect.width - gap;
          break;
        case 'right':
          top = targetRect.top + targetRect.height / 2 - cardRect.height / 2;
          left = targetRect.right + gap;
          break;
        case 'center':
          top = viewportHeight / 2 - cardRect.height / 2;
          left = viewportWidth / 2 - cardRect.width / 2;
          break;
        default:
          top = targetRect.bottom + gap;
          left = targetRect.left;
      }

      // Keep within viewport bounds
      top = Math.max(gap, Math.min(top, viewportHeight - cardRect.height - gap));
      left = Math.max(gap, Math.min(left, viewportWidth - cardRect.width - gap));

      setTooltipPosition({ top, left });
    };

    calculatePosition();

    // Recalculate on resize
    window.addEventListener('resize', calculatePosition);
    return () => window.removeEventListener('resize', calculatePosition);
  }, [targetElement, step.placement]);

  // Scroll target into view
  useEffect(() => {
    if (targetElement) {
      targetElement.scrollIntoView({ behavior: 'smooth', block: 'center' });

      // Add highlight class
      targetElement.classList.add('tour-highlight');
      targetElement.setAttribute('data-tour-active', 'true');

      return () => {
        targetElement.classList.remove('tour-highlight');
        targetElement.removeAttribute('data-tour-active');
      };
    }
  }, [targetElement]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowRight':
          if (!isLast) onNext();
          break;
        case 'ArrowLeft':
          if (!isFirst) onPrevious();
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFirst, isLast, onNext, onPrevious, onClose]);

  const animationClass = settings.animationSpeed === 'none' ? '' : 'transition-all duration-300 ease-in-out';

  return (
    <>
      {/* Spotlight Overlay */}
      {targetElement && (
        <div
          data-testid="tour-spotlight"
          className="fixed inset-0 z-[9998] pointer-events-none"
          style={{
            background: `radial-gradient(circle at ${
              targetElement.getBoundingClientRect().left + targetElement.getBoundingClientRect().width / 2
            }px ${
              targetElement.getBoundingClientRect().top + targetElement.getBoundingClientRect().height / 2
            }px, transparent ${Math.max(
              targetElement.getBoundingClientRect().width,
              targetElement.getBoundingClientRect().height
            ) / 2 + 20}px, rgba(0,0,0,0.6) ${Math.max(
              targetElement.getBoundingClientRect().width,
              targetElement.getBoundingClientRect().height
            ) / 2 + 80}px)`,
          }}
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        />
      )}

      {/* Dark Overlay (clickable to close) */}
      <div
        className="fixed inset-0 bg-black/50 z-[9997] cursor-pointer"
        onClick={onClose}
        data-testid="tour-overlay"
      />

      {/* Tour Step Card */}
      <Card
        ref={cardRef}
        data-testid="tour-step"
        className={`fixed z-[9999] p-6 shadow-2xl max-w-md ${animationClass}`}
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
        }}
        role="dialog"
        aria-labelledby="tour-step-title"
        aria-describedby="tour-step-content"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span
                data-testid="tour-progress"
                className="text-xs font-medium text-primary bg-primary/10 px-2 py-1 rounded"
              >
                {stepNumber} of {totalSteps}
              </span>
            </div>
            <h3 id="tour-step-title" className="text-lg font-semibold">
              {step.title}
            </h3>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="tour-close-button"
            aria-label="Close tour"
            className="h-8 w-8"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <div id="tour-step-content" className="mb-6">
          <p className="text-sm text-muted-foreground leading-relaxed">{step.content}</p>

          {step.image && (
            <div className="mt-4 rounded-lg overflow-hidden relative w-full h-48">
              <OptimizedImage
                src={step.image}
                alt={step.title}
                fill
                sizes="(max-width: 768px) 100vw, 400px"
                className="rounded-lg"
                objectFit="cover"
              />
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex gap-2">
            {!isFirst && (
              <Button variant="outline" size="sm" onClick={onPrevious} aria-label="Previous step">
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onSkip} aria-label="Skip tour">
              <SkipForward className="h-4 w-4 mr-1" />
              Skip Tour
            </Button>

            {step.actionLabel ? (
              <Button
                size="sm"
                onClick={() => {
                  step.onAction?.();
                  onNext();
                }}
              >
                {step.actionLabel}
              </Button>
            ) : (
              <Button size="sm" onClick={onNext}>
                {isLast ? 'Finish' : 'Next'}
                {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
              </Button>
            )}
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
