import { logger } from '../logger';

const log = logger.child({ module: 'Retry' });

export interface RetryOptions {
  maxRetries?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryableCheck?: (error: unknown) => boolean;
  onRetry?: (attempt: number, error: unknown) => void;
}

export const getErrorInfo = (error: unknown): { status?: number; code?: string; message: string } => {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const code = err.code as string | undefined;
    const status = (err.response as Record<string, unknown> | undefined)?.status as number | undefined;
    const message = err.message as string || 'Unknown error';
    return { status, code, message };
  }
  return { message: error instanceof Error ? error.message : 'Unknown error' };
};

const isRetryableError = (error: unknown): boolean => {
  if (error && typeof error === 'object') {
    const err = error as Record<string, unknown>;
    const code = err.code as string | undefined;
    if (code === 'ECONNRESET' || code === 'ECONNREFUSED' || code === 'ETIMEDOUT' || code === 'ENOTFOUND' || code === 'EAI_AGAIN') {
      return true;
    }
    const status = (err.response as Record<string, unknown> | undefined)?.status as number | undefined;
    if (status && (status === 429 || status === 500 || status === 502 || status === 503 || status === 504)) {
      return true;
    }
  }
  return false;
};

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 10000,
  retryableCheck: isRetryableError,
  onRetry: () => {},
};

const computeDelay = (attempt: number, baseDelayMs: number, maxDelayMs: number): number => {
  const jitter = Math.random() * 0.3 + 0.85;
  const delay = Math.min(baseDelayMs * Math.pow(2, attempt) * jitter, maxDelayMs);
  return Math.round(delay);
};

let globalRetryCounter: (() => void) | null = null;
export const setGlobalRetryCounter = (counter: (() => void) | null): void => { globalRetryCounter = counter; };

export const withRetry = async <T>(
  fn: () => Promise<T>,
  label: string,
  options?: RetryOptions,
): Promise<T> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      const isLast = attempt === opts.maxRetries;

      if (isLast || !opts.retryableCheck(error)) {
        throw error;
      }

      const delay = computeDelay(attempt, opts.baseDelayMs, opts.maxDelayMs);
      opts.onRetry(attempt + 1, error);
      if (globalRetryCounter) globalRetryCounter();
      log.warn({ attempt: attempt + 1, maxRetries: opts.maxRetries, delayMs: delay, label }, 'Retrying after transient error');
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new Error(`withRetry: exhausted all retries for ${label}`);
}
