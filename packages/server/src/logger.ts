import pino from 'pino';
import pinoHttp from 'pino-http';

const prettyOptions = {
  colorize: true,
  errorLikeObjectKeys: ['err', 'error'],
  errorProps: '*',
  ignore: 'pid,hostname',
  levelFirst: true,
  messageFormat: '{if module}[{module}] {end}{msg}',
  singleLine: false,
  translateTime: 'SYS:yyyy-mm-dd HH:MM:ss.l',
};

export const logger = pino({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  timestamp: pino.stdTimeFunctions.isoTime,
  transport: {
    target: 'pino-pretty',
    options: prettyOptions,
  },
});

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
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
});
