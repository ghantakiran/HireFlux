'use client';

/**
 * Mobile Application Flow Modal
 * Issue #142: Mobile-optimized job application with camera upload
 *
 * Features:
 * - Full-screen modal optimized for mobile
 * - Multi-step wizard (Resume → Form → Review)
 * - Touch-friendly inputs (44px+ tap targets)
 * - Camera resume upload with OCR
 * - Instant submit with optimistic UI
 * - iOS safe area support
 */

import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, Upload, Camera, FileText, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { ResumeUploadStep } from './mobile-apply-steps/resume-upload';
import { ApplicationFormStep } from './mobile-apply-steps/application-form';
import { ReviewStep } from './mobile-apply-steps/review';
import { SuccessScreen } from './mobile-apply-steps/success';

// Application steps
const STEPS = [
  { id: 1, label: 'Resume', icon: FileText },
  { id: 2, label: 'Details', icon: Upload },
  { id: 3, label: 'Review', icon: Check },
] as const;

export interface ApplicationData {
  // Step 1: Resume
  resumeId?: string;
  resumeFile?: File;
  resumeUrl?: string;

  // Step 2: Form
  fullName: string;
  email: string;
  phone: string;
  coverLetter?: string;

  // Step 3: Review
  termsAccepted: boolean;
}

interface MobileApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  companyName: string;
  location?: string;
}

export function MobileApplyModal({
  isOpen,
  onClose,
  jobId,
  jobTitle,
  companyName,
  location,
}: MobileApplyModalProps) {
  // Current step (1-3, 4 = success)
  const [currentStep, setCurrentStep] = useState(1);

  // Application data
  const [applicationData, setApplicationData] = useState<ApplicationData>({
    fullName: '',
    email: '',
    phone: '',
    termsAccepted: false,
  });

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [applicationRef, setApplicationRef] = useState<string | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setCurrentStep(1);
      setSubmissionError(null);
      setApplicationRef(null);
      // Keep user data but reset resume selection
      setApplicationData((prev) => ({
        ...prev,
        resumeId: undefined,
        resumeFile: undefined,
        resumeUrl: undefined,
        termsAccepted: false,
      }));
    }
  }, [isOpen]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Update application data
  const updateData = useCallback((updates: Partial<ApplicationData>) => {
    setApplicationData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Go to next step
  const handleNext = useCallback(() => {
    if (currentStep < 3) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  // Go to previous step
  const handleBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // Go to specific step (for edit buttons)
  const goToStep = useCallback((step: number) => {
    setCurrentStep(step);
  }, []);

  // Submit application
  const handleSubmit = useCallback(async () => {
    setIsSubmitting(true);
    setSubmissionError(null);

    try {
      // Optimistic UI - show submitting state immediately
      await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure UI updates

      // Submit application
      const response = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jobId,
          resumeId: applicationData.resumeId,
          fullName: applicationData.fullName,
          email: applicationData.email,
          phone: applicationData.phone,
          coverLetter: applicationData.coverLetter,
        }),
      });

      if (!response.ok) {
        const error = await response.json();

        if (response.status === 409) {
          throw new Error('You have already applied to this job.');
        } else if (response.status === 401) {
          throw new Error('Your session has expired. Please log in again.');
        } else {
          throw new Error(error.message || 'Failed to submit application. Please try again.');
        }
      }

      const result = await response.json();

      // Save to localStorage
      const applications = JSON.parse(localStorage.getItem('applications') || '[]');
      applications.push({
        id: result.id,
        jobId,
        jobTitle,
        companyName,
        status: 'submitted',
        submittedAt: new Date().toISOString(),
        ...applicationData,
      });
      localStorage.setItem('applications', JSON.stringify(applications));

      // Show success screen
      setApplicationRef(result.referenceNumber || `APP-${result.id}`);
      setCurrentStep(4); // Success screen
    } catch (error: any) {
      setSubmissionError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }, [jobId, jobTitle, companyName, applicationData]);

  // Retry submission after error
  const handleRetry = useCallback(() => {
    setSubmissionError(null);
    handleSubmit();
  }, [handleSubmit]);

  // Close modal and reset
  const handleClose = useCallback(() => {
    if (!isSubmitting) {
      onClose();
    }
  }, [isSubmitting, onClose]);

  // Check if current step is complete
  const isStepComplete = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        return !!(applicationData.resumeId || applicationData.resumeFile);
      case 2:
        return !!(
          applicationData.fullName &&
          applicationData.email &&
          applicationData.phone
        );
      case 3:
        return applicationData.termsAccepted;
      default:
        return false;
    }
  }, [applicationData]);

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent
        data-application-modal
        className="fixed inset-0 z-50 w-full h-full max-w-none m-0 p-0 rounded-none bg-white dark:bg-gray-900"
        style={{
          paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 0px)',
        }}
      >
        {/* Backdrop for click outside detection */}
        <div data-modal-backdrop className="hidden" />

        {/* Success Screen */}
        {currentStep === 4 && (
          <SuccessScreen
            jobTitle={jobTitle}
            companyName={companyName}
            referenceNumber={applicationRef || ''}
            onClose={handleClose}
            onViewApplication={() => {
              handleClose();
              window.location.href = '/dashboard/applications';
            }}
            onApplyMore={() => {
              handleClose();
              window.location.href = '/jobs';
            }}
          />
        )}

        {/* Application Steps */}
        {currentStep < 4 && (
          <>
            {/* Fixed Header */}
            <header
              data-modal-header
              className="fixed top-0 left-0 right-0 z-10 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700"
              style={{
                paddingTop: 'max(env(safe-area-inset-top, 0px), 16px)',
              }}
            >
              <div className="flex items-center justify-between px-4 py-3">
                {/* Back/Close Button */}
                {currentStep === 1 ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    data-modal-close
                    onClick={handleClose}
                    aria-label="Close"
                    className="h-10 w-10"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    data-back-button
                    onClick={handleBack}
                    aria-label="Go back"
                    className="h-10 w-10"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}

                {/* Title */}
                <h1 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                  Apply to {companyName}
                </h1>

                {/* Spacer for centering */}
                <div className="w-10" />
              </div>

              {/* Progress Bar */}
              <div
                data-application-progress
                className="px-4 pb-3"
              >
                <div className="flex items-center justify-between gap-2">
                  {STEPS.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = currentStep === step.id;
                    const isCompleted = currentStep > step.id || isStepComplete(step.id);

                    return (
                      <React.Fragment key={step.id}>
                        {/* Step Indicator */}
                        <button
                          data-progress-step={step.id}
                          data-active={isActive ? 'true' : 'false'}
                          data-completed={isCompleted ? 'true' : 'false'}
                          onClick={() => isCompleted && goToStep(step.id)}
                          disabled={!isCompleted && currentStep < step.id}
                          className={`
                            flex flex-col items-center gap-1 flex-1
                            transition-all duration-200
                            ${isCompleted ? 'cursor-pointer' : 'cursor-default'}
                          `}
                        >
                          {/* Icon Circle */}
                          <div
                            className={`
                              flex items-center justify-center
                              w-10 h-10 rounded-full
                              transition-colors duration-200
                              ${
                                isActive
                                  ? 'bg-blue-600 text-white'
                                  : isCompleted
                                  ? 'bg-green-600 text-white'
                                  : 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                              }
                            `}
                          >
                            {isCompleted && !isActive ? (
                              <Check className="h-5 w-5" />
                            ) : (
                              <Icon className="h-5 w-5" />
                            )}
                          </div>

                          {/* Step Label (mobile: compact, desktop: full) */}
                          <span
                            data-step-label
                            className={`
                              text-xs font-medium hidden sm:block
                              ${
                                isActive
                                  ? 'text-blue-600 dark:text-blue-400'
                                  : isCompleted
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-500 dark:text-gray-400'
                              }
                            `}
                          >
                            {step.label}
                          </span>

                          {/* Step Number (mobile only) */}
                          <span
                            className={`
                              text-xs sm:hidden
                              ${
                                isActive
                                  ? 'text-blue-600 dark:text-blue-400 font-semibold'
                                  : isCompleted
                                  ? 'text-green-600 dark:text-green-400'
                                  : 'text-gray-500 dark:text-gray-400'
                              }
                            `}
                          >
                            {step.id}
                          </span>
                        </button>

                        {/* Connector Line */}
                        {index < STEPS.length - 1 && (
                          <div
                            className={`
                              h-0.5 flex-1 -mx-2
                              transition-colors duration-200
                              ${
                                currentStep > step.id
                                  ? 'bg-green-600'
                                  : 'bg-gray-200 dark:bg-gray-700'
                              }
                            `}
                          />
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Step Text */}
                <p className="text-xs text-gray-600 dark:text-gray-400 text-center mt-2">
                  Step {currentStep} of {STEPS.length}
                </p>
              </div>
            </header>

            {/* Scrollable Content */}
            <main
              data-modal-content
              data-application-step={currentStep}
              className="overflow-y-auto h-full"
              style={{
                paddingTop: 'calc(130px + max(env(safe-area-inset-top, 0px), 0px))',
                paddingBottom: 'calc(80px + max(env(safe-area-inset-bottom, 0px), 0px))',
              }}
            >
              {/* Step 1: Resume Upload */}
              {currentStep === 1 && (
                <ResumeUploadStep
                  applicationData={applicationData}
                  updateData={updateData}
                />
              )}

              {/* Step 2: Application Form */}
              {currentStep === 2 && (
                <ApplicationFormStep
                  applicationData={applicationData}
                  updateData={updateData}
                  jobTitle={jobTitle}
                  companyName={companyName}
                />
              )}

              {/* Step 3: Review */}
              {currentStep === 3 && (
                <ReviewStep
                  applicationData={applicationData}
                  updateData={updateData}
                  jobTitle={jobTitle}
                  companyName={companyName}
                  location={location}
                  onEditResume={() => goToStep(1)}
                  onEditDetails={() => goToStep(2)}
                  isSubmitting={isSubmitting}
                  submissionError={submissionError}
                  onRetry={handleRetry}
                />
              )}
            </main>

            {/* Fixed Footer with Action Buttons */}
            <footer
              data-modal-footer
              className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-4 py-3"
              style={{
                paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 12px)',
              }}
            >
              {currentStep < 3 ? (
                <Button
                  data-next-button
                  onClick={handleNext}
                  disabled={!isStepComplete(currentStep)}
                  className="w-full h-12 text-base font-semibold"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  data-submit-button
                  onClick={handleSubmit}
                  disabled={!isStepComplete(3) || isSubmitting}
                  className="w-full h-12 text-base font-semibold"
                >
                  {isSubmitting ? (
                    <>
                      <span data-submitting data-loading-spinner className="inline-block animate-spin mr-2">
                        ⏳
                      </span>
                      Submitting...
                    </>
                  ) : (
                    'Submit Application'
                  )}
                </Button>
              )}
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
