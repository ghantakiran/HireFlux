import { Skeleton } from '@/components/ui/skeleton';
import { FormSkeleton } from '@/components/ui/skeleton-templates';

export default function EmployerProfileSettingsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <Skeleton className="h-8 w-56" />

      {/* Tab bar */}
      <Skeleton className="h-10 w-full max-w-md" />

      {/* Form */}
      <FormSkeleton rows={6} />
    </div>
  );
}
