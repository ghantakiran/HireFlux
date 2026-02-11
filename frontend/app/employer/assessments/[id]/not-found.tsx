import { NotFoundError } from '@/components/error/not-found-error';

export default function AssessmentNotFound() {
  return (
    <NotFoundError
      resourceType="page"
      suggestions={[
        { label: 'View Assessments', href: '/employer/assessments' },
        { label: 'Go to Dashboard', href: '/employer/dashboard' },
      ]}
    />
  );
}
