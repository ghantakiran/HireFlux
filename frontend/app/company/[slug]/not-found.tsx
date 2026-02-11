import { NotFoundError } from '@/components/error/not-found-error';

export default function CompanyNotFound() {
  return (
    <NotFoundError
      resourceType="page"
      suggestions={[
        { label: 'Browse Jobs', href: '/dashboard/jobs' },
        { label: 'Go Home', href: '/' },
      ]}
    />
  );
}
