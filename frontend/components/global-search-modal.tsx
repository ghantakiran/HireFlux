/**
 * Global Search Modal (Issue #149)
 *
 * Quick search modal triggered by "/" key
 * Searches across jobs, applications, and candidates
 */

'use client';

import { useEffect, useRef, useState } from 'react';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setSearchQuery(''); // Clear previous search
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="search-title"
        className="fixed left-1/2 top-[20%] -translate-x-1/2 z-[9999] w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <svg
              className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={inputRef}
              type="search"
              id="global-search-input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jobs, candidates, or applications..."
              className="w-full pl-10 pr-4 py-3 text-base border-0 focus:ring-0 focus:outline-none"
              aria-label="Global search"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto p-4">
          {searchQuery ? (
            <div className="space-y-2">
              <p className="text-sm text-gray-500">
                Showing results for "{searchQuery}"
              </p>
              {/* Placeholder for search results */}
              <div className="text-sm text-gray-400 py-8 text-center">
                Search implementation coming soon...
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-400 py-8 text-center">
              Type to search across jobs, applications, and candidates
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Press <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Esc</kbd> to close
          </p>
        </div>
      </div>
    </>
  );
}
