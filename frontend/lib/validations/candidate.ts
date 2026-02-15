import { z } from 'zod';
import { requiredUrlSchema } from './shared';

export const candidateProfileSchema = z.object({
  headline: z.string().min(1, 'Headline is required').max(200, 'Headline must be 200 characters or less'),
  bio: z.string().max(2000, 'Bio must be 2000 characters or less').optional().or(z.literal('')),
  location: z.string().optional().or(z.literal('')),
  skills: z.array(z.string()).optional().default([]),
  years_experience: z.number().min(0).max(50).optional().nullable(),
  experience_level: z.string().optional().or(z.literal('')),
  min_salary: z.number().min(0).optional().nullable(),
  max_salary: z.number().min(0).optional().nullable(),
  preferred_location_type: z.string().optional().or(z.literal('')),
  open_to_remote: z.boolean().optional().default(false),
  availability_status: z.string().optional().or(z.literal('')),
  available_from: z.string().optional().or(z.literal('')),
  visibility: z.enum(['public', 'private']).default('private'),
});

export type CandidateProfileFormData = z.infer<typeof candidateProfileSchema>;

export const portfolioItemSchema = z.object({
  type: z.enum(['github', 'website', 'article', 'project']),
  title: z.string().min(1, 'Title is required').max(100, 'Title must be 100 characters or less'),
  url: requiredUrlSchema,
  description: z.string().max(500, 'Description must be 500 characters or less').optional().or(z.literal('')),
});

export type PortfolioItemFormData = z.infer<typeof portfolioItemSchema>;
