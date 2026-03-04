import type { FlakyTest } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export function fetchFlakyTests(days = 14, limit = 20): Promise<FlakyTest[]> {
  return apiFetch(`/flaky-tests?days=${days}&limit=${limit}`);
}
