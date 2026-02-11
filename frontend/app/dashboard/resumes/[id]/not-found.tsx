import { NotFoundError } from '@/components/error/not-found-error';

export default function ResumeNotFound() {
  return (
    <NotFoundError
      resourceType="resume"
      suggestions={[
        { label: 'Create New Resume', href: '/dashboard/resumes/builder' },
        { label: 'View My Resumes', href: '/dashboard/resumes' },
      ]}
    />
  );
}
