import { Skeleton } from '@/components/ui/skeleton';
import { FormSkeleton } from '@/components/ui/skeleton-templates';

export default function EditJobLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-48" />
      <div className="flex gap-2 items-center">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-8 w-8 rounded-full" />
        ))}
      </div>
      <FormSkeleton rows={5} />
    </div>
  );
}
