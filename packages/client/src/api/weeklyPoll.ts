import { type WeeklyPollStatus } from '@cnv-monitor/shared';

import { apiFetch, apiPost } from './client';

const buildQuery = (component?: string): string =>
  component ? `?component=${encodeURIComponent(component)}` : '';

export const triggerWeeklyPoll = (component?: string): Promise<{ message: string }> =>
  apiPost(`/weekly-poll${buildQuery(component)}`, {});

export const fetchWeeklyPollStatus = (): Promise<WeeklyPollStatus> =>
  apiFetch('/weekly-poll/status');
