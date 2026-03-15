import type { AcknowledgmentStatus, AcknowledgeRequest, ApproverStat, AckHistoryEntry } from '@cnv-monitor/shared';
import { apiFetch, apiPost } from './client';

export const fetchAckStatus = (date?: string, component?: string): Promise<AcknowledgmentStatus> => {
  const componentParam = component ? `?component=${encodeURIComponent(component)}` : '';
  if (date) return apiFetch(`/acknowledgment/${date}${componentParam}`);
  return apiFetch(`/acknowledgment/today${componentParam}`);
};

export const submitAcknowledgment = (data: AcknowledgeRequest): Promise<AcknowledgmentStatus> =>
  apiPost('/acknowledgment', data);

type AckStatsResponse = {
  approvers: ApproverStat[];
  history: AckHistoryEntry[];
};

export const fetchAckStats = (days = 30): Promise<AckStatsResponse> =>
  apiFetch(`/acknowledgment/stats?days=${days}`);

export const deleteAcknowledgment = (date: string, reviewer: string): Promise<{ success: boolean }> =>
  apiFetch(`/acknowledgment/${date}`, {
    method: 'DELETE',
    body: JSON.stringify({ reviewer }),
  });
