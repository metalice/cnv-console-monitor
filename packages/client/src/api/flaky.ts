import type { FlakyTest } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export function fetchFlakyTests(days = 14, limit = 20, component?: string): Promise<FlakyTest[]> {
  const comp = component ? `&component=${encodeURIComponent(component)}` : '';
  return apiFetch(`/flaky-tests?days=${days}&limit=${limit}${comp}`);
}
