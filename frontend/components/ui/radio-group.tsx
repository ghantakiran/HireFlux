'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

interface RadioGroupProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export function RadioGroup({ value, onValueChange, children, className }: RadioGroupProps) {
  return (
    <div className={cn('grid gap-2', className)} role="radiogroup">
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child)) {
          return React.cloneElement(child as React.ReactElement<any>, {
            checked: child.props.value === value,
            onSelect: () => onValueChange(child.props.value),
          });
        }
        return child;
      })}
    </div>
  );
}

interface RadioGroupItemProps {
  value: string;
  id: string;
  checked?: boolean;
  onSelect?: () => void;
  children: React.ReactNode;
  'aria-label'?: string;
}

export function RadioGroupItem({
  value,
  id,
  checked,
  onSelect,
  children,
  'aria-label': ariaLabel,
}: RadioGroupItemProps) {
  return (
    <div className="flex items-center space-x-2">
      <input
        type="radio"
        id={id}
        value={value}
        checked={checked}
        onChange={onSelect}
        aria-label={ariaLabel}
        className="h-4 w-4 border-gray-300 dark:border-gray-600 text-primary focus:ring-2 focus:ring-primary"
      />
      <label htmlFor={id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
        {children}
      </label>
    </div>
  );
}
