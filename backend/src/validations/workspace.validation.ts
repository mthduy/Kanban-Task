import { z } from 'zod';

export const createWorkspaceSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  members: z.array(z.string()).optional(),
});

export const updateWorkspaceSchema = createWorkspaceSchema.partial();