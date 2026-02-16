'use client';

import { useState, useMemo, useCallback } from 'react';

export type SortDirection = 'asc' | 'desc' | 'none';

export interface SortState<K extends string = string> {
  column: K | null;
  direction: SortDirection;
}

export interface UseColumnSortOptions<T, K extends string = string> {
  items: T[];
  defaultSort?: { column: K; direction: Exclude<SortDirection, 'none'> };
  comparators?: Partial<Record<K, (a: T, b: T) => number>>;
}

export interface UseColumnSortReturn<T, K extends string = string> {
  sortedItems: T[];
  sortState: SortState<K>;
  toggleSort: (column: K) => void;
  setSort: (column: K | null, direction: SortDirection) => void;
  clearSort: () => void;
}

function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((acc, part) => acc?.[part], obj);
}

function defaultCompare(a: any, b: any): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;

  // Numbers
  if (typeof a === 'number' && typeof b === 'number') {
    return a - b;
  }

  // Dates
  if (a instanceof Date && b instanceof Date) {
    return a.getTime() - b.getTime();
  }

  // Date-parseable strings
  const aStr = String(a);
  const bStr = String(b);
  const aDate = Date.parse(aStr);
  const bDate = Date.parse(bStr);
  if (!isNaN(aDate) && !isNaN(bDate) && aStr.length > 4) {
    return aDate - bDate;
  }

  // Strings
  return aStr.localeCompare(bStr);
}

export function useColumnSort<T, K extends string = string>({
  items,
  defaultSort,
  comparators,
}: UseColumnSortOptions<T, K>): UseColumnSortReturn<T, K> {
  const [sortState, setSortState] = useState<SortState<K>>({
    column: defaultSort?.column ?? null,
    direction: defaultSort?.direction ?? 'none',
  });

  const toggleSort = useCallback((column: K) => {
    setSortState((prev) => {
      if (prev.column !== column) {
        return { column, direction: 'asc' };
      }
      if (prev.direction === 'asc') {
        return { column, direction: 'desc' };
      }
      // desc → none
      return { column: null, direction: 'none' };
    });
  }, []);

  const setSort = useCallback((column: K | null, direction: SortDirection) => {
    setSortState({ column, direction });
  }, []);

  const clearSort = useCallback(() => {
    setSortState({ column: null, direction: 'none' });
  }, []);

  const sortedItems = useMemo(() => {
    if (!sortState.column || sortState.direction === 'none') {
      return items;
    }

    const col = sortState.column;
    const dir = sortState.direction === 'asc' ? 1 : -1;
    const customComparator = comparators?.[col];

    return [...items].sort((a, b) => {
      if (customComparator) {
        return customComparator(a, b) * dir;
      }
      const aVal = getNestedValue(a, col);
      const bVal = getNestedValue(b, col);
      return defaultCompare(aVal, bVal) * dir;
    });
  }, [items, sortState.column, sortState.direction, comparators]);

  return { sortedItems, sortState, toggleSort, setSort, clearSort };
}

/**
 * Parse a compound sort value like "created_at_desc" into column and direction.
 * Splits on the last underscore to handle column names containing underscores.
 */
export function parseSortValue(value: string): { column: string; direction: 'asc' | 'desc' } {
  const lastUnderscore = value.lastIndexOf('_');
  const column = value.substring(0, lastUnderscore);
  const direction = value.substring(lastUnderscore + 1) as 'asc' | 'desc';
  return { column, direction };
}
