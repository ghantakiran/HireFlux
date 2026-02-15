import { Skeleton } from '@/components/ui/skeleton';
import { ListSkeleton } from '@/components/ui/skeleton-templates';

export default function CandidateSearchLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Search bar */}
      <Skeleton className="h-10 w-full max-w-md" />

      {/* Candidate list */}
      <ListSkeleton rows={6} showAvatar={true} />
    </div>
  );
}
