/**
 * Kanban Column Component - Week 40 Day 2
 *
 * Column component for Kanban board with:
 * - Stage name and candidate count badge
 * - Collapse/expand functionality
 * - Sort/filter controls
 * - List of candidate cards
 * - Empty state
 * - Drop zone highlighting
 */

'use client';

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { ChevronDown, ChevronRight } from 'lucide-react';
import KanbanCard, { Applicant } from './KanbanCard';
import { EmptyState } from '@/components/domain/EmptyState';

interface KanbanColumnProps {
  id: string;
  label: string;
  color: string;
  candidates: Applicant[];
  onCardClick?: (applicationId: string) => void;
  onAddNote?: (applicationId: string) => void;
  onAssignRecruiter?: (applicationId: string) => void;
}

export default function KanbanColumn({
  id,
  label,
  color,
  candidates,
  onCardClick,
  onAddNote,
  onAssignRecruiter,
}: KanbanColumnProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { setNodeRef, isOver } = useDroppable({
    id,
  });

  const candidateIds = candidates.map((c) => c.id);

  // Get color classes for column header
  const getColorClasses = () => {
    switch (color) {
      case 'blue':
        return 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200';
      case 'yellow':
        return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 border-yellow-200';
      case 'green':
        return 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200';
      case 'purple':
        return 'bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200';
      case 'orange':
        return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200';
      case 'red':
        return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-200';
      case 'gray':
        return 'bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
      default:
        return 'bg-gray-50 dark:bg-gray-950 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700';
    }
  };

  const colorClasses = getColorClasses();

  return (
    <div
      data-testid="kanban-column"
      data-column={id}
      data-drop-zone="true"
      data-drag-over={isOver ? 'true' : 'false'}
      className={`flex flex-col bg-gray-50 dark:bg-gray-950 rounded-lg border-2 transition-all duration-200 min-w-[260px] sm:min-w-[280px] max-w-[320px] ${
        isOver ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/50 dark:bg-blue-900/20 shadow-lg' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      {/* Column Header */}
      <div className={`flex items-center justify-between p-4 border-b-2 ${colorClasses} rounded-t-lg`}>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            aria-label={isCollapsed ? 'Expand column' : 'Collapse column'}
            className="hover:bg-white hover:bg-opacity-50 rounded p-1 transition-colors"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          <h2 className="font-semibold text-sm" aria-level={2}>
            {label}
          </h2>
        </div>

        {/* Candidate Count Badge */}
        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-white dark:bg-gray-900 text-xs font-semibold">
          {candidates.length}
        </span>
      </div>

      {/* Column Body (cards or empty state) */}
      {!isCollapsed && (
        <div
          ref={setNodeRef}
          className="flex-1 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-200px)] sm:max-h-[calc(100vh-300px)] overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          {candidates.length === 0 ? (
            // Empty State
            <EmptyState
              title="No candidates in this stage"
              description="Drag candidates here to move them"
              variant="compact"
            />
          ) : (
            // Candidate Cards
            <SortableContext items={candidateIds} strategy={verticalListSortingStrategy}>
              {candidates.map((applicant) => (
                <KanbanCard
                  key={applicant.id}
                  applicant={applicant}
                  onClick={() => onCardClick?.(applicant.id)}
                  onAddNote={() => onAddNote?.(applicant.id)}
                  onAssignRecruiter={() => onAssignRecruiter?.(applicant.id)}
                />
              ))}
            </SortableContext>
          )}
        </div>
      )}
    </div>
  );
}
