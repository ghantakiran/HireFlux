/**
 * AISuggestionCard Component (Issue #94)
 *
 * Displays AI-generated suggestions with reasoning, confidence scores, and user actions
 * Used across job seeker dashboard for resume improvements, job matches, and interview prep
 */

'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Check, X, Undo2 } from 'lucide-react';

export interface AISuggestion {
  id: string;
  title: string;
  description: string;
  reasoning?: string;
  confidence: number; // 0-100
  impact: 'high' | 'medium' | 'low';
  category: 'resume' | 'cover-letter' | 'job-match' | 'interview';
}

export interface AISuggestionCardProps {
  /** The AI suggestion to display */
  suggestion: AISuggestion;
  /** Callback when user accepts the suggestion */
  onAccept?: (id: string) => void;
  /** Callback when user rejects the suggestion */
  onReject?: (id: string) => void;
  /** Callback when user undoes their action */
  onUndo?: (id: string) => void;
  /** Loading state for async actions */
  loading?: boolean;
  /** Whether the suggestion has been accepted */
  accepted?: boolean;
  /** Whether the suggestion has been rejected */
  rejected?: boolean;
  /** Visual variant */
  variant?: 'full' | 'compact';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get color classes for confidence score
 */
function getConfidenceColor(confidence: number): string {
  if (confidence >= 90) return 'bg-success-500 text-white';
  if (confidence >= 70) return 'bg-accent-500 text-white';
  return 'bg-gray-600 text-white';
}

/**
 * Get color classes for impact level
 */
function getImpactColor(impact: AISuggestion['impact']): string {
  switch (impact) {
    case 'high':
      return 'bg-success-500 text-white';
    case 'medium':
      return 'bg-accent-500 text-white';
    case 'low':
      return 'bg-gray-600 text-white';
  }
}

/**
 * Get display label for category
 */
function getCategoryLabel(category: AISuggestion['category']): string {
  switch (category) {
    case 'resume':
      return 'Resume';
    case 'cover-letter':
      return 'Cover Letter';
    case 'job-match':
      return 'Job Match';
    case 'interview':
      return 'Interview';
  }
}

/**
 * Capitalize first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function AISuggestionCard({
  suggestion,
  onAccept,
  onReject,
  onUndo,
  loading = false,
  accepted = false,
  rejected = false,
  variant = 'full',
  className,
}: AISuggestionCardProps) {
  const [showReasoning, setShowReasoning] = useState(false);

  // Clamp confidence score between 0-100
  const clampedConfidence = Math.max(0, Math.min(100, suggestion.confidence));

  const hasReasoning = suggestion.reasoning && suggestion.reasoning.trim().length > 0;
  const isActionTaken = accepted || rejected;

  const handleAccept = () => {
    if (!loading && onAccept) {
      onAccept(suggestion.id);
    }
  };

  const handleReject = () => {
    if (!loading && onReject) {
      onReject(suggestion.id);
    }
  };

  const handleUndo = () => {
    if (!loading && onUndo) {
      onUndo(suggestion.id);
    }
  };

  return (
    <div
      data-suggestion-card
      data-variant={variant}
      role="article"
      aria-label={`AI Suggestion: ${suggestion.title}`}
      className={cn(
        'rounded-lg border border-border bg-card p-4 shadow-sm transition-all hover:shadow-md',
        isActionTaken && 'opacity-75',
        className
      )}
    >
      {/* Header with title and badges */}
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-base font-semibold text-foreground mb-1 break-words">
            {suggestion.title}
          </h3>
          <p className="text-sm text-muted-foreground break-words">
            {suggestion.description}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {/* Category badge */}
          <Badge variant="outline" className="text-xs">
            {getCategoryLabel(suggestion.category)}
          </Badge>
        </div>
      </div>

      {/* Confidence and Impact badges */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Confidence score */}
        <span
          data-confidence-score
          aria-label={`Confidence: ${clampedConfidence}%`}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            getConfidenceColor(clampedConfidence)
          )}
        >
          {clampedConfidence}% confident
        </span>

        {/* Impact level */}
        <span
          data-impact-level
          aria-label={`Impact: ${capitalize(suggestion.impact)}`}
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold',
            getImpactColor(suggestion.impact)
          )}
        >
          {capitalize(suggestion.impact)} impact
        </span>
      </div>

      {/* Reasoning section (collapsible) */}
      {hasReasoning && (
        <div className="mb-3">
          <button
            onClick={() => setShowReasoning(!showReasoning)}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
            aria-expanded={showReasoning}
          >
            <span data-reasoning-icon data-expanded={showReasoning}>
              {showReasoning ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </span>
            {showReasoning ? 'Hide reasoning' : 'Show reasoning'}
          </button>

          {showReasoning && (
            <div
              className="mt-2 rounded-md bg-muted p-3 text-sm text-muted-foreground break-words"
              aria-live="polite"
            >
              {suggestion.reasoning}
            </div>
          )}
        </div>
      )}

      {/* Action buttons or status */}
      <div className="flex items-center gap-2">
        {!isActionTaken && (
          <>
            <Button
              onClick={handleAccept}
              disabled={loading}
              size="sm"
              className="flex-1"
              aria-label="Accept suggestion"
            >
              {loading ? (
                <span role="status" aria-label="Loading" className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Processing...
                </span>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-1" />
                  Accept
                </>
              )}
            </Button>

            <Button
              onClick={handleReject}
              disabled={loading}
              size="sm"
              variant="outline"
              className="flex-1"
              aria-label="Reject suggestion"
            >
              <X className="h-4 w-4 mr-1" />
              Reject
            </Button>
          </>
        )}

        {accepted && (
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1.5 text-sm font-medium text-success-500">
              <Check className="h-4 w-4" />
              Accepted
            </span>
            <Button
              onClick={handleUndo}
              disabled={loading}
              size="sm"
              variant="ghost"
              aria-label="Undo action"
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Undo
            </Button>
          </div>
        )}

        {rejected && (
          <div className="flex items-center justify-between w-full">
            <span className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <X className="h-4 w-4" />
              Rejected
            </span>
            <Button
              onClick={handleUndo}
              disabled={loading}
              size="sm"
              variant="ghost"
              aria-label="Undo action"
            >
              <Undo2 className="h-4 w-4 mr-1" />
              Undo
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
