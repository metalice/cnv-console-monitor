import { Request, Response, NextFunction } from 'express';
import { ZodSchema, ZodError } from 'zod';

export const parseIntParam = (value: string | string[], name: string, res: Response): number | null => {
  const str = Array.isArray(value) ? value[0] : value;
  const parsed = parseInt(str, 10);
  if (Number.isNaN(parsed)) {
    res.status(400).json({ error: `Invalid ${name}: must be an integer` });
    return null;
  }
  return parsed;
}

export const validateBody = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Validation failed',
          details: err.errors.map((zodError) => ({
            path: zodError.path.join('.'),
            message: zodError.message,
          })),
        });
        return;
      }
      next(err);
    }
  };
}
