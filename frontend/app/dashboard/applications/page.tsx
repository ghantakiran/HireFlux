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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Calendar,
  Building,
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Loader2,
  TrendingUp,
  Briefcase,
  MapPin,
  X,
  Edit,
  Trash2,
  Filter,
  BarChart3,
} from 'lucide-react';
import {
  useApplicationStore,
  type ApplicationStatus,
  type ApplicationMode,
} from '@/lib/stores/application-store';
import { ApplicationCardSkeleton } from '@/components/skeletons/card-skeleton';
import { StatsRowSkeleton } from '@/components/skeletons/stats-skeleton';

export default function ApplicationsPage() {
  const router = useRouter();
  const {
    applications,
    stats,
    isLoading,
    error,
    filters,
    pagination,
    fetchApplications,
    fetchStats,
    updateApplication,
    deleteApplication,
    setFilters,
    clearFilters,
    clearError,
  } = useApplicationStore();

  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>('saved');
  const [notes, setNotes] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    // Fetch applications and stats on mount
    fetchApplications();
    fetchStats();
  }, []);

  const handleFilterChange = (key: 'status' | 'application_mode', value: string) => {
    if (value === 'all') {
      const newFilters = { ...filters };
      delete newFilters[key];
      setFilters(newFilters);
      fetchApplications({ ...newFilters, page: 1 });
    } else {
      const newFilters = { ...filters, [key]: value };
      setFilters(newFilters);
      fetchApplications({ ...newFilters, page: 1 });
    }
  };

  const handleClearFilters = () => {
    clearFilters();
    fetchApplications({ page: 1 });
  };

  const handlePageChange = (newPage: number) => {
    fetchApplications({ page: newPage });
  };

  const handleUpdateStatus = async () => {
    if (!selectedApplication) return;

    try {
      setUpdatingId(selectedApplication);
      await updateApplication(selectedApplication, { status: selectedStatus });
      setUpdateDialogOpen(false);
      setSelectedApplication(null);
      await fetchStats(); // Refresh stats
    } catch (err) {
      // Error handled by store
    } finally {
      setUpdatingId(null);
    }
  };

  const handleUpdateNotes = async () => {
    if (!selectedApplication) return;

    try {
      setUpdatingId(selectedApplication);
      await updateApplication(selectedApplication, { notes });
      setNotesDialogOpen(false);
      setSelectedApplication(null);
      setNotes('');
    } catch (err) {
      // Error handled by store
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDelete = async () => {
    if (!selectedApplication) return;

    try {
      setDeletingId(selectedApplication);
      await deleteApplication(selectedApplication);
      setDeleteDialogOpen(false);
      setSelectedApplication(null);
      await fetchStats(); // Refresh stats
    } catch (err) {
      // Error handled by store
    } finally {
      setDeletingId(null);
    }
  };

  const openUpdateDialog = (appId: string, currentStatus: ApplicationStatus) => {
    setSelectedApplication(appId);
    setSelectedStatus(currentStatus);
    setUpdateDialogOpen(true);
  };

  const openNotesDialog = (appId: string, currentNotes?: string) => {
    setSelectedApplication(appId);
    setNotes(currentNotes || '');
    setNotesDialogOpen(true);
  };

  const openDeleteDialog = (appId: string) => {
    setSelectedApplication(appId);
    setDeleteDialogOpen(true);
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    const configs = {
      saved: {
        variant: 'secondary' as const,
        icon: <Briefcase className="h-3 w-3 mr-1" />,
        label: 'Saved',
        className: '',
      },
      applied: {
        variant: 'default' as const,
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
        label: 'Applied',
        className: '',
      },
      interview: {
        variant: 'secondary' as const,
        icon: <AlertCircle className="h-3 w-3 mr-1" />,
        label: 'Interview',
        className: 'bg-purple-100 text-purple-800',
      },
      offer: {
        variant: 'secondary' as const,
        icon: <CheckCircle className="h-3 w-3 mr-1" />,
        label: 'Offer',
        className: 'bg-green-100 text-green-800',
      },
      rejected: {
        variant: 'destructive' as const,
        icon: <XCircle className="h-3 w-3 mr-1" />,
        label: 'Rejected',
        className: '',
      },
    };

    const config = configs[status];
    return (
      <Badge variant={config.variant} className={config.className}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const getModeBadge = (mode?: ApplicationMode) => {
    if (!mode) return null;

    const configs = {
      manual: { label: 'Manual', className: 'bg-gray-100 text-gray-800' },
      apply_assist: { label: 'Apply Assist', className: 'bg-blue-100 text-blue-800' },
      auto_apply: { label: 'Auto-Apply', className: 'bg-purple-100 text-purple-800' },
    };

    const config = configs[mode];
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
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Applications</h1>
        <p className="text-muted-foreground">
          Track your job applications and manage your pipeline
        </p>
        {pagination.total > 0 && (
          <p className="text-sm text-muted-foreground mt-2">
            Showing {(pagination.page - 1) * pagination.limit + 1} -{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} applications
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

      {/* Pipeline Overview */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleFilterChange('status', 'saved')}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-blue-600">
                {stats.by_status.saved || 0}
              </div>
              <div className="text-sm text-muted-foreground">Saved</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleFilterChange('status', 'applied')}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-orange-600">
                {stats.by_status.applied || 0}
              </div>
              <div className="text-sm text-muted-foreground">Applied</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleFilterChange('status', 'interview')}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-purple-600">
                {stats.by_status.interview || 0}
              </div>
              <div className="text-sm text-muted-foreground">Interview</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleFilterChange('status', 'offer')}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-green-600">
                {stats.by_status.offer || 0}
              </div>
              <div className="text-sm text-muted-foreground">Offers</div>
            </CardContent>
          </Card>
          <Card className="cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => handleFilterChange('status', 'rejected')}
          >
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-red-600">
                {stats.by_status.rejected || 0}
              </div>
              <div className="text-sm text-muted-foreground">Rejected</div>
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
          <div className="flex gap-4 items-center flex-wrap">
            {/* Status Filter */}
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => handleFilterChange('status', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Applications</SelectItem>
                <SelectItem value="saved">Saved</SelectItem>
                <SelectItem value="applied">Applied</SelectItem>
                <SelectItem value="interview">Interview</SelectItem>
                <SelectItem value="offer">Offers</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            {/* Application Mode Filter */}
            <Select
              value={filters.application_mode || 'all'}
              onValueChange={(value) => handleFilterChange('application_mode', value)}
            >
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Modes</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="apply_assist">Apply Assist</SelectItem>
                <SelectItem value="auto_apply">Auto-Apply</SelectItem>
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/analytics')}
            >
              <BarChart3 className="mr-2 h-4 w-4" />
              View Analytics
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Loading State */}
      {isLoading && applications.length === 0 && (
        <div className="space-y-6">
          {/* Stats Skeleton */}
          <StatsRowSkeleton count={5} />

          {/* Application Cards Skeleton */}
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <ApplicationCardSkeleton key={i} />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && applications.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Briefcase className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              No applications yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
              {activeFiltersCount > 0
                ? 'No applications match your filters. Try adjusting your filters.'
                : 'Start applying to jobs to track your applications here.'}
            </p>
            {activeFiltersCount > 0 ? (
              <Button className="mt-4" variant="outline" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button className="mt-4" onClick={() => router.push('/dashboard/jobs')}>
                Browse Jobs
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Applications List */}
      {applications.length > 0 && (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card
              key={application.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => router.push(`/dashboard/applications/${application.id}`)}
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-xl">
                      {application.job?.title || 'Job Title'}
                    </CardTitle>
                    <CardDescription className="text-lg flex items-center gap-2 mt-1">
                      <Building className="h-4 w-4" />
                      {application.job?.company || 'Company Name'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap justify-end">
                    {application.job?.match_score?.fit_index && (
                      <Badge variant="secondary" className="text-sm">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Fit: {application.job.match_score.fit_index}
                      </Badge>
                    )}
                    {getStatusBadge(application.status)}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Application Meta */}
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {application.applied_at
                        ? `Applied ${formatDate(application.applied_at)}`
                        : `Saved ${formatDate(application.created_at)}`}
                    </span>
                  </div>
                  {application.resume_version && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FileText className="h-4 w-4" />
                      <span className="truncate">
                        {application.resume_version.title}
                      </span>
                    </div>
                  )}
                  {application.job?.location && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4" />
                      <span>{application.job.location}</span>
                    </div>
                  )}
                </div>

                {/* Application Mode */}
                {application.application_mode && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-sm">Application Method:</h4>
                    {getModeBadge(application.application_mode)}
                  </div>
                )}

                {/* Notes */}
                {application.notes && (
                  <div className="mb-4">
                    <h4 className="font-semibold mb-2 text-sm">Notes:</h4>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {application.notes}
                    </p>
                  </div>
                )}

                {/* Job Details */}
                {application.job && (
                  <div className="flex gap-2 mb-4 flex-wrap">
                    <Badge variant="outline">{application.job.remote_policy}</Badge>
                    <Badge variant="outline">{application.job.employment_type}</Badge>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2 border-t flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      router.push(`/dashboard/jobs/${application.job_id}`);
                    }}
                  >
                    View Job
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openUpdateDialog(application.id, application.status);
                    }}
                  >
                    <Edit className="mr-1 h-3 w-3" />
                    Update Status
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openNotesDialog(application.id, application.notes);
                    }}
                  >
                    <FileText className="mr-1 h-3 w-3" />
                    {application.notes ? 'Edit Notes' : 'Add Notes'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDeleteDialog(application.id);
                    }}
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

      {/* Update Status Dialog */}
      <Dialog open={updateDialogOpen} onOpenChange={setUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Application Status</DialogTitle>
            <DialogDescription>
              Change the status of this application to track your progress
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={selectedStatus}
                onValueChange={(value) => setSelectedStatus(value as ApplicationStatus)}
              >
                <SelectTrigger id="status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="saved">Saved</SelectItem>
                  <SelectItem value="applied">Applied</SelectItem>
                  <SelectItem value="interview">Interview</SelectItem>
                  <SelectItem value="offer">Offer</SelectItem>
                  <SelectItem value="rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateDialogOpen(false)}
              disabled={updatingId !== null}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updatingId !== null}>
              {updatingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating...
                </>
              ) : (
                'Update Status'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes Dialog */}
      <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Application Notes</DialogTitle>
            <DialogDescription>
              Add or edit notes for this application
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add notes about this application..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotesDialogOpen(false)}
              disabled={updatingId !== null}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateNotes} disabled={updatingId !== null}>
              {updatingId ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Notes'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Application</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this application? This action cannot be
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
