import { Skeleton } from '@/components/ui/skeleton';
import { ResumeCardSkeleton } from '@/components/skeletons/card-skeleton';

export default function ResumeDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      <Skeleton className="h-9 w-32 mb-6" />

      {/* Resume card */}
      <ResumeCardSkeleton />

      {/* Tab bar */}
      <Skeleton className="h-10 w-full max-w-md" />

      {/* Content */}
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}
