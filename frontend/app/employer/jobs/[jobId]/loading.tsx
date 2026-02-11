import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton, ListSkeleton } from '@/components/ui/skeleton-templates';

export default function JobDetailLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-9 w-24 rounded-md" />
      <Skeleton className="h-8 w-64" />
      <CardSkeleton />
      <ListSkeleton rows={3} showAvatar={false} />
    </div>
  );
}
