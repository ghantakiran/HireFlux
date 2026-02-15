import { FormSkeleton, CardSkeleton } from '@/components/ui/skeleton-templates';
import { Skeleton } from '@/components/ui/skeleton';

export default function ResumeUploadLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Upload area */}
      <CardSkeleton />

      {/* Form */}
      <FormSkeleton rows={2} />
    </div>
  );
}
