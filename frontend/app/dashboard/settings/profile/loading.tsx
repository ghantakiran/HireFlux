import { Skeleton } from '@/components/ui/skeleton';
import { FormSkeleton } from '@/components/ui/skeleton-templates';

export default function ProfileSettingsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      <FormSkeleton rows={6} />
    </div>
  );
}
