'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { TagInput } from '@/components/ui/tag-input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { StepProgress } from '@/components/ui/step-progress';
import { useAuthStore } from '@/lib/stores/auth-store';
import { userApi } from '@/lib/api';

const ONBOARDING_STEPS = [
  { label: 'Profile' },
  { label: 'Preferences' },
  { label: 'Skills' },
  { label: 'Work Style' },
];

const STORAGE_KEY = 'onboarding-draft';

const step1Schema = z.object({
  phone: z.string().min(1, 'Phone number is required'),
  location: z.string().min(1, 'Location is required'),
});

const step2Schema = z.object({
  target_titles: z.array(z.string()).min(1, 'Select at least one job title'),
  salary_min: z.number().min(0, 'Minimum salary must be positive'),
  salary_max: z.number().min(0, 'Maximum salary must be positive'),
  industries: z.array(z.string()).min(1, 'Select at least one industry'),
});

const step3Schema = z.object({
  skills: z.array(z.string()).min(1, 'Add at least one skill'),
});

const step4Schema = z.object({
  remote_preference: z.enum(['remote', 'hybrid', 'onsite', 'flexible']),
  visa_sponsorship: z.boolean(),
  willing_to_relocate: z.boolean(),
  preferred_locations: z.array(z.string()),
});

type Step1Data = z.infer<typeof step1Schema>;
type Step2Data = z.infer<typeof step2Schema>;
type Step3Data = z.infer<typeof step3Schema>;
type Step4Data = z.infer<typeof step4Schema>;

type FormData = Step1Data & Step2Data & Step3Data & Step4Data;

const DEFAULT_FORM_DATA: FormData = {
  phone: '',
  location: '',
  target_titles: [],
  salary_min: 0,
  salary_max: 0,
  industries: [],
  skills: [],
  remote_preference: 'flexible',
  visa_sponsorship: false,
  willing_to_relocate: false,
  preferred_locations: [],
};

function loadDraft(): { step: number; data: FormData } | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function saveDraft(step: number, data: FormData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ step, data }));
  } catch {
    // storage full or unavailable
  }
}

function clearDraft() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // Load saved draft
  const draft = typeof window !== 'undefined' ? loadDraft() : null;

  const [currentStep, setCurrentStep] = useState(draft?.step ?? 0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [direction, setDirection] = useState<'forward' | 'back'>('forward');

  const [formData, setFormData] = useState<FormData>(draft?.data ?? DEFAULT_FORM_DATA);

  const step1Form = useForm<Step1Data>({
    resolver: zodResolver(step1Schema),
    mode: 'onSubmit',
    defaultValues: {
      phone: formData.phone,
      location: formData.location,
    },
  });

  const step2Form = useForm<Step2Data>({
    resolver: zodResolver(step2Schema),
    mode: 'onSubmit',
    defaultValues: {
      target_titles: formData.target_titles,
      salary_min: formData.salary_min,
      salary_max: formData.salary_max,
      industries: formData.industries,
    },
  });

  const step3Form = useForm<Step3Data>({
    resolver: zodResolver(step3Schema),
    mode: 'onSubmit',
    defaultValues: {
      skills: formData.skills,
    },
  });

  const step4Form = useForm<Step4Data>({
    resolver: zodResolver(step4Schema),
    mode: 'onSubmit',
    defaultValues: {
      remote_preference: formData.remote_preference,
      visa_sponsorship: formData.visa_sponsorship,
      willing_to_relocate: formData.willing_to_relocate,
      preferred_locations: formData.preferred_locations,
    },
  });

  // Auto-save on step change
  useEffect(() => {
    saveDraft(currentStep, formData);
  }, [currentStep, formData]);

  const goForward = useCallback((step: number) => {
    setDirection('forward');
    setCurrentStep(step);
  }, []);

  const goBack = useCallback((step: number) => {
    setDirection('back');
    setCurrentStep(step);
  }, []);

  const handleWelcomeContinue = () => {
    goForward(1);
  };

  const handleStep1Submit = async (data: Step1Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    goForward(2);
  };

  const handleStep2Submit = async (data: Step2Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    goForward(3);
  };

  const handleStep3Submit = async (data: Step3Data) => {
    setFormData((prev) => ({ ...prev, ...data }));
    goForward(4);
  };

  const handleStep4Submit = async (data: Step4Data) => {
    try {
      setIsLoading(true);
      setError(null);

      const completeData = {
        ...formData,
        ...data,
        locations: data.preferred_locations || []
      };
      await userApi.completeOnboarding(completeData);

      clearDraft();
      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error?.message || 'Failed to complete onboarding. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const animationClass = direction === 'forward'
    ? 'animate-fade-in'
    : 'animate-fade-in';

  const renderWelcome = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">Welcome to HireFlux!</CardTitle>
        <CardDescription className="text-lg">
          Let&apos;s set up your profile to find the perfect job matches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            We&apos;ll guide you through 4 quick steps to personalize your job search experience:
          </p>
          <ul className="space-y-2 text-left mx-auto max-w-md">
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">1.</span>
              <span>Basic Profile Information</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">2.</span>
              <span>Job Preferences & Salary Expectations</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">3.</span>
              <span>Your Skills & Expertise</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary font-bold">4.</span>
              <span>Work Preferences</span>
            </li>
          </ul>
        </div>

        {draft && draft.step > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800 text-center">
            You have a saved draft from step {draft.step}. We&apos;ll pick up where you left off.
          </div>
        )}

        <div className="flex justify-center">
          <Button size="lg" onClick={handleWelcomeContinue}>
            {draft && draft.step > 0 ? 'Continue Where You Left Off' : 'Get Started'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep1 = () => (
    <Card className={`w-full max-w-2xl ${animationClass}`}>
      <CardHeader>
        <StepProgress steps={ONBOARDING_STEPS} currentStep={0} className="mb-4" />
        <CardTitle>Basic Profile</CardTitle>
        <CardDescription>Tell us a bit about yourself</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={step1Form.handleSubmit(handleStep1Submit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              error={!!step1Form.formState.errors.phone}
              errorMessage={step1Form.formState.errors.phone?.message}
              {...step1Form.register('phone')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              type="text"
              placeholder="San Francisco, CA"
              error={!!step1Form.formState.errors.location}
              errorMessage={step1Form.formState.errors.location?.message}
              {...step1Form.register('location')}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => goBack(0)}>
              Back
            </Button>
            <Button type="submit">
              Continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card className={`w-full max-w-2xl ${animationClass}`}>
      <CardHeader>
        <StepProgress steps={ONBOARDING_STEPS} currentStep={1} className="mb-4" />
        <CardTitle>Job Preferences</CardTitle>
        <CardDescription>What kind of roles are you looking for?</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={step2Form.handleSubmit(handleStep2Submit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="target_titles">Job Titles (press Enter to add)</Label>
            <Controller
              name="target_titles"
              control={step2Form.control}
              render={({ field }) => (
                <TagInput
                  id="target_titles"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g., Software Engineer, Product Manager"
                  aria-invalid={!!step2Form.formState.errors.target_titles}
                />
              )}
            />
            {step2Form.formState.errors.target_titles && (
              <p className="text-sm text-red-600">{step2Form.formState.errors.target_titles.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="salary_min">Minimum Salary ($)</Label>
              <Input
                id="salary_min"
                type="number"
                placeholder="100000"
                error={!!step2Form.formState.errors.salary_min}
                errorMessage={step2Form.formState.errors.salary_min?.message}
                {...step2Form.register('salary_min', { valueAsNumber: true })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary_max">Maximum Salary ($)</Label>
              <Input
                id="salary_max"
                type="number"
                placeholder="150000"
                error={!!step2Form.formState.errors.salary_max}
                errorMessage={step2Form.formState.errors.salary_max?.message}
                {...step2Form.register('salary_max', { valueAsNumber: true })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="industries">Industries (press Enter to add)</Label>
            <Controller
              name="industries"
              control={step2Form.control}
              render={({ field }) => (
                <TagInput
                  id="industries"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g., Technology, Healthcare"
                  aria-invalid={!!step2Form.formState.errors.industries}
                />
              )}
            />
            {step2Form.formState.errors.industries && (
              <p className="text-sm text-red-600">{step2Form.formState.errors.industries.message}</p>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => goBack(1)}>
              Back
            </Button>
            <Button type="submit">
              Continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card className={`w-full max-w-2xl ${animationClass}`}>
      <CardHeader>
        <StepProgress steps={ONBOARDING_STEPS} currentStep={2} className="mb-4" />
        <CardTitle>Skills & Expertise</CardTitle>
        <CardDescription>Add your technical and professional skills</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={step3Form.handleSubmit(handleStep3Submit)} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="skills">Skills (press Enter to add)</Label>
            <Controller
              name="skills"
              control={step3Form.control}
              render={({ field }) => (
                <TagInput
                  id="skills"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g., React, Python, Project Management"
                  aria-invalid={!!step3Form.formState.errors.skills}
                />
              )}
            />
            {step3Form.formState.errors.skills && (
              <p className="text-sm text-red-600">{step3Form.formState.errors.skills.message}</p>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => goBack(2)}>
              Back
            </Button>
            <Button type="submit">
              Continue
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card className={`w-full max-w-2xl ${animationClass}`}>
      <CardHeader>
        <StepProgress steps={ONBOARDING_STEPS} currentStep={3} className="mb-4" />
        <CardTitle>Work Preferences</CardTitle>
        <CardDescription>Tell us about your work preferences</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={step4Form.handleSubmit(handleStep4Submit)} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800" role="alert">
              {error}
            </div>
          )}

          <div className="space-y-3">
            <Label>Remote Preference</Label>
            <Controller
              name="remote_preference"
              control={step4Form.control}
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange}>
                  <RadioGroupItem value="remote" id="remote" aria-label="Remote">
                    Remote
                  </RadioGroupItem>
                  <RadioGroupItem value="hybrid" id="hybrid" aria-label="Hybrid">
                    Hybrid
                  </RadioGroupItem>
                  <RadioGroupItem value="onsite" id="onsite" aria-label="On-site">
                    On-site
                  </RadioGroupItem>
                  <RadioGroupItem value="flexible" id="flexible" aria-label="Flexible">
                    Flexible
                  </RadioGroupItem>
                </RadioGroup>
              )}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Controller
                name="visa_sponsorship"
                control={step4Form.control}
                render={({ field }) => (
                  <Checkbox
                    id="visa_sponsorship"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    aria-label="Visa Sponsorship"
                  />
                )}
              />
              <Label htmlFor="visa_sponsorship" className="font-normal">
                I need visa sponsorship
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Controller
                name="willing_to_relocate"
                control={step4Form.control}
                render={({ field }) => (
                  <Checkbox
                    id="willing_to_relocate"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    aria-label="Willing to Relocate"
                  />
                )}
              />
              <Label htmlFor="willing_to_relocate" className="font-normal">
                I&apos;m willing to relocate
              </Label>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferred_locations">Preferred Locations (optional, press Enter to add)</Label>
            <Controller
              name="preferred_locations"
              control={step4Form.control}
              render={({ field }) => (
                <TagInput
                  id="preferred_locations"
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="e.g., New York, London"
                />
              )}
            />
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => goBack(3)}>
              Back
            </Button>
            <Button type="submit" loading={isLoading} loadingText="Completing...">
              Complete Onboarding
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      {currentStep === 0 && renderWelcome()}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && renderStep2()}
      {currentStep === 3 && renderStep3()}
      {currentStep === 4 && renderStep4()}
    </div>
  );
}
