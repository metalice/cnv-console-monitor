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

    const errorMsg = `Upstream error: ${err.message}`;
    setResponseError(res, errorMsg);
    res.status(502).json({
      error: errorMsg,
      upstream: typeof upstream === 'object' ? upstream : undefined,
      status,
      timestamp: new Date().toISOString(),
    });
    return;
  }

  const errorMsg = err.message || 'Internal server error';
  setResponseError(res, errorMsg);
  log.error({ err }, errorMsg);
  res.status(500).json({
    error: errorMsg,
    timestamp: new Date().toISOString(),
  });
}
