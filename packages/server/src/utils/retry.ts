import { logger } from '../logger';

const log = logger.child({ module: 'Retry' });

type RetryOptions = {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableCheck?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
};

export const getErrorInfo = (
  error: unknown,
): { status?: number; code?: string; message: string } => {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const code = err.code as string | undefined;
    const status = (err.response as Record<string, unknown> | undefined)?.status as
      | number
      | undefined;
    const message = (err.message as string) || 'Unknown error';
    return { code, message, status };
  }
  return { message: error instanceof Error ? error.message : 'Unknown error' };
};

const isRetryableError = (error: unknown): boolean => {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const code = err.code as string | undefined;
    if (
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT' ||
      code === 'ENOTFOUND' ||
      code === 'EAI_AGAIN' ||
      code === 'ECONNABORTED' ||
      code === 'ERR_STREAM_PREMATURE_CLOSE' ||
      code === 'ABORT_ERR' ||
      code === 'ERR_CANCELED'
    ) {
      return true;
    }
    const message = ((err.message as string) || '').toLowerCase();
    if (
      message.includes('stream has been aborted') ||
      message.includes('socket hang up') ||
      message.includes('aborted')
    ) {
      return true;
    }
    const status = (err.response as Record<string, unknown> | undefined)?.status as
      | number
      | undefined;
    if (
      status &&
      (status === 429 || status === 500 || status === 502 || status === 503 || status === 504)
    ) {
      return true;
    }
  }
  return false;
};

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  maxRetries: 3,
  onRetry: () => {
    // no-op
  },
  retryableCheck: isRetryableError,
};

const computeDelay = (attempt: number, baseDelayMs: number, maxDelayMs: number): number => {
  const jitter = Math.random() * 0.3 + 0.85;
  const delay = Math.min(baseDelayMs * 2 ** attempt * jitter, maxDelayMs);
  return Math.round(delay);
};

let globalRetryCounter: (() => void) | null = null;
export const setGlobalRetryCounter = (counter: (() => void) | null): void => {
  globalRetryCounter = counter;
};

export const withRetry = async <T>(
  fn: () => Promise<T>,
  label: string,
  options?: RetryOptions,
): Promise<T> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      return await fn();
    } catch (error) {
      const isLast = attempt === opts.maxRetries;

      if (isLast || !opts.retryableCheck(error)) {
        throw error;
      }

      const delay = computeDelay(attempt, opts.baseDelayMs, opts.maxDelayMs);
      opts.onRetry(attempt + 1, error);
      if (globalRetryCounter) {
        globalRetryCounter();
      }
      log.warn(
        { attempt: attempt + 1, delayMs: delay, label, maxRetries: opts.maxRetries },
        'Retrying after transient error',
      );
      // eslint-disable-next-line no-await-in-loop -- sequential: ordered operations
      await new Promise<void>(resolve => {
        setTimeout(resolve, delay);
      });
    }
  }

  throw new Error(`withRetry: exhausted all retries for ${label}`);
};
