import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton, FormSkeleton } from '@/components/ui/skeleton-templates';

export default function CandidateProfileSettingsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-6 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
      </div>
      <FormSkeleton rows={4} />
    </div>
  );
}
