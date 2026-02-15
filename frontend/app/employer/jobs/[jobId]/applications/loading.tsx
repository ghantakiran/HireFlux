import { Skeleton } from '@/components/ui/skeleton';
import { ApplicationCardSkeleton } from '@/components/skeletons/card-skeleton';

export default function JobApplicationsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-full max-w-md" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Application Cards */}
      <div className="space-y-4">
        <ApplicationCardSkeleton />
        <ApplicationCardSkeleton />
        <ApplicationCardSkeleton />
      </div>
    </div>
  );
}
