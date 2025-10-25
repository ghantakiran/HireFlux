'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
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

  const handleWelcomeContinue = () => {
    setCurrentStep(1);
  };

  const handleStep1Submit = async (data: Step1Data) => {
    setFormData({ ...formData, ...data });
    setCurrentStep(2);
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      {currentStep === 0 && renderWelcome()}
      {currentStep === 1 && renderStep1()}
      {currentStep === 2 && (
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <div className="text-sm text-muted-foreground mb-2">Step 2 of 4</div>
            <CardTitle>Job Preferences</CardTitle>
            <CardDescription>Coming soon...</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
