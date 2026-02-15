import { Skeleton } from '@/components/ui/skeleton';
import { FormSkeleton } from '@/components/ui/skeleton-templates';
import { StatsRowSkeleton } from '@/components/skeletons/stats-skeleton';

export default function AutoApplyLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-64" />
      <StatsRowSkeleton count={4} />
      <FormSkeleton rows={4} />
    </div>
  );
}
