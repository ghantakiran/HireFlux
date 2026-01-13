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
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'yellow':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'green':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'purple':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'orange':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'red':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'gray':
        return 'bg-gray-50 text-gray-700 border-gray-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const colorClasses = getColorClasses();

  return (
    <div
      data-testid="kanban-column"
      data-column={id}
      data-drop-zone="true"
      data-drag-over={isOver ? 'true' : 'false'}
      className={`flex flex-col bg-gray-50 rounded-lg border-2 transition-all duration-200 ${
        isOver ? 'ring-2 ring-blue-500 border-blue-500 bg-blue-50/50 shadow-lg' : 'border-gray-200'
      }`}
      style={{ minWidth: '280px', maxWidth: '320px' }}
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
        <span className="inline-flex items-center justify-center min-w-[24px] h-6 px-2 rounded-full bg-white text-xs font-semibold">
          {candidates.length}
        </span>
      </div>

      {/* Column Body (cards or empty state) */}
      {!isCollapsed && (
        <div
          ref={setNodeRef}
          className="flex-1 p-2 space-y-2 min-h-[200px] max-h-[calc(100vh-300px)] overflow-y-auto"
          style={{ scrollbarWidth: 'thin' }}
        >
          {candidates.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center h-full text-center py-8">
              <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-3">
                <svg
                  className="w-8 h-8 text-gray-400"
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
              <p className="text-sm font-medium text-gray-600">No candidates in this stage</p>
              <p className="text-xs text-gray-500 mt-1">Drag candidates here to move them</p>
            </div>
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
