import { Skeleton } from '@/components/ui/skeleton';
import { FormSkeleton } from '@/components/ui/skeleton-templates';

export default function NewCoverLetterLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-56" />
      <FormSkeleton rows={5} />
    </div>
  );
}
