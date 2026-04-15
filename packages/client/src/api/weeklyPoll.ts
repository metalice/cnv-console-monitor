import { type WeeklyPollStatus } from '@cnv-monitor/shared';

import { apiFetch, apiPost } from './client';

type TriggerParams = {
  component?: string;
  components?: string[];
  since?: string;
  until?: string;
};

export const triggerWeeklyPoll = (params: TriggerParams = {}): Promise<{ message: string }> => {
  const query = new URLSearchParams();
  if (params.component) query.set('component', params.component);
  if (params.components?.length) query.set('components', params.components.join(','));
  if (params.since) query.set('since', params.since);
  if (params.until) query.set('until', params.until);
  const queryStr = query.toString();
  return apiPost(`/weekly-poll${queryStr ? `?${queryStr}` : ''}`, {});
};

export const fetchWeeklyPollStatus = (component?: string): Promise<WeeklyPollStatus> => {
  const query = component ? `?component=${encodeURIComponent(component)}` : '';
  return apiFetch(`/weekly-poll/status${query}`);
};
