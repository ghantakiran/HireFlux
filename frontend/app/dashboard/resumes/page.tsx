'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { Badge } from '@/components/ui/badge';
import { useResumeStore, ParseStatus } from '@/lib/stores/resume-store';
import {
  FileText,
  Upload,
  Trash2,
  Star,
  Download,
} from 'lucide-react';
import { ParseStatusBadge } from '@/components/ui/status-badges';
import { SearchInput } from '@/components/ui/search-input';
import { FilterBar } from '@/components/ui/filter-bar';
import { useSearch } from '@/hooks/useSearch';
import { ResumeCardSkeleton } from '@/components/skeletons/card-skeleton';
import { ErrorBanner } from '@/components/ui/error-banner';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { usePagination } from '@/hooks/usePagination';
import { useColumnSort } from '@/hooks/useColumnSort';
import { useURLState } from '@/hooks/useURLState';
import { formatDate } from '@/lib/utils';
import { toast } from 'sonner';

const RESUMES_URL_CONFIG = {
  status: { defaultValue: 'all' },
  search: { defaultValue: '' },
  sort: { defaultValue: 'created_at' },
  sort_dir: { defaultValue: 'desc' },
  page: { defaultValue: '1' },
};

export default function ResumesPage() {
  // Note: Page title set via metadata in layout.tsx for WCAG 2.1 AA compliance (Issue #148)
  // Client-side fallback to ensure title is always set (resolves SSR/hydration timing issues)
  useEffect(() => {
    document.title = 'My Resumes | HireFlux';
  }, []);

  const router = useRouter();
  const urlState = useURLState(RESUMES_URL_CONFIG);
  const {
    resumes,
    defaultResumeId,
    isLoading,
    error,
    fetchResumes,
    deleteResume,
    setDefaultResume,
    downloadResume,
    clearError,
  } = useResumeStore();

  const { query: searchQuery, debouncedQuery, setQuery: setSearchQuery, clearSearch } = useSearch({
    initialQuery: urlState.params.search,
    onSearch: (q) => { urlState.setParams({ search: q, page: '1' }); },
  });
  const statusFilter = urlState.params.status || 'all';
  const setStatusFilter = (s: string) => { urlState.setParams({ status: s, page: '1' }); };

  const filteredResumes = useMemo(() => {
    return resumes.filter((r) => {
      const matchesSearch = !debouncedQuery || r.file_name.toLowerCase().includes(debouncedQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || r.parse_status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [resumes, debouncedQuery, statusFilter]);

  // Sorting
  const { sortedItems: sortedResumes, setSort } = useColumnSort({
    items: filteredResumes,
    defaultSort: {
      column: urlState.params.sort || 'created_at',
      direction: (urlState.params.sort_dir || 'desc') as 'asc' | 'desc',
    },
  });

  const sortDropdownValue = `${urlState.params.sort}_${urlState.params.sort_dir}`;

  const handleSortChange = (value: string) => {
    const lastUnderscore = value.lastIndexOf('_');
    const col = value.substring(0, lastUnderscore);
    const dir = value.substring(lastUnderscore + 1) as 'asc' | 'desc';
    setSort(col, dir);
    urlState.setParams({ sort: col, sort_dir: dir, page: '1' });
  };

  useEffect(() => {
    const col = urlState.params.sort || 'created_at';
    const dir = urlState.params.sort_dir || 'desc';
    setSort(col, dir as 'asc' | 'desc');
  }, [urlState.params.sort, urlState.params.sort_dir]);

  const {
    currentPage,
    setCurrentPage,
    totalPages,
    paginatedItems: paginatedResumes,
    pageInfo,
  } = usePagination({ items: sortedResumes, itemsPerPage: 12 });

  const deleteDialog = useConfirmDialog({
    onConfirm: async (id) => { await deleteResume(id); },
    successMessage: 'Resume deleted successfully',
    errorMessage: 'Failed to delete resume. Please try again.',
  });

  useEffect(() => {
    fetchResumes();
  }, [fetchResumes]);

  const handleUploadClick = () => {
    router.push('/dashboard/resumes/upload');
  };

  const handleResumeClick = (id: string) => {
    router.push(`/dashboard/resumes/${id}`);
  };

  const handleDeleteClick = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    deleteDialog.open(id);
  };

  const handleSetDefault = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await setDefaultResume(id);
      toast.success('Default resume updated');
    } catch (err) {
      toast.error('Failed to set default resume. Please try again.');
    }
  };

  const handleDownload = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadResume(id);
      toast.success('Resume downloaded');
    } catch (err) {
      toast.error('Failed to download resume. Please try again.');
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  if (isLoading && resumes.length === 0) {
    return (
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">My Resumes</h1>
            <p className="mt-2 text-muted-foreground">
              Upload and manage your resumes for job applications
            </p>
          </div>
          <Button size="lg" onClick={handleUploadClick}>
            <Upload className="mr-2 h-4 w-4" />
            Upload Resume
          </Button>
        </div>

        {/* Skeleton Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <ResumeCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Error Banner */}
      <ErrorBanner error={error} onDismiss={clearError} />

      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Resumes</h1>
          <p className="mt-2 text-muted-foreground">
            Upload and manage your resumes for job applications
          </p>
        </div>
        <Button size="lg" onClick={handleUploadClick}>
          <Upload className="mr-2 h-4 w-4" />
          Upload Resume
        </Button>
      </div>

      {/* Search & Filter */}
      {resumes.length > 0 && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  placeholder="Search by filename..."
                />
              </div>
              <FilterBar
                filters={[
                  {
                    type: 'select',
                    key: 'status',
                    label: 'Parse Status',
                    options: [
                      { value: 'all', label: 'All' },
                      { value: 'completed', label: 'Parsed' },
                      { value: 'processing', label: 'Processing' },
                      { value: 'pending', label: 'Pending' },
                      { value: 'failed', label: 'Failed' },
                    ],
                  },
                  {
                    type: 'select',
                    key: 'sort',
                    label: 'Sort by',
                    options: [
                      { value: 'created_at_desc', label: 'Newest First' },
                      { value: 'created_at_asc', label: 'Oldest First' },
                      { value: 'file_name_asc', label: 'Name (A-Z)' },
                      { value: 'file_name_desc', label: 'Name (Z-A)' },
                    ],
                  },
                ]}
                values={{ status: statusFilter, sort: sortDropdownValue }}
                onChange={(key, val) => {
                  if (key === 'status') setStatusFilter(val);
                  if (key === 'sort') handleSortChange(val);
                }}
                onClear={() => { clearSearch(); urlState.clearParams(); }}
                activeCount={(statusFilter !== 'all' ? 1 : 0) + (debouncedQuery ? 1 : 0) + (sortDropdownValue !== 'created_at_desc' ? 1 : 0)}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {resumes.length === 0 && !isLoading ? (
        <EmptyState
          icon={FileText}
          title="No resumes yet"
          description="Create your first ATS-optimized resume in minutes. Our AI helps you highlight your achievements and match job requirements."
          action={{
            label: 'Create Resume',
            onClick: () => router.push('/dashboard/resumes/builder'),
          }}
        />
      ) : (
        <>
        {/* Resume Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {paginatedResumes.map((resume) => (
            <Card
              key={resume.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
              variant="interactive"
              data-testid="resume-card"
              onClick={() => handleResumeClick(resume.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg line-clamp-1">
                      {resume.file_name}
                    </CardTitle>
                    <CardDescription className="mt-1">
                      {formatFileSize(resume.file_size)} • {formatDate(resume.created_at)}
                    </CardDescription>
                  </div>
                  {resume.is_default && (
                    <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {/* Status Badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Status</span>
                    <ParseStatusBadge status={resume.parse_status} />
                  </div>

                  {/* File Type */}
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-medium">
                      {resume.file_type.includes('pdf') ? 'PDF' : 'DOCX'}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2 border-t">
                    {!resume.is_default && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleSetDefault(resume.id, e)}
                        className="flex-1"
                        disabled={isLoading}
                      >
                        <Star className="mr-1 h-3 w-3" />
                        Set Default
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleDownload(resume.id, e)}
                      className="flex-1"
                      disabled={isLoading}
                    >
                      <Download className="mr-1 h-3 w-3" />
                      Download
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => handleDeleteClick(resume.id, e)}
                    >
                      <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={pageInfo.totalItems}
              itemsPerPage={12}
            />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={() => deleteDialog.close()}
        title="Delete Resume"
        description="Are you sure you want to delete this resume? This action cannot be undone."
        isConfirming={deleteDialog.isConfirming}
        onConfirm={deleteDialog.confirm}
      />
    </div>
  );
}
