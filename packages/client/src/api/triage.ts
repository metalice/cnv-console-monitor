import type { TriageRequest, CommentRequest, BulkTriageRequest } from '@cnv-monitor/shared';
import { apiPost } from './client';

export type TriageResult = { success: boolean };

export function classifyDefect(itemId: number, data: TriageRequest): Promise<TriageResult> {
  return apiPost(`/triage/${itemId}`, data);
}

export function bulkClassifyDefect(data: BulkTriageRequest): Promise<TriageResult> {
  return apiPost('/triage/bulk', data);
}

export function addComment(itemId: number, data: CommentRequest): Promise<TriageResult> {
  return apiPost(`/triage/${itemId}/comment`, data);
}
