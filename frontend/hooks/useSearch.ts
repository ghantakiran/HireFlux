'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface UseSearchOptions {
  initialQuery?: string;
  debounceMs?: number;
  onSearch?: (query: string) => void;
}

interface UseSearchReturn {
  query: string;
  debouncedQuery: string;
  setQuery: (query: string) => void;
  clearSearch: () => void;
  isDebouncing: boolean;
}

export function useSearch({
  initialQuery = '',
  debounceMs = 300,
  onSearch,
}: UseSearchOptions = {}): UseSearchReturn {
  const [query, setQueryState] = useState(initialQuery);
  const [debouncedQuery, setDebouncedQuery] = useState(initialQuery);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const onSearchRef = useRef(onSearch);
  onSearchRef.current = onSearch;

  useEffect(() => {
    if (query === debouncedQuery) {
      setIsDebouncing(false);
      return;
    }

    setIsDebouncing(true);
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
      setIsDebouncing(false);
      onSearchRef.current?.(query);
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, debounceMs, debouncedQuery]);

  const setQuery = useCallback((newQuery: string) => {
    setQueryState(newQuery);
  }, []);

  const clearSearch = useCallback(() => {
    setQueryState('');
    setDebouncedQuery('');
    setIsDebouncing(false);
    onSearchRef.current?.('');
  }, []);

  return { query, debouncedQuery, setQuery, clearSearch, isDebouncing };
}
