/**
 * Feedback Widget Trigger Button
 * Floating button that opens the feedback widget
 */

'use client';

import React from 'react';
import { MessageSquare, Keyboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export interface FeedbackWidgetTriggerProps {
  onClick: () => void;
  className?: string;
}

export function FeedbackWidgetTrigger({ onClick, className = '' }: FeedbackWidgetTriggerProps) {
  // Keyboard shortcut handler
  React.useEffect(() => {
    const handleKeyboard = (e: KeyboardEvent) => {
      // Ctrl+Shift+F or Cmd+Shift+F
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'F') {
        e.preventDefault();
        onClick();
      }
    };

    window.addEventListener('keydown', handleKeyboard);
    return () => window.removeEventListener('keydown', handleKeyboard);
  }, [onClick]);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            data-testid="feedback-widget-trigger"
            aria-label="Open feedback widget - Report bugs, request features, or send feedback"
            className={`fixed bottom-6 right-6 z-40 inline-flex items-center justify-center rounded-full shadow-lg hover:shadow-xl transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 bg-primary text-primary-foreground hover:bg-primary/90 ${className}`}
            style={{ width: '56px', height: '56px', minWidth: '56px', minHeight: '56px' }}
            type="button"
          >
            <MessageSquare className="h-6 w-6" />
            <span className="sr-only">Feedback</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="left" className="flex items-center gap-2">
          <span>Send Feedback</span>
          <span className="flex items-center gap-1 text-xs opacity-70">
            <Keyboard className="h-3 w-3" />
            <kbd className="px-1 bg-muted rounded">Ctrl</kbd>
            <kbd className="px-1 bg-muted rounded">Shift</kbd>
            <kbd className="px-1 bg-muted rounded">F</kbd>
          </span>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
