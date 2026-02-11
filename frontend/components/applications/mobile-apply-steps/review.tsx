'use client';

/**
 * Review Step
 * Issue #142: Step 3 of mobile application flow
 *
 * Features:
 * - Review all application details
 * - Edit buttons for each section
 * - Terms and conditions checkbox
 * - Submission error handling
 * - Retry functionality
 */

import React from 'react';
import { Edit2, FileText, User, Mail, Phone, MessageSquare, Briefcase, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import type { ApplicationData } from '../mobile-apply-modal';

interface ReviewStepProps {
  applicationData: ApplicationData;
  updateData: (updates: Partial<ApplicationData>) => void;
  jobTitle: string;
  companyName: string;
  location?: string;
  onEditResume: () => void;
  onEditDetails: () => void;
  isSubmitting: boolean;
  submissionError: string | null;
  onRetry: () => void;
}

export function ReviewStep({
  applicationData,
  updateData,
  jobTitle,
  companyName,
  location,
  onEditResume,
  onEditDetails,
  isSubmitting,
  submissionError,
  onRetry,
}: ReviewStepProps) {
  // Get resume name
  const getResumeName = () => {
    if (applicationData.resumeFile) {
      return applicationData.resumeFile.name;
    }
    if (applicationData.resumeId) {
      // TODO: Get actual resume name from API
      return 'Software Engineer Resume.pdf';
    }
    if (applicationData.resumeUrl) {
      return 'Resume from camera';
    }
    return 'Unknown resume';
  };

  return (
    <div data-application-review className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Review Application</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Please review your details before submitting
        </p>
      </div>

      {/* Job Details Section */}
      <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg space-y-3">
        <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Briefcase className="h-5 w-5 text-gray-600 dark:text-gray-400" />
          Job Details
        </h3>

        <div className="space-y-2">
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Position</p>
            <p data-review-job-title className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {jobTitle}
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400">Company</p>
            <p data-review-company className="text-sm font-medium text-gray-900 dark:text-gray-100">
              {companyName}
            </p>
          </div>

          {location && (
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Location</p>
              <p data-review-location className="text-sm font-medium text-gray-900 dark:text-gray-100 flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {location}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Resume Section */}
      <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Resume
          </h3>
          <Button
            data-edit-resume
            onClick={onEditResume}
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-blue-600 hover:text-blue-700"
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>

        <div data-review-resume className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-950 rounded-lg">
          <div className="flex-shrink-0 w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {getResumeName()}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {applicationData.resumeFile
                ? `${(applicationData.resumeFile.size / 1024).toFixed(0)} KB`
                : 'PDF document'}
            </p>
          </div>
        </div>
      </div>

      {/* Applicant Details Section */}
      <div className="p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <User className="h-5 w-5 text-purple-600" />
            Your Details
          </h3>
          <Button
            data-edit-details
            onClick={onEditDetails}
            size="sm"
            variant="ghost"
            className="h-8 text-xs text-blue-600 hover:text-blue-700"
          >
            <Edit2 className="h-3 w-3 mr-1" />
            Edit
          </Button>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <User className="h-4 w-4 text-purple-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Full Name</p>
              <p data-review-name className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {applicationData.fullName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
              <Mail className="h-4 w-4 text-green-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
              <p data-review-email className="text-sm font-medium text-gray-900 dark:text-gray-100 break-all">
                {applicationData.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
              <Phone className="h-4 w-4 text-orange-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
              <p data-review-phone className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {applicationData.phone}
              </p>
            </div>
          </div>

          {applicationData.coverLetter && (
            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Cover Letter</p>
                  <div
                    data-review-cover-letter
                    className="text-sm text-gray-900 dark:text-gray-100 max-h-32 overflow-y-auto p-2 bg-gray-50 dark:bg-gray-950 rounded-lg"
                  >
                    {applicationData.coverLetter}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Terms and Conditions */}
      <div className="p-4 bg-gray-50 dark:bg-gray-950 border border-gray-200 dark:border-gray-700 rounded-lg">
        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            data-terms-checkbox
            checked={applicationData.termsAccepted}
            onChange={(e) => updateData({ termsAccepted: e.target.checked })}
            className="mt-1"
          />
          <div>
            <p data-terms-label className="text-sm text-gray-900 dark:text-gray-100">
              I agree to the{' '}
              <a href="/terms" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              By submitting, you consent to sharing your information with {companyName}.
            </p>
          </div>
        </label>

        {!applicationData.termsAccepted && submissionError && (
          <p data-error="terms" role="alert" aria-live="polite" className="text-sm text-red-600 dark:text-red-400 mt-2">
            Please accept the terms and conditions to continue
          </p>
        )}
      </div>

      {/* Submission Error */}
      {submissionError && (
        <div data-application-error className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
          <p className="text-sm text-red-900 dark:text-red-300 mb-3">{submissionError}</p>

          {submissionError.includes('session') || submissionError.includes('login') ? (
            <Button
              data-login-button
              onClick={() => (window.location.href = '/login')}
              size="sm"
              className="w-full bg-red-600 hover:bg-red-700"
            >
              Log In Again
            </Button>
          ) : submissionError.includes('already applied') ? (
            <div data-duplicate-error>
              <Button
                data-view-application
                onClick={() => (window.location.href = '/dashboard/applications')}
                size="sm"
                className="w-full"
              >
                View Your Applications
              </Button>
            </div>
          ) : (
            <Button
              data-retry-button
              onClick={onRetry}
              size="sm"
              variant="outline"
              className="w-full border-red-300 text-red-700 dark:text-red-400 hover:bg-red-100"
            >
              Try Again
            </Button>
          )}
        </div>
      )}

      {/* Info Note */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900 dark:text-blue-300">
          🔒 Your information is secure and will only be shared with {companyName}.
        </p>
      </div>
    </div>
  );
}
