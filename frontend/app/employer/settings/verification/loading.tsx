import { Skeleton } from '@/components/ui/skeleton';
import { FormSkeleton } from '@/components/ui/skeleton-templates';

export default function VerificationSettingsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <Skeleton className="h-8 w-64" />

      {/* Form */}
      <FormSkeleton rows={4} />
    </div>
  );
}
