/**
 * Bug Report Form Component
 * Form for submitting bug reports with screenshot capture
 */

'use client';

import React, { useState, useEffect } from 'react';
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
  const [formData, setFormData] = useState<Partial<BugReportData>>({
    title: '',
    description: errorContext?.message || '',
    stepsToReproduce: '',
    expectedBehavior: '',
    actualBehavior: '',
    severity: 'medium',
    errorId: errorContext?.errorId || '',
    url: errorContext?.url || window.location.href,
    userAgent: navigator.userAgent,
  });

  const [screenshot, setScreenshot] = useState<{
    file: File;
    preview: string;
    size: string;
  } | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

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

  const handleChange = (field: keyof BugReportData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleCaptureScreenshot = async () => {
    try {
      setIsCapturing(true);
      const captured = await captureAndPrepareScreenshot();
      setScreenshot(captured);
    } catch (error) {
      console.error('Screenshot capture failed:', error);
      setErrors((prev) => ({
        ...prev,
        screenshot: 'Failed to capture screenshot',
      }));
    } finally {
      setIsCapturing(false);
    }
  };

  const handleRemoveScreenshot = () => {
    setScreenshot(null);
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.stepsToReproduce?.trim()) {
      newErrors.stepsToReproduce = 'Steps to reproduce are required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      setIsSubmitting(true);

      const submitData: BugReportData = {
        title: formData.title!,
        description: formData.description!,
        stepsToReproduce: formData.stepsToReproduce!,
        expectedBehavior: formData.expectedBehavior || '',
        actualBehavior: formData.actualBehavior || '',
        severity: formData.severity || 'medium',
        screenshot: screenshot?.file,
        errorId: formData.errorId,
        url: formData.url!,
        userAgent: formData.userAgent!,
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Submit failed:', error);
      setErrors((prev) => ({
        ...prev,
        submit: 'Failed to submit bug report. Please try again.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="bug-report-form" data-bug-report-form>
      {/* Error ID (if from error context) */}
      {formData.errorId && (
        <div className="bg-muted p-3 rounded-lg">
          <Label className="text-xs text-muted-foreground">Error ID</Label>
          <Input
            value={formData.errorId}
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
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="Brief description of the bug"
          className={errors.title ? 'border-destructive' : ''}
          data-field="title"
          required
        />
        <FieldError error={errors.title} fieldName="title" />
      </div>

      {/* Description */}
      <div>
        <Label htmlFor="description">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleChange('description', e.target.value)}
          placeholder="Describe what went wrong"
          className={errors.description ? 'border-destructive' : ''}
          data-field="description"
          rows={3}
          required
        />
        <FieldError error={errors.description} fieldName="description" />
      </div>

      {/* Steps to Reproduce */}
      <div>
        <Label htmlFor="steps">
          Steps to Reproduce <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="steps"
          value={formData.stepsToReproduce}
          onChange={(e) => handleChange('stepsToReproduce', e.target.value)}
          placeholder="1. Go to...\n2. Click on...\n3. Notice..."
          className={errors.stepsToReproduce ? 'border-destructive' : ''}
          data-field="steps"
          rows={4}
          required
        />
        <FieldError error={errors.stepsToReproduce} fieldName="steps" />
      </div>

      {/* Expected Behavior */}
      <div>
        <Label htmlFor="expected">Expected Behavior</Label>
        <Textarea
          id="expected"
          value={formData.expectedBehavior}
          onChange={(e) => handleChange('expectedBehavior', e.target.value)}
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
          value={formData.actualBehavior}
          onChange={(e) => handleChange('actualBehavior', e.target.value)}
          placeholder="What actually happened"
          data-field="actual"
          rows={2}
        />
      </div>

      {/* Severity */}
      <div>
        <Label htmlFor="severity">Severity</Label>
        <Select
          value={formData.severity}
          onValueChange={(value) => handleChange('severity', value as BugReportData['severity'])}
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
      {errors.submit && (
        <div className="bg-destructive/10 text-destructive p-3 rounded-lg text-sm">
          {errors.submit}
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <Button
          type="submit"
          disabled={isSubmitting || Object.keys(errors).length > 0}
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
