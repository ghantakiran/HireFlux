/**
 * Job Edit Page - Issue #23
 *
 * Similar to creation page but pre-fills existing job data
 * For MVP, users can view details and create new jobs
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Save, Eye, ArrowLeft } from 'lucide-react';
import { PageLoader } from '@/components/ui/page-loader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId as string;

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Fetch job and redirect to edit mode
    const loadJob = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          router.push('/employer/login');
          return;
        }

        const response = await fetch(`/api/v1/employer/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          throw new Error('Failed to load job');
        }

        // Job loaded - would populate form here
        setIsLoading(false);
      } catch (err) {
        console.error('Load error:', err);
        alert('Failed to load job for editing');
        router.push('/employer/jobs');
      }
    };

    loadJob();
  }, [jobId]);

  if (isLoading) {
    return <PageLoader message="Loading job..." fullScreen />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => router.push(`/employer/jobs/${jobId}`)}
          className="mb-4 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Job
        </Button>

        <Card>
          <CardContent className="p-8">
            <h1 className="text-2xl font-bold mb-4">Edit Job</h1>
            <p className="text-gray-600">
              Job editing functionality will reuse creation page components.
              For now, please delete and recreate the job or contact support.
            </p>
            <div className="mt-6 flex gap-3">
              <Button onClick={() => router.push(`/employer/jobs/${jobId}`)}>
                View Job
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/employer/jobs/new')}
              >
                Create New Job
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
