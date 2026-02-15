import { Skeleton } from '@/components/ui/skeleton';
import { ListSkeleton } from '@/components/ui/skeleton-templates';

export default function InterviewsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Tab bar */}
      <Skeleton className="h-10 w-full max-w-md" />

      {/* Interview table */}
      <ListSkeleton rows={6} showAvatar={false} />
    </div>
  );
}
