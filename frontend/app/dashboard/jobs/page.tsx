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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  MapPin,
  Clock,
  DollarSign,
  Filter,
  Bookmark,
  BookmarkCheck,
  Loader2,
  AlertCircle,
  X,
  TrendingUp,
} from 'lucide-react';
import { useJobStore, type JobSearchFilters } from '@/lib/stores/job-store';

export default function JobsPage() {
  const router = useRouter();
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

  const [searchQuery, setSearchQuery] = useState(filters.query || '');
  const [savingJobId, setSavingJobId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch jobs on mount
    fetchJobs();
    // Fetch saved jobs to know which jobs are bookmarked
    fetchSavedJobs();
  }, []);

  const handleSearch = () => {
    setFilters({ query: searchQuery });
    fetchJobs({ query: searchQuery, page: 1 });
  };

  const handleFilterChange = (key: keyof JobSearchFilters, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    fetchJobs({ ...newFilters, page: 1 });
  };

  const handleClearFilters = () => {
    setSearchQuery('');
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

  const formatSalary = (min?: number, max?: number, currency: string = 'USD') => {
    if (!min && !max) return 'Salary not disclosed';
    const formatNumber = (num: number) => {
      if (num >= 1000) return `$${(num / 1000).toFixed(0)}k`;
      return `$${num}`;
    };
    if (min && max) return `${formatNumber(min)} - ${formatNumber(max)}`;
    if (min) return `${formatNumber(min)}+`;
    if (max) return `Up to ${formatNumber(max)}`;
    return 'Salary not disclosed';
  };

  const formatPostedDate = (dateString: string) => {
    const posted = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - posted.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
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
      {error && (
        <div className="mb-6 rounded-md bg-red-50 border border-red-200 p-4" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800">Error</h3>
              <p className="text-sm text-red-700">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearError}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <Card className="mb-6">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Search & Filters
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
          <div className="grid md:grid-cols-5 gap-4">
            {/* Search Input */}
            <div className="md:col-span-2 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by title, company, skills..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
            </div>

            {/* Remote Policy Filter */}
            <Select
              value={filters.remote_policy || 'any'}
              onValueChange={(value) =>
                handleFilterChange('remote_policy', value === 'any' ? undefined : value)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Remote Policy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any</SelectItem>
                <SelectItem value="remote">Remote</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="onsite">On-site</SelectItem>
              </SelectContent>
            </Select>

            {/* Fit Index Filter */}
            <Select
              value={filters.min_fit_index?.toString() || 'any'}
              onValueChange={(value) =>
                handleFilterChange('min_fit_index', value === 'any' ? undefined : parseInt(value))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Min Fit Index" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any Fit</SelectItem>
                <SelectItem value="80">80+ (Excellent)</SelectItem>
                <SelectItem value="60">60+ (Good)</SelectItem>
                <SelectItem value="40">40+ (Fair)</SelectItem>
              </SelectContent>
            </Select>

            {/* Search Button */}
            <Button onClick={handleSearch} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Search
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && jobs.length === 0 && (
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Finding your best matches...</p>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && jobs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">No jobs found</p>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
              {activeFiltersCount > 0
                ? 'Try adjusting your filters to see more results'
                : 'Upload your resume and complete your profile to get personalized job matches'}
            </p>
            {activeFiltersCount > 0 && (
              <Button className="mt-4" variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            )}
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
                onClick={() => handleJobClick(job.id)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <CardTitle className="text-xl">{job.title}</CardTitle>
                      <CardDescription className="text-lg mt-1">
                        {job.company}
                      </CardDescription>
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
                      <span>{formatPostedDate(job.posted_at)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <DollarSign className="h-4 w-4" />
                      <span>{formatSalary(job.salary_min, job.salary_max)}</span>
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
                    <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                      <h4 className="font-semibold text-sm text-blue-900 mb-1">
                        Why this matches:
                      </h4>
                      <p className="text-sm text-blue-700 line-clamp-2">
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
    </div>
  );
}
