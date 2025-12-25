import { z } from 'zod';

const objectId = () => z.string().regex(/^[0-9a-fA-F]{24}$/u, 'Invalid id');

export const createBoardSchema = z.object({
  title: z
    .string()
    .min(2, 'Title must be at least 2 characters')
    .max(100)
    .transform((s) => s.trim()),
  description: z
    .string()
    .max(500)
    .transform((s) => s.trim())
    .optional(),
  background: z
    .string()
    .max(1000)
    .transform((s) => s.trim())
    .optional(),
  owner: z.string().min(1, 'Owner is required').optional(),
  // Accept array of ObjectId strings; controller will further normalize CSV/JSON inputs
  members: z.array(objectId()).optional(),
  // Workspace is required for board creation
  workspace: objectId(),
});

export const updateBoardSchema = createBoardSchema.partial();