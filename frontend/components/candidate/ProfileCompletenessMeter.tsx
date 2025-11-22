/**
 * Profile Completeness Meter Component - Issue #57
 *
 * Visual indicator showing candidate profile completion percentage.
 * Encourages users to fill out all fields for better employer visibility.
 *
 * Features:
 * - Progress bar (0-100%)
 * - Percentage display
 * - Missing fields list
 * - Encouragement messages
 * - Color-coded by completion level
 */

'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, AlertCircle, Target } from 'lucide-react';

interface ProfileCompletenessMeterProps {
  percentage: number;
  missingFields: string[];
  isComplete: boolean;
}

// Field name display mapping
const FIELD_LABELS: Record<string, string> = {
  headline: 'Professional Headline',
  bio: 'About Me / Bio',
  skills: 'Skills',
  years_experience: 'Years of Experience',
  location: 'Location',
  experience_level: 'Experience Level',
  profile_picture_url: 'Profile Picture',
  preferred_roles: 'Preferred Job Roles',
  expected_salary_min: 'Salary Expectations',
  portfolio: 'Portfolio Items',
  resume_summary: 'Resume Summary',
};

export default function ProfileCompletenessMeter({
  percentage,
  missingFields,
  isComplete,
}: ProfileCompletenessMeterProps) {
  // Determine color based on completion percentage
  const getColor = () => {
    if (percentage >= 100) return 'text-green-600';
    if (percentage >= 75) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Determine progress bar color
  const getProgressColor = () => {
    if (percentage >= 100) return 'bg-green-600';
    if (percentage >= 75) return 'bg-blue-600';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  // Get encouragement message
  const getMessage = () => {
    if (isComplete) {
      return {
        icon: <CheckCircle2 className="h-5 w-5 text-green-600" />,
        title: '🎉 Your profile is complete!',
        description: 'Employers love complete profiles. You stand out from the crowd!',
        variant: 'default' as const,
      };
    }

    if (percentage >= 75) {
      return {
        icon: <Target className="h-5 w-5 text-blue-600" />,
        title: 'Almost there!',
        description: `Add ${missingFields.length} more field${
          missingFields.length !== 1 ? 's' : ''
        } to reach 100%`,
        variant: 'default' as const,
      };
    }

    if (percentage >= 50) {
      return {
        icon: <Target className="h-5 w-5 text-yellow-600" />,
        title: 'Good progress!',
        description: 'Keep going! Employers prefer profiles above 75% complete.',
        variant: 'default' as const,
      };
    }

    return {
      icon: <AlertCircle className="h-5 w-5 text-red-600" />,
      title: 'Complete your profile',
      description: 'Profiles below 50% get significantly fewer views. Fill out key fields!',
      variant: 'destructive' as const,
    };
  };

  const message = getMessage();

  return (
    <div className="space-y-4" data-testid="profile-completeness-meter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Profile Completeness</h3>
          <p className="text-sm text-muted-foreground">
            Complete your profile to get discovered by employers
          </p>
        </div>
        <div className="text-right">
          <div
            className={`text-3xl font-bold ${getColor()}`}
            data-testid="completeness-percentage"
          >
            {percentage}%
          </div>
          <div className="text-xs text-muted-foreground">
            {isComplete ? 'Complete' : 'In Progress'}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="relative">
        <Progress
          value={percentage}
          className="h-3"
          data-testid="completeness-progress-bar"
        />
        {/* Custom color overlay */}
        <div
          className={`absolute top-0 left-0 h-3 rounded-full transition-all ${getProgressColor()}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Encouragement Message */}
      <Alert variant={message.variant} data-testid="completeness-message">
        <div className="flex items-start gap-3">
          {message.icon}
          <div className="flex-1">
            <div className="font-medium">{message.title}</div>
            <AlertDescription className="mt-1">{message.description}</AlertDescription>
          </div>
        </div>
      </Alert>

      {/* Missing Fields */}
      {!isComplete && missingFields.length > 0 && (
        <div className="rounded-lg border bg-muted/50 p-4" data-testid="missing-fields">
          <div className="mb-2 flex items-center justify-between">
            <h4 className="text-sm font-medium">Missing Fields</h4>
            <Badge variant="outline">
              {missingFields.length} field{missingFields.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <ul className="space-y-1">
            {missingFields.slice(0, 5).map((field) => (
              <li
                key={field}
                className="flex items-center gap-2 text-sm text-muted-foreground"
                data-testid={`missing-field-${field}`}
              >
                <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground" />
                {FIELD_LABELS[field] || field}
              </li>
            ))}
            {missingFields.length > 5 && (
              <li className="text-sm text-muted-foreground">
                + {missingFields.length - 5} more
              </li>
            )}
          </ul>
        </div>
      )}

      {/* Quick Tips */}
      {percentage < 50 && (
        <div className="rounded-lg border-l-4 border-yellow-500 bg-yellow-50 p-4 dark:bg-yellow-950/20">
          <h4 className="mb-2 text-sm font-medium text-yellow-900 dark:text-yellow-100">
            💡 Quick Tips
          </h4>
          <ul className="space-y-1 text-sm text-yellow-800 dark:text-yellow-200">
            <li>• Start with your headline and bio (30% boost)</li>
            <li>• Add at least 3-5 skills (15% boost)</li>
            <li>• Include your experience level and location (20% boost)</li>
          </ul>
        </div>
      )}
    </div>
  );
}
