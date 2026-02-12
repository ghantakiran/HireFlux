/**
 * Job Detail/View Page - Issue #23
 *
 * Features:
 * - View complete job details
 * - Performance metrics (views, applications, avg fit index)
 * - Quick actions (edit, pause/resume, close, delete)
 * - Navigate to applications
 *
 * API Integration:
 * - GET /api/v1/employer/jobs/{id}
 */

'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useRouter, useParams } from 'next/navigation';
import {
  Edit,
  Pause,
  Play,
  XCircle,
  Trash2,
  Users,
  Eye,
  TrendingUp,
  Calendar,
  MapPin,
  Briefcase,
  DollarSign,
  ArrowLeft,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';

// Types
interface Job {
  id: string;
  title: string;
  company: string;
  department: string;
  location: string;
  location_type: string;
  employment_type: string;
  experience_level?: string;
  experience_min_years?: number;
  experience_max_years?: number;
  salary_min?: number;
  salary_max?: number;
  salary_currency?: string;
  description: string;
  required_skills: string[];
  preferred_skills: string[];
  is_active: boolean;
  applications_count?: number;
  views_count?: number;
  avg_fit_index?: number;
  created_at: string;
  updated_at: string;
  posted_date?: string;
}

export default function JobDetailPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [job, setJob] = useState<Job | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch job details
  useEffect(() => {
    const fetchJob = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/employer/login');
          return;
        }

        const response = await fetch(`/api/v1/employer/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch job details');
        }

        const data = await response.json();
        setJob(data.success ? data.data : data);
      } catch (err) {
        console.error('Job fetch error:', err);
        setError(err instanceof Error ? err.message : 'Failed to load job');
        toast.error('Failed to load job details. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-5xl">
          <Skeleton className="h-10 w-64 mb-6" />
          <Card>
            <CardContent className="p-8">
              <Skeleton className="h-8 w-full mb-4" />
              <Skeleton className="h-6 w-3/4 mb-6" />
              <Skeleton className="h-32 w-full" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">{error || 'Job not found'}</p>
            <Button onClick={() => router.push('/employer/jobs')}>
              Back to Jobs
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatSalary = () => {
    if (!job.salary_min && !job.salary_max) return null;
    const currency = job.salary_currency || 'USD';
    if (job.salary_min && job.salary_max) {
      return `${currency} ${(job.salary_min / 1000).toFixed(0)}K - ${(job.salary_max / 1000).toFixed(0)}K`;
    }
    if (job.salary_min) return `${currency} ${(job.salary_min / 1000).toFixed(0)}K+`;
    return `Up to ${currency} ${(job.salary_max! / 1000).toFixed(0)}K`;
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(dateString));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Back button */}
        <Button
          variant="ghost"
          onClick={() => router.push('/employer/jobs')}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Jobs
        </Button>

        {/* Header */}
        <div className="bg-white rounded-lg border p-6 mb-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{job.title}</h1>
                <Badge variant={job.is_active ? 'default' : 'secondary'}>
                  {job.is_active ? 'Active' : 'Closed'}
                </Badge>
              </div>
              <p className="text-lg text-gray-600">{job.company}</p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => router.push(`/employer/jobs/${job.id}/edit`)}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
            </div>
          </div>

          {/* Job meta */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span>{job.department}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span>
                {job.location} • <span className="capitalize">{job.location_type}</span>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span className="capitalize">{job.employment_type}</span>
            </div>
            {formatSalary() && (
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                <span>{formatSalary()}</span>
              </div>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Applications</p>
                  <p className="text-3xl font-bold">{job.applications_count || 0}</p>
                </div>
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Views</p>
                  <p className="text-3xl font-bold">{job.views_count || 0}</p>
                </div>
                <Eye className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 mb-1">Avg Fit Index</p>
                  <p className="text-3xl font-bold">
                    {job.avg_fit_index ? job.avg_fit_index.toFixed(1) : '--'}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Job Details */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Job Description</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <p className="whitespace-pre-wrap text-gray-700">{job.description}</p>
            </div>

            {job.required_skills && job.required_skills.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Required Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.required_skills.map((skill, index) => (
                      <Badge key={index}>{skill}</Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            {job.preferred_skills && job.preferred_skills.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Preferred Skills</h3>
                  <div className="flex flex-wrap gap-2">
                    {job.preferred_skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              </>
            )}

            <Separator />
            <div className="text-sm text-gray-500">
              Posted on {formatDate(job.posted_date || job.created_at)}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        {(job.applications_count || 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Applications</CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                onClick={() =>
                  router.push(`/employer/jobs/${job.id}/applications`)
                }
              >
                View {job.applications_count} Application
                {job.applications_count !== 1 ? 's' : ''}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
