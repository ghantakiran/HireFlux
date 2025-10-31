'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  Edit,
  Download,
  Trash2,
  Loader2,
  AlertCircle,
  FileText,
  Building,
  Calendar,
  Settings,
  User,
  CheckCircle,
} from 'lucide-react';
import {
  useCoverLetterStore,
  type CoverLetterTone,
  type CoverLetterLength,
} from '@/lib/stores/cover-letter-store';
import { useResumeStore } from '@/lib/stores/resume-store';

export default function CoverLetterDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const {
    currentCoverLetter,
    isLoading,
    error,
    fetchCoverLetter,
    deleteCoverLetter,
    clearError,
    clearCurrentCoverLetter,
  } = useCoverLetterStore();

  const { resumes, fetchResumes } = useResumeStore();

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch cover letter and resumes on mount
  useEffect(() => {
    fetchCoverLetter(id);
    fetchResumes();

    return () => {
      clearCurrentCoverLetter();
    };
  }, [id]);

  const handleEdit = () => {
    router.push(`/dashboard/cover-letters/${id}/edit`);
  };

  const handleDownload = () => {
    // TODO: Implement download functionality
    alert('Download functionality coming soon!');
  };

  const handleDelete = async () => {
    try {
      setIsDeleting(true);
      await deleteCoverLetter(id);
      router.push('/dashboard/cover-letters');
    } catch (err) {
      // Error handled by store
      setIsDeleting(false);
    }
  };

  const handleUseInApplication = () => {
    // TODO: Implement use in application functionality
    alert('Use in application functionality coming soon!');
  };

  const getToneBadge = (tone: CoverLetterTone) => {
    const configs = {
      formal: { label: 'Formal', className: 'bg-blue-100 text-blue-800' },
      concise: { label: 'Concise', className: 'bg-purple-100 text-purple-800' },
      conversational: {
        label: 'Conversational',
        className: 'bg-green-100 text-green-800',
      },
    };

    const config = configs[tone];
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const getLengthBadge = (length: CoverLetterLength) => {
    const configs = {
      short: { label: 'Short (~150 words)', className: 'bg-gray-100 text-gray-800' },
      medium: { label: 'Medium (~250 words)', className: 'bg-gray-100 text-gray-800' },
      long: { label: 'Long (~350 words)', className: 'bg-gray-100 text-gray-800' },
    };

    const config = configs[length];
    return (
      <Badge variant="outline" className={config.className}>
        {config.label}
      </Badge>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getResumeTitle = (resumeVersionId: string) => {
    const resume = resumes.find((r) => r.id === resumeVersionId);
    return resume?.file_name || 'Resume';
  };

  // Loading state
  if (isLoading && !currentCoverLetter) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex min-h-[400px] items-center justify-center">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <p className="text-muted-foreground">Loading cover letter...</p>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (!currentCoverLetter && !isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="border-red-200">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <AlertCircle className="h-16 w-16 text-red-500 mb-4" />
            <p className="text-lg font-medium text-red-700">Cover letter not found</p>
            <p className="mt-2 text-sm text-muted-foreground text-center max-w-md">
              The cover letter you're looking for doesn't exist or has been deleted.
            </p>
            <Button className="mt-4" onClick={() => router.push('/dashboard/cover-letters')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Cover Letters
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!currentCoverLetter) return null;

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push('/dashboard/cover-letters')}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Cover Letters
        </Button>

        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold mb-2">
              {currentCoverLetter.job_title || 'Cover Letter'}
            </h1>
            {currentCoverLetter.company_name && (
              <div className="flex items-center gap-2 text-xl text-muted-foreground">
                <Building className="h-5 w-5" />
                <span>{currentCoverLetter.company_name}</span>
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={handleEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
            <Button variant="outline" onClick={handleDownload}>
              <Download className="mr-2 h-4 w-4" />
              Download
            </Button>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(true)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
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
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Main Content - 2 Column Layout */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - Cover Letter Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                <CardTitle>Cover Letter</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="prose max-w-none">
                <div className="whitespace-pre-wrap text-base leading-relaxed font-serif">
                  {currentCoverLetter.content}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Use in Application CTA */}
          <Card className="mt-6 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <CheckCircle className="h-6 w-6 text-blue-600 mt-1" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 mb-2">
                    Ready to use this cover letter?
                  </h3>
                  <p className="text-sm text-blue-800 mb-4">
                    Add this cover letter to a job application to increase your chances of
                    getting noticed by recruiters.
                  </p>
                  <Button onClick={handleUseInApplication} className="bg-blue-600">
                    Use in Application
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Metadata Sidebar */}
        <div className="space-y-6">
          {/* Settings Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <CardTitle className="text-lg">Settings</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Tone</p>
                {getToneBadge(currentCoverLetter.tone)}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">Length</p>
                {getLengthBadge(currentCoverLetter.length)}
              </div>

              <div>
                <p className="text-sm font-medium text-muted-foreground mb-2">
                  Company Personalization
                </p>
                <Badge variant={currentCoverLetter.personalize_company ? 'default' : 'outline'}>
                  {currentCoverLetter.personalize_company ? 'Enabled' : 'Disabled'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Resume Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <User className="h-5 w-5" />
                <CardTitle className="text-lg">Resume Used</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium">
                {getResumeTitle(currentCoverLetter.resume_version_id)}
              </p>
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() =>
                  router.push(`/dashboard/resumes/${currentCoverLetter.resume_version_id}`)
                }
              >
                View Resume
              </Button>
            </CardContent>
          </Card>

          {/* Job Information Card */}
          {(currentCoverLetter.job_id ||
            currentCoverLetter.job_title ||
            currentCoverLetter.company_name) && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  <CardTitle className="text-lg">Job Information</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {currentCoverLetter.job_title && (
                  <div>
                    <p className="text-sm text-muted-foreground">Position</p>
                    <p className="text-sm font-medium">{currentCoverLetter.job_title}</p>
                  </div>
                )}

                {currentCoverLetter.company_name && (
                  <div>
                    <p className="text-sm text-muted-foreground">Company</p>
                    <p className="text-sm font-medium">{currentCoverLetter.company_name}</p>
                  </div>
                )}

                {currentCoverLetter.job_id && (
                  <Button
                    variant="link"
                    className="p-0 h-auto text-sm"
                    onClick={() => router.push(`/dashboard/jobs/${currentCoverLetter.job_id}`)}
                  >
                    View Job Details
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Timestamps Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                <CardTitle className="text-lg">Dates</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Created</p>
                <p className="text-sm">{formatDate(currentCoverLetter.created_at)}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Last Modified</p>
                <p className="text-sm">{formatDate(currentCoverLetter.updated_at)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Word Count Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Words</span>
                  <span className="text-sm font-medium">
                    {currentCoverLetter.content.trim().split(/\s+/).filter(Boolean).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Characters</span>
                  <span className="text-sm font-medium">
                    {currentCoverLetter.content.length}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Cover Letter</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this cover letter? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? (
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
