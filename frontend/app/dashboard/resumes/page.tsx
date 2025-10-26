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
import { resumeApi } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth-store';

interface Resume {
  id: string;
  title: string;
  target_role: string;
  created_at: string;
  updated_at: string;
  ats_score: number;
}

export default function ResumesPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [resumes, setResumes] = useState<Resume[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [resumeToDelete, setResumeToDelete] = useState<string | null>(null);

  useEffect(() => {
    fetchResumes();
  }, []);

  const fetchResumes = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await resumeApi.getResumes();
      setResumes(response.data.data || []);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error?.message || 'Failed to load resumes. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateClick = () => {
    router.push('/dashboard/resumes/new');
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
      await resumeApi.deleteResume(resumeToDelete);
      setDeleteDialogOpen(false);
      setResumeToDelete(null);
      await fetchResumes();
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error?.message || 'Failed to delete resume. Please try again.';
      setError(errorMessage);
      setDeleteDialogOpen(false);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteDialogOpen(false);
    setResumeToDelete(null);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading resumes...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-md bg-red-50 p-4 text-red-800" role="alert">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Resumes</h1>
          <p className="mt-2 text-muted-foreground">
            Manage your resumes and track their ATS scores
          </p>
        </div>
        <Button size="lg" onClick={handleCreateClick}>
          Create New Resume
        </Button>
      </div>

      {resumes.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="text-lg text-muted-foreground">No resumes yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Get started by creating your first resume
            </p>
            <Button className="mt-4" onClick={handleCreateClick}>
              Create New Resume
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resumes.map((resume) => (
            <Card
              key={resume.id}
              className="cursor-pointer transition-shadow hover:shadow-lg"
              data-testid="resume-card"
              onClick={() => handleResumeClick(resume.id)}
            >
              <CardHeader>
                <CardTitle>{resume.title}</CardTitle>
                <CardDescription>{resume.target_role}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">ATS Score</span>
                    <span className="text-2xl font-bold text-primary">{resume.ats_score}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Updated: {formatDate(resume.updated_at)}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => handleDeleteClick(resume.id, e)}
                      className="w-full"
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
