import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton } from '@/components/skeletons/card-skeleton';

export default function CompanyProfileLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-16 w-16 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <CardSkeleton lines={4} showFooter={false} />
    </div>
  );
}
