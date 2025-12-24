/**
 * Command Palette (Issue #149)
 *
 * Quick actions palette triggered by Ctrl+K (Cmd+K on Mac)
 * Provides keyboard-driven access to common actions
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isMac } from '../hooks/useKeyboardShortcuts';

interface Command {
  id: string;
  name: string;
  shortcut?: string;
  icon?: React.ReactNode;
  action: () => void;
}

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  role?: 'job_seeker' | 'employer';
}

export function CommandPalette({ isOpen, onClose, role = 'job_seeker' }: CommandPaletteProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const modKey = isMac() ? 'Cmd' : 'Ctrl';

  // Define commands based on user role
  const allCommands: Command[] = role === 'employer' ? [
    {
      id: 'new-job',
      name: 'Post New Job',
      shortcut: `${modKey}+N`,
      action: () => {
        router.push('/employer/jobs/new');
        onClose();
      },
    },
    {
      id: 'view-applications',
      name: 'View Applications',
      shortcut: `${modKey}+A`,
      action: () => {
        router.push('/employer/applications');
        onClose();
      },
    },
    {
      id: 'view-dashboard',
      name: 'Go to Dashboard',
      shortcut: `${modKey}+D`,
      action: () => {
        router.push('/employer/dashboard');
        onClose();
      },
    },
    {
      id: 'search-candidates',
      name: 'Search Candidates',
      action: () => {
        router.push('/employer/candidates');
        onClose();
      },
    },
    {
      id: 'settings',
      name: 'Settings',
      shortcut: `${modKey}+,`,
      action: () => {
        router.push('/employer/settings');
        onClose();
      },
    },
  ] : [
    {
      id: 'view-jobs',
      name: 'Browse Jobs',
      action: () => {
        router.push('/jobs');
        onClose();
      },
    },
    {
      id: 'view-applications',
      name: 'My Applications',
      shortcut: `${modKey}+A`,
      action: () => {
        router.push('/applications');
        onClose();
      },
    },
    {
      id: 'view-dashboard',
      name: 'Go to Dashboard',
      shortcut: `${modKey}+D`,
      action: () => {
        router.push('/dashboard');
        onClose();
      },
    },
    {
      id: 'resume',
      name: 'Manage Resumes',
      action: () => {
        router.push('/resumes');
        onClose();
      },
    },
    {
      id: 'settings',
      name: 'Settings',
      shortcut: `${modKey}+,`,
      action: () => {
        router.push('/settings');
        onClose();
      },
    },
  ];

  // Filter commands based on search query
  const filteredCommands = searchQuery
    ? allCommands.filter((cmd) =>
        cmd.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : allCommands;

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredCommands.length);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? filteredCommands.length - 1 : prev - 1
        );
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredCommands[selectedIndex]) {
          filteredCommands[selectedIndex].action();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredCommands, onClose]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-[9998]"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="command-palette-title"
        className="fixed left-1/2 top-[20%] -translate-x-1/2 z-[9999] w-full max-w-2xl bg-white rounded-lg shadow-2xl overflow-hidden"
      >
        {/* Title */}
        <div className="px-4 pt-4 pb-2">
          <h2 id="command-palette-title" className="text-lg font-semibold text-gray-900">
            Command Palette
          </h2>
        </div>

        {/* Search Input */}
        <div className="px-4 pb-4 border-b border-gray-200">
          <input
            ref={inputRef}
            type="text"
            id="command-palette-input"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a command or search..."
            className="w-full px-4 py-3 text-base border-0 focus:ring-0 focus:outline-none"
            aria-label="Command palette search"
          />
        </div>

        {/* Commands List */}
        <div
          role="listbox"
          aria-labelledby="command-palette-title"
          className="max-h-96 overflow-y-auto"
        >
          {filteredCommands.length > 0 ? (
            <div className="py-2">
              {filteredCommands.map((command, index) => (
                <button
                  key={command.id}
                  role="option"
                  aria-selected={index === selectedIndex}
                  onClick={() => command.action()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`
                    w-full flex items-center justify-between px-4 py-3 text-left
                    ${index === selectedIndex ? 'bg-blue-50 text-blue-900' : 'text-gray-900 hover:bg-gray-50'}
                  `}
                >
                  <span className="text-sm font-medium">{command.name}</span>
                  {command.shortcut && (
                    <kbd className="inline-flex items-center gap-1 rounded border border-gray-200 bg-gray-100 px-2 py-1 text-xs font-mono text-gray-600">
                      {command.shortcut}
                    </kbd>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-sm text-gray-400">
              No commands found
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div className="flex items-center gap-4">
            <span>
              <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">↑↓</kbd> Navigate
            </span>
            <span>
              <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Enter</kbd> Select
            </span>
          </div>
          <span>
            <kbd className="px-1 py-0.5 bg-white border border-gray-300 rounded">Esc</kbd> Close
          </span>
        </div>
      </div>
    </>
  );
}
