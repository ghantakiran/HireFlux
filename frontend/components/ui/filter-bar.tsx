'use client';

import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface SelectFilterDef {
  type: 'select';
  key: string;
  label: string;
  options: { value: string; label: string }[];
  allValue?: string;
  width?: string;
  'data-testid'?: string;
}

export interface ButtonGroupFilterDef {
  type: 'button-group';
  key: string;
  options: { value: string; label: string }[];
  'data-testid'?: string;
}

export type FilterDef = SelectFilterDef | ButtonGroupFilterDef;

export interface FilterBarProps {
  filters: FilterDef[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  onClear?: () => void;
  activeCount?: number;
  showClearButton?: boolean;
  className?: string;
  'data-testid'?: string;
}

export function FilterBar({
  filters,
  values,
  onChange,
  onClear,
  activeCount = 0,
  showClearButton = true,
  className,
  'data-testid': dataTestId,
}: FilterBarProps) {
  return (
    <div
      className={cn('flex flex-wrap items-center gap-3', className)}
      data-testid={dataTestId}
    >
      {filters.map((filter) => {
        if (filter.type === 'select') {
          return (
            <Select
              key={filter.key}
              value={values[filter.key] || filter.allValue || 'all'}
              onValueChange={(value) => onChange(filter.key, value)}
            >
              <SelectTrigger
                className={cn('w-full sm:w-[180px]', filter.width)}
                data-testid={filter['data-testid']}
              >
                <SelectValue placeholder={filter.label} />
              </SelectTrigger>
              <SelectContent>
                {filter.options.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }

        if (filter.type === 'button-group') {
          return (
            <div
              key={filter.key}
              className="flex items-center gap-2 flex-wrap"
              data-testid={filter['data-testid']}
            >
              {filter.options.map((opt) => (
                <Button
                  key={opt.value}
                  variant={values[filter.key] === opt.value ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onChange(filter.key, opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
          );
        }

        return null;
      })}

      {showClearButton && activeCount > 0 && onClear && (
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="gap-1.5"
          data-testid="clear-filters-button"
        >
          <X className="h-4 w-4" />
          Clear
          <Badge variant="secondary" className="ml-1">
            {activeCount}
          </Badge>
        </Button>
      )}
    </div>
  );
}
