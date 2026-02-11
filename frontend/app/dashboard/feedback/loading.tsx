import { Skeleton } from '@/components/ui/skeleton';
import { ListSkeleton } from '@/components/ui/skeleton-templates';

export default function FeedbackLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-md" />
        ))}
      </div>
      <ListSkeleton rows={5} showAvatar={false} />
    </div>
  );
}
