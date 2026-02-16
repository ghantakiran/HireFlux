'use client';

/**
 * Candidate Detail Modal
 *
 * Shows comprehensive candidate information including:
 * - AI fit score breakdown with explanations
 * - Candidate profile and application details
 * - Status management workflow
 * - Team notes and collaboration
 * - Reviewer assignments
 */

import { useEffect, useState } from 'react';
import { atsApi } from '@/lib/api';
import { EmptyState } from '@/components/domain/EmptyState';

interface CandidateDetailModalProps {
  applicationId: string;
  isOpen: boolean;
  onClose: () => void;
  onUpdate?: () => void;
}

interface FitIndexData {
  fit_index: number;
  explanations: Array<{
    factor: string;
    score: number;
    explanation: string;
  }>;
  strengths: string[];
  concerns: string[];
}

interface ApplicationNote {
  id: string;
  content: string;
  visibility: 'team' | 'private';
  author_name: string;
  created_at: string;
}

interface ApplicationDetail {
  id: string;
  user_id: string;
  job_id: string;
  status: string;
  fit_index: number | null;
  applied_at: string;
  candidate: {
    first_name: string;
    last_name: string;
    email: string;
    headline?: string;
    location?: string;
    experience_years?: number;
  };
  assigned_to: string[];
  resume_url?: string;
  cover_letter_text?: string;
}

export default function CandidateDetailModal({
  applicationId,
  isOpen,
  onClose,
  onUpdate,
}: CandidateDetailModalProps) {
  const [application, setApplication] = useState<ApplicationDetail | null>(null);
  const [fitData, setFitData] = useState<FitIndexData | null>(null);
  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'fit' | 'notes'>('overview');

  // Form states
  const [newNoteContent, setNewNoteContent] = useState('');
  const [newNoteVisibility, setNewNoteVisibility] = useState<'team' | 'private'>('team');
  const [submittingNote, setSubmittingNote] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);

  useEffect(() => {
    if (isOpen && applicationId) {
      fetchApplicationDetails();
    }
  }, [isOpen, applicationId]);

  const fetchApplicationDetails = async () => {
    try {
      setLoading(true);

      // Fetch application fit score
      const fitResponse = await atsApi.calculateFit(applicationId);
      setFitData(fitResponse.data.data as FitIndexData);

      // Fetch application notes
      const notesResponse = await atsApi.getApplicationNotes(applicationId);
      setNotes(notesResponse.data.data as ApplicationNote[]);

      // TODO: Fetch full application details when endpoint is available
      // For now, we'll use placeholder data

    } catch (err) {
      console.error('Failed to fetch application details:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      setChangingStatus(true);
      await atsApi.updateApplicationStatus(applicationId, {
        status: newStatus,
        note: `Status changed to ${newStatus}`,
      });

      // Refresh data
      await fetchApplicationDetails();
      onUpdate?.();
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to update status');
    } finally {
      setChangingStatus(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newNoteContent.trim()) {
      return;
    }

    try {
      setSubmittingNote(true);
      await atsApi.addApplicationNote(applicationId, {
        content: newNoteContent,
        visibility: newNoteVisibility,
      });

      // Refresh notes
      const notesResponse = await atsApi.getApplicationNotes(applicationId);
      setNotes(notesResponse.data.data as ApplicationNote[]);

      // Reset form
      setNewNoteContent('');
      setNewNoteVisibility('team');
    } catch (err: any) {
      alert(err.response?.data?.detail || 'Failed to add note');
    } finally {
      setSubmittingNote(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Candidate Details</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 dark:border-gray-700 px-6">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Overview
              </button>
              <button
                onClick={() => setActiveTab('fit')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'fit'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                AI Fit Score
              </button>
              <button
                onClick={() => setActiveTab('notes')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'notes'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                Notes {notes.length > 0 && `(${notes.length})`}
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <>
                {/* Overview Tab */}
                {activeTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Candidate Information
                      </h3>
                      <div className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4">
                        <p className="text-gray-600 dark:text-gray-400 text-sm">
                          Detailed candidate profile will be displayed here once the full
                          application endpoint is implemented.
                        </p>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Change Status
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        {[
                          { value: 'reviewing', label: 'Reviewing', color: 'purple' },
                          { value: 'phone_screen', label: 'Phone Screen', color: 'yellow' },
                          { value: 'technical_interview', label: 'Technical', color: 'orange' },
                          { value: 'final_interview', label: 'Final Interview', color: 'pink' },
                          { value: 'offer', label: 'Offer', color: 'green' },
                          { value: 'hired', label: 'Hired', color: 'green' },
                          { value: 'rejected', label: 'Rejected', color: 'red' },
                        ].map((status) => (
                          <button
                            key={status.value}
                            onClick={() => handleStatusChange(status.value)}
                            disabled={changingStatus}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                              changingStatus
                                ? 'opacity-50 cursor-not-allowed'
                                : 'hover:opacity-80'
                            } bg-${status.color}-100 text-${status.color}-800`}
                          >
                            {status.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Fit Score Tab */}
                {activeTab === 'fit' && fitData && (
                  <div className="space-y-6">
                    {/* Overall Score */}
                    <div className="text-center">
                      <div className="inline-flex items-center justify-center w-32 h-32 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                        <div>
                          <div className="text-4xl font-bold">{fitData.fit_index}</div>
                          <div className="text-sm">Fit Score</div>
                        </div>
                      </div>
                    </div>

                    {/* Factor Breakdown */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                        Score Breakdown
                      </h3>
                      <div className="space-y-4">
                        {fitData.explanations.map((factor, index) => (
                          <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">
                                {factor.factor.replace(/_/g, ' ')}
                              </span>
                              <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                                {factor.score}/100
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2">
                              <div
                                className="bg-blue-600 h-2 rounded-full"
                                style={{ width: `${factor.score}%` }}
                              ></div>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">{factor.explanation}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Strengths */}
                    {fitData.strengths.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                          Candidate Strengths
                        </h3>
                        <ul className="space-y-2">
                          {fitData.strengths.map((strength, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-green-500 mr-2">✓</span>
                              <span className="text-gray-700 dark:text-gray-300">{strength}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Concerns */}
                    {fitData.concerns.length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                          Potential Concerns
                        </h3>
                        <ul className="space-y-2">
                          {fitData.concerns.map((concern, index) => (
                            <li key={index} className="flex items-start">
                              <span className="text-yellow-500 mr-2">⚠</span>
                              <span className="text-gray-700 dark:text-gray-300">{concern}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* Notes Tab */}
                {activeTab === 'notes' && (
                  <div className="space-y-6">
                    {/* Add Note Form */}
                    <form onSubmit={handleAddNote} className="bg-gray-50 dark:bg-gray-950 rounded-lg p-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Add Note</h3>
                      <textarea
                        value={newNoteContent}
                        onChange={(e) => setNewNoteContent(e.target.value)}
                        placeholder="Enter your note..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none dark:bg-gray-800 dark:text-gray-100"
                        disabled={submittingNote}
                      ></textarea>
                      <div className="flex items-center justify-between mt-3">
                        <div className="flex items-center gap-4">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="team"
                              checked={newNoteVisibility === 'team'}
                              onChange={() => setNewNoteVisibility('team')}
                              className="mr-2"
                              disabled={submittingNote}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Team Visible</span>
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="private"
                              checked={newNoteVisibility === 'private'}
                              onChange={() => setNewNoteVisibility('private')}
                              className="mr-2"
                              disabled={submittingNote}
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Private</span>
                          </label>
                        </div>
                        <button
                          type="submit"
                          disabled={submittingNote || !newNoteContent.trim()}
                          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {submittingNote ? 'Adding...' : 'Add Note'}
                        </button>
                      </div>
                    </form>

                    {/* Notes List */}
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">
                        All Notes ({notes.length})
                      </h3>
                      {notes.length === 0 ? (
                        <EmptyState title="No notes yet" variant="compact" showIcon={false} />
                      ) : (
                        <div className="space-y-3">
                          {notes.map((note) => (
                            <div
                              key={note.id}
                              className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-900 dark:text-gray-100">
                                    {note.author_name}
                                  </span>
                                  <span
                                    className={`px-2 py-0.5 text-xs rounded-full ${
                                      note.visibility === 'team'
                                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200'
                                    }`}
                                  >
                                    {note.visibility === 'team' ? 'Team' : 'Private'}
                                  </span>
                                </div>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(note.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                                {note.content}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-950">
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
