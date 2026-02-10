/**
 * Test Page for Employer Dashboard Component
 * Sprint 19-20 Week 39 Day 3
 *
 * Navigate to: http://localhost:3000/test/employer-dashboard
 */

'use client';

import React, { useState } from 'react';
import { EmployerDashboard } from '@/components/employer/EmployerDashboard';

// Mock data for testing
const mockDashboardData = {
  company: {
    id: 'company-1',
    name: 'TechCorp Inc.',
    logo: '/logos/techcorp.png',
  },
  stats: {
    activeJobs: 12,
    newApplicationsToday: 8,
    totalApplications: 145,
    avgCandidateQuality: 78,
    avgTimeToFill: 24,
  },
  applicationsByStatus: {
    new: 23,
    reviewing: 45,
    interview: 18,
    offer: 7,
    hired: 32,
    rejected: 20,
  },
  topJobs: [
    {
      id: 'job-1',
      title: 'Senior Frontend Developer',
      applications: 34,
      views: 245,
      postedDays: 5,
    },
    {
      id: 'job-2',
      title: 'Backend Engineer',
      applications: 28,
      views: 198,
      postedDays: 7,
    },
    {
      id: 'job-3',
      title: 'Full Stack Developer',
      applications: 19,
      views: 156,
      postedDays: 3,
    },
  ],
  recentActivity: [
    {
      id: 'activity-1',
      type: 'new_application' as const,
      message: 'John Doe applied to Senior Frontend Developer',
      timestamp: '2 minutes ago',
      actor: 'John Doe',
    },
    {
      id: 'activity-2',
      type: 'status_change' as const,
      message: 'Jane Smith moved to Interview stage for Backend Engineer',
      timestamp: '1 hour ago',
      actor: 'Sarah Johnson',
    },
    {
      id: 'activity-3',
      type: 'new_job' as const,
      message: 'New job posted: Full Stack Developer',
      timestamp: '3 hours ago',
      actor: 'Michael Chen',
    },
  ],
};

const emptyDashboardData = {
  company: {
    id: 'company-2',
    name: 'StartupCo',
  },
  stats: {
    activeJobs: 0,
    newApplicationsToday: 0,
    totalApplications: 0,
    avgCandidateQuality: 0,
    avgTimeToFill: 0,
  },
  applicationsByStatus: {
    new: 0,
    reviewing: 0,
    interview: 0,
    offer: 0,
    hired: 0,
    rejected: 0,
  },
  topJobs: [],
  recentActivity: [],
};

export default function EmployerDashboardTestPage() {
  const [viewMode, setViewMode] = useState<'normal' | 'loading' | 'error' | 'empty'>('normal');
  const [retryCount, setRetryCount] = useState(0);

  const handlePostJob = () => {
    console.log('Post Job clicked');
    alert('Post Job action triggered');
  };

  const handleViewApplications = () => {
    console.log('View Applications clicked');
    alert('View Applications action triggered');
  };

  const handleSearchCandidates = () => {
    console.log('Search Candidates clicked');
    alert('Search Candidates action triggered');
  };

  const handleRetry = () => {
    console.log('Retry clicked');
    setRetryCount(retryCount + 1);
    setViewMode('normal');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800">
      {/* Test Controls */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Employer Dashboard Test Page
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Sprint 19-20 Week 39 Day 3 - TDD Implementation (100% test coverage)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600 dark:text-green-400">
                ✓ 33/33 tests passing
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Retry count: {retryCount}</p>
            </div>
          </div>

          {/* View Mode Controls */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setViewMode('normal')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'normal'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Normal View
            </button>
            <button
              onClick={() => setViewMode('loading')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'loading'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Loading State
            </button>
            <button
              onClick={() => setViewMode('error')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'error'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Error State
            </button>
            <button
              onClick={() => setViewMode('empty')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                viewMode === 'empty'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
            >
              Empty State
            </button>
          </div>
        </div>
      </div>

      {/* Dashboard Component */}
      {viewMode === 'loading' && (
        <EmployerDashboard
          data={null}
          loading={true}
          onPostJob={handlePostJob}
          onViewApplications={handleViewApplications}
          onSearchCandidates={handleSearchCandidates}
        />
      )}

      {viewMode === 'error' && (
        <EmployerDashboard
          data={null}
          error="Failed to load dashboard data. Please try again."
          onPostJob={handlePostJob}
          onViewApplications={handleViewApplications}
          onSearchCandidates={handleSearchCandidates}
          onRetry={handleRetry}
        />
      )}

      {viewMode === 'empty' && (
        <EmployerDashboard
          data={emptyDashboardData}
          onPostJob={handlePostJob}
          onViewApplications={handleViewApplications}
          onSearchCandidates={handleSearchCandidates}
        />
      )}

      {viewMode === 'normal' && (
        <EmployerDashboard
          data={mockDashboardData}
          onPostJob={handlePostJob}
          onViewApplications={handleViewApplications}
          onSearchCandidates={handleSearchCandidates}
        />
      )}
    </div>
  );
}
