/**
 * NoteItem Component (Issue #27)
 *
 * Displays individual note with:
 * - Author info & timestamps
 * - Note content with @mention highlighting
 * - Visibility & type badges
 * - Edit button (if within 5 min and author)
 * - Delete button (if within 5 min and author)
 * - Countdown timer for edit window
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Clock, Lock, Users } from 'lucide-react';
import {
  ApplicationNote,
  isWithinEditWindow,
  getRemainingEditTime,
  formatRemainingTime,
  getNoteTypeBadgeColor,
  getNoteTypeLabel,
  deleteApplicationNote,
  NoteError,
} from '@/lib/api/applicationNotes';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import EditNoteModal from './EditNoteModal';
import { formatRelativeTime } from '@/lib/utils';

interface NoteItemProps {
  note: ApplicationNote;
  currentUserId: string;
  onNoteUpdated: (note: ApplicationNote) => void;
  onNoteDeleted: (noteId: string) => void;
}

export default function NoteItem({
  note,
  currentUserId,
  onNoteUpdated,
  onNoteDeleted,
}: NoteItemProps) {
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [remainingTime, setRemainingTime] = useState(
    getRemainingEditTime(note.created_at)
  );

  const isAuthor = note.author_id === currentUserId;
  const canEdit = isAuthor && isWithinEditWindow(note.created_at);

  // Update countdown timer every second
  useEffect(() => {
    if (!canEdit) return;

    const interval = setInterval(() => {
      const remaining = getRemainingEditTime(note.created_at);
      setRemainingTime(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [note.created_at, canEdit]);

  // Handle delete
  const handleDelete = () => {
    if (!canEdit) {
      setDeleteError('Edit window has expired');
      return;
    }
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    setShowDeleteDialog(false);
    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteApplicationNote(note.id);
      onNoteDeleted(note.id);
    } catch (err) {
      const error = err as NoteError;
      setDeleteError(error.detail || 'Failed to delete note');
    } finally {
      setDeleting(false);
    }
  };

  // Get badge colors
  const typeBadgeColor = getNoteTypeBadgeColor(note.note_type);
  const typeColors: Record<string, string> = {
    gray: 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300',
    blue: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
  };

  // Highlight @mentions in content (safe React rendering — no dangerouslySetInnerHTML)
  const renderContentWithMentions = (text: string) => {
    const parts = text.split(/((?<![a-zA-Z0-9])@[a-zA-Z0-9_]+)/g);
    return parts.map((part, i) =>
      /^@[a-zA-Z0-9_]+$/.test(part) ? (
        <span key={i} className="text-blue-600 dark:text-blue-400 font-medium">{part}</span>
      ) : (
        part
      )
    );
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:border-gray-300 dark:hover:border-gray-600 transition-colors">
        {/* Header */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center space-x-2">
            {/* Author avatar */}
            <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full flex items-center justify-center">
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                {note.author?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>

            {/* Author info */}
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {note.author?.name || 'Unknown User'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatRelativeTime(note.created_at)}
                {note.updated_at !== note.created_at && (
                  <span className="ml-1">(edited)</span>
                )}
              </p>
            </div>
          </div>

          {/* Actions (only show if can edit) */}
          {canEdit && (
            <div className="flex items-center space-x-2">
              {/* Countdown timer */}
              {remainingTime > 0 && (
                <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatRemainingTime(remainingTime)}</span>
                </div>
              )}

              {/* Edit button */}
              <button
                onClick={() => setShowEditModal(true)}
                className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                title="Edit note"
              >
                <Edit2 className="w-4 h-4" />
              </button>

              {/* Delete button */}
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
                title="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Non-author message */}
          {!isAuthor && isWithinEditWindow(note.created_at) && (
            <div className="text-xs text-gray-500 dark:text-gray-400 italic">
              Only author can edit
            </div>
          )}
        </div>

        {/* Badges */}
        <div className="flex flex-wrap gap-2 mb-2">
          {/* Visibility badge */}
          {note.visibility === 'private' ? (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
              <Lock className="w-3 h-3 mr-1" />
              Private
            </span>
          ) : (
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 dark:bg-purple-900/30 text-purple-800 dark:text-purple-300">
              <Users className="w-3 h-3 mr-1" />
              Team
            </span>
          )}

          {/* Type badge */}
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
              typeColors[typeBadgeColor]
            }`}
          >
            {getNoteTypeLabel(note.note_type)}
          </span>
        </div>

        {/* Content */}
        <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">
          {renderContentWithMentions(note.content)}
        </div>

        {/* Delete error */}
        {deleteError && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-gray-700 rounded p-2">
            {deleteError}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {showEditModal && (
        <EditNoteModal
          note={note}
          onClose={() => setShowEditModal(false)}
          onNoteUpdated={(updatedNote) => {
            onNoteUpdated(updatedNote);
            setShowEditModal(false);
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        title="Delete Note"
        description="Are you sure you want to delete this note? This action cannot be undone."
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
