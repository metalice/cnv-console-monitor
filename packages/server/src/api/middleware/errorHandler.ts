import { Request, Response, NextFunction } from 'express';
import { AxiosError } from 'axios';
import { logger } from '../../logger';

const log = logger.child({ module: 'API' });

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const upstream = err.response?.data;
    const url = err.config?.url;

    log.error({
      err: { message: err.message, code: err.code, status, url },
      upstream,
    }, 'Upstream API error');

    res.status(502).json({
      error: `Upstream error: ${err.message}`,
      upstream: typeof upstream === 'object' ? upstream : undefined,
      status,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  log.error({ err }, 'Internal server error');
  res.status(500).json({
    error: err.message || 'Internal server error',
    timestamp: new Date().toISOString(),
  });
}
