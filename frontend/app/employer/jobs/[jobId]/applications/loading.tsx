import { Skeleton } from '@/components/ui/skeleton';
import { ApplicationCardSkeleton } from '@/components/skeletons/card-skeleton';

export default function JobApplicationsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-md" />
        ))}
      </div>
      <div className="space-y-4">
        <ApplicationCardSkeleton />
        <ApplicationCardSkeleton />
        <ApplicationCardSkeleton />
      </div>
    </div>
  );
}
