import { NotFoundError } from '@/components/error/not-found-error';

export default function ApplicationNotFound() {
  return (
    <NotFoundError
      resourceType="application"
      suggestions={[
        { label: 'View Applications', href: '/dashboard/applications' },
        { label: 'Browse Jobs', href: '/dashboard/jobs' },
      ]}
    />
  );
}
