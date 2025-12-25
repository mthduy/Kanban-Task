
import { z } from 'zod';

export const registerSchema = z.object({
  username: z.string().min(3),
  password: z.string().min(6),
  email: z.email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});