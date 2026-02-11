import { Skeleton } from '@/components/ui/skeleton';
import { CoverLetterCardSkeleton } from '@/components/skeletons/card-skeleton';

export default function CoverLetterDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-9 w-24 rounded-md" />
      <CoverLetterCardSkeleton />
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
    </div>
  );
}
