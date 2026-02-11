import { Skeleton } from '@/components/ui/skeleton';
import { CoverLetterCardSkeleton } from '@/components/skeletons/card-skeleton';

export default function CoverLettersLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CoverLetterCardSkeleton />
        <CoverLetterCardSkeleton />
        <CoverLetterCardSkeleton />
      </div>
    </div>
  );
}
