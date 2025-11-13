/**
 * AssessmentSubmission Component - Sprint 19-20 Week 38 Day 4
 *
 * Handles assessment submission flow with confirmation modal
 * Shows progress, validation, and submission status
 */

'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { CheckCircle, AlertCircle, Clock, Loader2 } from 'lucide-react';

export interface AssessmentSubmissionProps {
  /** Collected answers from all questions */
  answers: Record<string, any>;
  /** Total number of questions in assessment */
  totalQuestions: number;
  /** Callback when assessment is submitted */
  onSubmit: (answers: Record<string, any>) => Promise<void>;
  /** Optional time spent in seconds */
  timeSpentSeconds?: number;
  /** Optional className */
  className?: string;
}

export function AssessmentSubmission({
  answers,
  totalQuestions,
  onSubmit,
  timeSpentSeconds,
  className = '',
}: AssessmentSubmissionProps) {
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Calculate progress
  const answeredCount = Object.keys(answers).length;
  const completionPercentage = totalQuestions > 0 ? Math.round((answeredCount / totalQuestions) * 100) : 0;
  const unansweredCount = totalQuestions - answeredCount;
  const allAnswered = answeredCount === totalQuestions;

  // Format time
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  const handleSubmitClick = () => {
    setSubmissionError(null);
    setShowConfirmModal(true);
  };

  const handleCancel = () => {
    setShowConfirmModal(false);
  };

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      await onSubmit(answers);
      setShowConfirmModal(false);
    } catch (error) {
      setSubmissionError(error instanceof Error ? error.message : 'Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetry = () => {
    setSubmissionError(null);
    setShowConfirmModal(true);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Progress Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Submission Summary</h3>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-700">{answeredCount} of {totalQuestions} questions answered</span>
            <span className="font-medium text-gray-900">{completionPercentage}%</span>
          </div>
          <div
            role="progressbar"
            aria-valuenow={completionPercentage}
            aria-valuemin={0}
            aria-valuemax={100}
            className="w-full bg-gray-200 rounded-full h-2 overflow-hidden"
          >
            <div
              className={`h-full transition-all duration-300 ${
                allAnswered ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {/* Status Messages */}
        <div className="space-y-2">
          {allAnswered ? (
            <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">All questions answered</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <span className="text-sm font-medium">{unansweredCount} question{unansweredCount !== 1 ? 's' : ''} unanswered</span>
            </div>
          )}

          {/* Time Spent */}
          {timeSpentSeconds !== undefined && (
            <div className="flex items-center gap-2 text-gray-600">
              <Clock className="w-4 h-4" />
              <span className="text-sm">Time spent: {formatTime(timeSpentSeconds)}</span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmitClick}
          disabled={answeredCount === 0 || isSubmitting}
          className="w-full"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Assessment'
          )}
        </Button>

        {/* Error Message */}
        {submissionError && (
          <div className="space-y-3">
            <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded-lg p-3">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Submission failed</p>
                <p className="text-sm text-red-600 mt-1">{submissionError}</p>
              </div>
            </div>
            <Button onClick={handleRetry} variant="outline" className="w-full">
              Try Again
            </Button>
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={(e) => e.target === e.currentTarget && handleCancel()}
        >
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Confirm Submission</h2>

            <div className="space-y-3">
              <p className="text-gray-700">
                You are about to submit your assessment. Once submitted, you cannot make changes.
              </p>

              {/* Progress Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Questions answered:</span>
                  <span className="font-medium text-gray-900">{answeredCount} of {totalQuestions}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Completion:</span>
                  <span className="font-medium text-gray-900">{completionPercentage}%</span>
                </div>
                {timeSpentSeconds !== undefined && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Time spent:</span>
                    <span className="font-medium text-gray-900">{formatTime(timeSpentSeconds)}</span>
                  </div>
                )}
              </div>

              {/* Warning for incomplete */}
              {!allAnswered && (
                <div className="flex items-start gap-2 text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium">Incomplete assessment</p>
                    <p className="mt-1">You have {unansweredCount} unanswered question{unansweredCount !== 1 ? 's' : ''}. These will be marked as incorrect.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Submission Status */}
            {isSubmitting && (
              <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 text-blue-600 bg-blue-50 border border-blue-200 rounded-lg p-3">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm font-medium">Submitting your assessment...</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button
                onClick={handleCancel}
                variant="outline"
                className="flex-1"
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                className="flex-1"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting
                  </>
                ) : (
                  'Confirm'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
