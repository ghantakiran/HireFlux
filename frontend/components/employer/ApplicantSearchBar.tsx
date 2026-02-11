/**
 * Applicant Search Bar Component
 * Issue #59: ATS Core Features
 *
 * Features:
 * - Debounced search input (500ms delay)
 * - Search by candidate name or email
 * - Clear button
 * - Search icon
 * - Loading indicator
 * - Real-time results count
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, X, Loader2 } from 'lucide-react';
import { useApplicantFiltering } from '@/hooks/useApplicantFiltering';

interface ApplicantSearchBarProps {
  jobId: string;
  placeholder?: string;
  debounceMs?: number;
}

export default function ApplicantSearchBar({
  jobId,
  placeholder = 'Search by name or email...',
  debounceMs = 500,
}: ApplicantSearchBarProps) {
  const { filters, setSearch, isLoading, totalCount } = useApplicantFiltering();

  // Local state for immediate UI updates
  const [localValue, setLocalValue] = useState(filters.search || '');
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search effect
  useEffect(() => {
    setIsSearching(true);
    const timer = setTimeout(() => {
      setSearch(localValue);
      setIsSearching(false);
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      setIsSearching(false);
    };
  }, [localValue, debounceMs, setSearch]);

  // Sync with external filter changes
  useEffect(() => {
    if (filters.search !== localValue && filters.search !== undefined) {
      setLocalValue(filters.search || '');
    }
  }, [filters.search]);

  // Handle input change
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLocalValue(e.target.value);
  };

  // Handle clear
  const handleClear = useCallback(() => {
    setLocalValue('');
    setSearch('');
  }, [setSearch]);

  // Handle keyboard shortcuts
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        {/* Search Icon */}
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {isSearching ? (
            <Loader2 className="w-5 h-5 text-gray-400 dark:text-gray-500 animate-spin" />
          ) : (
            <Search className="w-5 h-5 text-gray-400 dark:text-gray-500" />
          )}
        </div>

        {/* Input */}
        <input
          type="text"
          value={localValue}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="block w-full pl-10 pr-10 py-2.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          aria-label="Search applicants"
        />

        {/* Clear Button */}
        {localValue && (
          <button
            onClick={handleClear}
            className="absolute inset-y-0 right-0 pr-3 flex items-center hover:bg-gray-50 dark:hover:bg-gray-800 rounded-r-lg transition-colors"
            aria-label="Clear search"
          >
            <X className="w-5 h-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
          </button>
        )}
      </div>

      {/* Results Count (when searching) */}
      {localValue && !isSearching && (
        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
          Found{' '}
          <span className="font-medium text-gray-900 dark:text-gray-100">{totalCount}</span>{' '}
          {totalCount === 1 ? 'applicant' : 'applicants'}
        </div>
      )}
    </div>
  );
}
