/**
 * FitExplanationModal Component (Issue #26)
 *
 * Displays detailed breakdown of AI fit index calculation:
 * - Overall fit score with color coding
 * - Breakdown table with individual factor scores & weights
 * - Strengths section (positive highlights)
 * - Concerns section (areas of mismatch)
 */

'use client';

import React, { useEffect, useState } from 'react';
import { X, TrendingUp, AlertTriangle, Loader2 } from 'lucide-react';
import {
  FitIndexResponse,
  getFitIndexColor,
  getBreakdownWeights,
  getComponentName,
  getBreakdownLabel,
  getFitExplanation,
} from '@/lib/api/ranking';

interface FitExplanationModalProps {
  applicationId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function FitExplanationModal({
  applicationId,
  isOpen,
  onClose,
}: FitExplanationModalProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fitData, setFitData] = useState<FitIndexResponse | null>(null);

  // Fetch fit explanation when modal opens
  useEffect(() => {
    if (isOpen && applicationId) {
      setLoading(true);
      setError(null);

      getFitExplanation(applicationId)
        .then((data) => {
          setFitData(data);
          setLoading(false);
        })
        .catch((err) => {
          setError(err.message || 'Failed to load fit explanation');
          setLoading(false);
        });
    }
  }, [isOpen, applicationId]);

  // Handle Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden'; // Prevent body scroll
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const weights = getBreakdownWeights();

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fit-explanation-title"
        className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto"
      >
        <div
          className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal
        >
          {/* Header */}
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2
              id="fit-explanation-title"
              className="text-2xl font-bold text-gray-900"
            >
              Fit Index Explanation
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
              aria-label="Close modal"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <span className="ml-3 text-gray-600">Loading explanation...</span>
              </div>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
              </div>
            )}

            {fitData && !loading && !error && (
              <>
                {/* Overall Fit Score */}
                <div className="bg-gray-50 rounded-lg p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 mb-1">Overall Fit Index</p>
                      <div
                        data-testid="overall-fit-score"
                        className="flex items-baseline gap-2"
                      >
                        <span className="text-4xl font-bold text-gray-900">
                          {fitData.fit_index}
                        </span>
                        <span className="text-xl text-gray-500">/ 100</span>
                      </div>
                    </div>
                    <div
                      className={`
                        px-6 py-3 rounded-full font-semibold text-lg
                        ${getFitIndexColor(fitData.fit_index).bg}
                        ${getFitIndexColor(fitData.fit_index).text}
                      `}
                    >
                      {getFitIndexColor(fitData.fit_index).label}
                    </div>
                  </div>

                  {fitData.cached && (
                    <p className="mt-3 text-xs text-gray-500">
                      Calculated {new Date(fitData.calculated_at).toLocaleString()}
                      {' • '}
                      <span className="font-medium">Cached result</span>
                    </p>
                  )}
                </div>

                {/* Breakdown Table */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    Factor Breakdown
                  </h3>
                  <div className="overflow-x-auto">
                    <table
                      data-testid="breakdown-table"
                      className="w-full border border-gray-200 rounded-lg"
                    >
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                            Factor
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                            Score
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                            Weight
                          </th>
                          <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                            Rating
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {(Object.keys(fitData.breakdown) as Array<keyof typeof fitData.breakdown>).map(
                          (factor) => {
                            const score = fitData.breakdown[factor];
                            const weight = weights[factor];

                            return (
                              <tr key={factor} className="hover:bg-gray-50">
                                <td className="px-4 py-3 text-sm text-gray-900">
                                  {getComponentName(factor)}
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-sm font-semibold text-gray-900">
                                    {Math.round(score)}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span className="text-sm text-gray-600">{weight}%</span>
                                </td>
                                <td className="px-4 py-3 text-center">
                                  <span
                                    className={`
                                      inline-block px-2 py-0.5 rounded text-xs font-medium
                                      ${
                                        score >= 80
                                          ? 'bg-green-100 text-green-800'
                                          : score >= 60
                                          ? 'bg-yellow-100 text-yellow-800'
                                          : score >= 40
                                          ? 'bg-orange-100 text-orange-800'
                                          : 'bg-red-100 text-red-800'
                                      }
                                    `}
                                  >
                                    {getBreakdownLabel(score)}
                                  </span>
                                </td>
                              </tr>
                            );
                          }
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Strengths */}
                {fitData.strengths && fitData.strengths.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Strengths</h3>
                    </div>
                    <ul className="space-y-2" data-testid="strengths-section">
                      {fitData.strengths.map((strength, idx) => (
                        <li
                          key={idx}
                          data-testid="strength-item"
                          className="flex items-start gap-2"
                        >
                          <span className="flex-shrink-0 w-1.5 h-1.5 bg-green-600 rounded-full mt-2" />
                          <span className="text-sm text-gray-700">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Concerns */}
                {fitData.concerns && fitData.concerns.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600" />
                      <h3 className="text-lg font-semibold text-gray-900">Concerns</h3>
                    </div>
                    <ul className="space-y-2" data-testid="concerns-section">
                      {fitData.concerns.map((concern, idx) => (
                        <li
                          key={idx}
                          data-testid="concern-item"
                          className="flex items-start gap-2"
                        >
                          <span className="flex-shrink-0 w-1.5 h-1.5 bg-orange-600 rounded-full mt-2" />
                          <span className="text-sm text-gray-700">{concern}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
