'use client';

import { useState } from 'react';
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
import { useAuthStore } from '@/lib/stores/auth-store';
import { userApi } from '@/lib/api';

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

export default function OnboardingPage() {
  const router = useRouter();
  const { user } = useAuthStore();
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form data storage
  const [formData, setFormData] = useState({
    phone: '',
    location: '',
    target_titles: [] as string[],
    salary_min: 0,
    salary_max: 0,
    industries: [] as string[],
    skills: [] as string[],
    remote_preference: 'flexible' as const,
    visa_sponsorship: false,
    willing_to_relocate: false,
    preferred_locations: [] as string[],
  });

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

  const handleWelcomeContinue = () => {
    setCurrentStep(1);
  };

  const handleStep1Submit = async (data: Step1Data) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(2);
  };

  const handleStep2Submit = async (data: Step2Data) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(3);
  };

  const handleStep3Submit = async (data: Step3Data) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(4);
  };

  const handleStep4Submit = async (data: Step4Data) => {
    try {
      setIsLoading(true);
      setError(null);

      const completeData = { ...formData, ...data };
      await userApi.completeOnboarding(completeData);

      router.push('/dashboard');
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error?.message || 'Failed to complete onboarding. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const renderWelcome = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader className="text-center">
        <CardTitle className="text-3xl font-bold">Welcome to HireFlux!</CardTitle>
        <CardDescription className="text-lg">
          Let's set up your profile to find the perfect job matches
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4 text-center">
          <p className="text-muted-foreground">
            We'll guide you through 4 quick steps to personalize your job search experience:
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
        <div className="flex justify-center">
          <Button size="lg" onClick={handleWelcomeContinue}>
            Get Started
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const renderStep1 = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="text-sm text-muted-foreground mb-2">Step 1 of 4</div>
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
              {...step1Form.register('phone')}
            />
            {step1Form.formState.errors.phone && (
              <p className="text-sm text-red-600">{step1Form.formState.errors.phone.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              type="text"
              placeholder="San Francisco, CA"
              {...step1Form.register('location')}
            />
            {step1Form.formState.errors.location && (
              <p className="text-sm text-red-600">{step1Form.formState.errors.location.message}</p>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <Button type="button" variant="outline" onClick={() => setCurrentStep(0)}>
              Back
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderStep2 = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="text-sm text-muted-foreground mb-2">Step 2 of 4</div>
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
                {...step2Form.register('salary_min', { valueAsNumber: true })}
              />
              {step2Form.formState.errors.salary_min && (
                <p className="text-sm text-red-600">{step2Form.formState.errors.salary_min.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary_max">Maximum Salary ($)</Label>
              <Input
                id="salary_max"
                type="number"
                placeholder="150000"
                {...step2Form.register('salary_max', { valueAsNumber: true })}
              />
              {step2Form.formState.errors.salary_max && (
                <p className="text-sm text-red-600">{step2Form.formState.errors.salary_max.message}</p>
              )}
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
            <Button type="button" variant="outline" onClick={() => setCurrentStep(1)}>
              Back
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderStep3 = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="text-sm text-muted-foreground mb-2">Step 3 of 4</div>
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
            <Button type="button" variant="outline" onClick={() => setCurrentStep(2)}>
              Back
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Continue'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderStep4 = () => (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <div className="text-sm text-muted-foreground mb-2">Step 4 of 4</div>
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
                    onCheckedChange={field.onChange}
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
                    onCheckedChange={field.onChange}
                    aria-label="Willing to Relocate"
                  />
                )}
              />
              <Label htmlFor="willing_to_relocate" className="font-normal">
                I'm willing to relocate
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
            <Button type="button" variant="outline" onClick={() => setCurrentStep(3)}>
              Back
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Completing...' : 'Complete Onboarding'}
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
