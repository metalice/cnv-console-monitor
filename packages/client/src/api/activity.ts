import type { ActivityEntry } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export function fetchActivity(limit = 50, offset = 0): Promise<ActivityEntry[]> {
  return apiFetch(`/activity?limit=${limit}&offset=${offset}`);
}
