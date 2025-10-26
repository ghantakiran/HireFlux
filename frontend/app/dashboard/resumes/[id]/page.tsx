'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedResume, setEditedResume] = useState<Resume | null>(null);

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
    setIsEditMode(true);
    setEditedResume(resume);
    setError(null);
  };

  const handleCancelEdit = () => {
    setIsEditMode(false);
    setEditedResume(null);
    setError(null);
  };

  const handleSaveChanges = async () => {
    if (!editedResume) return;

    try {
      setIsLoading(true);
      setError(null);
      const response = await resumeApi.updateResume(resumeId, { content: editedResume.content });
      setResume(response.data.data);
      setIsEditMode(false);
      setEditedResume(null);
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error?.message || 'Failed to update resume. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFieldChange = (field: string, value: string) => {
    if (!editedResume) return;

    const keys = field.split('.');
    const updatedResume = { ...editedResume };
    let current: any = updatedResume.content;

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setEditedResume(updatedResume);
  };

  const handleWorkExperienceChange = (index: number, field: string, value: string) => {
    if (!editedResume) return;

    const updatedResume = { ...editedResume };
    updatedResume.content.work_experience[index] = {
      ...updatedResume.content.work_experience[index],
      [field]: value,
    };
    setEditedResume(updatedResume);
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
        {!isEditMode ? (
          <>
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
          </>
        ) : (
          <>
            <Button variant="outline" onClick={handleCancelEdit}>
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </>
        )}
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
          {error}
        </div>
      )}

      {/* Resume Content */}
      <div className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
          </CardHeader>
          <CardContent>
            {!isEditMode ? (
              <div className="space-y-2">
                <p className="text-xl font-semibold">{resume.content.personal_info.name}</p>
                <p className="text-muted-foreground">{resume.content.personal_info.email}</p>
                <p className="text-muted-foreground">{resume.content.personal_info.phone}</p>
                <p className="text-muted-foreground">{resume.content.personal_info.location}</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={editedResume?.content.personal_info.name || ''}
                    onChange={(e) => handleFieldChange('personal_info.name', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editedResume?.content.personal_info.email || ''}
                    onChange={(e) => handleFieldChange('personal_info.email', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editedResume?.content.personal_info.phone || ''}
                    onChange={(e) => handleFieldChange('personal_info.phone', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editedResume?.content.personal_info.location || ''}
                    onChange={(e) => handleFieldChange('personal_info.location', e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Professional Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Professional Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {!isEditMode ? (
              <p>{resume.content.summary}</p>
            ) : (
              <div>
                <Label htmlFor="summary">Summary</Label>
                <Textarea
                  id="summary"
                  value={editedResume?.content.summary || ''}
                  onChange={(e) => handleFieldChange('summary', e.target.value)}
                  rows={4}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Work Experience */}
        <Card data-testid="section-work-experience" data-section="work-experience">
          <CardHeader>
            <CardTitle>Work Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isEditMode
              ? resume.content.work_experience.map((job) => (
                  <div key={job.id} className="border-b pb-4 last:border-0">
                    <h3 className="text-lg font-semibold">{job.job_title}</h3>
                    <p className="text-muted-foreground">
                      {job.company} • {job.location}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(job.start_date)} -{' '}
                      {job.end_date ? formatDate(job.end_date) : 'Present'}
                    </p>
                    <p className="mt-2">{job.description}</p>
                  </div>
                ))
              : editedResume?.content.work_experience.map((job, index) => (
                  <div key={job.id} className="space-y-4 border-b pb-4 last:border-0">
                    <div>
                      <Label htmlFor={`job-title-${index}`}>Job Title</Label>
                      <Input
                        id={`job-title-${index}`}
                        value={job.job_title}
                        onChange={(e) =>
                          handleWorkExperienceChange(index, 'job_title', e.target.value)
                        }
                      />
                    </div>
                    <div>
                      <Label htmlFor={`company-${index}`}>Company</Label>
                      <Input
                        id={`company-${index}`}
                        value={job.company}
                        onChange={(e) => handleWorkExperienceChange(index, 'company', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`job-location-${index}`}>Location</Label>
                      <Input
                        id={`job-location-${index}`}
                        value={job.location}
                        onChange={(e) => handleWorkExperienceChange(index, 'location', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label htmlFor={`description-${index}`}>Description</Label>
                      <Textarea
                        id={`description-${index}`}
                        value={job.description}
                        onChange={(e) =>
                          handleWorkExperienceChange(index, 'description', e.target.value)
                        }
                        rows={3}
                      />
                    </div>
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
