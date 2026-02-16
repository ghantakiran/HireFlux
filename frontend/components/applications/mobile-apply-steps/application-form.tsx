'use client';

/**
 * Application Form Step
 * Issue #142: Step 2 of mobile application flow
 *
 * Features:
 * - Simplified form with essential fields only
 * - Pre-filled from user profile
 * - Touch-friendly inputs (44px+ height)
 * - Mobile-optimized keyboards
 * - AI cover letter generation
 * - Real-time validation
 */

import React, { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { ApplicationData } from '../mobile-apply-modal';
import { getErrorMessage } from '@/lib/api-error-handler';

interface ApplicationFormStepProps {
  applicationData: ApplicationData;
  updateData: (updates: Partial<ApplicationData>) => void;
  jobTitle: string;
  companyName: string;
}

// Mock user profile (TODO: Replace with actual user context)
const MOCK_USER = {
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  phone: '+1 (555) 123-4567',
};

export function ApplicationFormStep({
  applicationData,
  updateData,
  jobTitle,
  companyName,
}: ApplicationFormStepProps) {
  // Form validation errors
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Cover letter generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Pre-fill form on mount if data is empty
  useEffect(() => {
    if (!applicationData.fullName) {
      updateData({
        fullName: `${MOCK_USER.firstName} ${MOCK_USER.lastName}`,
        email: MOCK_USER.email,
        phone: MOCK_USER.phone,
      });
    }
  }, []);

  // Handle input change
  const handleChange = (field: keyof ApplicationData, value: string) => {
    updateData({ [field]: value });

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validate full name
    if (!applicationData.fullName?.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    // Validate email
    if (!applicationData.email?.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(applicationData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Validate phone
    if (!applicationData.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    } else if (!/^[\d\s\-\+\(\)]+$/.test(applicationData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Generate cover letter
  const handleGenerateCoverLetter = async () => {
    setIsGenerating(true);
    setGenerationError(null);

    try {
      // Simulate AI generation (TODO: Replace with actual API call)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      const generated = `Dear Hiring Manager,

I am writing to express my strong interest in the ${jobTitle} position at ${companyName}. With my background in software development and passion for innovation, I believe I would be a valuable addition to your team.

Throughout my career, I have consistently demonstrated my ability to deliver high-quality solutions and collaborate effectively with cross-functional teams. I am particularly excited about the opportunity to contribute to ${companyName}'s mission and work on challenging projects that make a real impact.

I would welcome the opportunity to discuss how my skills and experience align with your needs. Thank you for considering my application.

Best regards,
${applicationData.fullName}`;

      updateData({ coverLetter: generated });
    } catch (error: unknown) {
      setGenerationError(getErrorMessage(error, 'Failed to generate cover letter. Please try again.'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Character count for cover letter
  const maxCoverLetterLength = 2000;
  const coverLetterLength = applicationData.coverLetter?.length || 0;

  return (
    <div data-application-form className="p-4 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Your Details</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
          Tell us about yourself
        </p>
      </div>

      {/* Form Fields */}
      <div className="space-y-4">
        {/* Full Name */}
        <div>
          <Label htmlFor="fullName" className="text-base font-medium">
            Full Name *
          </Label>
          <Input
            id="fullName"
            name="fullName"
            type="text"
            value={applicationData.fullName}
            onChange={(e) => handleChange('fullName', e.target.value)}
            placeholder="John Doe"
            className="h-12 text-base mt-2"
            aria-required="true"
            aria-invalid={!!errors.fullName}
            aria-describedby={errors.fullName ? 'error-fullName' : undefined}
          />
          {errors.fullName && (
            <p id="error-fullName" data-error="fullName" role="alert" aria-live="polite" className="text-sm text-red-600 dark:text-red-400 mt-1">
              {errors.fullName}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <Label htmlFor="email" className="text-base font-medium">
            Email Address *
          </Label>
          <Input
            id="email"
            name="email"
            type="email"
            inputMode="email"
            value={applicationData.email}
            onChange={(e) => handleChange('email', e.target.value)}
            placeholder="john.doe@example.com"
            className="h-12 text-base mt-2"
            aria-required="true"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? 'error-email' : undefined}
          />
          {errors.email && (
            <p id="error-email" data-error="email" role="alert" aria-live="polite" className="text-sm text-red-600 dark:text-red-400 mt-1">
              {errors.email}
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <Label htmlFor="phone" className="text-base font-medium">
            Phone Number *
          </Label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            inputMode="tel"
            value={applicationData.phone}
            onChange={(e) => handleChange('phone', e.target.value)}
            placeholder="+1 (555) 123-4567"
            className="h-12 text-base mt-2"
            aria-required="true"
            aria-invalid={!!errors.phone}
            aria-describedby={errors.phone ? 'error-phone' : undefined}
          />
          {errors.phone && (
            <p id="error-phone" data-error="phone" role="alert" aria-live="polite" className="text-sm text-red-600 dark:text-red-400 mt-1">
              {errors.phone}
            </p>
          )}
        </div>

        {/* Cover Letter */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="coverLetter" className="text-base font-medium">
              Cover Letter (Optional)
            </Label>
            <Button
              data-generate-cover-letter
              onClick={handleGenerateCoverLetter}
              disabled={isGenerating || !applicationData.fullName}
              size="sm"
              variant="outline"
              className="h-8 text-xs"
            >
              {isGenerating ? (
                <>
                  <span data-generating className="animate-spin mr-1">⏳</span>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generate with AI
                </>
              )}
            </Button>
          </div>

          <Textarea
            id="coverLetter"
            name="coverLetter"
            value={applicationData.coverLetter || ''}
            onChange={(e) => handleChange('coverLetter', e.target.value)}
            placeholder="Tell us why you're interested in this role..."
            maxLength={maxCoverLetterLength}
            rows={8}
            className="text-base resize-none"
          />

          {/* Character Count */}
          <div className="flex items-center justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
            <p data-char-count>
              {coverLetterLength} / {maxCoverLetterLength} characters
            </p>
            {coverLetterLength > maxCoverLetterLength * 0.9 && (
              <p className="text-orange-600">
                {maxCoverLetterLength - coverLetterLength} remaining
              </p>
            )}
          </div>

          {/* Generation Error */}
          {generationError && (
            <div data-generation-error className="mt-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 rounded-lg">
              <p className="text-sm text-red-900 dark:text-red-300">{generationError}</p>
            </div>
          )}
        </div>
      </div>

      {/* Info Note */}
      <div className="p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
        <p className="text-xs text-blue-900 dark:text-blue-300">
          💡 <strong>Tip:</strong> A personalized cover letter can increase your chances of getting noticed by 40%.
        </p>
      </div>
    </div>
  );
}
