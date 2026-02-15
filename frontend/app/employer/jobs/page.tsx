/**
 * Employer Jobs List Page - Issue #79
 *
 * Features:
 * - Job listing with statistics
 * - Filters (status, department), search, and sort
 * - Quick actions (edit, duplicate, close, delete)
 * - Empty states
 * - Loading states
 * - Responsive design
 * - All E2E test data attributes
 *
 * Related: Issue #23 (original), Issue #79 (TDD/BDD enhancement)
 * API Integration: Uses lib/api/jobs.ts
 */

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
  Search,
  Plus,
  Edit,
  Pause,
  Play,
  XCircle,
  Trash2,
  MoreVertical,
  Filter,
  RefreshCw,
  Eye,
  Users,
  TrendingUp,
  Copy,
  X,
  Briefcase,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/domain/EmptyState';
import { Pagination } from '@/components/ui/pagination';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

// Import API client and types
import {
  listJobs,
  deleteJob as apiDeleteJob,
  updateJobStatus as apiUpdateJobStatus,
  type Job,
  type JobStatus,
  formatSalaryRange,
  getStatusBadgeColor,
  getStatusLabel,
} from '@/lib/api/jobs';

type FilterStatus = 'all' | 'draft' | 'active' | 'paused' | 'closed';

export default function EmployerJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'applicants'>('newest');

  // Delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);

  // Duplicate job
  const duplicateJob = (job: Job) => {
    // Navigate to create page with job data pre-filled via query params or localStorage
    localStorage.setItem('job_template', JSON.stringify({
      ...job,
      title: `Copy of ${job.title}`,
    }));
    toast.success('Job duplicated');
    router.push('/employer/jobs/new?duplicate=true');
  };

  // Clear all filters
  const clearFilters = () => {
    setStatusFilter('all');
    setDepartmentFilter('all');
    setSearchQuery('');
    setSortBy('newest');
    setPage(1);
  };

  // Calculate job statistics from all jobs (would ideally come from API)
  const jobStats = {
    total: total,
    active: jobs.filter((j) => j.is_active).length,
    draft: jobs.filter((j) => !j.is_active && !j.posted_date).length,
    closed: jobs.filter((j) => !j.is_active && j.posted_date).length,
  };

  // Departments (would ideally come from API)
  const departments = ['Engineering', 'Sales', 'Marketing', 'Product', 'Operations', 'Other'];

  // Fetch jobs
  const fetchJobs = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('access_token');
      if (!token) {
        router.push('/employer/login');
        return;
      }

      // Build filters
      const filters: any = {
        page,
        limit,
      };

      if (statusFilter && statusFilter !== 'all') {
        filters.status = statusFilter;
      }

      // Call API client
      const data = await listJobs(filters);

      setJobs(data.jobs);
      setTotal(data.total);
      setTotalPages(data.total_pages);
    } catch (err) {
      console.error('Jobs fetch error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load jobs');
      if (err instanceof Error && err.message.includes('authentication')) {
        router.push('/employer/login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Update job status
  const updateStatus = async (jobId: string, newStatus: JobStatus) => {
    try {
      await apiUpdateJobStatus(jobId, newStatus as any);
      // Refresh job list
      fetchJobs();
      toast.success('Job status updated');
    } catch (err) {
      console.error('Status update error:', err);
      toast.error('Failed to update job. Please try again.');
    }
  };

  // Delete job
  const deleteJobHandler = async () => {
    if (!jobToDelete) return;

    try {
      await apiDeleteJob(jobToDelete.id);
      // Refresh job list
      fetchJobs();
      setDeleteDialogOpen(false);
      setJobToDelete(null);
      toast.success('Job deleted');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to update job. Please try again.');
    }
  };

  // Set page metadata
  useEffect(() => {
    document.title = 'Job Postings | HireFlux';
  }, []);

  // Initial load and filter changes
  useEffect(() => {
    fetchJobs();
  }, [page, statusFilter, departmentFilter]);

  // Search with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery !== undefined) {
        setPage(1); // Reset to page 1 on search
        fetchJobs();
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Helper to get job status from Job object
  const getJobStatus = (job: Job): string => {
    // The API returns status in the 'status' field or we can infer from is_active
    // For now, infer from is_active until backend adds status field
    if (!job.is_active) return 'closed';
    return 'active';  // Simplified - backend should return actual status
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(date);
  };

  // Sort jobs based on sortBy state
  const sortedJobs = [...jobs].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case 'oldest':
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case 'applicants':
        return (b.applications_count || 0) - (a.applications_count || 0);
      default:
        return 0;
    }
  });

  // Loading skeleton
  if (isLoading && jobs.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-700">
          <div className="container mx-auto px-4 py-6">
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>
        </div>
        <div className="container mx-auto px-4 py-8">
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="h-6 w-64 mb-3" />
                  <Skeleton className="h-4 w-full mb-2" />
                  <Skeleton className="h-4 w-3/4" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Error Loading Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 dark:text-gray-400 mb-4">{error}</p>
            <Button onClick={fetchJobs} className="gap-2">
              <RefreshCw className="w-4 h-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950" data-jobs-list-page>
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Job Postings</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your job listings and track applications
              </p>
            </div>
            <Button
              onClick={() => router.push('/employer/jobs/new')}
              className="gap-2"
              data-create-job-button
            >
              <Plus className="w-4 h-4" />
              Post New Job
            </Button>
          </div>
        </div>
      </div>

      {/* Job Statistics */}
      <div className="bg-white dark:bg-gray-900 border-b dark:border-gray-700">
        <div className="container mx-auto px-4 py-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6" data-job-statistics>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Total Jobs</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-gray-100" data-total-jobs>
                {jobStats.total}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Active</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400" data-active-jobs>
                {jobStats.active}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Draft</p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400" data-draft-jobs>
                {jobStats.draft}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Closed</p>
              <p className="text-3xl font-bold text-gray-600 dark:text-gray-400" data-closed-jobs>
                {jobStats.closed}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Filters & Search */}
        <div className="bg-white dark:bg-gray-900 rounded-lg border dark:border-gray-700 p-4 mb-6">
          <div className="space-y-4">
            {/* Search and Sort Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Search */}
              <div className="md:col-span-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search by job title..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                    data-search-input
                  />
                </div>
              </div>

              {/* Sort */}
              <div>
                <Select
                  value={sortBy}
                  onValueChange={(value: any) => setSortBy(value)}
                >
                  <SelectTrigger data-sort-select>
                    <SelectValue placeholder="Sort by..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest" data-sort-option="newest">
                      Newest First
                    </SelectItem>
                    <SelectItem value="oldest" data-sort-option="oldest">
                      Oldest First
                    </SelectItem>
                    <SelectItem value="applicants" data-sort-option="applicants">
                      Most Applicants
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Status Filters and Actions Row */}
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-2">
                <Button
                  variant={statusFilter === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter('all');
                    setPage(1);
                  }}
                  data-filter-all
                >
                  All
                </Button>
                <Button
                  variant={statusFilter === 'active' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter('active');
                    setPage(1);
                  }}
                  data-filter-active
                >
                  Active
                </Button>
                <Button
                  variant={statusFilter === 'draft' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter('draft');
                    setPage(1);
                  }}
                  data-filter-draft
                >
                  Draft
                </Button>
                <Button
                  variant={statusFilter === 'closed' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setStatusFilter('closed');
                    setPage(1);
                  }}
                  data-filter-closed
                >
                  Closed
                </Button>
              </div>

              {(statusFilter !== 'all' || searchQuery || sortBy !== 'newest') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearFilters}
                  className="gap-2"
                  data-clear-filters-button
                >
                  <X className="w-4 h-4" />
                  Clear Filters
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Showing <span className="font-medium">{jobs.length}</span> of{' '}
            <span className="font-medium">{total}</span> jobs
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={fetchJobs}
            disabled={isLoading}
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>

        {/* Empty State */}
        {jobs.length === 0 && !isLoading ? (
          <EmptyState
            title="No jobs posted yet"
            description="Create your first job posting with AI-powered description generation."
            icon={<Briefcase className="h-12 w-12 text-muted-foreground" />}
            actionLabel="Post a Job"
            onAction={() => router.push('/employer/jobs/new')}
          />
        ) : (
          <>
            {/* Job List */}
            <div className="space-y-4">
              {sortedJobs.map((job) => (
                <Card key={job.id} className="hover:shadow-md transition-shadow" data-job-card>
                  <CardContent className="p-6">
                    <div className="flex flex-col sm:flex-row items-start justify-between gap-3">
                      <div className="flex-1">
                        {/* Title & Status */}
                        <div className="flex items-center gap-3 mb-2">
                          <h3
                            className="text-xl font-semibold text-gray-900 dark:text-gray-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer"
                            onClick={() => router.push(`/employer/jobs/${job.id}`)}
                            data-job-title
                          >
                            {job.title}
                          </h3>
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusBadgeColor(
                              getJobStatus(job)
                            )}`}
                            data-job-status
                          >
                            {getStatusLabel(getJobStatus(job))}
                          </span>
                        </div>

                        {/* Details */}
                        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                          <span className="flex items-center gap-1">
                            <span className="font-medium" data-job-department>{job.department}</span>
                          </span>
                          <span>•</span>
                          <span data-job-location>{job.location}</span>
                          <span>•</span>
                          <span className="capitalize">{job.location_type}</span>
                          <span>•</span>
                          <span className="capitalize">{job.employment_type}</span>
                        </div>

                        {/* Salary */}
                        {(job.salary_min || job.salary_max) && (
                          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                            {formatSalaryRange(job.salary_min, job.salary_max)}
                          </p>
                        )}

                        {/* Metrics */}
                        <div className="flex items-center gap-6 text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              <span className="font-semibold text-gray-900 dark:text-gray-100" data-applicant-count>
                                {job.applications_count || 0}
                              </span>{' '}
                              applications
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye className="w-4 h-4 text-gray-400" />
                            <span className="text-gray-600 dark:text-gray-400">
                              <span className="font-semibold text-gray-900 dark:text-gray-100">
                                {job.views_count || 0}
                              </span>{' '}
                              views
                            </span>
                          </div>
                          {job.avg_fit_index && (
                            <div className="flex items-center gap-2">
                              <TrendingUp className="w-4 h-4 text-gray-400" />
                              <span className="text-gray-600 dark:text-gray-400">
                                Avg fit:{' '}
                                <span className="font-semibold text-purple-600 dark:text-purple-400">
                                  {job.avg_fit_index.toFixed(1)}
                                </span>
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Created date */}
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-2" data-created-date>
                          Posted on {formatDate(job.posted_date || job.created_at)}
                        </p>
                      </div>

                      {/* Actions */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => router.push(`/employer/jobs/${job.id}`)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => router.push(`/employer/jobs/${job.id}/edit`)}
                            data-edit-button
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit Job
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => duplicateJob(job)}
                            data-duplicate-option
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Duplicate Job
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {job.is_active ? (
                            <DropdownMenuItem
                              onClick={() => updateStatus(job.id, 'paused' as JobStatus)}
                            >
                              <Pause className="w-4 h-4 mr-2" />
                              Pause Job
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              onClick={() => updateStatus(job.id, 'active' as JobStatus)}
                            >
                              <Play className="w-4 h-4 mr-2" />
                              Resume Job
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem
                            onClick={() => updateStatus(job.id, 'closed' as JobStatus)}
                            className="text-orange-600 dark:text-orange-400"
                            data-close-option
                          >
                            <XCircle className="w-4 h-4 mr-2" />
                            Close Job
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setJobToDelete(job);
                              setDeleteDialogOpen(true);
                            }}
                            className="text-red-600 dark:text-red-400"
                            data-delete-option
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Job
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              disabled={isLoading}
            />
          </>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Posting</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{jobToDelete?.title}"? This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteJobHandler}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
