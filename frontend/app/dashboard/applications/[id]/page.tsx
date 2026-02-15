'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  DollarSign,
  ExternalLink,
  Download,
  Edit,
  Trash2,
  ArrowLeft,
  Mail,
  Phone,
  Globe,
} from 'lucide-react';
import {
  useApplicationStore,
  type ApplicationStatus,
  type ApplicationDetail,
} from '@/lib/stores/application-store';
import { toast } from 'sonner';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';

export default function ApplicationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const applicationId = params.id as string;

  const {
    currentApplication,
    isLoading,
    error,
    fetchApplication,
    updateApplication,
    deleteApplication,
    clearCurrentApplication,
  } = useApplicationStore();

  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<ApplicationStatus>('saved');
  const [notes, setNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  const deleteDialog = useConfirmDialog({
    onConfirm: async (id) => { await deleteApplication(id); },
    onSuccess: () => router.push('/dashboard/applications'),
    successMessage: 'Application deleted',
    errorMessage: 'Failed to delete application. Please try again.',
  });

  useEffect(() => {
    if (applicationId) {
      fetchApplication(applicationId);
    }

    return () => {
      clearCurrentApplication();
    };
  }, [applicationId]);

  useEffect(() => {
    if (currentApplication) {
      setSelectedStatus(currentApplication.status);
      setNotes(currentApplication.notes || '');
    }
  }, [currentApplication]);

  const handleUpdateStatus = async () => {
    try {
      setUpdating(true);
      await updateApplication(applicationId, { status: selectedStatus });
      setUpdateDialogOpen(false);
      toast.success('Status updated');
    } catch (err) {
      toast.error('Failed to update application. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const handleUpdateNotes = async () => {
    try {
      setUpdating(true);
      await updateApplication(applicationId, { notes });
      setNotesDialogOpen(false);
      toast.success('Notes saved');
    } catch (err) {
      toast.error('Failed to update application. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: ApplicationStatus) => {
    const configs = {
      saved: {
        variant: 'secondary' as const,
        icon: <Briefcase className="h-4 w-4 mr-1" />,
        label: 'Saved',
        className: '',
      },
      applied: {
        variant: 'default' as const,
        icon: <CheckCircle className="h-4 w-4 mr-1" />,
        label: 'Applied',
        className: '',
      },
      interview: {
        variant: 'secondary' as const,
        icon: <AlertCircle className="h-4 w-4 mr-1" />,
        label: 'Interview',
        className: 'bg-purple-100 text-purple-800',
      },
      offer: {
        variant: 'secondary' as const,
        icon: <CheckCircle className="h-4 w-4 mr-1" />,
        label: 'Offer',
        className: 'bg-green-100 text-green-800',
      },
      rejected: {
        variant: 'destructive' as const,
        icon: <XCircle className="h-4 w-4 mr-1" />,
        label: 'Rejected',
        className: '',
      },
    };

    const config = configs[status];
    return (
      <Badge variant={config.variant} className={config.className || ''}>
        {config.icon}
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatSalary = (min?: number, max?: number) => {
    if (!min && !max) return 'Not disclosed';
    const formatNum = (num: number) =>
      num >= 1000 ? `$${(num / 1000).toFixed(0)}k` : `$${num}`;
    if (min && max) return `${formatNum(min)} - ${formatNum(max)}`;
    if (min) return `${formatNum(min)}+`;
    if (max) return `Up to ${formatNum(max)}`;
    return 'Not disclosed';
  };

  if (isLoading || !currentApplication) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-muted-foreground">Loading application...</p>
        </div>
      </div>
    );
  }

  const application = currentApplication;
  const job = application.job;
  const fitIndex = job?.match_score?.fit_index || 0;

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={() => router.push('/dashboard/applications')}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Applications
      </Button>

      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold mb-2">{job?.title || 'Job Title'}</h1>
            <div className="flex items-center gap-2 text-lg text-muted-foreground">
              <Building className="h-5 w-5" />
              <span>{job?.company || 'Company Name'}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {fitIndex > 0 && (
              <Badge variant="secondary" className="text-base px-3 py-1">
                <TrendingUp className="mr-2 h-4 w-4" />
                Fit Index: {fitIndex}
              </Badge>
            )}
            {getStatusBadge(application.status)}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-2 flex-wrap">
          <Button
            onClick={() => {
              setSelectedStatus(application.status);
              setUpdateDialogOpen(true);
            }}
          >
            <Edit className="mr-2 h-4 w-4" />
            Update Status
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setNotes(application.notes || '');
              setNotesDialogOpen(true);
            }}
          >
            <FileText className="mr-2 h-4 w-4" />
            Edit Notes
          </Button>
          {job && (
            <Button
              variant="outline"
              onClick={() => router.push(`/dashboard/jobs/${job.id}`)}
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              View Job Details
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => deleteDialog.open(applicationId)}
            className="text-red-600 hover:text-red-700"
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Application Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Application Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {application.applied_at && (
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-blue-100 p-2">
                      <CheckCircle className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium">Application Submitted</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(application.applied_at)}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <div className="rounded-full bg-gray-100 p-2">
                    <Briefcase className="h-5 w-5 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium">Application Saved</p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(application.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Job Information */}
          {job && (
            <Card>
              <CardHeader>
                <CardTitle>Job Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {/* Location & Details */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-muted-foreground" />
                      <span>{formatSalary(job.salary_min, job.salary_max)}</span>
                    </div>
                  </div>

                  {/* Job Type Tags */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge variant="outline">{job.remote_policy}</Badge>
                    <Badge variant="outline">{job.employment_type}</Badge>
                    {job.posted_at && (
                      <Badge variant="secondary">
                        Posted: {formatDate(job.posted_at)}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documents Used */}
          <Card>
            <CardHeader>
              <CardTitle>Application Materials</CardTitle>
              <CardDescription>
                Documents submitted with this application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Resume */}
                {application.resume_version ? (
                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <FileText className="h-5 w-5 text-blue-600 mt-0.5" />
                      <div>
                        <p className="font-medium">
                          {application.resume_version.title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {application.resume_version.filename}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/dashboard/resumes/${application.resume_version_id}`
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                    <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No resume attached</p>
                  </div>
                )}

                {/* Cover Letter */}
                {application.cover_letter ? (
                  <div className="flex items-start justify-between p-4 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Mail className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div>
                        <p className="font-medium">
                          Cover Letter for {application.cover_letter.job_title}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {application.cover_letter.company_name}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        router.push(
                          `/dashboard/cover-letters/${application.cover_letter_id}`
                        )
                      }
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="p-4 border border-dashed rounded-lg text-center text-muted-foreground">
                    <Mail className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No cover letter attached</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Notes</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setNotes(application.notes || '');
                    setNotesDialogOpen(true);
                  }}
                >
                  <Edit className="mr-1 h-3 w-3" />
                  Edit
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {application.notes ? (
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {application.notes}
                </p>
              ) : (
                <p className="text-muted-foreground italic">
                  No notes added yet. Click Edit to add notes about this application.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Application Details */}
          <Card>
            <CardHeader>
              <CardTitle>Application Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                {getStatusBadge(application.status)}
              </div>

              {application.application_mode && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">
                    Application Method
                  </p>
                  <Badge
                    variant="outline"
                    className={
                      application.application_mode === 'auto_apply'
                        ? 'bg-purple-100 text-purple-800'
                        : application.application_mode === 'apply_assist'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-800'
                    }
                  >
                    {application.application_mode === 'auto_apply'
                      ? 'Auto-Apply'
                      : application.application_mode === 'apply_assist'
                      ? 'Apply Assist'
                      : 'Manual'}
                  </Badge>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">Created</p>
                <p className="font-medium">{formatDate(application.created_at)}</p>
              </div>

              {application.applied_at && (
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Applied</p>
                  <p className="font-medium">{formatDate(application.applied_at)}</p>
                </div>
              )}

              <div>
                <p className="text-sm text-muted-foreground mb-1">Last Updated</p>
                <p className="font-medium">{formatDate(application.updated_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          {application.status === 'applied' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Next Steps</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Follow up after 1 week if no response</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Connect with recruiters on LinkedIn</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                    <span>Prepare for potential interviews</span>
                  </li>
                </ul>
              </CardContent>
            </Card>
          )}

          {application.status === 'interview' && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Interview Prep</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <span>Review the job description</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <span>Prepare STAR method examples</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <span>Research the company</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-blue-600 mt-0.5" />
                    <span>Practice with Interview Buddy</span>
                  </li>
                </ul>
                <Button
                  className="w-full mt-4"
                  variant="outline"
                  onClick={() => router.push('/dashboard/interview-buddy')}
                >
                  Start Interview Prep
                </Button>
              </CardContent>
            </Card>
          )}

          {application.status === 'offer' && (
            <Card className="bg-green-50">
              <CardHeader>
                <CardTitle className="text-base text-green-800">
                  Congratulations! 🎉
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-green-700">
                  You received an offer! Take time to review the offer details,
                  negotiate if needed, and make the best decision for your career.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateStatus} disabled={updating}>
              {updating ? (
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
                rows={8}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setNotesDialogOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleUpdateNotes} disabled={updating}>
              {updating ? (
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
      <ConfirmDialog
        open={deleteDialog.isOpen}
        onOpenChange={() => deleteDialog.close()}
        title="Delete Application"
        description="Are you sure you want to delete this application? This action cannot be undone."
        isConfirming={deleteDialog.isConfirming}
        onConfirm={deleteDialog.confirm}
      />
    </div>
  );
}
