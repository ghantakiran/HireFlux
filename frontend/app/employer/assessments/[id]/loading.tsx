import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton, ListSkeleton } from '@/components/ui/skeleton-templates';

export default function AssessmentDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      <Skeleton className="h-10 w-24" />

      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Assessment details */}
      <CardSkeleton />

      {/* Questions list */}
      <div className="space-y-4">
        <Skeleton className="h-6 w-48" />
        <ListSkeleton rows={4} showAvatar={false} />
      </div>
    </div>
  );
}
