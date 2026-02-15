/**
 * General Feedback Form Component
 * Form for submitting general feedback with star rating
 */

'use client';

import React, { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { generalFeedbackSchema, GeneralFeedbackFormData } from '@/lib/validations/schemas';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Star, Loader2 } from 'lucide-react';
import { FieldError } from '@/components/error/error-message';

export interface GeneralFeedbackData {
  rating: number; // 1-5
  feedback: string;
  category: 'user-experience' | 'performance' | 'features' | 'support' | 'other';
}

export interface GeneralFeedbackFormProps {
  onSubmit: (data: GeneralFeedbackData) => Promise<void>;
  onCancel: () => void;
}

export function GeneralFeedbackForm({ onSubmit, onCancel }: GeneralFeedbackFormProps) {
  const {
    register,
    handleSubmit,
    control,
    setValue,
    trigger,
    watch,
    formState: { errors },
  } = useForm<GeneralFeedbackFormData>({
    resolver: zodResolver(generalFeedbackSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
    defaultValues: {
      rating: 0,
      feedback: '',
      category: 'user-experience',
    },
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [hoveredStar, setHoveredStar] = useState(0);

  const currentRating = watch('rating');

  const handleRatingClick = (star: number) => {
    setValue('rating', star);
    trigger('rating');
  };

  const onFormSubmit = handleSubmit(async (data) => {
    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const submitData: GeneralFeedbackData = {
        rating: data.rating,
        feedback: data.feedback,
        category: data.category,
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Submit failed:', error);
      setSubmitError('Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  });

  return (
    <form onSubmit={onFormSubmit} className="space-y-4" data-testid="general-feedback-form" data-general-feedback-form>
      {/* Rating */}
      <div>
        <Label>
          How would you rate your experience? <span className="text-destructive">*</span>
        </Label>
        <div className="flex gap-2 mt-2" data-testid="rating-stars">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => handleRatingClick(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              data-testid={`rating-star-${star}`}
              data-rating={star}
              className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hoveredStar || currentRating || 0)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        {currentRating && currentRating > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {currentRating === 5 && 'Excellent!'}
            {currentRating === 4 && 'Good'}
            {currentRating === 3 && 'Average'}
            {currentRating === 2 && 'Below Average'}
            {currentRating === 1 && 'Poor'}
          </p>
        )}
        <FieldError error={errors.rating?.message} fieldName="rating" />
      </div>

      {/* Feedback */}
      <div>
        <Label htmlFor="feedback">
          Your Feedback <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="feedback"
          {...register('feedback')}
          placeholder="Tell us what you think..."
          className={errors.feedback ? 'border-destructive' : ''}
          data-field="feedback"
          rows={5}
          required
        />
        <FieldError error={errors.feedback?.message} fieldName="feedback" />
      </div>

      {/* Category */}
      <div>
        <Label htmlFor="category">Category</Label>
        <Controller
          name="category"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="category" data-field="category">
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user-experience" data-category="user-experience">User Experience</SelectItem>
                <SelectItem value="performance" data-category="performance">Performance</SelectItem>
                <SelectItem value="features" data-category="features">Features</SelectItem>
                <SelectItem value="support" data-category="support">Support</SelectItem>
                <SelectItem value="other" data-category="other">Other</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
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
              Sending...
            </>
          ) : (
            'Send Feedback'
          )}
        </Button>
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
