/**
 * JobCard Component (Issue #94)
 *
 * Displays job listing information with fit scores, actions, and rich metadata
 * Used across job seeker dashboard, search results, and saved jobs
 */

'use client';

import React from 'react';
import { cn, capitalize, formatRelativeTime, getCurrencySymbol } from '@/lib/utils';
import { getLocationTypeBadgeColor } from '@/lib/badge-helpers';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FitIndexBadge } from '@/components/domain/FitIndexBadge';
import { Bookmark, BookmarkCheck, MapPin, Building2, Clock } from 'lucide-react';

export interface Job {
  id: string;
  title: string;
  company: string;
  location?: string;
  locationType?: 'remote' | 'hybrid' | 'onsite';
  salary?: {
    min: number;
    max?: number;
    currency: string;
  };
  fitIndex?: number;
  postedDate?: string;
  tags?: string[];
  description?: string;
  saved?: boolean;
  applied?: boolean;
}

export interface JobCardProps {
  /** Job data to display */
  job: Job;
  /** Callback when card is clicked */
  onClick?: (jobId: string) => void;
  /** Callback when save/bookmark button clicked */
  onSave?: (jobId: string) => void;
  /** Callback when apply button clicked */
  onApply?: (jobId: string) => void;
  /** Whether to show fit index */
  showFitIndex?: boolean;
  /** Whether to show description */
  showDescription?: boolean;
  /** Maximum number of tags to display */
  maxTags?: number;
  /** Visual variant */
  variant?: 'full' | 'compact';
  /** Loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format salary range
 */
function formatSalary(salary: Job['salary']): string {
  if (!salary) return '';

  const symbol = getCurrencySymbol(salary.currency);
  const min = salary.min.toLocaleString();

  if (salary.max) {
    const max = salary.max.toLocaleString();
    return `${symbol}${min} - ${symbol}${max}`;
  }

  return `${symbol}${min}+`;
}

function JobCardInner({
  job,
  onClick,
  onSave,
  onApply,
  showFitIndex = true,
  showDescription = false,
  maxTags,
  variant = 'full',
  loading = false,
  className,
}: JobCardProps) {
  const handleCardClick = () => {
    if (onClick) {
      onClick(job.id);
    }
  };

  const handleSaveClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onSave && !loading) {
      onSave(job.id);
    }
  };

  const handleApplyClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onApply && !loading) {
      onApply(job.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick(job.id);
    }
  };

  const displayTags = maxTags && job.tags ? job.tags.slice(0, maxTags) : job.tags;
  const remainingTags = maxTags && job.tags ? job.tags.length - maxTags : 0;

  const isCompact = variant === 'compact';
  const isClickable = Boolean(onClick);

  return (
    <article
      data-job-card
      data-variant={variant}
      role="article"
      aria-label={isClickable ? `${job.title} at ${job.company}${job.fitIndex !== undefined ? `, fit index ${job.fitIndex}` : ''}. Click to view details` : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleCardClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      className={cn(
        'rounded-lg border border-border bg-card p-4 transition-all',
        isClickable && 'cursor-pointer hover:shadow-md hover:border-primary',
        isCompact ? 'p-3' : 'p-4',
        className
      )}
    >
      {/* Loading overlay */}
      {loading && (
        <div
          role="status"
          aria-label="Loading"
          className="absolute inset-0 bg-background/50 flex items-center justify-center rounded-lg"
        >
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      )}

      {/* Header: Title, Company, and Save Button */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h3 className={cn('font-semibold text-foreground break-words mb-1', isCompact ? 'text-base' : 'text-lg')}>
            {job.title}
          </h3>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="break-words">{job.company}</span>
          </div>
        </div>

        {/* Save/Bookmark button */}
        {onSave && (
          <Button
            onClick={handleSaveClick}
            disabled={loading}
            variant="ghost"
            size="icon"
            aria-label={job.saved ? 'Unsave job' : 'Save job'}
            className="flex-shrink-0"
          >
            {job.saved ? (
              <BookmarkCheck className="h-5 w-5 text-primary" />
            ) : (
              <Bookmark className="h-5 w-5" />
            )}
          </Button>
        )}
      </div>

      {/* Metadata: Location, Location Type, Salary */}
      <div className="mb-3 flex flex-wrap items-center gap-2 text-sm">
        {/* Location */}
        {job.location && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <MapPin className="h-4 w-4 flex-shrink-0" />
            <span>{job.location}</span>
          </div>
        )}

        {/* Location Type Badge */}
        {job.locationType && (
          <Badge className={cn('text-xs', getLocationTypeBadgeColor(job.locationType))}>
            {capitalize(job.locationType)}
          </Badge>
        )}

        {/* Salary */}
        {job.salary && (
          <span className="font-semibold text-foreground">{formatSalary(job.salary)}</span>
        )}
      </div>

      {/* Fit Index and Posted Date */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Fit Index */}
        {showFitIndex && job.fitIndex !== undefined && (
          <FitIndexBadge score={job.fitIndex} size="sm" showLabel />
        )}

        {/* Posted Date */}
        {job.postedDate && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            <span>{formatRelativeTime(job.postedDate)}</span>
          </div>
        )}
      </div>

      {/* Description (only in full variant when enabled) */}
      {!isCompact && showDescription && job.description && (
        <p className="mb-3 text-sm text-muted-foreground line-clamp-2 break-words">
          {job.description}
        </p>
      )}

      {/* Skill Tags */}
      {displayTags && displayTags.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {displayTags.map((tag, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {tag}
            </Badge>
          ))}
          {remainingTags > 0 && (
            <Badge variant="outline" className="text-xs text-muted-foreground">
              +{remainingTags} more
            </Badge>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {onApply && (
        <div className="flex gap-2">
          <Button
            onClick={handleApplyClick}
            disabled={loading || job.applied}
            size="sm"
            className="flex-1"
            aria-label={job.applied ? 'Applied' : 'Apply now'}
          >
            {job.applied ? 'Applied' : 'Apply Now'}
          </Button>
        </div>
      )}
    </article>
  );
}

export const JobCard = React.memo(JobCardInner);
JobCard.displayName = 'JobCard';
