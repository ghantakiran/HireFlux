/**
 * Interactive Test Page - Applicant Kanban Board
 * Week 40 Day 2
 *
 * Test scenarios:
 * 1. Normal load (30 candidates across 8 stages)
 * 2. Empty state (0 candidates)
 * 3. Single stage (all in "New")
 * 4. High-fit candidates only (>80)
 * 5. With filters active
 * 6. API error state
 *
 * Mock modes:
 * - Success (300ms delay)
 * - Slow (2s delay)
 * - Error (simulate failure)
 */

'use client';

import React, { useState, useEffect } from 'react';
import ApplicantKanbanBoard from '@/components/employer/ApplicantKanbanBoard';
import { atsApi } from '@/lib/api';
import { Applicant } from '@/components/employer/KanbanCard';

type Scenario =
  | 'normal'
  | 'empty'
  | 'single-stage'
  | 'high-fit-only'
  | 'with-filters'
  | 'error';
type MockMode = 'success' | 'slow' | 'error';

// Mock data generator
function generateMockApplicants(count: number): Applicant[] {
  const stages = [
    'new',
    'reviewing',
    'phone_screen',
    'technical_interview',
    'final_interview',
    'offer',
    'hired',
    'rejected',
  ];
  const names = [
    'Alice Johnson',
    'Bob Smith',
    'Carol Davis',
    'David Wilson',
    'Eve Martinez',
    'Frank Brown',
    'Grace Lee',
    'Henry Chen',
    'Isabel Rodriguez',
    'Jack Thompson',
  ];
  const tagsList = [
    ['React', 'TypeScript', 'Remote'],
    ['Vue', 'JavaScript'],
    ['React', 'Node.js', 'Referral'],
    ['Angular', 'TypeScript'],
    ['React', 'GraphQL', 'Leadership'],
    ['jQuery', 'PHP'],
    ['Python', 'Django', 'Remote'],
    ['Java', 'Spring Boot'],
    ['Go', 'Kubernetes'],
    ['Ruby', 'Rails'],
  ];

  return Array.from({ length: count }, (_, i) => {
    const fitIndex = Math.floor(Math.random() * 60) + 40; // 40-100
    const stageIndex = Math.floor(Math.random() * stages.length);
    const nameIndex = i % names.length;

    return {
      id: `app-${i + 1}`,
      candidateId: `cand-${i + 1}`,
      candidateName: names[nameIndex] + ` (${i + 1})`,
      candidateEmail: `candidate${i + 1}@example.com`,
      jobId: 'job-test-1',
      jobTitle: 'Senior Frontend Engineer',
      fitIndex,
      stage: stages[stageIndex],
      appliedAt: new Date(
        Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000
      ).toISOString(),
      resumeUrl: `https://example.com/resume${i + 1}.pdf`,
      tags: tagsList[nameIndex],
      assignedTo: i % 3 === 0 ? 'recruiter-1' : i % 5 === 0 ? 'recruiter-2' : undefined,
    };
  });
}

// Scenario configurations
function getScenarioData(scenario: Scenario): Applicant[] {
  switch (scenario) {
    case 'normal':
      return generateMockApplicants(30);
    case 'empty':
      return [];
    case 'single-stage':
      return generateMockApplicants(15).map((a) => ({ ...a, stage: 'new' }));
    case 'high-fit-only':
      return generateMockApplicants(12).map((a) => ({
        ...a,
        fitIndex: Math.floor(Math.random() * 20) + 80,
      }));
    case 'with-filters':
      return generateMockApplicants(25);
    case 'error':
      throw new Error('Mock API Error: Failed to fetch candidates');
    default:
      return generateMockApplicants(30);
  }
}

export default function ApplicantKanbanTestPage() {
  const [scenario, setScenario] = useState<Scenario>('normal');
  const [mockMode, setMockMode] = useState<MockMode>('success');
  const [activityLog, setActivityLog] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCard, setSelectedCard] = useState<string | null>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setActivityLog((prev) => [`[${timestamp}] ${message}`, ...prev].slice(0, 20));
  };

  // Handle Escape key to close modal
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectedCard) {
        setSelectedCard(null);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [selectedCard]);

  // Mock API implementation
  useEffect(() => {
    // Runtime mocking of atsApi methods
    (atsApi.getJobApplications as any) = async (jobId: string) => {
      addLog(`API Call: getJobApplications(${jobId})`);

      if (mockMode === 'error') {
        throw new Error('Mock API Error: Failed to fetch candidates');
      }

      const delay = mockMode === 'slow' ? 2000 : 300;
      await new Promise((resolve) => setTimeout(resolve, delay));

      const data = getScenarioData(scenario);
      return { data: { data, total: data.length } };
    };

    (atsApi.updateApplicationStatus as any) = async (applicationId: string, payload: any) => {
      addLog(`API Call: updateApplicationStatus(${applicationId}, ${payload.status})`);

      if (mockMode === 'error') {
        throw new Error('Mock API Error: Failed to update status');
      }

      const delay = mockMode === 'slow' ? 2000 : 300;
      await new Promise((resolve) => setTimeout(resolve, delay));

      return { data: { success: true } };
    };
  }, [scenario, mockMode]);

  const handleCardClick = (applicationId: string) => {
    setSelectedCard(applicationId);
    addLog(`User Action: Clicked card ${applicationId}`);
  };

  const handleAddNote = (applicationId: string) => {
    addLog(`User Action: Add note for ${applicationId}`);
  };

  const handleAssignRecruiter = (applicationId: string) => {
    addLog(`User Action: Assign recruiter to ${applicationId}`);
  };

  const handleStageChange = (
    applicationId: string,
    oldStage: string,
    newStage: string
  ) => {
    addLog(`Stage Change: ${applicationId} moved from ${oldStage} to ${newStage}`);
  };

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
    setActivityLog([]);
    addLog('Refreshed component');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 p-6">
      {/* Header */}
      <div className="max-w-[1600px] mx-auto mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
          Applicant Kanban Board - Interactive Test
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Test drag-and-drop functionality, filtering, and all interactive features
        </p>
      </div>

      {/* Control Panel */}
      <div className="max-w-[1600px] mx-auto mb-6 bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Scenario Selection */}
          <div>
            <label
              htmlFor="scenario-select"
              className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2"
            >
              Test Scenario
            </label>
            <select
              id="scenario-select"
              value={scenario}
              onChange={(e) => {
                setScenario(e.target.value as Scenario);
                handleRefresh();
              }}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="normal">Normal (30 candidates)</option>
              <option value="empty">Empty State (0 candidates)</option>
              <option value="single-stage">Single Stage (all in New)</option>
              <option value="high-fit-only">High Fit Only (&gt;80)</option>
              <option value="with-filters">With Filters Active</option>
              <option value="error">API Error</option>
            </select>
          </div>

          {/* Mock Mode */}
          <div>
            <label
              htmlFor="mock-mode-select"
              className="block text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2"
            >
              Mock API Mode
            </label>
            <select
              id="mock-mode-select"
              value={mockMode}
              onChange={(e) => setMockMode(e.target.value as MockMode)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:text-gray-100"
            >
              <option value="success">Success (300ms)</option>
              <option value="slow">Slow (2s delay)</option>
              <option value="error">Error (failures)</option>
            </select>
          </div>

          {/* Actions */}
          <div className="flex items-end">
            <button
              onClick={handleRefresh}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
            >
              Refresh Component
            </button>
          </div>
        </div>

        {/* Info */}
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-1">Test Instructions</h3>
          <ul className="text-sm text-blue-800 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>Drag candidates between columns to change their stage</li>
            <li>Click on a card to view details (logs activity)</li>
            <li>Use keyboard: Tab to navigate, Space/Enter to drag, Arrow keys to move</li>
            <li>Try filtering by fit index, tags, or assignee</li>
            <li>Test collapsing/expanding columns</li>
            <li>Watch the activity log below for all events</li>
          </ul>
        </div>
      </div>

      {/* Main Kanban Board */}
      <div className="max-w-[1600px] mx-auto mb-6 bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
        <ApplicantKanbanBoard
          key={refreshKey}
          jobId="job-test-1"
          onCardClick={handleCardClick}
          onAddNote={handleAddNote}
          onAssignRecruiter={handleAssignRecruiter}
          onStageChange={handleStageChange}
        />
      </div>

      {/* Activity Log */}
      <div className="max-w-[1600px] mx-auto bg-white dark:bg-gray-900 rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Activity Log</h2>
          <button
            onClick={() => setActivityLog([])}
            className="px-3 py-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            Clear Log
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-950 rounded-md border border-gray-200 dark:border-gray-700 p-4 max-h-96 overflow-y-auto font-mono text-sm">
          {activityLog.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400">No activity yet. Interact with the board to see logs.</p>
          ) : (
            <div className="space-y-1">
              {activityLog.map((log, index) => (
                <div key={index} className="text-gray-700 dark:text-gray-300">
                  {log}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Card Modal */}
      {selectedCard && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          onClick={(e) => {
            // Only close if clicking the backdrop itself, not the modal content
            if (e.target === e.currentTarget) {
              setSelectedCard(null);
            }
          }}
        >
          <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl p-6 max-w-md">
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">Card Clicked</h2>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              In a real app, the CandidateDetailModal would open here.
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              Application ID: <span className="font-mono">{selectedCard}</span>
            </p>
            <button
              onClick={() => setSelectedCard(null)}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Footer Stats */}
      <div className="max-w-[1600px] mx-auto mt-6 bg-white dark:bg-gray-900 rounded-lg shadow-md p-4">
        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{activityLog.length}</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Actions</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {activityLog.filter((log) => log.includes('Stage Change')).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Stage Changes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
              {activityLog.filter((log) => log.includes('Clicked card')).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Card Clicks</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
              {activityLog.filter((log) => log.includes('API Call')).length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">API Calls</div>
          </div>
        </div>
      </div>
    </div>
  );
}
