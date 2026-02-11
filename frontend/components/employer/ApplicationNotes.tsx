/**
 * ApplicationNotes Component (Issue #27)
 *
 * Main container for application notes with:
 * - Real-time polling (10s interval)
 * - Filter by visibility (team/private)
 * - Filter by type (internal/feedback/interview_notes)
 * - Sort by created_at (newest first)
 * - Empty state
 * - Loading states
 * - Error handling
 */

'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Plus, Filter, RefreshCw } from 'lucide-react';
import {
  getApplicationNotes,
  ApplicationNote,
  NoteError,
} from '@/lib/api/applicationNotes';
import NoteItem from './NoteItem';
import AddNoteForm from './AddNoteForm';

interface ApplicationNotesProps {
  applicationId: string;
  currentUserId: string;
}

type VisibilityFilter = 'all' | 'team' | 'private';
type TypeFilter = 'all' | 'internal' | 'feedback' | 'interview_notes';

export default function ApplicationNotes({
  applicationId,
  currentUserId,
}: ApplicationNotesProps) {
  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [visibilityFilter, setVisibilityFilter] =
    useState<VisibilityFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [refreshing, setRefreshing] = useState(false);

  // Fetch notes from API
  const fetchNotes = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const fetchedNotes = await getApplicationNotes(applicationId);
      setNotes(fetchedNotes);
    } catch (err) {
      const error = err as NoteError;
      setError(error.detail || 'Failed to load notes');
      console.error('Error fetching notes:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [applicationId]);

  // Initial load
  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  // Real-time polling (every 10 seconds) - Issue #27 requirement
  useEffect(() => {
    const interval = setInterval(() => {
      fetchNotes(true); // Refresh without showing loading state
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [fetchNotes]);

  // Filter notes based on visibility and type
  const filteredNotes = notes.filter((note) => {
    // Visibility filter
    if (visibilityFilter === 'team' && note.visibility !== 'team') {
      return false;
    }
    if (visibilityFilter === 'private' && note.visibility !== 'private') {
      return false;
    }

    // Type filter
    if (typeFilter !== 'all' && note.note_type !== typeFilter) {
      return false;
    }

    return true;
  });

  // Handle note created
  const handleNoteCreated = (newNote: ApplicationNote) => {
    setNotes([newNote, ...notes]); // Add to top (newest first)
    setShowAddForm(false);
  };

  // Handle note updated
  const handleNoteUpdated = (updatedNote: ApplicationNote) => {
    setNotes(
      notes.map((note) => (note.id === updatedNote.id ? updatedNote : note))
    );
  };

  // Handle note deleted
  const handleNoteDeleted = (noteId: string) => {
    setNotes(notes.filter((note) => note.id !== noteId));
  };

  // Loading skeleton
  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Notes</h3>
        </div>
        {/* Skeleton loaders */}
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 animate-pulse"
          >
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Notes</h3>
          {refreshing && (
            <RefreshCw className="w-4 h-4 text-gray-400 dark:text-gray-400 animate-spin" />
          )}
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Note</span>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <Filter className="w-4 h-4 text-gray-500 dark:text-gray-400" />

        {/* Visibility filter */}
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value as VisibilityFilter)}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="all">All Visibility</option>
          <option value="team">Team Notes</option>
          <option value="private">My Private Notes</option>
        </select>

        {/* Type filter */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
          className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-900 dark:text-gray-100"
        >
          <option value="all">All Types</option>
          <option value="internal">Internal</option>
          <option value="feedback">Feedback</option>
          <option value="interview_notes">Interview Notes</option>
        </select>

        {/* Note count */}
        <span className="text-sm text-gray-500 dark:text-gray-400 ml-auto">
          {filteredNotes.length} note{filteredNotes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Add Note Form */}
      {showAddForm && (
        <AddNoteForm
          applicationId={applicationId}
          onNoteCreated={handleNoteCreated}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Error State */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-gray-700 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-1">
              <p className="text-sm font-medium text-red-800 dark:text-red-300">
                Failed to load notes
              </p>
              <p className="text-sm text-red-600 dark:text-red-400 mt-1">{error}</p>
            </div>
            <button
              onClick={() => fetchNotes()}
              className="ml-3 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-500"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Notes List */}
      {filteredNotes.length === 0 ? (
        // Empty state
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-950 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <div className="w-12 h-12 mx-auto bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
            <Plus className="w-6 h-6 text-gray-400 dark:text-gray-400" />
          </div>
          <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-1">
            No notes yet
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Be the first to add a note about this candidate
          </p>
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Note
            </button>
          )}
        </div>
      ) : (
        // Notes list (newest first)
        <div className="space-y-3">
          {filteredNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              currentUserId={currentUserId}
              onNoteUpdated={handleNoteUpdated}
              onNoteDeleted={handleNoteDeleted}
            />
          ))}
        </div>
      )}
    </div>
  );
}
