import { Skeleton } from '@/components/ui/skeleton';
import { FormSkeleton } from '@/components/ui/skeleton-templates';

export default function NewJobLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Step indicator */}
      <Skeleton className="h-2 w-full max-w-md" />

      {/* Form */}
      <FormSkeleton rows={5} />
    </div>
  );
}
