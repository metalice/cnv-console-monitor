import type { ActivityEntry } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export const fetchActivity = (limit = 50, offset = 0, component?: string): Promise<ActivityEntry[]> => {
  const componentParam = component ? `&component=${encodeURIComponent(component)}` : '';
  return apiFetch(`/activity?limit=${limit}&offset=${offset}${componentParam}`);
};
