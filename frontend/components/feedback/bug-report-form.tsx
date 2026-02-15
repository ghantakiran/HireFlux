/**
 * Bug Report Form Component
 * Form for submitting bug reports with screenshot capture
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { bugReportSchema, BugReportFormData } from '@/lib/validations/schemas';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, X, Loader2 } from 'lucide-react';
import { captureAndPrepareScreenshot } from '@/lib/screenshot-utils';
import { FieldError } from '@/components/error/error-message';
import { OptimizedImage } from '@/components/ui/optimized-image';

export interface BugReportData {
  title: string;
  description: string;
  stepsToReproduce: string;
  expectedBehavior: string;
  actualBehavior: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  screenshot?: File;
  errorId?: string;
  url: string;
  userAgent: string;
}

export interface BugReportFormProps {
  onSubmit: (data: BugReportData) => Promise<void>;
  onCancel: () => void;
  errorContext?: {
    errorId: string;
    message: string;
    url: string;
  };
}

export function BugReportForm({ onSubmit, onCancel, errorContext }: BugReportFormProps) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<BugReportFormData>({
    resolver: zodResolver(bugReportSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      title: '',
      description: errorContext?.message || '',
      stepsToReproduce: '',
      expectedBehavior: '',
      actualBehavior: '',
      severity: 'medium',
    },
  });

  const [screenshot, setScreenshot] = useState<{
    file: File;
    preview: string;
    size: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Auto-capture screenshot on mount
  useEffect(() => {
    const autoCapture = async () => {
      try {
        setIsCapturing(true);
        const captured = await captureAndPrepareScreenshot();
        setScreenshot(captured);
      } catch (error) {
        console.error('Auto-capture failed:', error);
      } finally {
        setIsCapturing(false);
      }
    };

    autoCapture();
  }, []);

  const handleCaptureScreenshot = async () => {
    try {
      setIsCapturing(true);
      const captured = await captureAndPrepareScreenshot();
      setScreenshot(captured);
    } catch (error) {
      console.error('Screenshot capture failed:', error);
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
  };

  const onFormSubmit = handleSubmit(async (data) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const submitData: BugReportData = {
        title: data.title,
        description: data.description,
        stepsToReproduce: data.stepsToReproduce,
        expectedBehavior: data.expectedBehavior || '',
        actualBehavior: data.actualBehavior || '',
        severity: data.severity,
        screenshot: screenshot?.file,
        errorId: errorContext?.errorId,
        url: errorContext?.url || window.location.href,
        userAgent: navigator.userAgent,
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Submit failed:', error);
      setSubmitError('Failed to submit bug report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={onFormSubmit} className="space-y-4" data-testid="bug-report-form" data-bug-report-form>
      {/* Error ID (if from error context) */}
      {errorContext?.errorId && (
        <div className="bg-muted p-3 rounded-lg">
          <Label className="text-xs text-muted-foreground">Error ID</Label>
          <Input
            value={errorContext.errorId}
            readOnly
            className="mt-1"
            data-testid="error-id-input"
          />
        </div>
      )}

      {/* Title */}
      <div>
        <Label htmlFor="title">
          Bug Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          {...register('title')}
          placeholder="Brief description of the bug"
          className={errors.title ? 'border-destructive' : ''}
          data-field="title"
          required
        />
        <FieldError error={errors.title?.message} fieldName="title" />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          {...register('description')}
          placeholder="Describe what went wrong"
          className={errors.description ? 'border-destructive' : ''}
          data-field="description"
          rows={3}
          required
        />
        <FieldError error={errors.description?.message} fieldName="description" />
      </div>

      {/* Steps to Reproduce */}
      <div>
        <Label htmlFor="steps">
          Steps to Reproduce <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="steps"
          {...register('stepsToReproduce')}
          placeholder="1. Go to...\n2. Click on...\n3. Notice..."
          className={errors.stepsToReproduce ? 'border-destructive' : ''}
          data-field="steps"
          rows={4}
          required
        />
        <FieldError error={errors.stepsToReproduce?.message} fieldName="steps" />
      </div>

      {/* Expected Behavior */}
      <div>
        <Label htmlFor="expected">Expected Behavior</Label>
        <Textarea
          id="expected"
          {...register('expectedBehavior')}
          placeholder="What should happen"
          data-field="expected"
          rows={2}
        />
      </div>

      {/* Actual Behavior */}
      <div>
        <Label htmlFor="actual">Actual Behavior</Label>
        <Textarea
          id="actual"
          {...register('actualBehavior')}
          placeholder="What actually happened"
          data-field="actual"
          rows={2}
        />
      </div>

      {/* Severity */}
      <div>
        <Label htmlFor="severity">Severity</Label>
        <Controller
          name="severity"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="severity" data-field="severity">
                <SelectValue placeholder="Select severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low" data-severity="low">Low - Minor inconvenience</SelectItem>
                <SelectItem value="medium" data-severity="medium">Medium - Affects functionality</SelectItem>
                <SelectItem value="high" data-severity="high">High - Major functionality broken</SelectItem>
                <SelectItem value="critical" data-severity="critical">Critical - App unusable</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>

      {/* Screenshot */}
      <div>
        <Label>Screenshot</Label>
        <div
          className="mt-2 border-2 border-dashed rounded-lg p-4"
          data-testid="screenshot-preview"
        >
          {isCapturing ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-sm text-muted-foreground">Capturing screenshot...</span>
            </div>
          ) : screenshot ? (
            <div className="space-y-2">
              <div className="relative w-full h-64">
                <OptimizedImage
                  src={screenshot.preview}
                  alt="Screenshot"
                  fill
                  sizes="(max-width: 768px) 100vw, 600px"
                  className="rounded border"
                  objectFit="contain"
                  data-testid="screenshot-image"
                  data-screenshot-preview
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="icon"
                  className="absolute top-2 right-2 z-10"
                  onClick={handleRemoveScreenshot}
                  data-testid="screenshot-remove"
                  data-remove-screenshot
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground" data-testid="screenshot-size">
                Size: {screenshot.size}
              </p>
            </div>
          ) : (
            <div className="text-center py-8">
              <Button
                type="button"
                variant="outline"
                onClick={handleCaptureScreenshot}
                data-testid="screenshot-capture"
                data-capture-screenshot
              >
                <Camera className="mr-2 h-4 w-4" />
                Capture Screenshot
              </Button>
              <p className="mt-2 text-xs text-muted-foreground">
                Optional: Include a screenshot to help us understand the issue
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Submit Error */}
      {submitError && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
          data-submit-feedback
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Bug Report'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
