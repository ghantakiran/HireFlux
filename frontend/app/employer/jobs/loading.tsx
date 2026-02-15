import { Skeleton } from '@/components/ui/skeleton';
import { StatsRowSkeleton } from '@/components/skeletons/stats-skeleton';
import { JobCardSkeleton } from '@/components/skeletons/card-skeleton';

export default function EmployerJobsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Filter bar */}
      <Skeleton className="h-10 w-full max-w-md" />

      {/* Stats */}
      <StatsRowSkeleton count={3} />

      {/* Job Cards */}
      <div className="space-y-4">
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </div>
    </div>
  );
}
