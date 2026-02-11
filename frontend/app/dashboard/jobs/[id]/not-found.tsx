import { NotFoundError } from '@/components/error/not-found-error';

export default function JobNotFound() {
  return (
    <NotFoundError
      resourceType="job"
      suggestions={[
        { label: 'Browse Jobs', href: '/dashboard/jobs' },
        { label: 'Go to Dashboard', href: '/dashboard' },
      ]}
    />
  );
}
