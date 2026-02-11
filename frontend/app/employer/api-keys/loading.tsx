import { Skeleton } from '@/components/ui/skeleton';
import { ListSkeleton, FormSkeleton } from '@/components/ui/skeleton-templates';

export default function ApiKeysLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-36" />
      <ListSkeleton rows={3} showAvatar={false} />
      <FormSkeleton rows={2} />
    </div>
  );
}
