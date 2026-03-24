import pino from 'pino';
import pinoHttp from 'pino-http';

const prettyOptions = {
  colorize: true,
  errorLikeObjectKeys: [],
  ignore: 'pid,hostname',
  levelFirst: true,
  messageFormat: '{if module}[{module}] {end}{msg}',
  singleLine: false,
  translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
};

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  serializers: {
    err: (
      err: {
        code?: string;
        constructor?: { name?: string };
        message?: string;
        status?: number;
        statusCode?: number;
      } | null,
    ) => ({
      code: err?.code,
      message: err?.message,
      status: err?.status || err?.statusCode,
      type: err?.constructor?.name || 'Error',
    }),
    error: (
      err: {
        code?: string;
        constructor?: { name?: string };
        message?: string;
        status?: number;
        statusCode?: number;
      } | null,
    ) => ({
      code: err?.code,
      message: err?.message,
      status: err?.status || err?.statusCode,
      type: err?.constructor?.name || 'Error',
    }),
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    options: prettyOptions,
    target: 'pino-pretty',
  },
});

export const setResponseError = (res: unknown, message: string): void => {
  (res as Record<string, unknown>).__errorMessage = message;
};

export const httpLogger = pinoHttp({
  autoLogging: {
    ignore: req => req.url === '/health',
  },
  customErrorMessage: (_req, res) => {
    const errorMsg = (res as unknown as Record<string, unknown>).__errorMessage as
      | string
      | undefined;
    return errorMsg || `request failed with status ${res.statusCode}`;
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) {
      return 'error';
    }
    if (res.statusCode >= 400) {
      return 'warn';
    }
    return 'info';
  },
  logger,
  serializers: {
    err: () => undefined,
    req: (req: { method?: string; url?: string }) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res: { statusCode?: number }) => ({
      statusCode: res.statusCode,
    }),
  },
});
