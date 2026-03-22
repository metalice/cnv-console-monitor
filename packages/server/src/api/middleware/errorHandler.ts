import { Request, Response, NextFunction } from 'express';
import { AxiosError } from 'axios';
import { logger, setResponseError } from '../../logger';

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
