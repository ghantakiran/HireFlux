import { NotFoundError } from '@/components/error/not-found-error';

export default function JobNotFound() {
  return (
    <NotFoundError
      resourceType="job"
      suggestions={[
        { label: 'Create New Job', href: '/employer/jobs/new' },
        { label: 'View All Jobs', href: '/employer/jobs' },
      ]}
    />
  );
}
