/**
 * Kanban Card Component - Week 40 Day 2
 *
 * Individual candidate card for Kanban board with:
 * - Candidate name and photo
 * - Fit index badge (color-coded)
 * - Applied date (relative time)
 * - Tags (skills, referral source)
 * - Quick actions (view details, notes)
 * - Drag handle
 */

'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Eye, MessageSquare, UserPlus } from 'lucide-react';
import { getFitIndexDetailedColor } from '@/lib/score-colors';
import { formatRelativeTime, getInitials } from '@/lib/utils';

export interface Applicant {
  id: string;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  fitIndex: number;
  stage: string;
  appliedAt: string;
  resumeUrl?: string;
  coverLetterText?: string;
  tags?: string[];
  assignedTo?: string;
}

interface KanbanCardProps {
  applicant: Applicant;
  onClick?: () => void;
  onAddNote?: () => void;
  onAssignRecruiter?: () => void;
  isDragging?: boolean;
}

export default function KanbanCard({
  applicant,
  onClick,
  onAddNote,
  onAssignRecruiter,
  isDragging,
}: KanbanCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: applicant.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition: transition || 'transform 250ms cubic-bezier(0.4, 0, 0.2, 1), opacity 200ms ease-in-out, box-shadow 200ms ease-in-out',
    opacity: isSortableDragging || isDragging ? 0.6 : 1,
    boxShadow: isSortableDragging ? '0 10px 25px rgba(0, 0, 0, 0.15)' : undefined,
    willChange: 'transform, opacity, box-shadow',
  };

  const fitIndexColor = getFitIndexDetailedColor(applicant.fitIndex);
  const relativeTime = formatRelativeTime(applicant.appliedAt, true);
  const initials = getInitials(applicant.candidateName);

  const handleClick = (e: React.MouseEvent) => {
    // Don't trigger onClick when clicking action buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    onClick?.();
  };

  const handleAddNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddNote?.();
  };

  const handleAssignRecruiter = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAssignRecruiter?.();
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      data-testid="kanban-card"
      data-dragging={isSortableDragging || isDragging ? 'true' : 'false'}
      data-candidate-id={applicant.candidateId}
      data-application-id={applicant.id}
      className={`group relative bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-all duration-200 ${
        isSortableDragging ? 'scale-105 shadow-lg' : ''
      }`}
      onClick={handleClick}
      draggable="true"
      aria-label={`${applicant.candidateName}, ${applicant.fitIndex} fit index, applied ${relativeTime}`}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Loading Spinner (shown during API call) */}
      {isDragging && (
        <div
          data-testid="loading-spinner"
          className="absolute inset-0 bg-white dark:bg-gray-900 bg-opacity-75 dark:bg-opacity-75 flex items-center justify-center z-10"
        >
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Header: Photo + Name + Fit Index */}
      <div className="flex items-start gap-3 mb-3">
        {/* Candidate Photo/Avatar */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 flex items-center justify-center font-semibold text-sm">
          {initials}
        </div>

        {/* Name and Fit Index */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate" role="heading">
            {applicant.candidateName}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span
              data-testid="fit-index-badge"
              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${fitIndexColor}`}
            >
              {applicant.fitIndex}
            </span>
            <span data-testid="applied-time" className="text-xs text-gray-500 dark:text-gray-400">{relativeTime}</span>
          </div>
        </div>
      </div>

      {/* Tags */}
      {applicant.tags && applicant.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {applicant.tags.slice(0, 3).map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
            >
              {tag}
            </span>
          ))}
          {applicant.tags.length > 3 && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400">
              +{applicant.tags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Assigned Recruiter */}
      {applicant.assignedTo && (
        <div className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          <span className="font-medium">Assigned</span> to {applicant.assignedTo}
        </div>
      )}

      {/* Quick Actions (visible on hover) */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={handleClick}
          aria-label="View details"
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
        >
          <Eye className="w-3 h-3" />
          View
        </button>
        <button
          onClick={handleAddNote}
          aria-label="Add note"
          className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
        >
          <MessageSquare className="w-3 h-3" />
          Note
        </button>
        {!applicant.assignedTo && (
          <button
            onClick={handleAssignRecruiter}
            aria-label="Assign recruiter"
            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded transition-colors"
          >
            <UserPlus className="w-3 h-3" />
            Assign
          </button>
        )}
      </div>
    </div>
  );
}
