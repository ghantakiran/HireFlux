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
import { Badge } from '@/components/ui/badge';
import { SearchInput } from '@/components/ui/search-input';
import { FilterBar } from '@/components/ui/filter-bar';
import { useSearch } from '@/hooks/useSearch';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Plus,
  FileText,
  Building,
  Calendar,
  Edit,
  Trash2,
  Download,
  Loader2,
  AlertCircle,
  X,
  Eye,
  ChevronDown,
} from 'lucide-react';
import { CoverLetterCardSkeleton } from '@/components/skeletons/card-skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  useCoverLetterStore,
  type CoverLetterTone,
} from '@/lib/stores/cover-letter-store';
import { toast } from 'sonner';
import { EmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { Mail } from 'lucide-react';
import { useColumnSort } from '@/hooks/useColumnSort';
import { useURLState } from '@/hooks/useURLState';

const COVER_LETTERS_URL_CONFIG = {
  tone: { defaultValue: 'all' },
  search: { defaultValue: '' },
  sort: { defaultValue: 'created_at' },
  sort_dir: { defaultValue: 'desc' },
};

export default function CoverLettersPage() {
  // Note: Page title set via metadata in layout.tsx for WCAG 2.1 AA compliance (Issue #148)
  // Client-side fallback to ensure title is always set (resolves SSR/hydration timing issues)
  useEffect(() => {
    document.title = 'Cover Letters | HireFlux';
  }, []);

  const router = useRouter();
  const urlState = useURLState(COVER_LETTERS_URL_CONFIG);
  const {
    coverLetters,
    stats,
    isLoading,
    error,
    filters,
    pagination,
    fetchCoverLetters,
    fetchStats,
    deleteCoverLetter,
    downloadCoverLetter,
    setFilters,
    clearFilters,
    clearError,
  } = useCoverLetterStore();

  const { query: searchQuery, debouncedQuery, setQuery: setSearchQuery, clearSearch } = useSearch();

  const deleteDialog = useConfirmDialog({
    onConfirm: async (id) => {
      await deleteCoverLetter(id);
      await fetchStats();
    },
  });
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch cover letters and stats on mount
    fetchCoverLetters();
    fetchStats();
  }, []);

  const handleFilterChange = (key: 'tone', value: string) => {
    if (value === 'all') {
      const newFilters = { ...filters };
      delete newFilters[key];
      setFilters(newFilters);
      fetchCoverLetters({ ...newFilters, page: 1 });
    } else {
      const newFilters = { ...filters, [key]: value as CoverLetterTone };
      setFilters(newFilters);
      fetchCoverLetters({ ...newFilters, page: 1 });
    }
  };

  const handleClearFilters = () => {
    clearFilters();
    fetchCoverLetters({ page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    fetchCoverLetters({ page: newPage });
  };

  const handleDownload = async (id: string, format: 'pdf' | 'docx') => {
    try {
      setDownloadingId(id);
      await downloadCoverLetter(id, format);
      toast.success(`Downloaded as ${format.toUpperCase()}`, {
        description: 'Your cover letter has been downloaded successfully.',
      });
    } catch (err) {
      toast.error('Download failed', {
        description: 'Please try again or contact support.',
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const getToneBadge = (tone: CoverLetterTone) => {
    const configs = {
      formal: { label: 'Formal', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
      concise: { label: 'Concise', className: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
      conversational: { label: 'Conversational', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
    };

    const config = configs[tone];
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  const searchFilteredLetters = useMemo(() => {
    if (!debouncedQuery) return coverLetters;
    const q = debouncedQuery.toLowerCase();
    return coverLetters.filter((cl) =>
      cl.job_title?.toLowerCase().includes(q) ||
      cl.company_name?.toLowerCase().includes(q)
    );
  }, [coverLetters, debouncedQuery]);

  // Sorting
  const { sortedItems: sortedLetters, setSort } = useColumnSort({
    items: searchFilteredLetters,
    defaultSort: {
      column: urlState.params.sort || 'created_at',
      direction: (urlState.params.sort_dir || 'desc') as 'asc' | 'desc',
    },
  });

  const sortDropdownValue = `${urlState.params.sort}_${urlState.params.sort_dir}`;

  const handleSortDropdownChange = (value: string) => {
    const lastUnderscore = value.lastIndexOf('_');
    const col = value.substring(0, lastUnderscore);
    const dir = value.substring(lastUnderscore + 1) as 'asc' | 'desc';
    setSort(col, dir);
    urlState.setParams({ sort: col, sort_dir: dir });
  };

  useEffect(() => {
    const col = urlState.params.sort || 'created_at';
    const dir = urlState.params.sort_dir || 'desc';
    setSort(col, dir as 'asc' | 'desc');
  }, [urlState.params.sort, urlState.params.sort_dir]);

  const activeFiltersCount = Object.keys(filters).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold mb-4">Cover Letters</h1>
          <p className="text-muted-foreground">
            AI-generated cover letters tailored to your target jobs
          </p>
          {pagination.total > 0 && (
            <p className="text-sm text-muted-foreground mt-2">
              Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
              {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
              {pagination.total} cover letters
            </p>
          )}
        </div>
        <Button onClick={() => router.push('/dashboard/cover-letters/new')}>
          <Plus className="h-4 w-4 mr-2" />
          Generate New
        </Button>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800 dark:text-red-300">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearError} aria-label="Dismiss error">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Usage Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                {stats.total_generated}
              </div>
              <div className="text-sm text-muted-foreground">Total Generated</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.used_in_applications}
              </div>
              <div className="text-sm text-muted-foreground">Used in Applications</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                {stats.this_month}
              </div>
              <div className="text-sm text-muted-foreground">This Month</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-sm text-muted-foreground mb-1">Most Used Tone</div>
              <div className="font-semibold">
                {Object.entries(stats.by_tone).sort(([, a], [, b]) => b - a)[0]?.[0] ||
                  'N/A'}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by job title or company..."
              />
            </div>
            <FilterBar
              filters={[
                {
                  type: 'select',
                  key: 'tone',
                  label: 'Tone',
                  options: [
                    { value: 'all', label: 'All Tones' },
                    { value: 'formal', label: 'Formal' },
                    { value: 'concise', label: 'Concise' },
                    { value: 'conversational', label: 'Conversational' },
                  ],
                },
                {
                  type: 'select',
                  key: 'sort',
                  label: 'Sort by',
                  options: [
                    { value: 'created_at_desc', label: 'Newest First' },
                    { value: 'created_at_asc', label: 'Oldest First' },
                    { value: 'job_title_asc', label: 'Job Title (A-Z)' },
                    { value: 'job_title_desc', label: 'Job Title (Z-A)' },
                  ],
                },
              ]}
              values={{ tone: urlState.params.tone || filters.tone || 'all', sort: sortDropdownValue }}
              onChange={(key, val) => {
                if (key === 'tone') {
                  handleFilterChange('tone', val);
                  urlState.setParam('tone', val);
                }
                if (key === 'sort') handleSortDropdownChange(val);
              }}
              onClear={() => { handleClearFilters(); clearSearch(); urlState.clearParams(); }}
              activeCount={activeFiltersCount + (debouncedQuery ? 1 : 0) + (sortDropdownValue !== 'created_at_desc' ? 1 : 0)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && coverLetters.length === 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <CoverLetterCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && coverLetters.length === 0 && (
        activeFiltersCount > 0 ? (
          <EmptyState
            icon={FileText}
            title="No cover letters found"
            description="No cover letters match your filters. Try adjusting your filters."
            action={{
              label: 'Clear Filters',
              onClick: handleClearFilters,
            }}
          />
        ) : (
          <EmptyState
            icon={Mail}
            title="No cover letters yet"
            description="Generate personalized cover letters tailored to each job application. Stand out with compelling narratives."
            action={{
              label: 'Create Cover Letter',
              onClick: () => router.push('/dashboard/cover-letters/new'),
            }}
          />
        )
      )}

      {/* Cover Letters Grid */}
      {coverLetters.length > 0 && (
        <div className="grid md:grid-cols-2 gap-6">
          {sortedLetters.map((coverLetter) => (
            <Card
              key={coverLetter.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              variant="interactive"
              onClick={() => router.push(`/dashboard/cover-letters/${coverLetter.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {coverLetter.job_title || 'Cover Letter'}
                    </CardTitle>
                    {coverLetter.company_name && (
                      <CardDescription className="text-lg flex items-center gap-2 mt-1">
                        <Building className="h-4 w-4" />
                        {coverLetter.company_name}
                      </CardDescription>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {getToneBadge(coverLetter.tone)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Meta Information */}
                <div className="flex items-center gap-4 mb-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>{formatDate(coverLetter.created_at)}</span>
                  </div>
                  <Badge variant="outline">
                    {coverLetter.length === 'short'
                      ? 'Short'
                      : coverLetter.length === 'medium'
                      ? 'Medium'
                      : 'Long'}
                  </Badge>
                </div>

                {/* Content Preview */}
                <p className="text-muted-foreground mb-4 line-clamp-3">
                  {coverLetter.content}
                </p>

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/cover-letters/${coverLetter.id}`);
                    }}
                  >
                    <Eye className="mr-1 h-3 w-3" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/cover-letters/${coverLetter.id}/edit`);
                    }}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Edit
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => e.stopPropagation()}
                        disabled={downloadingId === coverLetter.id}
                      >
                        {downloadingId === coverLetter.id ? (
                          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="mr-1 h-3 w-3" />
                        )}
                        Download
                        <ChevronDown className="ml-1 h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(coverLetter.id, 'pdf');
                        }}
                      >
                        Download as PDF
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(coverLetter.id, 'docx');
                        }}
                      >
                        Download as DOCX
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteDialog.open(coverLetter.id);
                    }}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    Delete
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Pagination
        currentPage={pagination.page}
        totalPages={pagination.total_pages}
        onPageChange={handlePageChange}
        totalItems={pagination.total}
        itemsPerPage={pagination.limit}
        disabled={isLoading}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={() => deleteDialog.close()}
        title="Delete Cover Letter"
        description="Are you sure you want to delete this cover letter? This action cannot be undone."
        isConfirming={deleteDialog.isConfirming}
        onConfirm={deleteDialog.confirm}
      />
    </div>
  );
}
