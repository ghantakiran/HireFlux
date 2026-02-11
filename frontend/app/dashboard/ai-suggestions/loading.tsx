import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton } from '@/components/ui/skeleton-templates';
import { StatsRowSkeleton } from '@/components/skeletons/stats-skeleton';

export default function AISuggestionsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-64" />
      <StatsRowSkeleton count={3} />
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-24 rounded-md" />
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
