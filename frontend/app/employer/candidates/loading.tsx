import { Skeleton } from '@/components/ui/skeleton';
import { ListSkeleton } from '@/components/ui/skeleton-templates';

export default function CandidatesLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-44" />
      <Skeleton className="h-10 w-full max-w-md rounded-md" />
      <ListSkeleton rows={6} showAvatar={true} />
    </div>
  );
}
