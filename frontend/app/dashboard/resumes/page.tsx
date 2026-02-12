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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { useResumeStore, ParseStatus } from '@/lib/stores/resume-store';
import {
  FileText,
  Upload,
  Trash2,
  Star,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { ResumeCardSkeleton } from '@/components/skeletons/card-skeleton';
import { EmptyState } from '@/components/domain/EmptyState';

export default function ResumesPage() {
  // Note: Page title set via metadata in layout.tsx for WCAG 2.1 AA compliance (Issue #148)
  // Client-side fallback to ensure title is always set (resolves SSR/hydration timing issues)
  useEffect(() => {
    document.title = 'Resume Builder | HireFlux';
  }, []);

  const router = useRouter();
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

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

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
    setResumeToDelete(id);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!resumeToDelete) return;

    try {
      setDeletingId(resumeToDelete);
      await deleteResume(resumeToDelete);
      setDeleteDialogOpen(false);
      setResumeToDelete(null);
    } catch (err) {
      // Error is handled by the store
    } finally {
      setDeletingId(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setResumeToDelete(null);
  };

  const handleSetDefault = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await setDefaultResume(id);
    } catch (err) {
      // Error is handled by the store
    }
  };

  const handleDownload = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await downloadResume(id);
    } catch (err) {
      // Error is handled by the store
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getStatusBadge = (status: ParseStatus) => {
    switch (status) {
      case ParseStatus.COMPLETED:
        return (
          <Badge variant="default" className="bg-green-500">
            <CheckCircle2 className="mr-1 h-3 w-3" />
            Parsed
          </Badge>
        );
      case ParseStatus.PROCESSING:
        return (
          <Badge variant="default" className="bg-blue-500">
            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
            Processing
          </Badge>
        );
      case ParseStatus.PENDING:
        return (
          <Badge variant="secondary">
            <Clock className="mr-1 h-3 w-3" />
            Pending
          </Badge>
        );
      case ParseStatus.FAILED:
        return (
          <Badge variant="destructive">
            <AlertCircle className="mr-1 h-3 w-3" />
            Failed
          </Badge>
        );
      default:
        return null;
    }
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
      {error && (
        <div className="mb-6 rounded-md bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4" role="alert">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-red-800 dark:text-red-300">Error</h3>
              <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
            </div>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </div>
        </div>
      )}

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

      {/* Empty State */}
      {resumes.length === 0 && !isLoading ? (
        <EmptyState
          title="No resumes yet"
          description="Create your first AI-optimized resume to start applying for jobs."
          icon={<FileText className="h-12 w-12 text-muted-foreground" />}
          actionLabel="Create Resume"
          onAction={() => router.push('/dashboard/resumes/builder')}
        />
      ) : (
        /* Resume Grid */
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <Card
              key={resume.id}
              className="cursor-pointer transition-all hover:shadow-lg hover:border-blue-300 dark:hover:border-blue-700"
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
                    {getStatusBadge(resume.parse_status)}
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
                      disabled={deletingId === resume.id}
                    >
                      {deletingId === resume.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4 text-red-600 dark:text-red-400" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Resume</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this resume? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={handleDeleteCancel}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteConfirm}
              disabled={!!deletingId}
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
