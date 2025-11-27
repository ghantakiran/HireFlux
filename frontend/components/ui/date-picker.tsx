'use client';

import { Calendar } from 'lucide-react';
import { useId } from 'react';

interface DatePickerProps {
  label?: string;
  value?: string;
  onChange?: (value: string) => void;
  min?: string;
  max?: string;
  className?: string;
  required?: boolean;
  name?: string;
}

// Native date input for minimal deps. Can be swapped for react-day-picker later.
export function DatePicker({ label, value, onChange, min, max, className, required, name }: DatePickerProps) {
  const id = useId();
  return (
    <div className={`flex flex-col gap-1 ${className ?? ''}`}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-foreground">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          id={id}
          name={name}
          type="date"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          min={min}
          max={max}
          required={required}
          className="w-full rounded-md border border-input bg-background px-3 py-2 pr-9 text-sm text-foreground shadow-sm outline-none ring-0 focus:border-primary"
        />
        <Calendar className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}


