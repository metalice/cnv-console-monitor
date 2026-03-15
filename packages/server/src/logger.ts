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
  timestamp: pino.stdTimeFunctions.isoTime,
  serializers: {
    err: (err) => ({ type: err?.constructor?.name || 'Error', message: err?.message, code: err?.code, status: err?.status || err?.statusCode }),
    error: (err) => ({ type: err?.constructor?.name || 'Error', message: err?.message, code: err?.code, status: err?.status || err?.statusCode }),
  },
  transport: {
    target: 'pino-pretty',
    options: prettyOptions,
  },
});

export const setResponseError = (res: unknown, message: string): void => {
  (res as Record<string, unknown>).__errorMessage = message;
}

export const httpLogger = pinoHttp({
  logger,
  autoLogging: {
    ignore: (req) => req.url === '/health',
  },
  customLogLevel: (_req, res, err) => {
    if (res.statusCode >= 500 || err) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customErrorMessage: (_req, res) => {
    const errorMsg = (res as unknown as Record<string, unknown>).__errorMessage as string | undefined;
    return errorMsg || `request failed with status ${res.statusCode}`;
  },
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: () => undefined,
  },
});
