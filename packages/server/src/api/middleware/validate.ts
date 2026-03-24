import { type NextFunction, type Request, type Response } from 'express';
import { ZodError, type ZodSchema } from 'zod';

export const parseIntParam = (
  value: string | string[],
  name: string,
  res: Response,
): number | null => {
  const str = Array.isArray(value) ? value[0] : value;
  const parsed = parseInt(str, 10);
  if (Number.isNaN(parsed)) {
    res.status(400).json({ error: `Invalid ${name}: must be an integer` });
    return null;
  }
  return parsed;
};

export const clampInt = (
  raw: string | undefined,
  defaultVal: number,
  min: number,
  max: number,
): number => {
  const parsed = raw ? parseInt(raw, 10) : NaN;
  const value = Number.isNaN(parsed) ? defaultVal : parsed;
  return Math.max(min, Math.min(max, value));
};

export const validateBody =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          details: err.errors.map(zodError => ({
            message: zodError.message,
            path: zodError.path.join('.'),
          })),
          error: 'Validation failed',
        });
        return;
      }
      next(err);
    }
  };

export const validateQuery =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          details: err.errors.map(zodError => ({
            message: zodError.message,
            path: zodError.path.join('.'),
          })),
          error: 'Query validation failed',
        });
        return;
      }
      next(err);
    }
  };

export const validateParams =
  (schema: ZodSchema) =>
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        res.status(400).json({
          details: err.errors.map(zodError => ({
            message: zodError.message,
            path: zodError.path.join('.'),
          })),
          error: 'Parameter validation failed',
        });
        return;
      }
      next(err);
    }
  };
