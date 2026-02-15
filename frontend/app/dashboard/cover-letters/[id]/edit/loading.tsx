import { Skeleton } from '@/components/ui/skeleton';
import { FormSkeleton } from '@/components/ui/skeleton-templates';

export default function CoverLetterEditLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Back button */}
      <Skeleton className="h-9 w-32 mb-6" />

      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-64" />
      </div>

      {/* Form */}
      <FormSkeleton rows={5} />
    </div>
  );
}
