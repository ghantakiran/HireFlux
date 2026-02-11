import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton } from '@/components/ui/skeleton-templates';
import { StatsRowSkeleton } from '@/components/skeletons/stats-skeleton';

export default function EmployerAnalyticsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-10 w-56 rounded-md" />
      <StatsRowSkeleton count={4} />
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
