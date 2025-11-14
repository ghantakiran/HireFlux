/**
 * ATS View Toggle Component
 * Week 40 Day 3
 *
 * Toggle button to switch between List and Kanban views
 * - Keyboard shortcut: Alt+V
 * - Screen reader announcements
 * - Smooth transitions
 */

'use client';

import React, { useEffect } from 'react';
import { LayoutList, LayoutGrid } from 'lucide-react';
import { ViewMode } from '@/hooks/useATSStore';

interface ATSViewToggleProps {
  view: ViewMode;
  onToggle: (view: ViewMode) => void;
}

export default function ATSViewToggle({ view, onToggle }: ATSViewToggleProps) {
  const [announcement, setAnnouncement] = React.useState('');

  // Keyboard shortcut: Alt+V
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        const newView: ViewMode = view === 'list' ? 'kanban' : 'list';
        onToggle(newView);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [view, onToggle]);

  const handleToggle = () => {
    const newView: ViewMode = view === 'list' ? 'kanban' : 'list';
    onToggle(newView);

    // Announce to screen reader
    setAnnouncement(`Switched to ${newView} view`);
    setTimeout(() => setAnnouncement(''), 1000);
  };

  return (
    <>
      <button
        onClick={handleToggle}
        aria-label={`Toggle view (current: ${view}). Press Alt+V to toggle.`}
        className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
        title={`Switch to ${view === 'list' ? 'Kanban' : 'List'} view (Alt+V)`}
      >
        {view === 'list' ? (
          <>
            <LayoutGrid className="w-4 h-4" />
            <span>Kanban View</span>
          </>
        ) : (
          <>
            <LayoutList className="w-4 h-4" />
            <span>List View</span>
          </>
        )}
      </button>

      {/* Screen Reader Announcement */}
      <div
        role="status"
        aria-label="view announcement"
        aria-live="assertive"
        className="sr-only"
      >
        {announcement}
      </div>
    </>
  );
}
