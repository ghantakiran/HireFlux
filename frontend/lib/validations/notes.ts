import { z } from 'zod';

export const applicationNoteSchema = z.object({
  content: z
    .string()
    .min(1, 'Note content is required')
    .max(5000, 'Note must be 5000 characters or less'),
  type: z.enum(['note', 'feedback', 'question']).optional().default('note'),
});

export type ApplicationNoteFormData = z.infer<typeof applicationNoteSchema>;
