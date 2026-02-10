import { cn } from '@/lib/utils';
import { Skeleton } from './skeleton';

interface FormSkeletonProps {
  rows?: number;
  className?: string;
}

export function FormSkeleton({ rows = 3, className }: FormSkeletonProps) {
  return (
    <div className={cn('space-y-4', className)} data-skeleton="form">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
      <div className="flex justify-end pt-2">
        <Skeleton className="h-10 w-28" />
      </div>
    </div>
  );
}

interface ListSkeletonProps {
  rows?: number;
  showAvatar?: boolean;
  className?: string;
}

export function ListSkeleton({ rows = 5, showAvatar = true, className }: ListSkeletonProps) {
  return (
    <div className={cn('space-y-3', className)} data-skeleton="list">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 p-3">
          {showAvatar && <Skeleton className="h-10 w-10 rounded-full flex-shrink-0" />}
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

interface CardSkeletonProps {
  className?: string;
}

export function CardSkeleton({ className }: CardSkeletonProps) {
  return (
    <div className={cn('rounded-lg border p-6 space-y-4', className)} data-skeleton="card">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-20" />
        </div>
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-4/5" />
      <div className="flex gap-2 pt-2">
        <Skeleton className="h-8 w-20 rounded-md" />
        <Skeleton className="h-8 w-20 rounded-md" />
      </div>
    </div>
  );
}
