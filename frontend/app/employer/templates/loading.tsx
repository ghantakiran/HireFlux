import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton } from '@/components/ui/skeleton-templates';

export default function TemplatesLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-4 md:grid-cols-2">
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
        <CardSkeleton />
      </div>
    </div>
  );
}
