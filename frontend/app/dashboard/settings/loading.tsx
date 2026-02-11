import { Skeleton } from '@/components/ui/skeleton';
import { CardSkeleton } from '@/components/ui/skeleton-templates';

export default function SettingsLoading() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <Skeleton className="h-8 w-36" />
      <div className="grid gap-6 md:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full rounded-md" />
          ))}
        </div>
        <div className="space-y-6">
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    </div>
  );
}
