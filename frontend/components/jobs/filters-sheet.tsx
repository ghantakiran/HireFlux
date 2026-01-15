'use client';

/**
 * Filters Sheet Component
 * Issue #141: Filter preferences for job discovery
 */

import React, { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';

interface FiltersSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (activeCount: number) => void;
}

export function FiltersSheet({ isOpen, onClose, onApply }: FiltersSheetProps) {
  const [remoteOnly, setRemoteOnly] = useState(false);
  const [visaSponsorship, setVisaSponsorship] = useState(false);
  const [salaryMin, setSalaryMin] = useState(100);

  const handleApply = () => {
    let count = 0;
    if (remoteOnly) count++;
    if (visaSponsorship) count++;
    if (salaryMin > 100) count++;

    onApply(count);
  };

  const handleReset = () => {
    setRemoteOnly(false);
    setVisaSponsorship(false);
    setSalaryMin(100);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        data-filters-sheet
        className="fixed inset-0 z-50 w-full h-full max-w-none m-0 p-0 rounded-none bg-white"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
        }}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Filters</h2>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-10 w-10">
            <X className="h-5 w-5" />
          </Button>
        </header>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 140px)' }}>
          {/* Remote Only */}
          <div data-filter="remote" className="flex items-center space-x-3">
            <Checkbox
              id="remote"
              checked={remoteOnly}
              onChange={(e) => setRemoteOnly(e.target.checked)}
            />
            <Label htmlFor="remote" className="text-base font-medium cursor-pointer">
              Remote Only
            </Label>
          </div>

          {/* Visa Sponsorship */}
          <div className="flex items-center space-x-3">
            <Checkbox
              id="visa"
              checked={visaSponsorship}
              onChange={(e) => setVisaSponsorship(e.target.checked)}
            />
            <Label htmlFor="visa" className="text-base font-medium cursor-pointer">
              Visa Sponsorship Available
            </Label>
          </div>

          {/* Salary Range */}
          <div data-filter="salary" className="space-y-4">
            <Label className="text-base font-medium">Minimum Salary</Label>
            <div className="space-y-2">
              <Slider
                value={[salaryMin]}
                onValueChange={(value) => setSalaryMin(value[0])}
                min={50}
                max={300}
                step={10}
                className="w-full"
              />
              <p className="text-sm text-gray-600 text-center">
                ${salaryMin}k+ per year
              </p>
            </div>
          </div>

          {/* Location (Placeholder) */}
          <div data-filter="location" className="space-y-2">
            <Label className="text-base font-medium">Location</Label>
            <p className="text-sm text-gray-500">Coming soon...</p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 py-4 space-y-3"
          style={{
            paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 16px)',
          }}
        >
          <Button
            data-apply-filters
            onClick={handleApply}
            className="w-full h-12 text-base font-semibold"
          >
            Apply Filters
          </Button>
          <Button onClick={handleReset} variant="outline" className="w-full h-12">
            Reset All
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
