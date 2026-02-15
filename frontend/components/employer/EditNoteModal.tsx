/**
 * EditNoteModal Component (Issue #27)
 *
 * Modal dialog for editing existing notes with:
 * - Pre-populated content
 * - Countdown timer display
 * - Save/Cancel buttons
 * - Error handling (time limit, network)
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applicationNoteSchema, ApplicationNoteFormData } from '@/lib/validations/notes';
import { X, Clock } from 'lucide-react';
import {
  ApplicationNote,
  updateApplicationNote,
  UpdateNoteRequest,
  getRemainingEditTime,
  formatRemainingTime,
  NoteError,
} from '@/lib/api/applicationNotes';

interface EditNoteModalProps {
  note: ApplicationNote;
  onClose: () => void;
  onNoteUpdated: (note: ApplicationNote) => void;
}

export default function EditNoteModal({
  note,
  onClose,
  onNoteUpdated,
}: EditNoteModalProps) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isValid },
  } = useForm<ApplicationNoteFormData>({
    resolver: zodResolver(applicationNoteSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      content: note.content,
      type: 'note',
    },
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(
    getRemainingEditTime(note.created_at)
  );

  const content = watch('content');
  const charCount = content?.length || 0;
  const charLimit = 5000;
  const charRemaining = charLimit - charCount;
  const hasChanges = content !== note.content;

  // Update countdown timer every second
  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getRemainingEditTime(note.created_at);
      setRemainingTime(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        setError('Edit window has expired (5 minutes)');
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [note.created_at]);

  // Handle form submission
  const onFormSubmit = handleSubmit(async (data) => {
    if (remainingTime <= 0) {
      setError('Edit window has expired. Cannot save changes.');
      return;
    }

    if (!hasChanges) {
      onClose();
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const updateData: UpdateNoteRequest = {
        content: data.content.trim(),
      };

      const updatedNote = await updateApplicationNote(note.id, updateData);
      onNoteUpdated(updatedNote);
    } catch (err) {
      const error = err as NoteError;

      // Handle specific error cases
      if (error.status === 400 && error.detail?.includes('edit window')) {
        setError('Edit window expired (5 minutes). Cannot save changes.');
      } else if (error.status === 403) {
        setError('You can only edit your own notes.');
      } else {
        setError(error.detail || 'Failed to update note');
      }
    } finally {
      setSubmitting(false);
    }
  });

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 z-40"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <form onSubmit={onFormSubmit}>
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-3">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Edit Note
                </h3>

                {/* Countdown timer */}
                {remainingTime > 0 && (
                  <div
                    className={`flex items-center space-x-1 px-2 py-1 rounded text-xs font-medium ${
                      remainingTime < 60
                        ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                        : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                    }`}
                  >
                    <Clock className="w-3 h-3" />
                    <span>{formatRemainingTime(remainingTime)}</span>
                  </div>
                )}

                {remainingTime <= 0 && (
                  <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded text-xs font-medium">
                    Expired
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4">
              {/* Content textarea */}
              <div>
                <label htmlFor="edit-note-content" className="sr-only">
                  Note content
                </label>
                <textarea
                  id="edit-note-content"
                  {...register('content')}
                  placeholder="Note content..."
                  rows={6}
                  maxLength={charLimit}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none dark:bg-gray-900 dark:text-gray-100"
                  disabled={submitting || remainingTime <= 0}
                  autoFocus
                />

                {/* Character counter */}
                <div className="flex justify-between items-center mt-1">
                  <span
                    className={`text-xs ${
                      charRemaining < 100
                        ? 'text-red-600 dark:text-red-400 font-medium'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {charRemaining} characters remaining
                  </span>

                  {hasChanges && (
                    <span className="text-xs text-blue-600 dark:text-blue-400">Unsaved changes</span>
                  )}
                </div>

                {/* Validation error */}
                {errors.content && (
                  <p className="text-sm text-red-600 dark:text-red-400 mt-1" role="alert">
                    {errors.content.message}
                  </p>
                )}
              </div>

              {/* Note metadata (read-only) */}
              <div className="bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded p-3 space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Visibility:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {note.visibility === 'private' ? 'Private' : 'Team'}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">Type:</span>
                  <span className="font-medium text-gray-700 dark:text-gray-300">
                    {note.note_type === 'internal'
                      ? 'Internal'
                      : note.note_type === 'feedback'
                      ? 'Feedback'
                      : 'Interview Notes'}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 italic mt-2">
                  Note: Visibility and type cannot be changed after creation
                </p>
              </div>

              {/* Error message */}
              {error && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-gray-700 rounded p-3">
                  {error}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end space-x-2 p-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={
                  submitting || !isValid || !hasChanges || remainingTime <= 0
                }
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
