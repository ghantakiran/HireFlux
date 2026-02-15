import { Skeleton } from '@/components/ui/skeleton';
import { ListSkeleton } from '@/components/ui/skeleton-templates';
import { StatsRowSkeleton } from '@/components/skeletons/stats-skeleton';

export default function NotificationsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-64" />
      <StatsRowSkeleton count={3} />
      <Skeleton className="h-10 w-full max-w-md" />
      <ListSkeleton rows={6} showAvatar={false} />
    </div>
  );
}
