const BASE = '/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

const getImpersonateParam = (): string => {
  const params = new URLSearchParams(window.location.search);
  const impersonate = params.get('impersonate');
  return impersonate ? `impersonate=${encodeURIComponent(impersonate)}` : '';
};

export const apiFetch = async <T>(path: string, options?: RequestInit): Promise<T> => {
  const impersonateParam = getImpersonateParam();
  const separator = path.includes('?') ? '&' : '?';
  const url = impersonateParam ? `${BASE}${path}${separator}${impersonateParam}` : `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = (await res.json().catch(() => ({ error: res.statusText }))) as {
      error?: string;
      message?: string;
    };
    const message = body.error ?? body.message ?? (res.statusText || 'Request failed');
    throw new ApiError(res.status, message);
  }

  return res.json() as Promise<T>;
};

export const apiPost = <T>(path: string, body: unknown): Promise<T> =>
  apiFetch(path, { body: JSON.stringify(body), method: 'POST' });
