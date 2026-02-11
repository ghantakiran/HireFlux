/**
 * Applicant Kanban Board Component - Week 40 Day 2
 *
 * Drag-and-drop Kanban board for ATS pipeline management with:
 * - 8 pipeline stages (New → Hired/Rejected)
 * - Drag-and-drop candidates between stages
 * - Optimistic UI updates
 * - Keyboard accessibility (Space/Enter for drag, Arrow keys for navigation)
 * - Screen reader announcements
 * - Filtering and sorting
 * - Responsive design
 */

'use client';

import React, { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  closestCorners,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { Filter, ArrowUpDown } from 'lucide-react';
import KanbanColumn from './KanbanColumn';
import KanbanCard, { Applicant } from './KanbanCard';
import { atsApi } from '@/lib/api';
import { useATSStore } from '@/hooks/useATSStore';

// ============================================================================
// Types & Interfaces
// ============================================================================

type ApplicationStatus =
  | 'new'
  | 'reviewing'
  | 'phone_screen'
  | 'technical_interview'
  | 'final_interview'
  | 'offer'
  | 'hired'
  | 'rejected';

interface KanbanStage {
  id: ApplicationStatus;
  label: string;
  color: string;
  candidates: Applicant[];
}

interface ApplicantKanbanBoardProps {
  jobId: string;
  onCardClick?: (applicationId: string) => void;
  onAddNote?: (applicationId: string) => void;
  onAssignRecruiter?: (applicationId: string) => void;
  onStageChange?: (applicationId: string, oldStage: string, newStage: string) => void;
}

interface Filters {
  assignee?: string;
  tags?: string[];
  minFitIndex?: number;
  maxFitIndex?: number;
}

type SortOption = 'fit-desc' | 'fit-asc' | 'date-desc' | 'date-asc';

interface UndoAction {
  applicationId: string;
  oldStage: ApplicationStatus;
  newStage: ApplicationStatus;
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const STAGES: Array<{ id: ApplicationStatus; label: string; color: string }> = [
  { id: 'new', label: 'New', color: 'blue' },
  { id: 'reviewing', label: 'Reviewing', color: 'yellow' },
  { id: 'phone_screen', label: 'Phone Screen', color: 'purple' },
  { id: 'technical_interview', label: 'Technical Interview', color: 'orange' },
  { id: 'final_interview', label: 'Final Interview', color: 'green' },
  { id: 'offer', label: 'Offer', color: 'green' },
  { id: 'hired', label: 'Hired', color: 'green' },
  { id: 'rejected', label: 'Rejected', color: 'red' },
];

// ============================================================================
// Main Component
// ============================================================================

export default function ApplicantKanbanBoard({
  jobId,
  onCardClick,
  onAddNote,
  onAssignRecruiter,
  onStageChange,
}: ApplicantKanbanBoardProps) {
  // Get shared state from store
  const {
    applications: applicants,
    filteredApplications,
    loading,
    error: storeError,
    filters,
    sortBy,
    updateApplication,
    setFilters,
    setSortBy,
  } = useATSStore();

  // UI-specific state (not shared)
  const [activeId, setActiveId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [error, setError] = useState<string | null>(storeError);
  const [undoStack, setUndoStack] = useState<UndoAction[]>([]);
  const [showUndoNotification, setShowUndoNotification] = useState(false);

  // Refs
  const undoNotificationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Drag and drop sensors (including touch support)
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Prevent accidental drags
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250, // Delay to distinguish from scroll
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Check online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    setIsOnline(navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Sync store error to local error state
  useEffect(() => {
    if (storeError) {
      setError(storeError);
    }
  }, [storeError]);

  // Undo handler
  const handleUndo = useCallback(async () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];
    const { applicationId, oldStage, newStage } = lastAction;

    // Remove from stack
    setUndoStack((prev) => prev.slice(0, -1));

    // Revert the change
    updateApplication(applicationId, { stage: oldStage as string });

    // Show notification
    setShowUndoNotification(true);
    setAnnouncement(`Undid move from ${newStage} to ${oldStage}`);

    // Clear notification after 3 seconds
    if (undoNotificationTimeoutRef.current) {
      clearTimeout(undoNotificationTimeoutRef.current);
    }
    undoNotificationTimeoutRef.current = setTimeout(() => {
      setShowUndoNotification(false);
    }, 3000);

    try {
      // API call to revert
      await atsApi.updateApplicationStatus(applicationId, {
        status: oldStage as string,
      });
    } catch (err) {
      // Revert back if API fails
      updateApplication(applicationId, { stage: newStage as string });
      setError('Failed to undo action');
      setTimeout(() => setError(null), 5000);
    }
  }, [undoStack, updateApplication]);

  // Keyboard shortcut for undo (Cmd+Z / Ctrl+Z)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Cmd+Z (Mac) or Ctrl+Z (Windows/Linux)
      if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo]);

  // Fetch applications when component mounts or jobId changes
  const { fetchApplications } = useATSStore();
  useEffect(() => {
    if (jobId) {
      fetchApplications(jobId);
    }
  }, [jobId, fetchApplications]);

  // Organize applicants by stage (using store's filtered data)
  const stages: KanbanStage[] = useMemo(() => {
    return STAGES.map((stage) => ({
      ...stage,
      candidates: filteredApplications.filter((a) => a.stage === stage.id),
    }));
  }, [filteredApplications]);

  // Get active applicant being dragged
  const activeApplicant = useMemo(
    () => applicants.find((a) => a.id === activeId),
    [activeId, applicants]
  );

  // Drag handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    setActiveId(active.id as string);
    setIsDragging(true);

    // Haptic feedback on mobile
    if ('vibrate' in navigator) {
      navigator.vibrate(50);
    }

    const applicant = applicants.find((a) => a.id === active.id);
    if (applicant) {
      const stage = STAGES.find((s) => s.id === applicant.stage);
      setAnnouncement(
        `Picked up ${applicant.candidateName} from ${stage?.label} column`
      );
    }
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    if (over && activeId) {
      const overId = over.id as string;
      const overStage = STAGES.find((s) => s.id === overId);

      if (overStage) {
        setAnnouncement(`Press arrow keys to move. Currently over ${overStage.label}`);
      }
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    setIsDragging(false);

    if (!over) {
      setActiveId(null);
      setAnnouncement('Drag cancelled');
      return;
    }

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeApplicant = applicants.find((a) => a.id === activeId);
    if (!activeApplicant) {
      setActiveId(null);
      return;
    }

    // Check if dropped on a stage (not another card)
    const targetStage = STAGES.find((s) => s.id === overId);
    if (!targetStage) {
      setActiveId(null);
      return;
    }

    const oldStage = activeApplicant.stage;
    const newStage = targetStage.id;

    // Don't update if dropped on same stage
    if (oldStage === newStage) {
      setActiveId(null);
      setAnnouncement('Dropped in same column, no change');
      return;
    }

    // Optimistic update via store
    updateApplication(activeId, { stage: newStage });

    // Add to undo stack (limit to 10 items)
    setUndoStack((prev) => {
      const newStack: UndoAction[] = [
        ...prev,
        {
          applicationId: activeId,
          oldStage: oldStage as ApplicationStatus,
          newStage: newStage as ApplicationStatus,
          timestamp: Date.now(),
        },
      ];
      return newStack.slice(-10); // Keep last 10 actions
    });

    setAnnouncement(`Moved ${activeApplicant.candidateName} to ${targetStage.label}`);

    // Haptic feedback on successful drop (mobile)
    if ('vibrate' in navigator) {
      navigator.vibrate(100);
    }

    // Call callback
    onStageChange?.(activeId, oldStage, newStage);

    try {
      // API call
      await atsApi.updateApplicationStatus(activeId, {
        status: newStage,
      });

      // Update candidate counts announcement
      const oldStageData = STAGES.find((s) => s.id === oldStage);
      const newStageData = STAGES.find((s) => s.id === newStage);
      const oldCount = stages.find((s) => s.id === oldStage)?.candidates.length || 0;
      const newCount = stages.find((s) => s.id === newStage)?.candidates.length || 0;

      setAnnouncement(
        `${oldStageData?.label}: ${oldCount - 1} candidates. ${newStageData?.label}: ${newCount + 1} candidates`
      );
    } catch (err) {
      // Revert on error via store
      updateApplication(activeId, { stage: oldStage });

      // Remove from undo stack on error
      setUndoStack((prev) => prev.slice(0, -1));

      setAnnouncement(`Failed to update candidate stage: ${(err as Error).message}`);
      setError('Failed to update candidate stage');

      setTimeout(() => {
        setError(null);
      }, 5000);
    } finally {
      setActiveId(null);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setIsDragging(false);
    setAnnouncement('Drag cancelled');
  };

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading candidates...</p>
        </div>
      </div>
    );
  }

  // Empty state
  if (applicants.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-center">
        <div className="w-20 h-20 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-4">
          <svg
            className="w-10 h-10 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">No candidates yet</h3>
        <p className="text-gray-600 dark:text-gray-400 max-w-md">
          Post this job to start receiving applications from qualified candidates.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      {/* Offline Banner */}
      {!isOnline && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-400">
                You are currently offline. Changes will sync when online.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-red-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar */}
      <div className="flex items-center justify-between mb-4 gap-4">
        <div className="flex items-center gap-2">
          {/* Sort Dropdown */}
          <label htmlFor="sort-select" className="sr-only">
            Sort candidates
          </label>
          <select
            id="sort-select"
            aria-label="Sort candidates"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="fit-desc">Fit Index (High to Low)</option>
            <option value="fit-asc">Fit Index (Low to High)</option>
            <option value="date-desc">Applied Date (Newest First)</option>
            <option value="date-asc">Applied Date (Oldest First)</option>
          </select>

          {/* Filter Button */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            aria-label="Filter candidates"
            className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>
        </div>

        {/* Keyboard Instructions */}
        {isDragging && (
          <div className="text-sm text-gray-600 dark:text-gray-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-2 rounded-md">
            Press arrow keys to move. Press Space to drop. Press Esc to cancel.
          </div>
        )}
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Assignee Filter */}
            <div>
              <label htmlFor="assignee-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by assignee
              </label>
              <select
                id="assignee-filter"
                aria-label="Filter by assignee"
                value={filters.assignee || ''}
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    assignee: e.target.value || undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All assignees</option>
                <option value="recruiter-1">Recruiter 1</option>
                <option value="recruiter-2">Recruiter 2</option>
              </select>
            </div>

            {/* Tags Filter */}
            <div>
              <label htmlFor="tags-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Filter by tags
              </label>
              <input
                id="tags-filter"
                type="text"
                aria-label="Filter by tags"
                placeholder="e.g., React, TypeScript"
                onChange={(e) => {
                  const tags = e.target.value
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean);
                  setFilters({
                    ...filters,
                    tags: tags.length > 0 ? tags : undefined,
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Fit Index Range */}
            <div>
              <label htmlFor="min-fit-filter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Minimum fit index
              </label>
              <input
                id="min-fit-filter"
                type="number"
                min="0"
                max="100"
                aria-label="Minimum fit index"
                placeholder="0"
                onChange={(e) =>
                  setFilters({
                    ...filters,
                    minFitIndex: e.target.value ? parseInt(e.target.value) : undefined,
                  })
                }
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          data-testid="dnd-context"
          data-touch-enabled="true"
          onTouchMove={(e) => {
            // Prevent page scroll during drag
            if (isDragging) {
              e.preventDefault();
            }
          }}
        >
          {stages.map((stage) => (
            <KanbanColumn
              key={stage.id}
              id={stage.id}
              label={stage.label}
              color={stage.color}
              candidates={stage.candidates}
              onCardClick={onCardClick}
              onAddNote={onAddNote}
              onAssignRecruiter={onAssignRecruiter}
            />
          ))}
        </div>

        {/* Drag Overlay with enhanced styling */}
        <DragOverlay
          dropAnimation={{
            duration: 200,
            easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {activeApplicant ? (
            <div
              data-testid="drag-ghost"
              style={{
                opacity: 0.8,
                transform: 'scale(1.05) rotate(3deg)',
                boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
                cursor: 'grabbing',
              }}
            >
              <KanbanCard applicant={activeApplicant} isDragging />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Undo Notification */}
      {showUndoNotification && (
        <div
          data-testid="undo-notification"
          className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 z-50 animate-slide-up"
          role="alert"
        >
          <svg
            className="w-5 h-5 text-green-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <span>Action undone successfully</span>
          <button
            onClick={handleUndo}
            disabled={undoStack.length === 0}
            className="ml-2 text-blue-400 hover:text-blue-300 font-medium"
          >
            Undo again
          </button>
        </div>
      )}

      {/* Undo Button (Floating) */}
      {undoStack.length > 0 && !showUndoNotification && (
        <button
          data-testid="undo-button"
          onClick={handleUndo}
          className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2 z-50"
          aria-label={`Undo last action (${undoStack.length} ${undoStack.length === 1 ? 'action' : 'actions'} available)`}
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"
            />
          </svg>
          <span>Undo ({undoStack.length})</span>
          <kbd className="ml-2 px-2 py-1 text-xs bg-blue-700 rounded">
            {typeof navigator !== 'undefined' && navigator.platform.includes('Mac') ? '⌘' : 'Ctrl'}+Z
          </kbd>
        </button>
      )}

      {/* Screen Reader Announcements */}
      <div
        role="status"
        aria-label="drag announcement"
        aria-live="assertive"
        className="sr-only"
      >
        {announcement}
      </div>

      <div
        role="status"
        aria-label="count announcement"
        aria-live="polite"
        className="sr-only"
      >
        {stages.map((stage) => `${stage.label}: ${stage.candidates.length} candidates`).join('. ')}
      </div>

      {/* Context Menu (placeholder) */}
      <div role="menu" className="hidden">
        <button>Move to Reviewing</button>
        <button>Reject candidate</button>
        <button>Schedule interview</button>
      </div>
    </div>
  );
}
