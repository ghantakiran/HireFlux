'use client';

import * as React from 'react';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SortDirection } from '@/hooks/useColumnSort';

export interface SortableColumnHeaderProps {
  column: string;
  label: string;
  currentSortColumn: string | null;
  currentSortDirection: SortDirection;
  onSort: (column: string) => void;
  className?: string;
}

export function SortableColumnHeader({
  column,
  label,
  currentSortColumn,
  currentSortDirection,
  onSort,
  className,
}: SortableColumnHeaderProps) {
  const isActive = currentSortColumn === column;
  const ariaSortValue =
    isActive && currentSortDirection === 'asc'
      ? 'ascending'
      : isActive && currentSortDirection === 'desc'
      ? 'descending'
      : 'none';

  return (
    <th
      scope="col"
      aria-sort={ariaSortValue}
      className={cn(
        'px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider',
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSort(column)}
        className="flex items-center gap-1 hover:text-gray-900 dark:hover:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 rounded-sm transition-colors"
      >
        {label}
        {!isActive || currentSortDirection === 'none' ? (
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
        ) : currentSortDirection === 'asc' ? (
          <ArrowUp className="w-4 h-4 text-blue-600" />
        ) : (
          <ArrowDown className="w-4 h-4 text-blue-600" />
        )}
      </button>
    </th>
  );
}
