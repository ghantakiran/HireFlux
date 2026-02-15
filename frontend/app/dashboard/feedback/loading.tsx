import { Skeleton } from '@/components/ui/skeleton';
import { ListSkeleton } from '@/components/ui/skeleton-templates';

export default function FeedbackLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-10 w-48" />
      <ListSkeleton rows={5} showAvatar={false} />
    </div>
  );
}
