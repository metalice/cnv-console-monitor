import type { AcknowledgmentStatus, AcknowledgeRequest, ApproverStat, AckHistoryEntry } from '@cnv-monitor/shared';
import { apiFetch, apiPost } from './client';

export function fetchAckStatus(date?: string): Promise<AcknowledgmentStatus> {
  if (date) return apiFetch(`/acknowledgment/${date}`);
  return apiFetch('/acknowledgment/today');
}

export function submitAcknowledgment(data: AcknowledgeRequest): Promise<AcknowledgmentStatus> {
  return apiPost('/acknowledgment', data);
}

type AckStatsResponse = {
  approvers: ApproverStat[];
  history: AckHistoryEntry[];
};

export function fetchAckStats(days = 30): Promise<AckStatsResponse> {
  return apiFetch(`/acknowledgment/stats?days=${days}`);
}

export function deleteAcknowledgment(date: string, reviewer: string): Promise<{ success: boolean }> {
  return apiFetch(`/acknowledgment/${date}`, {
    method: 'DELETE',
    body: JSON.stringify({ reviewer }),
  });
}
