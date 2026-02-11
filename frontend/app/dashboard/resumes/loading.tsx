import { Skeleton } from '@/components/ui/skeleton';
import { ResumeCardSkeleton } from '@/components/skeletons/card-skeleton';

export default function ResumesLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ResumeCardSkeleton />
        <ResumeCardSkeleton />
        <ResumeCardSkeleton />
      </div>
    </div>
  );
}
