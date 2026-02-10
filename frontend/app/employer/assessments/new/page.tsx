/**
 * Create Assessment Page - Employer Portal
 * Sprint 17-18 Phase 4
 *
 * BDD Test: tests/e2e/assessment-features.spec.ts
 * Satisfies: "should create a new technical screening assessment"
 *           "should validate required fields when creating assessment"
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Save, Settings, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { assessmentApi } from '@/lib/api';

// Validation schema (BDD: Required field validation)
const assessmentSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255, 'Title too long'),
  description: z.string().optional(),
  assessment_type: z.enum(['screening', 'technical', 'behavioral', 'culture_fit'], {
    required_error: 'Assessment type is required',
  }),
  time_limit_minutes: z.coerce.number().min(1, 'Time limit must be at least 1 minute').max(480, 'Time limit cannot exceed 8 hours'),
  passing_score_percentage: z.coerce.number().min(0, 'Passing score must be at least 0').max(100, 'Passing score cannot exceed 100'),
  randomize_questions: z.boolean().default(false),
  enable_proctoring: z.boolean().default(false),
  track_tab_switches: z.boolean().default(false),
  max_tab_switches: z.coerce.number().min(1).max(10).default(3),
  track_ip_changes: z.boolean().default(false),
});

type AssessmentFormData = z.infer<typeof assessmentSchema>;

export default function CreateAssessmentPage() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<AssessmentFormData>({
    resolver: zodResolver(assessmentSchema),
    defaultValues: {
      time_limit_minutes: 60,
      passing_score_percentage: 70,
      randomize_questions: false,
      enable_proctoring: false,
      track_tab_switches: false,
      max_tab_switches: 3,
      track_ip_changes: false,
    },
  });

  const trackTabSwitches = watch('track_tab_switches');

  const onSubmit = async (data: AssessmentFormData) => {
    setIsSubmitting(true);
    try {
      // Map form data to API format
      const assessmentData = {
        title: data.title,
        description: data.description,
        assessment_type: data.assessment_type as 'pre_screening' | 'technical' | 'personality' | 'skills_test',
        time_limit_minutes: data.time_limit_minutes,
        passing_score_percentage: data.passing_score_percentage,
        randomize_questions: data.randomize_questions,
        enable_proctoring: data.enable_proctoring,
        allow_tab_switching: !data.track_tab_switches,
        max_tab_switches: data.track_tab_switches ? data.max_tab_switches : undefined,
      };

      const response = await assessmentApi.createAssessment(assessmentData);

      if (response.data.success) {
        toast.success('Assessment created successfully');
        router.push(`/employer/assessments/${response.data.data.id}`);
      } else {
        throw new Error('Failed to create assessment');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.error?.message || 'Failed to create assessment';
      toast.error(errorMessage);
      console.error('Assessment creation error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">Create Assessment</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Set up a new skills assessment for your candidates
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Basic Information</h2>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <Label htmlFor="title">
                Assessment Title <span className="text-red-500 dark:text-red-400">*</span>
              </Label>
              <Input
                id="title"
                {...register('title')}
                data-testid="assessment-title"
                placeholder="e.g., Senior Backend Engineer Screening"
                className={errors.title ? 'border-red-500 dark:border-red-400' : ''}
              />
              {errors.title && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-1">{errors.title.message}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register('description')}
                data-testid="assessment-description"
                placeholder="Brief description of what this assessment evaluates..."
                rows={3}
              />
            </div>

            {/* Assessment Type */}
            <div>
              <Label htmlFor="assessment_type">
                Assessment Type <span className="text-red-500 dark:text-red-400">*</span>
              </Label>
              <Select
                onValueChange={(value) => setValue('assessment_type', value as any)}
              >
                <SelectTrigger data-testid="assessment-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="screening">Screening</SelectItem>
                  <SelectItem value="technical">Technical</SelectItem>
                  <SelectItem value="behavioral">Behavioral</SelectItem>
                  <SelectItem value="culture_fit">Culture Fit</SelectItem>
                </SelectContent>
              </Select>
              {errors.assessment_type && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                  {errors.assessment_type.message}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Assessment Settings */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Assessment Settings</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Time Limit */}
            <div>
              <Label htmlFor="time_limit_minutes">Time Limit (minutes)</Label>
              <Input
                id="time_limit_minutes"
                type="number"
                {...register('time_limit_minutes')}
                data-testid="time-limit-minutes"
                placeholder="60"
                min="1"
                max="480"
                className={errors.time_limit_minutes ? 'border-red-500 dark:border-red-400' : ''}
              />
              {errors.time_limit_minutes && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                  {errors.time_limit_minutes.message}
                </p>
              )}
            </div>

            {/* Passing Score */}
            <div>
              <Label htmlFor="passing_score_percentage">Passing Score (%)</Label>
              <Input
                id="passing_score_percentage"
                type="number"
                {...register('passing_score_percentage')}
                data-testid="passing-score-percentage"
                placeholder="70"
                min="0"
                max="100"
                className={errors.passing_score_percentage ? 'border-red-500 dark:border-red-400' : ''}
              />
              {errors.passing_score_percentage && (
                <p className="text-red-500 dark:text-red-400 text-sm mt-1">
                  {errors.passing_score_percentage.message}
                </p>
              )}
            </div>
          </div>

          <div className="mt-6 space-y-4">
            {/* Randomize Questions */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="randomize_questions">Randomize Question Order</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Questions will appear in random order for each candidate
                </p>
              </div>
              <Switch
                id="randomize_questions"
                {...register('randomize_questions')}
                data-testid="randomize-questions"
              />
            </div>
          </div>
        </div>

        {/* Anti-Cheating Measures */}
        <div className="bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Anti-Cheating Measures</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Enable proctoring and monitoring to maintain assessment integrity
            </p>
          </div>

          <div className="space-y-4">
            {/* Enable Proctoring */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="enable_proctoring">Enable Proctoring</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Monitor candidate behavior during the assessment
                </p>
              </div>
              <Switch
                id="enable_proctoring"
                {...register('enable_proctoring')}
                data-testid="enable-proctoring"
              />
            </div>

            {/* Track Tab Switches */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="track_tab_switches">Track Tab Switches</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Detect when candidates switch browser tabs
                </p>
              </div>
              <Switch
                id="track_tab_switches"
                {...register('track_tab_switches')}
                data-testid="track-tab-switches"
              />
            </div>

            {/* Max Tab Switches */}
            {trackTabSwitches && (
              <div>
                <Label htmlFor="max_tab_switches">
                  Maximum Tab Switches Allowed
                </Label>
                <Input
                  id="max_tab_switches"
                  type="number"
                  {...register('max_tab_switches')}
                  data-testid="max-tab-switches"
                  placeholder="3"
                  min="1"
                  max="10"
                  className="max-w-xs"
                />
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  Assessment will be auto-submitted after this limit
                </p>
              </div>
            )}

            {/* Track IP Changes */}
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <Label htmlFor="track_ip_changes">Track IP Address Changes</Label>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Flag suspicious activity if IP address changes during assessment
                </p>
              </div>
              <Switch
                id="track_ip_changes"
                {...register('track_ip_changes')}
                data-testid="track-ip-changes"
              />
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            data-testid="save-assessment-button"
            disabled={isSubmitting}
            className="flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? 'Creating...' : 'Create Assessment'}
          </Button>
        </div>
      </form>
    </div>
  );
}
