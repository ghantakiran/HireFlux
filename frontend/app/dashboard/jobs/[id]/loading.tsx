import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton } from '@/components/skeletons/card-skeleton';

export default function JobDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      <CardSkeleton lines={4} showFooter />
    </div>
  );
}
