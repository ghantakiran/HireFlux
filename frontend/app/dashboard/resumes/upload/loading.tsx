import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton, FormSkeleton } from '@/components/ui/skeleton-templates';

export default function ResumeUploadLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      <CardSkeleton />
      <FormSkeleton rows={2} />
    </div>
  );
}
