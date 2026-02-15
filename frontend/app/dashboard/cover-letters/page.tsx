'use client';

import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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
  Filter,
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
import { Mail } from 'lucide-react';

export default function CoverLettersPage() {
  // Note: Page title set via metadata in layout.tsx for WCAG 2.1 AA compliance (Issue #148)
  // Client-side fallback to ensure title is always set (resolves SSR/hydration timing issues)
  useEffect(() => {
    document.title = 'Cover Letters | HireFlux';
  }, []);

  const router = useRouter();
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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedCoverLetter, setSelectedCoverLetter] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
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

  const handleDelete = async () => {
    if (!selectedCoverLetter) return;

    try {
      setDeletingId(selectedCoverLetter);
      await deleteCoverLetter(selectedCoverLetter);
      setDeleteDialogOpen(false);
      setSelectedCoverLetter(null);
      await fetchStats(); // Refresh stats
    } catch (err) {
      // Error handled by store
    } finally {
      setDeletingId(null);
    }
  };

  const openDeleteDialog = (id: string) => {
    setSelectedCoverLetter(id);
    setDeleteDialogOpen(true);
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
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filters
              {activeFiltersCount > 0 && (
                <Badge variant="secondary">{activeFiltersCount} active</Badge>
              )}
            </CardTitle>
            {activeFiltersCount > 0 && (
              <Button variant="ghost" size="sm" onClick={handleClearFilters}>
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 items-center">
            {/* Tone Filter */}
            <Select
              value={filters.tone || 'all'}
              onValueChange={(value) => handleFilterChange('tone', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by tone" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tones</SelectItem>
                <SelectItem value="formal">Formal</SelectItem>
                <SelectItem value="concise">Concise</SelectItem>
                <SelectItem value="conversational">Conversational</SelectItem>
              </SelectContent>
            </Select>
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
          {coverLetters.map((coverLetter) => (
            <Card
              key={coverLetter.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
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
                      openDeleteDialog(coverLetter.id);
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

      {/* Pagination */}
      {pagination.total_pages > 1 && (
        <div className="mt-8 flex justify-center">
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={pagination.page === 1 || isLoading}
              onClick={() => handlePageChange(pagination.page - 1)}
            >
              Previous
            </Button>

            {/* Page Numbers */}
            {Array.from({ length: Math.min(5, pagination.total_pages) }, (_, i) => {
              let pageNum;
              if (pagination.total_pages <= 5) {
                pageNum = i + 1;
              } else if (pagination.page <= 3) {
                pageNum = i + 1;
              } else if (pagination.page >= pagination.total_pages - 2) {
                pageNum = pagination.total_pages - 4 + i;
              } else {
                pageNum = pagination.page - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={pagination.page === pageNum ? 'default' : 'outline'}
                  onClick={() => handlePageChange(pageNum)}
                  disabled={isLoading}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              disabled={pagination.page === pagination.total_pages || isLoading}
              onClick={() => handlePageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Cover Letter</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this cover letter? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deletingId !== null}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deletingId !== null}
            >
              {deletingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
