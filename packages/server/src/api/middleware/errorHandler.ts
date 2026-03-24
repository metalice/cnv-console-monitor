import { AxiosError } from 'axios';
import { type NextFunction, type Request, type Response } from 'express';

import { logger, setResponseError } from '../../logger';

const log = logger.child({ module: 'API' });

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AxiosError) {
    const status = err.response?.status;
    const upstream: unknown = err.response?.data;
    const url = err.config?.url;

    log.error(
      {
        err: { code: err.code, message: err.message, status, url },
        upstream,
      },
      'Upstream API error',
    );

    setResponseError(res, 'An upstream service returned an error');
    res.status(502).json({
      error: 'An upstream service returned an error',
      status,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  log.error({ err }, err.message || 'Internal server error');
  setResponseError(res, 'Internal server error');
  res.status(500).json({
    error: 'Internal server error',
    timestamp: new Date().toISOString(),
  });
}
