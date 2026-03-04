import type { AcknowledgmentStatus, AcknowledgeRequest } from '@cnv-monitor/shared';
import { apiFetch, apiPost } from './client';

export function fetchAckStatus(): Promise<AcknowledgmentStatus> {
  return apiFetch('/acknowledgment/today');
}

export function submitAcknowledgment(data: AcknowledgeRequest): Promise<AcknowledgmentStatus> {
  return apiPost('/acknowledgment', data);
}
