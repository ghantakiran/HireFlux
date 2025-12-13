/**
 * Feature Request Form Component
 * Form for submitting feature requests with mockup attachments
 */

'use client';

import React, { useState } from 'react';
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
import { Upload, X, Loader2, Image as ImageIcon } from 'lucide-react';
import { FieldError } from '@/components/error/error-message';
import { OptimizedImage } from '@/components/ui/optimized-image';

export interface FeatureRequestData {
  title: string;
  description: string;
  useCase: string;
  priority: 'low' | 'medium' | 'high';
  mockups?: File[];
}

export interface FeatureRequestFormProps {
  onSubmit: (data: FeatureRequestData) => Promise<void>;
  onCancel: () => void;
}

export function FeatureRequestForm({ onSubmit, onCancel }: FeatureRequestFormProps) {
  const [formData, setFormData] = useState<Partial<FeatureRequestData>>({
    title: '',
    description: '',
    useCase: '',
    priority: 'medium',
  });

  const [mockups, setMockups] = useState<Array<{ file: File; preview: string }>>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (field: keyof FeatureRequestData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    // Validate file types and sizes
    const validFiles: Array<{ file: File; preview: string }> = [];
    const maxSize = 5 * 1024 * 1024; // 5MB

    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        setErrors((prev) => ({
          ...prev,
          mockups: 'Only image files are allowed',
        }));
        continue;
      }

      if (file.size > maxSize) {
        setErrors((prev) => ({
          ...prev,
          mockups: 'Images must be less than 5MB',
        }));
        continue;
      }

      if (mockups.length + validFiles.length >= 3) {
        setErrors((prev) => ({
          ...prev,
          mockups: 'Maximum 3 images allowed',
        }));
        break;
      }

      validFiles.push({
        file,
        preview: URL.createObjectURL(file),
      });
    }

    setMockups((prev) => [...prev, ...validFiles]);
    e.target.value = ''; // Reset input
  };

  const handleRemoveMockup = (index: number) => {
    setMockups((prev) => {
      const newMockups = [...prev];
      URL.revokeObjectURL(newMockups[index].preview);
      newMockups.splice(index, 1);
      return newMockups;
    });
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title?.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'Description is required';
    }

    if (!formData.useCase?.trim()) {
      newErrors.useCase = 'Use case is required';
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

      const submitData: FeatureRequestData = {
        title: formData.title!,
        description: formData.description!,
        useCase: formData.useCase!,
        priority: formData.priority || 'medium',
        mockups: mockups.map((m) => m.file),
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Submit failed:', error);
      setErrors((prev) => ({
        ...prev,
        submit: 'Failed to submit feature request. Please try again.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="feature-request-form">
      {/* Title */}
      <div>
        <Label htmlFor="title">
          Feature Title <span className="text-destructive">*</span>
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="What feature would you like to see?"
          className={errors.title ? 'border-destructive' : ''}
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
          placeholder="Describe the feature in detail"
          className={errors.description ? 'border-destructive' : ''}
          rows={4}
          required
        />
        <FieldError error={errors.description} fieldName="description" />
      </div>

      {/* Use Case */}
      <div>
        <Label htmlFor="useCase">
          Use Case <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="useCase"
          value={formData.useCase}
          onChange={(e) => handleChange('useCase', e.target.value)}
          placeholder="How would you use this feature? What problem does it solve?"
          className={errors.useCase ? 'border-destructive' : ''}
          rows={3}
          required
        />
        <FieldError error={errors.useCase} fieldName="use-case" />
      </div>

      {/* Priority */}
      <div>
        <Label htmlFor="priority">Priority</Label>
        <Select
          value={formData.priority}
          onValueChange={(value) => handleChange('priority', value as FeatureRequestData['priority'])}
        >
          <SelectTrigger id="priority">
            <SelectValue placeholder="Select priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="low">Low - Nice to have</SelectItem>
            <SelectItem value="medium">Medium - Would improve experience</SelectItem>
            <SelectItem value="high">High - Essential for workflow</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Mockup Upload */}
      <div>
        <Label>Mockups / Screenshots (Optional)</Label>
        <div className="mt-2 space-y-2">
          {mockups.length > 0 && (
            <div className="grid grid-cols-3 gap-2" data-testid="mockup-preview">
              {mockups.map((mockup, index) => (
                <div key={index} className="relative group h-24">
                  <OptimizedImage
                    src={mockup.preview}
                    alt={`Mockup ${index + 1}`}
                    fill
                    sizes="(max-width: 768px) 33vw, 150px"
                    className="rounded border"
                    objectFit="cover"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                    onClick={() => handleRemoveMockup(index)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          )}

          {mockups.length < 3 && (
            <div className="border-2 border-dashed rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                id="mockup-upload"
              />
              <label htmlFor="mockup-upload" className="cursor-pointer">
                <div className="flex flex-col items-center">
                  <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-sm font-medium">Upload Images</span>
                  <span className="text-xs text-muted-foreground mt-1">
                    PNG, JPG up to 5MB ({mockups.length}/3 images)
                  </span>
                </div>
              </label>
            </div>
          )}

          {errors.mockups && (
            <p className="text-sm text-destructive">{errors.mockups}</p>
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
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit Feature Request'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
