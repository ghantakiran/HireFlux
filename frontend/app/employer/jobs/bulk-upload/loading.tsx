import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton, FormSkeleton } from '@/components/ui/skeleton-templates';

export default function BulkUploadLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Upload area */}
      <CardSkeleton />

      {/* Form */}
      <FormSkeleton rows={3} />
    </div>
  );
}
