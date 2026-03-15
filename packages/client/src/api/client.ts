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

function getImpersonateParam(): string {
  const params = new URLSearchParams(window.location.search);
  const impersonate = params.get('impersonate');
  return impersonate ? `impersonate=${encodeURIComponent(impersonate)}` : '';
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const imp = getImpersonateParam();
  const separator = path.includes('?') ? '&' : '?';
  const url = imp ? `${BASE}${path}${separator}${imp}` : `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    const message = body.error || body.message || res.statusText || 'Request failed';
    throw new ApiError(res.status, message);
  }

  return res.json();
}

export function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiFetch(path, { method: 'POST', body: JSON.stringify(body) });
}
