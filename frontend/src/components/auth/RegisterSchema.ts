// src/schemas/registerSchema.ts
import { z } from 'zod';

export const RegisterSchema = z.object({
  firstname: z.string().min(1, 'First name is required'),
  lastname: z.string().min(1, 'Last name is required'),
  username: z.string().min(3, 'Username must be at least 3 characters'),
  email: z.email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

// Automatically infer TypeScript type for the form
export type RegisterFormValue = z.infer<typeof RegisterSchema>;
