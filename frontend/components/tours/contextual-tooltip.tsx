/**
 * Contextual Tooltip Component
 * Shows helpful tooltips on hover/focus for UI elements
 * Can trigger tours via "Show me how" action
 */

'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HelpCircle, X, Play } from 'lucide-react';
import { TourTooltipConfig, TourStepPlacement } from '@/lib/tours/types';
import { useTour } from './tour-provider';

export interface ContextualTooltipProps {
  /** Target element selector */
  target: string;

  /** Tooltip configuration */
  config: TourTooltipConfig;

  /** Show beacon indicator */
  showBeacon?: boolean;

  /** Callback when tooltip is shown */
  onShow?: () => void;

  /** Callback when tooltip is hidden */
  onHide?: () => void;
}

export function ContextualTooltip({
  target,
  config,
  showBeacon = false,
  onShow,
  onHide
}: ContextualTooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const { settings, startTour, isTourActive } = useTour();

  // Find target element
  useEffect(() => {
    const element = document.querySelector(target) as HTMLElement;
    if (element) {
      setTargetElement(element);
    }
  }, [target]);

  // Calculate tooltip position
  useEffect(() => {
    if (!targetElement || !tooltipRef.current || !isVisible) return;

    const calculatePosition = () => {
      const targetRect = targetElement.getBoundingClientRect();
      const tooltipRect = tooltipRef.current!.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let top = 0;
      let left = 0;
      const gap = 12;
      const placement = config.placement || 'top';

      switch (placement) {
        case 'top':
          top = targetRect.top - tooltipRect.height - gap;
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'bottom':
          top = targetRect.bottom + gap;
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
          break;
        case 'left':
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
          left = targetRect.left - tooltipRect.width - gap;
          break;
        case 'right':
          top = targetRect.top + targetRect.height / 2 - tooltipRect.height / 2;
          left = targetRect.right + gap;
          break;
        default:
          top = targetRect.top - tooltipRect.height - gap;
          left = targetRect.left + targetRect.width / 2 - tooltipRect.width / 2;
      }

      // Keep within viewport bounds
      top = Math.max(gap, Math.min(top, viewportHeight - tooltipRect.height - gap));
      left = Math.max(gap, Math.min(left, viewportWidth - tooltipRect.width - gap));

      setPosition({ top, left });
    };

    calculatePosition();
    window.addEventListener('resize', calculatePosition);
    window.addEventListener('scroll', calculatePosition, true);

    return () => {
      window.removeEventListener('resize', calculatePosition);
      window.removeEventListener('scroll', calculatePosition, true);
    };
  }, [targetElement, isVisible, config.placement]);

  // Handle hover/focus with delay
  useEffect(() => {
    if (!targetElement || !settings.tooltipsEnabled || isTourActive) return;

    const handleMouseEnter = () => {
      timeoutRef.current = setTimeout(() => {
        setIsVisible(true);
        onShow?.();
      }, settings.tooltipDelay);
    };

    const handleMouseLeave = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsVisible(false);
      onHide?.();
    };

    const handleFocus = () => {
      setIsVisible(true);
      onShow?.();
    };

    const handleBlur = () => {
      setIsVisible(false);
      onHide?.();
    };

    targetElement.addEventListener('mouseenter', handleMouseEnter);
    targetElement.addEventListener('mouseleave', handleMouseLeave);
    targetElement.addEventListener('focus', handleFocus);
    targetElement.addEventListener('blur', handleBlur);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      targetElement.removeEventListener('mouseenter', handleMouseEnter);
      targetElement.removeEventListener('mouseleave', handleMouseLeave);
      targetElement.removeEventListener('focus', handleFocus);
      targetElement.removeEventListener('blur', handleBlur);
    };
  }, [targetElement, settings.tooltipsEnabled, settings.tooltipDelay, isTourActive, onShow, onHide]);

  // Add beacon indicator to target element
  useEffect(() => {
    if (!targetElement || !showBeacon || !settings.showBeacons) return;

    targetElement.classList.add('tour-beacon');

    return () => {
      targetElement.classList.remove('tour-beacon');
    };
  }, [targetElement, showBeacon, settings.showBeacons]);

  const handleShowMeHow = () => {
    if (config.tourId) {
      setIsVisible(false);
      startTour(config.tourId);
    }
  };

  const handleClose = () => {
    setIsVisible(false);
    onHide?.();
  };

  if (!isVisible || !targetElement) return null;

  return (
    <Card
      ref={tooltipRef}
      data-testid="contextual-tooltip"
      className="fixed z-[9999] p-3 shadow-lg max-w-xs text-sm"
      style={{
        top: position.top,
        left: position.left,
      }}
      role="tooltip"
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <HelpCircle className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
        <button
          onClick={handleClose}
          className="h-4 w-4 text-muted-foreground hover:text-foreground flex-shrink-0"
          aria-label="Close tooltip"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="text-sm text-foreground leading-relaxed mb-3">
        {config.content}
      </p>

      <div className="flex gap-2">
        {config.tourId && (
          <Button
            size="sm"
            variant="default"
            onClick={handleShowMeHow}
            className="text-xs"
            data-testid="show-me-how-button"
          >
            <Play className="h-3 w-3 mr-1" />
            Show me how
          </Button>
        )}
        {config.learnMoreUrl && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.open(config.learnMoreUrl, '_blank')}
            className="text-xs"
          >
            Learn more
          </Button>
        )}
      </div>
    </Card>
  );
}
