/**
 * General Feedback Form Component
 * Form for submitting general feedback with star rating
 */

'use client';

import React, { useState } from 'react';
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
  const [formData, setFormData] = useState<Partial<GeneralFeedbackData>>({
    rating: 0,
    feedback: '',
    category: 'user-experience',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredStar, setHoveredStar] = useState(0);

  const handleRatingClick = (rating: number) => {
    setFormData((prev) => ({ ...prev, rating }));
    if (errors.rating) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.rating;
        return newErrors;
      });
    }
  };

  const handleChange = (field: keyof GeneralFeedbackData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.rating || formData.rating < 1 || formData.rating > 5) {
      newErrors.rating = 'Please select a rating';
    }

    if (!formData.feedback?.trim()) {
      newErrors.feedback = 'Feedback is required';
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

      const submitData: GeneralFeedbackData = {
        rating: formData.rating!,
        feedback: formData.feedback!,
        category: formData.category || 'user-experience',
      };

      await onSubmit(submitData);
    } catch (error) {
      console.error('Submit failed:', error);
      setErrors((prev) => ({
        ...prev,
        submit: 'Failed to submit feedback. Please try again.',
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4" data-testid="general-feedback-form">
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
              className="focus:outline-none focus:ring-2 focus:ring-primary rounded"
            >
              <Star
                className={`h-8 w-8 transition-colors ${
                  star <= (hoveredStar || formData.rating || 0)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
        {formData.rating > 0 && (
          <p className="text-sm text-muted-foreground mt-1">
            {formData.rating === 5 && 'Excellent!'}
            {formData.rating === 4 && 'Good'}
            {formData.rating === 3 && 'Average'}
            {formData.rating === 2 && 'Below Average'}
            {formData.rating === 1 && 'Poor'}
          </p>
        )}
        <FieldError error={errors.rating} fieldName="rating" />
      </div>

      {/* Feedback */}
      <div>
        <Label htmlFor="feedback">
          Your Feedback <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="feedback"
          value={formData.feedback}
          onChange={(e) => handleChange('feedback', e.target.value)}
          placeholder="Tell us what you think..."
          className={errors.feedback ? 'border-destructive' : ''}
          rows={5}
          required
        />
        <FieldError error={errors.feedback} fieldName="feedback" />
      </div>

      {/* Category */}
      <div>
        <Label htmlFor="category">Category</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => handleChange('category', value as GeneralFeedbackData['category'])}
        >
          <SelectTrigger id="category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="user-experience">User Experience</SelectItem>
            <SelectItem value="performance">Performance</SelectItem>
            <SelectItem value="features">Features</SelectItem>
            <SelectItem value="support">Support</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
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
