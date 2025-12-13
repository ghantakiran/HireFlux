/**
 * Tour Modal Component
 * Displays welcome modal before starting a tour
 */

'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, X } from 'lucide-react';

export interface TourModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  tourName: string;
  stepCount: number;
  onStart: () => void;
  onSkip: () => void;
}

export function TourModal({ isOpen, title, description, tourName, stepCount, onStart, onSkip }: TourModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onSkip()}>
      <DialogContent
        data-testid="tour-modal"
        className="sm:max-w-md"
        aria-labelledby="tour-modal-title"
        aria-describedby="tour-modal-description"
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            {title}
          </DialogTitle>
          <DialogDescription className="text-base pt-2">
            {description}
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 p-4 bg-muted rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Tour: {tourName}</p>
              <p className="text-sm text-muted-foreground">{stepCount} steps • ~2 minutes</p>
            </div>
            <Play className="h-8 w-8 text-primary" />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <Button onClick={onStart} className="flex-1" size="lg">
            <Play className="mr-2 h-4 w-4" />
            Start Tour
          </Button>
          <Button onClick={onSkip} variant="outline" size="lg">
            <X className="mr-2 h-4 w-4" />
            Skip Tour
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          You can always replay this tour later from Settings
        </p>
      </DialogContent>
    </Dialog>
  );
}
