import { type NextFunction, type Request, type Response } from 'express';
import { ZodError, type ZodObject } from 'zod';

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (schema: ZodObject<any>) =>
    (req: Request, res: Response, next: NextFunction): void => {
      try {
        req.body = schema.parse(req.body as unknown);
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
