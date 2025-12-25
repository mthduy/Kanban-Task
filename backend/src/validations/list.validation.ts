import { z } from 'zod';

export const createListSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).transform((s) => s.trim()),
});

export const updateListSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).transform((s) => s.trim()).optional(),
});

export default createListSchema;
