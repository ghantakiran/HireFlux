/**
 * AddNoteForm Component (Issue #27)
 *
 * Form for creating new notes with:
 * - Rich text editor (textarea for MVP, can upgrade to TipTap later)
 * - Visibility toggle (private/team)
 * - Note type selector
 * - Character counter (5000 max)
 * - Form validation
 * - Optimistic UI update
 */

'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { applicationNoteSchema, ApplicationNoteFormData } from '@/lib/validations/notes';
import { X, Lock, Users } from 'lucide-react';
import {
  createApplicationNote,
  ApplicationNote,
  CreateNoteRequest,
  NoteError,
} from '@/lib/api/applicationNotes';

interface AddNoteFormProps {
  applicationId: string;
  onNoteCreated: (note: ApplicationNote) => void;
  onCancel: () => void;
}

export default function AddNoteForm({
  applicationId,
  onNoteCreated,
  onCancel,
}: AddNoteFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<ApplicationNoteFormData>({
    resolver: zodResolver(applicationNoteSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      content: '',
      type: 'note',
    },
  });

  const [visibility, setVisibility] = useState<'private' | 'team'>('team');
  const [noteType, setNoteType] = useState<
    'internal' | 'feedback' | 'interview_notes'
  >('internal');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const content = watch('content');
  const charCount = content?.length || 0;
  const charLimit = 5000;
  const charRemaining = charLimit - charCount;

  // Handle form submission
  const onFormSubmit = handleSubmit(async (data) => {
    try {
      setSubmitting(true);
      setError(null);

      const noteData: CreateNoteRequest = {
        content: data.content.trim(),
        visibility,
        note_type: noteType,
      };

      const newNote = await createApplicationNote(applicationId, noteData);
      onNoteCreated(newNote);

      // Reset form
      reset();
      setVisibility('team');
      setNoteType('internal');
    } catch (err) {
      const error = err as NoteError;
      setError(error.detail || 'Failed to create note');
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg p-4 shadow-sm">
      <form onSubmit={onFormSubmit} className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">Add Note</h4>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content textarea */}
        <div>
          <label htmlFor="note-content" className="sr-only">
            Note content
          </label>
          <textarea
            id="note-content"
            {...register('content')}
            placeholder="Add your note here... Use @username to mention team members"
            rows={4}
            maxLength={charLimit}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none dark:bg-gray-900 dark:text-gray-100"
            disabled={submitting}
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

            {/* @mention hint */}
            {content?.includes('@') && (
              <span className="text-xs text-blue-600 dark:text-blue-400">
                @mentions will notify team members
              </span>
            )}
          </div>

          {/* Validation error */}
          {errors.content && (
            <p className="text-sm text-red-600 dark:text-red-400 mt-1" role="alert">
              {errors.content.message}
            </p>
          )}
        </div>

        {/* Options row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Visibility selector */}
          <div>
            <label
              htmlFor="visibility"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Visibility
            </label>
            <div className="relative">
              <select
                id="visibility"
                value={visibility}
                onChange={(e) =>
                  setVisibility(e.target.value as 'private' | 'team')
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none dark:bg-gray-900 dark:text-gray-100"
                disabled={submitting}
              >
                <option value="team">Team - Visible to all team members</option>
                <option value="private">Private - Only visible to you</option>
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                {visibility === 'private' ? (
                  <Lock className="w-4 h-4 text-gray-400" />
                ) : (
                  <Users className="w-4 h-4 text-gray-400" />
                )}
              </div>
            </div>
          </div>

          {/* Type selector */}
          <div>
            <label
              htmlFor="note-type"
              className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Note Type
            </label>
            <select
              id="note-type"
              value={noteType}
              onChange={(e) =>
                setNoteType(
                  e.target.value as 'internal' | 'feedback' | 'interview_notes'
                )
              }
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100"
              disabled={submitting}
            >
              <option value="internal">Internal</option>
              <option value="feedback">Feedback</option>
              <option value="interview_notes">Interview Notes</option>
            </select>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-gray-700 rounded p-2">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            disabled={submitting}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !isValid}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Saving...' : 'Save Note'}
          </button>
        </div>
      </form>
    </div>
  );
}
