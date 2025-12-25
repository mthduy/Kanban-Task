import type { Request, Response, NextFunction } from 'express';
import type { ZodSchema } from 'zod';

// Middleware to validate request body with a Zod schema
export const validateBody = (schema: ZodSchema<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (result.success) {
      req.body = result.data;
      return next();
    }

  
    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_';
      fields[key] = issue.message;
    }

    return res.status(400).json({ message: 'Validation failed', fields });
  };
};

export default validateBody;