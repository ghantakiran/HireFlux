import { Skeleton } from '@/components/ui/skeleton';
import { ApplicationCardSkeleton } from '@/components/skeletons/card-skeleton';

export default function ApplicationDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-9 w-24 rounded-md" />
      <ApplicationCardSkeleton />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-md" />
        ))}
      </div>
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}
