import { z } from 'zod';

const objectId = () => z.string().regex(/^[0-9a-fA-F]{24}$/u, 'Invalid id');

const labelSchema = z.object({
  color: z
    .string()
    .regex(/^#[0-9a-fA-F]{6}$/u, 'Invalid color format')
    .optional(),
  name: z.string().max(50).optional(),
});

export const createCardSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200)
    .transform((s) => s.trim()),
  description: z
    .string()
    .max(2000)
    .transform((s) => s.trim())
    .optional(),
  position: z.number().int().min(0).optional(),
  listId: objectId(),
  members: z.array(objectId()).optional(),
  labels: z.array(labelSchema).optional(),
  dueDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    })
    .optional(),
});

export const updateCardSchema = z.object({
  title: z
    .string()
    .min(1, 'Title is required')
    .max(200)
    .transform((s) => s.trim())
    .optional(),
  description: z
    .string()
    .max(2000)
    .transform((s) => s.trim())
    .optional(),
  position: z.number().int().min(0).optional(),
  listId: objectId().optional(),
  members: z.array(objectId()).optional(),
  labels: z.array(labelSchema).optional(),
  dueDate: z
    .string()
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    })
    .optional(),
});
export const uploadAttachmentSchema = z.object({
  // This validates the request body (metadata)
  // File validation happens in multer middleware
});

export const deleteAttachmentSchema = z.object({
  attachmentId: objectId(),
});