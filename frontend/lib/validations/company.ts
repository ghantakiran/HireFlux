import { z } from 'zod';
import { emailSchema, passwordSchema, urlSchema } from './shared';

export const employerRegistrationSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    agreeToTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to the Terms of Service' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type EmployerRegistrationFormData = z.infer<typeof employerRegistrationSchema>;

export const companyProfileSchema = z.object({
  name: z.string().min(1, 'Company name is required').max(100, 'Company name must be 100 characters or less'),
  industry: z.string().optional(),
  size: z.string().optional(),
  website: urlSchema,
  description: z.string().max(500, 'Description must be 500 characters or less').optional().or(z.literal('')),
  values: z.string().optional().or(z.literal('')),
  culture: z.string().optional().or(z.literal('')),
  linkedin: urlSchema,
  twitter: urlSchema,
  facebook: urlSchema,
  instagram: urlSchema,
});

export type CompanyProfileFormData = z.infer<typeof companyProfileSchema>;

export const employerSettingsSchema = z.object({
  name: z.string().min(2, 'Company name is required (minimum 2 characters)'),
  website: z
    .string()
    .regex(/^https?:\/\/.+/, 'Please enter a valid URL (e.g., https://example.com)')
    .optional()
    .or(z.literal('')),
  description: z
    .string()
    .max(5000, 'Description must be under 5000 characters')
    .optional()
    .or(z.literal('')),
  linkedin_url: z
    .string()
    .refine((val) => !val || val.startsWith('https://linkedin.com/'), {
      message: 'LinkedIn URL must start with https://linkedin.com/',
    })
    .optional()
    .or(z.literal('')),
  twitter_url: z
    .string()
    .refine((val) => !val || val.startsWith('https://twitter.com/'), {
      message: 'Twitter URL must start with https://twitter.com/',
    })
    .optional()
    .or(z.literal('')),
  industry: z.string().optional(),
  size: z.string().optional(),
  location: z.string().optional().or(z.literal('')),
  timezone: z.string().optional(),
});

export type EmployerSettingsFormData = z.infer<typeof employerSettingsSchema>;
