import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton, ListSkeleton } from '@/components/ui/skeleton-templates';
import { StatsRowSkeleton } from '@/components/skeletons/stats-skeleton';

export default function EmployerDashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Stats */}
      <StatsRowSkeleton count={4} />

      {/* Chart */}
      <CardSkeleton />

      {/* Recent Activity */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <ListSkeleton rows={5} showAvatar={false} />
      </div>
    </div>
  );
}
