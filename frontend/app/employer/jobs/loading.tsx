import { Skeleton } from '@/components/ui/skeleton';
import { StatsRowSkeleton } from '@/components/skeletons/stats-skeleton';
import { JobCardSkeleton } from '@/components/skeletons/card-skeleton';

export default function EmployerJobsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-36" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-md" />
        ))}
      </div>
      <StatsRowSkeleton count={3} />
      <div className="space-y-4">
        <JobCardSkeleton />
        <JobCardSkeleton />
        <JobCardSkeleton />
      </div>
    </div>
  );
}
