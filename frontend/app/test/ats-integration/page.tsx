/**
 * ATS Integration Test Page
 * Week 40 Day 3
 *
 * Interactive test page for manual verification:
 * - View toggle (List ↔ Kanban)
 * - localStorage persistence
 * - URL state sync
 * - Keyboard shortcuts (Alt+V)
 */

'use client';

import React from 'react';
import Link from 'next/link';
import { useATSStore } from '@/hooks/useATSStore';

export default function ATSIntegrationTestPage() {
  const {
    view,
    applications,
    filteredApplications,
    filters,
    sortBy,
    selectedIds,
    setView,
    toggleView,
    setFilters,
    setSortBy,
    toggleSelection,
    selectAll,
    clearSelection,
  } = useATSStore();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/test"
            className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 mb-4"
          >
            ← Back to Test Suite
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            ATS Integration Test Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Week 40 Day 3 - Testing view toggle, state management, and URL sync
          </p>
        </div>

        {/* Test Controls */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Test Controls</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* View Toggle */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">View Mode</h3>
              <div className="space-y-2">
                <button
                  onClick={() => setView('list')}
                  className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    view === 'list'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  List View
                </button>
                <button
                  onClick={() => setView('kanban')}
                  className={`w-full px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    view === 'kanban'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  Kanban View
                </button>
                <button
                  onClick={toggleView}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-md text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  Toggle View
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                Keyboard: Press Alt+V to toggle
              </p>
            </div>

            {/* Filters */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Filters</h3>
              <div className="space-y-2">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">Stage</label>
                  <select
                    value={filters.stage || ''}
                    onChange={(e) => setFilters({ stage: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-gray-100"
                  >
                    <option value="">All Stages</option>
                    <option value="new">New</option>
                    <option value="reviewing">Reviewing</option>
                    <option value="phone_screen">Phone Screen</option>
                    <option value="technical">Technical</option>
                    <option value="offer">Offer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Min Fit Index: {filters.minFitIndex || 0}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={filters.minFitIndex || 0}
                    onChange={(e) =>
                      setFilters({ minFitIndex: parseInt(e.target.value) })
                    }
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Sort */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">Sort</h3>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-800 dark:text-gray-100"
              >
                <option value="date-desc">Date (Newest First)</option>
                <option value="date-asc">Date (Oldest First)</option>
                <option value="fit-desc">Fit Index (Highest First)</option>
                <option value="fit-asc">Fit Index (Lowest First)</option>
              </select>
            </div>

            {/* Selection */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3">
                Selection ({selectedIds.length})
              </h3>
              <div className="space-y-2">
                <button
                  onClick={selectAll}
                  className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={clearSelection}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* State Display */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Current State</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">View State</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify({ view }, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Filters</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify(filters, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Sort</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify({ sortBy }, null, 2)}
              </pre>
            </div>
            <div>
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Selection</h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                {JSON.stringify({ selectedIds }, null, 2)}
              </pre>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                localStorage (ats_view_preference)
              </h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                {typeof window !== 'undefined'
                  ? localStorage.getItem('ats_view_preference') || 'null'
                  : 'SSR'}
              </pre>
            </div>
            <div className="md:col-span-2">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                URL Query Params
              </h3>
              <pre className="bg-gray-100 dark:bg-gray-800 p-3 rounded text-xs overflow-x-auto">
                {typeof window !== 'undefined'
                  ? window.location.search || 'No params'
                  : 'SSR'}
              </pre>
            </div>
          </div>
        </div>

        {/* Data Display */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
            Applications Data ({applications.length} total, {filteredApplications.length}{' '}
            filtered)
          </h2>
          <div className="overflow-x-auto">
            <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded text-xs">
              {JSON.stringify(
                {
                  total: applications.length,
                  filtered: filteredApplications.length,
                  applications: applications.slice(0, 3),
                },
                null,
                2
              )}
            </pre>
          </div>
        </div>

        {/* Test Instructions */}
        <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Manual Test Checklist</h3>
          <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-300">
            <li>✓ Toggle between List and Kanban views</li>
            <li>✓ Press Alt+V to toggle views (keyboard shortcut)</li>
            <li>✓ Refresh page and verify view preference persists (localStorage)</li>
            <li>✓ Change filters and verify URL updates</li>
            <li>✓ Copy URL and open in new tab (shareable URLs)</li>
            <li>✓ Verify selection state</li>
            <li>✓ Check browser DevTools localStorage</li>
          </ul>
        </div>

        {/* Live ATS Page */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
              Live ATS Integration
            </h2>
            <Link
              href="/employer/jobs/job-test-1/applications"
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Open Full Page →
            </Link>
          </div>
          <div className="border-4 border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900">
            <iframe
              src="/employer/jobs/job-test-1/applications"
              className="w-full h-[600px]"
              title="ATS Integration Preview"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
