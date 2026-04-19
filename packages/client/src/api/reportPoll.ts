import { type ReportPollStatus } from '@cnv-monitor/shared';

import { apiFetch, apiPost } from './client';

type TriggerParams = {
  component?: string;
  components?: string[];
  since?: string;
  until?: string;
};

export const triggerReportPoll = (params: TriggerParams = {}): Promise<{ message: string }> => {
  const query = new URLSearchParams();
  if (params.component) query.set('component', params.component);
  if (params.components?.length) query.set('components', params.components.join(','));
  if (params.since) query.set('since', params.since);
  if (params.until) query.set('until', params.until);
  const queryStr = query.toString();
  return apiPost(`/report-poll${queryStr ? `?${queryStr}` : ''}`, {});
};

export const fetchReportPollStatus = (component?: string): Promise<ReportPollStatus> => {
  const query = component ? `?component=${encodeURIComponent(component)}` : '';
  return apiFetch(`/report-poll/status${query}`);
};
