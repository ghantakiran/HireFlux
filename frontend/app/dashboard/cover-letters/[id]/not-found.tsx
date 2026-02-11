import { NotFoundError } from '@/components/error/not-found-error';

export default function CoverLetterNotFound() {
  return (
    <NotFoundError
      resourceType="cover-letter"
      suggestions={[
        { label: 'Create Cover Letter', href: '/dashboard/cover-letters/new' },
        { label: 'View All Cover Letters', href: '/dashboard/cover-letters' },
      ]}
    />
  );
}
