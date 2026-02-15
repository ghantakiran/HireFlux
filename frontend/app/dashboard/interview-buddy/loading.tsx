import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton, ListSkeleton } from '@/components/ui/skeleton-templates';

export default function InterviewBuddyLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-64" />
      <CardSkeleton />
      <ListSkeleton rows={4} />
    </div>
  );
}
