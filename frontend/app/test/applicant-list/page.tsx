/**
 * Test Page for ApplicantList Component
 * Sprint 19-20 Week 39 Day 5
 *
 * Navigate to: http://localhost:3000/test/applicant-list
 */

'use client';

import React, { useState } from 'react';
import { ApplicantList, Applicant } from '@/components/employer/ApplicantList';

// Mock applicants data
const mockApplicants: Applicant[] = [
  {
    id: 'app-1',
    candidateId: 'user-1',
    candidateName: 'John Doe',
    candidateEmail: 'john.doe@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Developer',
    fitIndex: 92,
    stage: 'new',
    appliedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
    resumeUrl: 'https://example.com/resume1.pdf',
    coverLetterText: 'I am excited to apply...',
    tags: ['React', 'TypeScript', 'Next.js'],
    assignedTo: 'Sarah Johnson',
  },
  {
    id: 'app-2',
    candidateId: 'user-2',
    candidateName: 'Jane Smith',
    candidateEmail: 'jane.smith@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Developer',
    fitIndex: 87,
    stage: 'reviewing',
    appliedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    resumeUrl: 'https://example.com/resume2.pdf',
    tags: ['React', 'JavaScript', 'CSS'],
    assignedTo: 'Mike Chen',
  },
  {
    id: 'app-3',
    candidateId: 'user-3',
    candidateName: 'Bob Johnson',
    candidateEmail: 'bob.johnson@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Developer',
    fitIndex: 75,
    stage: 'phone_screen',
    appliedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    resumeUrl: 'https://example.com/resume3.pdf',
    tags: ['Vue', 'JavaScript'],
  },
  {
    id: 'app-4',
    candidateId: 'user-4',
    candidateName: 'Alice Brown',
    candidateEmail: 'alice.brown@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Developer',
    fitIndex: 68,
    stage: 'technical_interview',
    appliedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    tags: ['Angular'],
    assignedTo: 'Sarah Johnson',
  },
  {
    id: 'app-5',
    candidateId: 'user-5',
    candidateName: 'Charlie Davis',
    candidateEmail: 'charlie.davis@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Developer',
    fitIndex: 55,
    stage: 'rejected',
    appliedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    tags: ['jQuery'],
  },
  {
    id: 'app-6',
    candidateId: 'user-6',
    candidateName: 'David Wilson',
    candidateEmail: 'david.wilson@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Developer',
    fitIndex: 95,
    stage: 'offer',
    appliedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days ago
    resumeUrl: 'https://example.com/resume6.pdf',
    tags: ['React', 'TypeScript', 'Node.js', 'GraphQL'],
    assignedTo: 'Mike Chen',
  },
  {
    id: 'app-7',
    candidateId: 'user-7',
    candidateName: 'Emma Martinez',
    candidateEmail: 'emma.martinez@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Developer',
    fitIndex: 82,
    stage: 'final_interview',
    appliedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
    resumeUrl: 'https://example.com/resume7.pdf',
    tags: ['React', 'Redux', 'TypeScript'],
    assignedTo: 'Sarah Johnson',
  },
  {
    id: 'app-8',
    candidateId: 'user-8',
    candidateName: 'Frank Garcia',
    candidateEmail: 'frank.garcia@example.com',
    jobId: 'job-1',
    jobTitle: 'Senior Frontend Developer',
    fitIndex: 100,
    stage: 'hired',
    appliedAt: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), // 21 days ago
    resumeUrl: 'https://example.com/resume8.pdf',
    tags: ['React', 'TypeScript', 'Next.js', 'Testing'],
    assignedTo: 'Mike Chen',
  },
];

export default function ApplicantListTestPage() {
  const [applicants, setApplicants] = useState<Applicant[]>(mockApplicants);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | undefined>();
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setLogs(prev => [`[${timestamp}] ${message}`, ...prev].slice(0, 10));
  };

  const handleViewApplicant = (applicantId: string) => {
    const applicant = applicants.find(a => a.id === applicantId);
    addLog(`Viewed applicant: ${applicant?.candidateName} (${applicantId})`);
    alert(`Viewing applicant: ${applicant?.candidateName}\nFit Index: ${applicant?.fitIndex}\nStage: ${applicant?.stage}`);
  };

  const handleUpdateStage = (applicantId: string, newStage: string) => {
    setApplicants(prev =>
      prev.map(a => (a.id === applicantId ? { ...a, stage: newStage } : a))
    );
    const applicant = applicants.find(a => a.id === applicantId);
    addLog(`Updated ${applicant?.candidateName} stage to: ${newStage}`);
  };

  const handleBulkUpdate = (applicantIds: string[], action: any) => {
    if (action.stage) {
      setApplicants(prev =>
        prev.map(a => (applicantIds.includes(a.id) ? { ...a, stage: action.stage } : a))
      );
      addLog(`Bulk updated ${applicantIds.length} applicants to stage: ${action.stage}`);
    } else if (action.action === 'reject') {
      setApplicants(prev =>
        prev.map(a => (applicantIds.includes(a.id) ? { ...a, stage: 'rejected' } : a))
      );
      addLog(`Bulk rejected ${applicantIds.length} applicants`);
    } else if (action.action === 'archive') {
      setApplicants(prev => prev.filter(a => !applicantIds.includes(a.id)));
      addLog(`Bulk archived (removed) ${applicantIds.length} applicants`);
    }
  };

  const handleFilterChange = (filters: any) => {
    addLog(`Filters changed: ${JSON.stringify(filters)}`);
  };

  const handleSortChange = (sortBy: string) => {
    addLog(`Sort changed to: ${sortBy}`);

    // Actually sort the data
    setApplicants(prev => {
      const sorted = [...prev];
      if (sortBy === 'fit_index_desc') {
        sorted.sort((a, b) => b.fitIndex - a.fitIndex);
      } else if (sortBy === 'fit_index_asc') {
        sorted.sort((a, b) => a.fitIndex - b.fitIndex);
      } else if (sortBy === 'date_desc') {
        sorted.sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime());
      } else if (sortBy === 'date_asc') {
        sorted.sort((a, b) => new Date(a.appliedAt).getTime() - new Date(b.appliedAt).getTime());
      }
      return sorted;
    });
  };

  const simulateLoading = () => {
    setLoading(true);
    addLog('Loading state activated');
    setTimeout(() => {
      setLoading(false);
      addLog('Loading complete');
    }, 2000);
  };

  const simulateError = () => {
    setError('Failed to load applicants. Please try again.');
    addLog('Error state activated');
    setTimeout(() => {
      setError(undefined);
      addLog('Error cleared');
    }, 3000);
  };

  const resetData = () => {
    setApplicants(mockApplicants);
    setError(undefined);
    setLoading(false);
    addLog('Data reset to initial state');
  };

  const clearApplicants = () => {
    setApplicants([]);
    addLog('All applicants cleared (empty state)');
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800">
      {/* Test Controls */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 p-4 sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                Applicant List Test Page
              </h1>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Sprint 19-20 Week 39 Day 5 - TDD Implementation (30/38 tests passing - 79%)
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-green-600">
                ✓ 30/38 tests passing (79%)
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {applicants.length} applicant{applicants.length === 1 ? '' : 's'} loaded
              </p>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex gap-2 flex-wrap mb-4">
            <button
              onClick={simulateLoading}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              Simulate Loading
            </button>
            <button
              onClick={simulateError}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Simulate Error
            </button>
            <button
              onClick={resetData}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Reset Data
            </button>
            <button
              onClick={clearApplicants}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-yellow-600 text-white hover:bg-yellow-700 transition-colors"
            >
              Clear All (Empty State)
            </button>
          </div>

          {/* Info Panel */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-blue-900 dark:text-blue-300">
              <strong>Current State:</strong> Loading={loading ? 'Yes' : 'No'}, Error={error ? 'Yes' : 'No'},
              Applicants={applicants.length}
            </p>
          </div>

          {/* Activity Log */}
          {logs.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase">Activity Log</h3>
                <button
                  onClick={() => setLogs([])}
                  className="text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100"
                >
                  Clear
                </button>
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {logs.map((log, index) => (
                  <p key={index} className="text-xs text-gray-600 dark:text-gray-400 font-mono">
                    {log}
                  </p>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ApplicantList Component */}
      <div className="max-w-7xl mx-auto p-6">
        <ApplicantList
          applicants={applicants}
          jobId="job-1"
          jobTitle="Senior Frontend Developer"
          loading={loading}
          error={error}
          onViewApplicant={handleViewApplicant}
          onUpdateStage={handleUpdateStage}
          onBulkUpdate={handleBulkUpdate}
          onFilterChange={handleFilterChange}
          onSortChange={handleSortChange}
        />
      </div>
    </div>
  );
}
