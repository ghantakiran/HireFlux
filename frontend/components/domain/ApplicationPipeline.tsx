/**
 * ApplicationPipeline Component (Issue #94)
 *
 * Kanban-style application tracking board for employer ATS
 * Displays applications grouped by stage (New, Screening, Interview, Offer, Hired, Rejected)
 * Used in employer dashboard for managing candidate pipeline
 */

'use client';

import { cn } from '@/lib/utils';
import { FitIndexBadge } from '@/components/domain/FitIndexBadge';
import { EmptyState } from '@/components/domain/EmptyState';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, User, Calendar, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export interface Application {
  id: string;
  jobTitle: string;
  company: string;
  candidateName?: string;
  appliedDate?: Date;
  stage: string;
  fitIndex?: number;
}

export interface PipelineStage {
  id: string;
  label: string;
  color: string;
}

export interface ApplicationPipelineProps {
  /** Applications to display */
  applications: Application[];
  /** Pipeline stages */
  stages: PipelineStage[];
  /** Callback when application stage changes */
  onStageChange?: (applicationId: string, newStage: string) => void;
  /** Callback when application card is clicked */
  onApplicationClick?: (applicationId: string) => void;
  /** Whether to show fit index */
  showFitIndex?: boolean;
  /** Whether to show applied date */
  showDate?: boolean;
  /** Whether to show count for each stage */
  showCount?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
  /** Visual variant */
  variant?: 'full' | 'compact';
  /** Loading state */
  loading?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Get stage color classes
 */
function getStageColor(color: string): string {
  const colors: Record<string, string> = {
    gray: 'border-gray-600',
    blue: 'border-primary',
    purple: 'border-purple-500',
    green: 'border-accent-500',
    success: 'border-success-500',
    red: 'border-error',
  };
  return colors[color] || 'border-muted-foreground';
}

/**
 * Format date
 */
function formatDate(date: Date): string {
  return format(date, 'MMM d');
}

export function ApplicationPipeline({
  applications,
  stages,
  onStageChange,
  onApplicationClick,
  showFitIndex = true,
  showDate = true,
  showCount = true,
  emptyMessage = 'No applications yet',
  variant = 'full',
  loading = false,
  className,
}: ApplicationPipelineProps) {
  // Group applications by stage
  const applicationsByStage = stages.reduce((acc, stage) => {
    acc[stage.id] = applications.filter((app) => app.stage === stage.id);
    return acc;
  }, {} as Record<string, Application[]>);

  // Empty state
  if (applications.length === 0 && !loading) {
    return (
      <div className={className}>
        <EmptyState title={emptyMessage} variant="compact" />
      </div>
    );
  }

  const isCompact = variant === 'compact';

  return (
    <div
      data-pipeline
      data-variant={variant}
      role="region"
      aria-label="Application pipeline"
      className={cn('w-full', className)}
    >
      {/* Loading State */}
      {loading && (
        <div
          role="status"
          aria-label="Loading"
          className="flex gap-4 overflow-x-auto pb-4"
        >
          {stages.map((stage) => (
            <div
              key={stage.id}
              data-skeleton
              className="flex-shrink-0 w-80 h-96 rounded-lg bg-muted animate-pulse"
            />
          ))}
        </div>
      )}

      {/* Pipeline Columns */}
      {!loading && (
        <div
          data-scroll-container
          className="flex gap-4 overflow-x-auto pb-4"
        >
          {stages.map((stage) => {
            const stageApplications = applicationsByStage[stage.id] || [];

            return (
              <div
                key={stage.id}
                data-stage={stage.id}
                aria-label={`${stage.label} stage with ${stageApplications.length} applications`}
                className={cn(
                  'flex-shrink-0 flex flex-col',
                  isCompact ? 'w-64' : 'w-80'
                )}
              >
                {/* Stage Header */}
                <div
                  data-stage-header
                  className={cn(
                    'p-3 rounded-t-lg border-t-4 bg-card',
                    getStageColor(stage.color)
                  )}
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground">
                      {stage.label}
                    </h3>
                    {showCount && (
                      <Badge variant="secondary" className="text-xs">
                        {stageApplications.length}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Applications List */}
                <div
                  className={cn(
                    'flex-1 space-y-2 p-3 bg-muted/30 rounded-b-lg border border-t-0 border-border min-h-[200px] overflow-y-auto',
                    isCompact ? 'max-h-96' : 'max-h-[600px]'
                  )}
                >
                  {stageApplications.map((application) => (
                    <ApplicationCard
                      key={application.id}
                      application={application}
                      stages={stages}
                      currentStage={stage.id}
                      onStageChange={onStageChange}
                      onClick={onApplicationClick}
                      showFitIndex={showFitIndex}
                      showDate={showDate}
                      isCompact={isCompact}
                    />
                  ))}

                  {stageApplications.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      No applications
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Individual application card component
 */
function ApplicationCard({
  application,
  stages,
  currentStage,
  onStageChange,
  onClick,
  showFitIndex,
  showDate,
  isCompact,
}: {
  application: Application;
  stages: PipelineStage[];
  currentStage: string;
  onStageChange?: (applicationId: string, newStage: string) => void;
  onClick?: (applicationId: string) => void;
  showFitIndex: boolean;
  showDate: boolean;
  isCompact: boolean;
}) {
  const handleClick = () => {
    if (onClick) {
      onClick(application.id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ' ') && onClick) {
      e.preventDefault();
      onClick(application.id);
    }
  };

  const handleStageChange = (newStage: string) => {
    if (onStageChange) {
      onStageChange(application.id, newStage);
    }
  };

  const isClickable = Boolean(onClick);

  return (
    <div
      data-application-card
      role="article"
      tabIndex={isClickable ? 0 : undefined}
      onClick={isClickable ? handleClick : undefined}
      onKeyDown={isClickable ? handleKeyDown : undefined}
      className={cn(
        'p-3 rounded-lg border border-border bg-card transition-all',
        isClickable && 'cursor-pointer hover:shadow-md hover:border-primary',
        isCompact && 'p-2'
      )}
    >
      {/* Job Title */}
      <h4 className={cn('font-semibold text-foreground mb-2 break-words', isCompact ? 'text-sm' : 'text-base')}>
        {application.jobTitle}
      </h4>

      {/* Company */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Building2 className="h-3.5 w-3.5 flex-shrink-0" />
        <span className="truncate">{application.company}</span>
      </div>

      {/* Candidate Name */}
      {application.candidateName && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
          <User className="h-3.5 w-3.5 flex-shrink-0" />
          <span className="truncate">{application.candidateName}</span>
        </div>
      )}

      {/* Fit Index */}
      {showFitIndex && application.fitIndex !== undefined && (
        <div className="mb-2">
          <FitIndexBadge score={application.fitIndex} size="sm" />
        </div>
      )}

      {/* Applied Date */}
      {showDate && application.appliedDate && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
          <Calendar className="h-3 w-3 flex-shrink-0" />
          <span>{formatDate(application.appliedDate)}</span>
        </div>
      )}

      {/* Stage Selector */}
      {onStageChange && (
        <div className="mt-3 pt-3 border-t border-border">
          <Select value={currentStage} onValueChange={handleStageChange}>
            <SelectTrigger
              data-stage-selector
              className="w-full text-xs h-8"
              onClick={(e) => e.stopPropagation()}
            >
              <SelectValue placeholder="Move to..." />
            </SelectTrigger>
            <SelectContent>
              {stages.map((stage) => (
                <SelectItem key={stage.id} value={stage.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span>{stage.label}</span>
                    {stage.id !== currentStage && <ChevronRight className="h-3 w-3" />}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}
