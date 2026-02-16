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
  MapPin,
  Clock,
  DollarSign,
  Bookmark,
  BookmarkCheck,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { SearchInput } from '@/components/ui/search-input';
import { FilterBar } from '@/components/ui/filter-bar';
import { useSearch } from '@/hooks/useSearch';
import { useJobStore, type JobSearchFilters } from '@/lib/stores/job-store';
import { CompanyLogo } from '@/components/ui/optimized-image';
import { ErrorBanner } from '@/components/ui/error-banner';
import { NoJobsEmptyState } from '@/components/ui/empty-state';
import { Pagination } from '@/components/ui/pagination';
import { useURLState } from '@/hooks/useURLState';
import { PageLoader } from '@/components/ui/page-loader';
import { formatSalaryCompact, formatRelativeTime } from '@/lib/utils';

const JOBS_URL_CONFIG = {
  remote_policy: { defaultValue: 'any' },
  min_fit_index: { defaultValue: 'any' },
  search: { defaultValue: '' },
  sort: { defaultValue: 'fit_index' },
  sort_dir: { defaultValue: 'desc' },
  page: { defaultValue: '1' },
};

export default function JobsPage() {
  const router = useRouter();
  const urlState = useURLState(JOBS_URL_CONFIG);
  const {
    jobs,
    isLoading,
    error,
    filters,
    pagination,
    fetchJobs,
    saveJob,
    unsaveJob,
    isSaved,
    setFilters,
    clearFilters,
    clearError,
    fetchSavedJobs,
  } = useJobStore();

  const { query: searchQuery, debouncedQuery, setQuery: setSearchQuery, clearSearch, isDebouncing } = useSearch({
    initialQuery: urlState.params.search || filters.query || '',
    debounceMs: 300,
    onSearch: (q) => {
      setFilters({ query: q });
      fetchJobs({ query: q, page: 1 });
      urlState.setParams({ search: q, page: '1' });
    },
  });
  const [savingJobId, setSavingJobId] = useState<string | null>(null);

  // Sort dropdown
  const sortDropdownValue = `${urlState.params.sort}_${urlState.params.sort_dir}`;

  const handleSortChange = (value: string) => {
    const lastUnderscore = value.lastIndexOf('_');
    const col = value.substring(0, lastUnderscore);
    const dir = value.substring(lastUnderscore + 1);
    urlState.setParams({ sort: col, sort_dir: dir, page: '1' });
  };

  useEffect(() => {
    // Set document title for WCAG 2.1 AA compliance (Issue #148)
    document.title = 'Job Search | HireFlux';

    // Fetch jobs on mount
    fetchJobs();
    // Fetch saved jobs to know which jobs are bookmarked
    fetchSavedJobs();
  }, []);

  const handleFilterChange = (key: keyof JobSearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchJobs({ ...newFilters, page: 1 });
  };

  const handleClearFilters = () => {
    clearSearch();
    clearFilters();
    fetchJobs({ page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    fetchJobs({ page: newPage });
  };

  const handleSaveJob = async (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setSavingJobId(jobId);
      if (isSaved(jobId)) {
        await unsaveJob(jobId);
      } else {
        await saveJob(jobId);
      }
    } catch (err) {
      // Error handled by store
    } finally {
      setSavingJobId(null);
    }
  };

  const handleJobClick = (jobId: string) => {
    router.push(`/dashboard/jobs/${jobId}`);
  };

  const getFitIndexColor = (fitIndex: number) => {
    if (fitIndex >= 80) return 'bg-green-500';
    if (fitIndex >= 60) return 'bg-blue-500';
    if (fitIndex >= 40) return 'bg-yellow-500';
    return 'bg-gray-500';
  };

  const getFitIndexLabel = (fitIndex: number) => {
    if (fitIndex >= 80) return 'Excellent Match';
    if (fitIndex >= 60) return 'Good Match';
    if (fitIndex >= 40) return 'Fair Match';
    return 'Low Match';
  };

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Job Matches</h1>
        <p className="text-muted-foreground">
          AI-powered job recommendations tailored to your profile
        </p>
        {pagination.total > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} jobs
          </p>
        )}
      </div>

      {/* Error Banner */}
      <ErrorBanner error={error} onDismiss={clearError} />

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <SearchInput
                  value={searchQuery}
                  onChange={setSearchQuery}
                  isSearching={isDebouncing || isLoading}
                  placeholder="Search by title, company, skills..."
                />
              </div>
              <FilterBar
                filters={[
                  {
                    type: 'select',
                    key: 'remote_policy',
                    label: 'Remote Policy',
                    options: [
                      { value: 'any', label: 'Any' },
                      { value: 'remote', label: 'Remote' },
                      { value: 'hybrid', label: 'Hybrid' },
                      { value: 'onsite', label: 'On-site' },
                    ],
                  },
                  {
                    type: 'select',
                    key: 'min_fit_index',
                    label: 'Min Fit Index',
                    options: [
                      { value: 'any', label: 'Any Fit' },
                      { value: '80', label: '80+ (Excellent)' },
                      { value: '60', label: '60+ (Good)' },
                      { value: '40', label: '40+ (Fair)' },
                    ],
                  },
                  {
                    type: 'select',
                    key: 'sort',
                    label: 'Sort by',
                    options: [
                      { value: 'fit_index_desc', label: 'Best Fit First' },
                      { value: 'posted_at_desc', label: 'Newest First' },
                      { value: 'posted_at_asc', label: 'Oldest First' },
                      { value: 'salary_max_desc', label: 'Highest Salary' },
                    ],
                  },
                ]}
                values={{
                  remote_policy: urlState.params.remote_policy || filters.remote_policy || 'any',
                  min_fit_index: urlState.params.min_fit_index || filters.min_fit_index?.toString() || 'any',
                  sort: sortDropdownValue,
                }}
                onChange={(key, val) => {
                  if (key === 'remote_policy') {
                    handleFilterChange('remote_policy', val === 'any' ? undefined : val);
                    urlState.setParams({ remote_policy: val, page: '1' });
                  }
                  if (key === 'min_fit_index') {
                    handleFilterChange('min_fit_index', val === 'any' ? undefined : parseInt(val));
                    urlState.setParams({ min_fit_index: val, page: '1' });
                  }
                  if (key === 'sort') handleSortChange(val);
                }}
                onClear={() => {
                  handleClearFilters();
                  urlState.clearParams();
                }}
                activeCount={activeFiltersCount}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && jobs.length === 0 && (
        <PageLoader message="Finding your best matches..." />
      )}

      {/* Empty State */}
      {!isLoading && jobs.length === 0 && (
        <Card className="border-dashed">
          <CardContent>
            <NoJobsEmptyState onSearch={activeFiltersCount > 0 ? handleClearFilters : undefined} />
          </CardContent>
        </Card>
      )}

      {/* Job Cards */}
      {jobs.length > 0 && (
        <div className="space-y-4">
          {jobs.map((job) => {
            const fitIndex = job.match_score?.fit_index || 0;
            const saved = isSaved(job.id);

            return (
              <Card
                key={job.id}
                className="hover:shadow-md transition-shadow cursor-pointer"
                variant="interactive"
                onClick={() => handleJobClick(job.id)}
                data-testid="job-card"
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start gap-3 flex-1">
                      {/* Company Logo */}
                      <CompanyLogo
                        src={`/images/placeholders/company-logo.svg`}
                        alt={`${job.company} logo`}
                        size={48}
                        className="company-logo"
                        data-testid="company-logo"
                      />
                      <div className="flex-1">
                        <CardTitle className="text-xl">{job.title}</CardTitle>
                        <CardDescription className="text-lg mt-1">
                          {job.company}
                        </CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {fitIndex > 0 && (
                        <Badge className={getFitIndexColor(fitIndex)}>
                          <TrendingUp className="mr-1 h-3 w-3" />
                          Fit: {fitIndex}
                        </Badge>
                      )}
                      <Button
                        variant={saved ? 'default' : 'outline'}
                        size="sm"
                        onClick={(e) => handleSaveJob(job.id, e)}
                        disabled={savingJobId === job.id}
                      >
                        {savingJobId === job.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : saved ? (
                          <BookmarkCheck className="h-4 w-4" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Job Meta */}
                  <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Clock className="h-4 w-4" />
                      <span>{formatRelativeTime(job.posted_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatSalaryCompact(job.salary_min, job.salary_max)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{job.remote_policy}</Badge>
                      <Badge variant="outline">{job.employment_type}</Badge>
                    </div>
                  </div>

                  {/* Description Preview */}
                  <p className="text-muted-foreground mb-4 line-clamp-2">
                    {job.description}
                  </p>

                  {/* Match Rationale */}
                  {job.match_score?.match_rationale && (
                    <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-300 mb-1">
                        Why this matches:
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 line-clamp-2">
                        {job.match_score.match_rationale}
                      </p>
                    </div>
                  )}

                  {/* Skills */}
                  {job.match_score?.matched_skills &&
                    job.match_score.matched_skills.length > 0 && (
                      <div className="flex gap-2 mb-4 flex-wrap">
                        {job.match_score.matched_skills.slice(0, 5).map((skill, index) => (
                          <Badge key={index} variant="secondary">
                            {skill}
                          </Badge>
                        ))}
                        {job.match_score.matched_skills.length > 5 && (
                          <Badge variant="outline">
                            +{job.match_score.matched_skills.length - 5} more
                          </Badge>
                        )}
                      </div>
                    )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t">
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJobClick(job.id);
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/applications/new?job=${job.id}`);
                      }}
                    >
                      Apply Now
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
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
    </div>
  );
}
