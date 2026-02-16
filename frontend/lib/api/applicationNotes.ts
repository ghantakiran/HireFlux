/**
 * Application Notes API Client (Issue #27)
 *
 * Provides API functions for managing application notes:
 * - Create note
 * - Get notes for application
 * - Update note (within 5-minute window)
 * - Delete note (within 5-minute window)
 */

import { API_BASE_URL, getAuthHeaders } from './client';

// ============================================================================
// Types
// ============================================================================

export interface ApplicationNote {
  id: string;
  application_id: string;
  author_id: string;
  content: string;
  visibility: 'private' | 'team';
  note_type: 'internal' | 'feedback' | 'interview_notes';
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    name: string;
    email: string;
  };
  mentioned_users?: string[];
}

export interface CreateNoteRequest {
  content: string;
  visibility: 'private' | 'team';
  note_type: 'internal' | 'feedback' | 'interview_notes';
}

export interface UpdateNoteRequest {
  content: string;
}

export interface NoteError {
  detail: string;
  status: number;
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Get all notes for an application
 *
 * Returns team notes + current user's private notes
 *
 * @param applicationId - UUID of the application
 * @returns Array of ApplicationNote objects
 */
export async function getApplicationNotes(
  applicationId: string
): Promise<ApplicationNote[]> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/applications/${applicationId}/notes`,
    {
      method: 'GET',
      headers: getAuthHeaders(),
    }
  );

  if (!response.ok) {
    const error: NoteError = {
      detail: await response.text(),
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Create a new note on an application
 *
 * @param applicationId - UUID of the application
 * @param noteData - Note content, visibility, and type
 * @returns Created ApplicationNote with extracted @mentions
 */
export async function createApplicationNote(
  applicationId: string,
  noteData: CreateNoteRequest
): Promise<ApplicationNote> {
  const response = await fetch(
    `${API_BASE_URL}/api/v1/applications/${applicationId}/notes`,
    {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(noteData),
    }
  );

  if (!response.ok) {
    const error: NoteError = {
      detail: await response.text(),
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Update an existing note (Issue #27)
 *
 * Can only update:
 * - Your own notes
 * - Within 5 minutes of creation
 *
 * @param noteId - UUID of the note to update
 * @param noteData - Updated content
 * @returns Updated ApplicationNote
 * @throws NoteError with status 400 (time limit), 403 (not author), or 404 (not found)
 */
export async function updateApplicationNote(
  noteId: string,
  noteData: UpdateNoteRequest
): Promise<ApplicationNote> {
  const response = await fetch(`${API_BASE_URL}/api/v1/notes/${noteId}`, {
    method: 'PUT',
    headers: getAuthHeaders(),
    body: JSON.stringify(noteData),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error: NoteError = {
      detail: errorText,
      status: response.status,
    };
    throw error;
  }

  return response.json();
}

/**
 * Delete a note (Issue #27)
 *
 * Can only delete:
 * - Your own notes
 * - Within 5 minutes of creation
 *
 * @param noteId - UUID of the note to delete
 * @throws NoteError with status 400 (time limit), 403 (not author), or 404 (not found)
 */
export async function deleteApplicationNote(noteId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/v1/notes/${noteId}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    const error: NoteError = {
      detail: errorText,
      status: response.status,
    };
    throw error;
  }

  // 204 No Content - successful deletion
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Check if a note is still within the 5-minute edit window
 *
 * @param createdAt - ISO timestamp when note was created
 * @returns true if within 5 minutes, false otherwise
 */
export function isWithinEditWindow(createdAt: string): boolean {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffMinutes = diffMs / 1000 / 60;

  return diffMinutes < 5; // Strict less-than (not <=)
}

/**
 * Get remaining time in edit window (in seconds)
 *
 * @param createdAt - ISO timestamp when note was created
 * @returns Remaining seconds (0 if expired)
 */
export function getRemainingEditTime(createdAt: string): number {
  const created = new Date(createdAt);
  const now = new Date();
  const diffMs = now.getTime() - created.getTime();
  const diffSeconds = diffMs / 1000;
  const editWindowSeconds = 5 * 60; // 5 minutes

  const remaining = editWindowSeconds - diffSeconds;
  return Math.max(0, Math.floor(remaining));
}

/**
 * Format remaining time as "X minutes Y seconds"
 *
 * @param seconds - Remaining seconds
 * @returns Formatted string like "3 minutes 45 seconds" or "30 seconds"
 */
export function formatRemainingTime(seconds: number): string {
  if (seconds <= 0) return 'Expired';

  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;

  if (minutes > 0) {
    return `${minutes} minute${minutes !== 1 ? 's' : ''} ${secs} second${secs !== 1 ? 's' : ''}`;
  }

  return `${secs} second${secs !== 1 ? 's' : ''}`;
}

/**
 * Extract @mentions from note content (client-side validation)
 *
 * This mirrors the backend regex pattern for consistency.
 * Server is the source of truth, but this helps with UI highlighting.
 *
 * @param content - Note content
 * @returns Array of unique mentioned usernames
 */
export function extractMentions(content: string): string[] {
  // Same regex as backend: (?<![a-zA-Z0-9])@([a-zA-Z0-9_]+)
  const pattern = /(?<![a-zA-Z0-9])@([a-zA-Z0-9_]+)/g;
  const matches = [...content.matchAll(pattern)];

  // Extract unique usernames
  const seen = new Set<string>();
  const mentions: string[] = [];

  for (const match of matches) {
    const username = match[1];
    if (!seen.has(username)) {
      seen.add(username);
      mentions.push(username);
    }
  }

  return mentions;
}

/**
 * Highlight @mentions in note content for display
 *
 * @param content - Note content
 * @returns HTML string with highlighted @mentions
 */
export function highlightMentions(content: string): string {
  const pattern = /(?<![a-zA-Z0-9])(@[a-zA-Z0-9_]+)/g;

  return content.replace(
    pattern,
    '<span class="mention">$1</span>'
  );
}

/**
 * Get note type badge color
 *
 * @param noteType - Note type
 * @returns Tailwind color class
 */
export function getNoteTypeBadgeColor(
  noteType: 'internal' | 'feedback' | 'interview_notes'
): string {
  const colors = {
    internal: 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200',
    feedback: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300',
    interview_notes: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300',
  };

  return colors[noteType] || 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200';
}

/**
 * Get note type display label
 *
 * @param noteType - Note type
 * @returns Display label
 */
export function getNoteTypeLabel(
  noteType: 'internal' | 'feedback' | 'interview_notes'
): string {
  const labels = {
    internal: 'Internal',
    feedback: 'Feedback',
    interview_notes: 'Interview Notes',
  };

  return labels[noteType] || 'Internal';
}

/**
 * Validate note content length
 *
 * @param content - Note content
 * @returns true if valid (1-5000 chars), false otherwise
 */
export function validateNoteContent(content: string): {
  valid: boolean;
  error?: string;
} {
  if (!content || content.trim().length === 0) {
    return { valid: false, error: 'Note content cannot be empty' };
  }

  if (content.length > 5000) {
    return {
      valid: false,
      error: `Note is too long (${content.length}/5000 characters)`,
    };
  }

  return { valid: true };
}
