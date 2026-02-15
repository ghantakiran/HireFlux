import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton, FormSkeleton } from '@/components/ui/skeleton-templates';

export default function CandidateProfileSettingsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <Skeleton className="h-8 w-56" />

      {/* 2× CardSkeleton */}
      <CardSkeleton />
      <CardSkeleton />

      {/* Form */}
      <FormSkeleton rows={4} />
    </div>
  );
}
