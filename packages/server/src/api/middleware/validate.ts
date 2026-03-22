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

export const clampInt = (raw: string | undefined, defaultVal: number, min: number, max: number): number => {
  const parsed = raw ? parseInt(raw, 10) : NaN;
  const value = Number.isNaN(parsed) ? defaultVal : parsed;
  return Math.max(min, Math.min(max, value));
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

export const validateQuery = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Query validation failed',
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

export const validateParams = (schema: ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          error: 'Parameter validation failed',
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
