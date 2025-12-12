/**
 * Not Found Error Components (404)
 * Specific error displays for missing resources
 */

'use client';

import React from 'react';
import { FileQuestion, Briefcase, FileText, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export interface NotFoundErrorProps {
  resourceType?: 'job' | 'resume' | 'cover-letter' | 'application' | 'page';
  suggestions?: Array<{ label: string; href: string }>;
  similarItems?: Array<{ id: string; title: string; href: string }>;
}

export function NotFoundError({
  resourceType = 'page',
  suggestions = [],
  similarItems = [],
}: NotFoundErrorProps) {
  const getIcon = () => {
    switch (resourceType) {
      case 'job':
        return <Briefcase className="h-24 w-24" />;
      case 'resume':
      case 'cover-letter':
        return <FileText className="h-24 w-24" />;
      default:
        return <FileQuestion className="h-24 w-24" />;
    }
  };

  const getMessage = () => {
    switch (resourceType) {
      case 'job':
        return 'Job not found';
      case 'resume':
        return 'Resume not found';
      case 'cover-letter':
        return 'Cover letter not found';
      case 'application':
        return 'Application not found';
      default:
        return 'Page not found';
    }
  };

  const getDescription = () => {
    switch (resourceType) {
      case 'job':
        return 'This job may have been filled or is no longer available.';
      case 'resume':
        return 'This resume may have been deleted or moved.';
      case 'cover-letter':
        return 'This cover letter may have been deleted or moved.';
      default:
        return "The page you're looking for doesn't exist or has been moved.";
    }
  };

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[400px] p-8"
      data-testid="404-error"
    >
      <div className="text-gray-400 dark:text-gray-600 mb-6">{getIcon()}</div>

      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{getMessage()}</h1>

      <p className="text-gray-600 dark:text-gray-400 text-center mb-8 max-w-md">
        {getDescription()}
      </p>

      {/* Similar Items */}
      {similarItems.length > 0 && (
        <div className="w-full max-w-md mb-6" data-testid="similar-jobs">
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {resourceType === 'job' ? 'Similar Jobs' : 'You might like these'}
          </h3>
          <div className="space-y-2">
            {similarItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="block p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {item.title}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion, index) => (
            <Button key={index} asChild variant={index === 0 ? 'default' : 'outline'}>
              <Link href={suggestion.href}>{suggestion.label}</Link>
            </Button>
          ))
        ) : (
          <>
            {resourceType === 'job' && (
              <Button asChild>
                <Link href="/dashboard/jobs">
                  <Briefcase className="mr-2 h-4 w-4" />
                  Browse All Jobs
                </Link>
              </Button>
            )}
            {resourceType === 'resume' && (
              <>
                <Button asChild>
                  <Link href="/dashboard/resumes/new">
                    <FileText className="mr-2 h-4 w-4" />
                    Create New Resume
                  </Link>
                </Button>
                <Button asChild variant="outline">
                  <Link href="/dashboard/resumes">View My Resumes</Link>
                </Button>
              </>
            )}
            <Button asChild variant="outline">
              <Link href="/dashboard">
                <Home className="mr-2 h-4 w-4" />
                Go to Dashboard
              </Link>
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * Job Not Found Component
 */
export function JobNotFoundError({ similarJobs }: { similarJobs?: Array<any> }) {
  const suggestions = [
    { label: 'Browse All Jobs', href: '/dashboard/jobs' },
    { label: 'Go to Dashboard', href: '/dashboard' },
  ];

  const similarItems = similarJobs?.slice(0, 3).map((job) => ({
    id: job.id,
    title: job.title,
    href: `/dashboard/jobs/${job.id}`,
  }));

  return <NotFoundError resourceType="job" suggestions={suggestions} similarItems={similarItems} />;
}

/**
 * Resume Not Found Component
 */
export function ResumeNotFoundError() {
  const suggestions = [
    { label: 'Create New Resume', href: '/dashboard/resumes/new' },
    { label: 'View My Resumes', href: '/dashboard/resumes' },
  ];

  return <NotFoundError resourceType="resume" suggestions={suggestions} />;
}
