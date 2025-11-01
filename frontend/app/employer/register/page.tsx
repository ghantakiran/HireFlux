'use client';

import { useState } from 'react';
import Link from 'next/link';
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
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { employerApi } from '@/lib/api';

const employerRegisterSchema = z.object({
  name: z.string().min(2, 'Company name must be at least 2 characters'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one digit'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
  industry: z.string().optional(),
  size: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type EmployerRegisterFormData = z.infer<typeof employerRegisterSchema>;

const COMPANY_SIZES = ['1-10', '11-50', '51-200', '201-500', '501+'];
const INDUSTRIES = [
  'Technology',
  'Finance',
  'Healthcare',
  'Education',
  'Retail',
  'Manufacturing',
  'Marketing',
  'Consulting',
  'Real Estate',
  'Other',
];

export default function EmployerRegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('');
  const [selectedIndustry, setSelectedIndustry] = useState<string>('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EmployerRegisterFormData>({
    resolver: zodResolver(employerRegisterSchema),
    mode: 'onBlur',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: EmployerRegisterFormData) => {
    try {
      setIsLoading(true);
      setError(null);

      const { confirmPassword, ...registerData } = data;

      // Add selected values from dropdowns
      const payload = {
        ...registerData,
        industry: selectedIndustry || undefined,
        size: selectedSize || undefined,
      };

      const response = await employerApi.register(payload);

      // Store tokens
      if (response.data?.data?.access_token) {
        localStorage.setItem('access_token', response.data.data.access_token);
        if (response.data.data.refresh_token) {
          localStorage.setItem('refresh_token', response.data.data.refresh_token);
        }
      }

      // Redirect to employer dashboard
      router.push('/employer/dashboard');
    } catch (err: any) {
      const errorMessage =
        err?.response?.data?.error?.message ||
        err?.response?.data?.detail ||
        'Failed to register company. Please try again.';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-2xl">
        <CardHeader className="space-y-1">
          <div className="flex items-center justify-center mb-2">
            <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
                />
              </svg>
            </div>
          </div>
          <CardTitle className="text-center text-3xl font-bold">Register Your Company</CardTitle>
          <CardDescription className="text-center">
            Join HireFlux to find top talent with AI-powered recruiting
          </CardDescription>
        </CardHeader>

        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800" role="alert">
                {error}
              </div>
            )}

            {/* Company Name */}
            <div className="space-y-2">
              <Label htmlFor="name">
                Company Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="Acme Inc"
                autoComplete="organization"
                aria-invalid={!!errors.name}
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Founder Email */}
            <div className="space-y-2">
              <Label htmlFor="email">
                Founder Email <span className="text-red-500">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="founder@acme.com"
                autoComplete="email"
                aria-invalid={!!errors.email}
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-red-600">{errors.email.message}</p>
              )}
              <p className="text-xs text-gray-500">
                This will be your login email and company domain will be extracted from it
              </p>
            </div>

            {/* Password */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="password">
                  Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={!!errors.password}
                  {...register('password')}
                />
                {errors.password && (
                  <p className="text-sm text-red-600">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">
                  Confirm Password <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  aria-invalid={!!errors.confirmPassword}
                  {...register('confirmPassword')}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600">{errors.confirmPassword.message}</p>
                )}
              </div>
            </div>

            {/* Industry & Size */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="industry">Industry</Label>
                <Select value={selectedIndustry} onValueChange={setSelectedIndustry}>
                  <SelectTrigger id="industry">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry} value={industry}>
                        {industry}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="size">Company Size</Label>
                <Select value={selectedSize} onValueChange={setSelectedSize}>
                  <SelectTrigger id="size">
                    <SelectValue placeholder="Select size" />
                  </SelectTrigger>
                  <SelectContent>
                    {COMPANY_SIZES.map((size) => (
                      <SelectItem key={size} value={size}>
                        {size} employees
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                type="text"
                placeholder="San Francisco, CA"
                autoComplete="address-level2"
                {...register('location')}
              />
            </div>

            {/* Website */}
            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                placeholder="https://acme.com"
                autoComplete="url"
                {...register('website')}
              />
            </div>

            {/* Plan Info */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 p-4 mt-6">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <svg
                    className="h-5 w-5 text-blue-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-blue-800">Free 14-Day Trial</h3>
                  <div className="mt-2 text-sm text-blue-700">
                    <ul className="list-disc list-inside space-y-1">
                      <li>Post 1 active job</li>
                      <li>View up to 10 candidates per month</li>
                      <li>AI-powered candidate ranking</li>
                      <li>Basic ATS features</li>
                    </ul>
                  </div>
                  <p className="mt-2 text-xs text-blue-600">
                    No credit card required. Upgrade anytime for more features.
                  </p>
                </div>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Creating your account...' : 'Start Free Trial'}
            </Button>

            <p className="text-xs text-center text-gray-500 mt-4">
              By registering, you agree to our{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">
                Privacy Policy
              </Link>
            </p>
          </CardContent>

          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              Already have an employer account?{' '}
              <Link href="/signin" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </div>
            <div className="text-center text-sm text-muted-foreground">
              Looking for a job?{' '}
              <Link href="/signup" className="text-blue-600 hover:underline font-medium">
                Register as a job seeker
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
