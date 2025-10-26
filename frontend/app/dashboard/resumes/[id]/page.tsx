'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { resumeApi } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth-store';

interface Resume {
  id: string;
  title: string;
  target_role: string;
  tone: string;
  created_at: string;
  updated_at: string;
  ats_score: number;
  content: {
    personal_info: {
      name: string;
      email: string;
      phone: string;
      location: string;
    };
    summary: string;
    work_experience: Array<{
      id: string;
      job_title: string;
      company: string;
      location: string;
      start_date: string;
      end_date: string;
      description: string;
    }>;
    education: Array<{
      id: string;
      degree: string;
      school: string;
      location: string;
      graduation_date: string;
    }>;
    skills: string[];
  };
}

export default function ResumeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const resumeId = params?.id as string;
  const { user } = useAuthStore();

  const [resume, setResume] = useState<Resume | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (resumeId) {
      fetchResume();
    }
  }, [resumeId]);

  const fetchResume = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await resumeApi.getResume(resumeId);
      setResume(response.data.data);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error?.message || 'Failed to load resume. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    router.push('/dashboard/resumes');
  };

  const handleEdit = () => {
    // TODO: Implement edit mode
    console.log('Edit mode');
  };

  const handleDownload = async (format: 'pdf' | 'docx' | 'txt') => {
    try {
      const response = await resumeApi.exportVersion(resumeId, format, 'modern');
      // Handle download
      console.log('Downloaded', format);
    } catch (err) {
      console.error('Download failed', err);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading resume...</p>
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

  if (!resume) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Resume not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{resume.title}</h1>
          <p className="mt-2 text-muted-foreground">{resume.target_role}</p>
        </div>
        <div className="flex gap-4">
          <div className="text-center">
            <div className="text-sm text-muted-foreground">ATS Score</div>
            <div className="text-3xl font-bold text-primary" data-testid="ats-score">
              {resume.ats_score}
            </div>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mb-8 flex gap-4">
        <Button variant="outline" onClick={handleBack}>
          Back
        </Button>
        <Button onClick={handleEdit}>Edit</Button>
        <DropdownMenu
          trigger={
            <Button variant="outline">
              Download
              <svg
                className="ml-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </Button>
          }
        >
          <DropdownMenuItem onClick={() => handleDownload('pdf')}>PDF</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload('docx')}>DOCX</DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleDownload('txt')}>Plain Text</DropdownMenuItem>
        </DropdownMenu>
      </div>

      {/* Resume Content */}
      <div className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-xl font-semibold">{resume.content.personal_info.name}</p>
              <p className="text-muted-foreground">{resume.content.personal_info.email}</p>
              <p className="text-muted-foreground">{resume.content.personal_info.phone}</p>
              <p className="text-muted-foreground">{resume.content.personal_info.location}</p>
            </div>
          </CardContent>
        </Card>

        {/* Professional Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <p>{resume.content.summary}</p>
          </CardContent>
        </Card>

        {/* Work Experience */}
        <Card data-testid="section-work-experience" data-section="work-experience">
          <CardHeader>
            <CardTitle>Work Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resume.content.work_experience.map((job) => (
              <div key={job.id} className="border-b pb-4 last:border-0">
                <h3 className="text-lg font-semibold">{job.job_title}</h3>
                <p className="text-muted-foreground">
                  {job.company} • {job.location}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(job.start_date)} - {job.end_date ? formatDate(job.end_date) : 'Present'}
                </p>
                <p className="mt-2">{job.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Education */}
        <Card data-testid="section-education">
          <CardHeader>
            <CardTitle>Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {resume.content.education.map((edu) => (
              <div key={edu.id} className="border-b pb-4 last:border-0">
                <h3 className="text-lg font-semibold">{edu.degree}</h3>
                <p className="text-muted-foreground">
                  {edu.school} • {edu.location}
                </p>
                <p className="text-sm text-muted-foreground">Graduated: {edu.graduation_date}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Skills */}
        <Card data-testid="section-skills">
          <CardHeader>
            <CardTitle>Skills</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {resume.content.skills.map((skill, index) => (
                <Badge key={index} variant="secondary">
                  {skill}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
