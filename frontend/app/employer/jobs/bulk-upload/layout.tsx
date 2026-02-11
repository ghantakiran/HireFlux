import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Bulk Upload Jobs',
  description: 'Upload multiple job postings at once via CSV for fast multi-board distribution.',
};

export default function BulkUploadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
