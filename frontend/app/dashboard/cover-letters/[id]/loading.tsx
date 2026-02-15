import { Skeleton } from '@/components/ui/skeleton';
import { CoverLetterCardSkeleton } from '@/components/skeletons/card-skeleton';

export default function CoverLetterDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      <Skeleton className="h-9 w-32 mb-6" />

      {/* Cover letter card */}
      <CoverLetterCardSkeleton />

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
