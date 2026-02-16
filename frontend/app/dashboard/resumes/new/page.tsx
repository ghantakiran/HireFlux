'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { resumeApi } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth-store';
import { getErrorMessage } from '@/lib/api-error-handler';

const resumeSchema = z.object({
  title: z.string().min(1, 'Resume title is required'),
  target_role: z.string().min(1, 'Target role is required'),
  tone: z.string(),
});

type ResumeFormData = z.infer<typeof resumeSchema>;

type CreationMode = 'options' | 'scratch' | 'upload';

export default function NewResumePage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [mode, setMode] = useState<CreationMode>('options');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResumeFormData>({
    resolver: zodResolver(resumeSchema),
    defaultValues: {
      title: '',
      target_role: '',
      tone: 'professional',
    },
  });

  const handleStartFromScratch = () => {
    setMode('scratch');
    setError(null);
  };

  const handleUploadExisting = () => {
    setMode('upload');
    setError(null);
  };

  const handleBack = () => {
    setMode('options');
    setError(null);
    setSelectedFile(null);
  };

  const onSubmitScratch = async (data: ResumeFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await resumeApi.createResume(data);
      const resumeId = response.data.data.id;

      router.push(`/dashboard/resumes/${resumeId}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create resume. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleContinueUpload = async () => {
    if (!selectedFile) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await resumeApi.upload(selectedFile);
      const resumeId = response.data.data.id;

      router.push(`/dashboard/resumes/${resumeId}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to upload resume. Please try again.'));
    } finally {
      setIsLoading(false);
    }
  };

  const renderOptions = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">Create New Resume</CardTitle>
        <CardDescription>Choose how you'd like to get started</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Button
            size="lg"
            variant="outline"
            className="h-32 flex-col gap-2"
            onClick={handleStartFromScratch}
          >
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
            <span className="text-lg font-semibold">Start from Scratch</span>
            <span className="text-sm text-muted-foreground">Create a new resume with AI</span>
          </Button>

          <Button
            size="lg"
            variant="outline"
            className="h-32 flex-col gap-2"
            onClick={handleUploadExisting}
          >
            <svg
              className="h-8 w-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span className="text-lg font-semibold">Upload Existing</span>
            <span className="text-sm text-muted-foreground">Optimize your current resume</span>
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderScratchForm = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Create Resume from Scratch</CardTitle>
        <CardDescription>Fill in the details to generate your resume with AI</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmitScratch)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="title">Resume Title</Label>
            <Input
              id="title"
              type="text"
              placeholder="e.g., Software Engineer Resume"
              {...register('title')}
            />
            {errors.title && <p className="text-sm text-red-600">{errors.title.message}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="target_role">Target Role</Label>
            <Input
              id="target_role"
              type="text"
              placeholder="e.g., Senior Software Engineer"
              {...register('target_role')}
            />
            {errors.target_role && (
              <p className="text-sm text-red-600">{errors.target_role.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tone">Tone</Label>
            <Select id="tone" {...register('tone')}>
              <option value="professional">Professional</option>
              <option value="conversational">Conversational</option>
              <option value="formal">Formal</option>
              <option value="concise">Concise</option>
            </Select>
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Generate Resume'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderUploadForm = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Upload Existing Resume</CardTitle>
        <CardDescription>Upload your resume to optimize and tailor it with AI</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="resume-upload">Upload Resume (PDF or DOCX)</Label>
            <Input
              id="resume-upload"
              type="file"
              accept=".pdf,.docx"
              onChange={handleFileChange}
              aria-label="Upload your resume"
            />
          </div>

          {selectedFile && (
            <div className="rounded-md border p-3">
              <p className="text-sm">
                <span className="font-semibold">Selected file:</span> {selectedFile.name}
              </p>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={handleBack}>
              Back
            </Button>
            <Button
              onClick={handleContinueUpload}
              disabled={!selectedFile || isLoading}
            >
              {isLoading ? 'Uploading...' : 'Continue'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      {mode === 'options' && renderOptions()}
      {mode === 'scratch' && renderScratchForm()}
      {mode === 'upload' && renderUploadForm()}
    </div>
  );
}
