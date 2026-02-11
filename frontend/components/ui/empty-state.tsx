/**
 * Empty State Component
 * Displays friendly empty states with images and actions
 */

'use client';

import { LucideIcon } from 'lucide-react';
import { OptimizedImage } from './optimized-image';
import { Button } from './button';

interface EmptyStateProps {
  icon?: LucideIcon;
  image?: string;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export function EmptyState({
  icon: Icon,
  image,
  title,
  description,
  action,
  secondaryAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon or Image */}
      {image ? (
        <OptimizedImage
          src={image}
          alt={title}
          width={200}
          height={200}
          priority
          className="mb-6"
        />
      ) : Icon ? (
        <Icon className="h-24 w-24 text-gray-300 mb-6" />
      ) : null}

      {/* Title */}
      <h3 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h3>

      {/* Description */}
      <p className="text-gray-600 dark:text-gray-400 max-w-md mb-8">{description}</p>

      {/* Actions */}
      {(action || secondaryAction) && (
        <div className="flex gap-3">
          {action && (
            <Button onClick={action.onClick} size="lg">
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button onClick={secondaryAction.onClick} variant="outline" size="lg">
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * No Jobs Empty State
 */
export function NoJobsEmptyState({ onSearch }: { onSearch?: () => void }) {
  return (
    <EmptyState
      image="/images/placeholders/no-image.svg"
      title="No jobs found"
      description="We couldn't find any jobs matching your criteria. Try adjusting your filters or search terms."
      action={
        onSearch
          ? {
              label: 'Clear Filters',
              onClick: onSearch,
            }
          : undefined
      }
    />
  );
}

/**
 * No Applications Empty State
 */
export function NoApplicationsEmptyState({ onCreate }: { onCreate?: () => void }) {
  return (
    <EmptyState
      image="/images/placeholders/no-image.svg"
      title="No applications yet"
      description="Start your job search journey by applying to roles that match your skills and experience."
      action={
        onCreate
          ? {
              label: 'Browse Jobs',
              onClick: onCreate,
            }
          : undefined
      }
    />
  );
}

/**
 * No Activity Empty State
 */
export function NoActivityEmptyState() {
  return (
    <EmptyState
      image="/images/placeholders/no-image.svg"
      title="No recent activity"
      description="Your activity timeline will appear here once you start interacting with jobs and applications."
    />
  );
}

/**
 * Generic Empty State with custom image
 */
export function GenericEmptyState({
  title,
  description,
  imageSrc = '/images/placeholders/no-image.svg',
  action,
}: {
  title: string;
  description: string;
  imageSrc?: string;
  action?: { label: string; onClick: () => void };
}) {
  return <EmptyState image={imageSrc} title={title} description={description} action={action} />;
}
