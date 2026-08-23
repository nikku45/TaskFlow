import { z } from 'zod';

export const createProjectSchema = z
  .object({
    name: z.string().min(1, 'Project name is required'),
    description: z.string().optional(),
  })
  .strict();

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
  })
  .strict();

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
