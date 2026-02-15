import { z } from 'zod';

// ─── Bug Report ───
export const bugReportSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  stepsToReproduce: z.string().min(1, 'Steps to reproduce are required'),
  expectedBehavior: z.string().optional().default(''),
  actualBehavior: z.string().optional().default(''),
  severity: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
});
export type BugReportFormData = z.infer<typeof bugReportSchema>;

// ─── General Feedback ───
export const generalFeedbackSchema = z.object({
  rating: z.number().min(1, 'Please select a rating').max(5),
  feedback: z.string().min(1, 'Feedback is required'),
  category: z.enum(['user-experience', 'performance', 'features', 'support', 'other']).default('user-experience'),
});
export type GeneralFeedbackFormData = z.infer<typeof generalFeedbackSchema>;

// ─── Feature Request ───
export const featureRequestSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().min(1, 'Description is required'),
  useCase: z.string().min(1, 'Use case is required'),
  priority: z.enum(['low', 'medium', 'high']).default('medium'),
});
export type FeatureRequestFormData = z.infer<typeof featureRequestSchema>;

// ─── Team Invite ───
export const teamInviteSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address'),
  role: z.enum(['owner', 'admin', 'hiring_manager', 'recruiter', 'interviewer', 'viewer']),
});
export type TeamInviteFormData = z.infer<typeof teamInviteSchema>;
