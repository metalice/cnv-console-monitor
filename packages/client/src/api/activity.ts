import type { ActivityEntry } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export function fetchActivity(limit = 50, offset = 0, component?: string): Promise<ActivityEntry[]> {
  const comp = component ? `&component=${encodeURIComponent(component)}` : '';
  return apiFetch(`/activity?limit=${limit}&offset=${offset}${comp}`);
}
