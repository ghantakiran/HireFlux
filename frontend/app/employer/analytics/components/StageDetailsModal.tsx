'use client';

/**
 * Stage Details Modal Component
 * Sprint 15-16: Advanced Analytics & Reporting
 */

import React from 'react';

interface StageDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stage: string | null;
  stageData?: {
    stage: string;
    count: number;
    avg_days_in_stage: number | null;
    drop_off_rate: number | null;
  };
}

const STAGE_LABELS: Record<string, string> = {
  new: 'New',
  reviewing: 'Reviewing',
  phone_screen: 'Phone Screen',
  technical_interview: 'Technical Interview',
  final_interview: 'Final Interview',
  offer: 'Offer',
  hired: 'Hired',
  rejected: 'Rejected',
};

export function StageDetailsModal({ isOpen, onClose, stage, stageData }: StageDetailsModalProps) {
  if (!isOpen || !stage || !stageData) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto" data-testid="stage-details-modal">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose}></div>

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-gray-900">
              {STAGE_LABELS[stage] || stage} Details
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
              aria-label="Close modal"
            >
              <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="space-y-6">
            {/* Stage Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Candidates</p>
                <p className="text-3xl font-bold text-blue-600">{stageData.count}</p>
              </div>
              {stageData.avg_days_in_stage !== null && (
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Avg Days in Stage</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {stageData.avg_days_in_stage.toFixed(1)}
                  </p>
                </div>
              )}
              {stageData.drop_off_rate !== null && (
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600 mb-1">Drop-off Rate</p>
                  <p className="text-3xl font-bold text-red-600">
                    {(stageData.drop_off_rate * 100).toFixed(1)}%
                  </p>
                </div>
              )}
            </div>

            {/* Applications List Placeholder */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">
                Recent Applications in {STAGE_LABELS[stage]}
              </h4>
              <div
                className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center"
                data-testid="applications-list"
              >
                <p className="text-gray-500 text-sm">
                  Application list would be loaded here from the API
                </p>
                <p className="text-xs text-gray-400 mt-2">
                  Showing {stageData.count} candidates in this stage
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
              <button
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                onClick={() => {
                  // Navigate to applications filtered by stage
                  console.log('Navigate to applications for stage:', stage);
                }}
              >
                View All Applications
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
