'use client';

/**
 * Date Range Picker Component for Analytics Dashboard
 * Sprint 15-16: Advanced Analytics & Reporting
 */

import React, { useState } from 'react';
import { format, subDays } from 'date-fns';

interface DateRangePickerProps {
  startDate: string;
  endDate: string;
  onDateRangeChange: (startDate: string, endDate: string) => void;
}

type PresetKey = 'last_7_days' | 'last_30_days' | 'last_90_days' | 'custom';

interface Preset {
  label: string;
  getDates: () => { start: string; end: string };
}

const PRESETS: Record<PresetKey, Preset> = {
  last_7_days: {
    label: 'Last 7 days',
    getDates: () => ({
      start: format(subDays(new Date(), 7), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  last_30_days: {
    label: 'Last 30 days',
    getDates: () => ({
      start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  last_90_days: {
    label: 'Last 90 days',
    getDates: () => ({
      start: format(subDays(new Date(), 90), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
  custom: {
    label: 'Custom range',
    getDates: () => ({
      start: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
      end: format(new Date(), 'yyyy-MM-dd'),
    }),
  },
};

export function DateRangePicker({ startDate, endDate, onDateRangeChange }: DateRangePickerProps) {
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('last_30_days');
  const [showCustom, setShowCustom] = useState(false);

  const handlePresetClick = (preset: PresetKey) => {
    setSelectedPreset(preset);

    if (preset === 'custom') {
      setShowCustom(true);
    } else {
      setShowCustom(false);
      const dates = PRESETS[preset].getDates();
      onDateRangeChange(dates.start, dates.end);
    }
  };

  const handleCustomDateChange = (type: 'start' | 'end', value: string) => {
    if (type === 'start') {
      onDateRangeChange(value, endDate);
    } else {
      onDateRangeChange(startDate, value);
    }
  };

  return (
    <div data-testid="date-range-picker" className="flex flex-col space-y-4">
      {/* Preset Buttons */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(PRESETS).map(([key, preset]) => (
          <button
            key={key}
            data-testid={`preset-${key}`}
            onClick={() => handlePresetClick(key as PresetKey)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPreset === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
            aria-label={`Select ${preset.label}`}
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Custom Date Inputs */}
      {showCustom && (
        <div className="flex flex-col sm:flex-row gap-4" data-testid="custom-date-inputs">
          <div className="flex-1">
            <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              id="start-date"
              type="date"
              value={startDate}
              onChange={(e) => handleCustomDateChange('start', e.target.value)}
              max={endDate}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="Start date"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              id="end-date"
              type="date"
              value={endDate}
              onChange={(e) => handleCustomDateChange('end', e.target.value)}
              min={startDate}
              max={format(new Date(), 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              aria-label="End date"
            />
          </div>
        </div>
      )}

      {/* Current Selection Display */}
      <div className="text-sm text-gray-600">
        <span className="font-medium">Selected range:</span>{' '}
        {format(new Date(startDate), 'MMM dd, yyyy')} - {format(new Date(endDate), 'MMM dd, yyyy')}
      </div>
    </div>
  );
}
