import type { TriageRequest, CommentRequest, BulkTriageRequest } from '@cnv-monitor/shared';
import { apiPost } from './client';

export function classifyDefect(itemId: number, data: TriageRequest) {
  return apiPost(`/triage/${itemId}`, data);
}

export function bulkClassifyDefect(data: BulkTriageRequest) {
  return apiPost('/triage/bulk', data);
}

export function addComment(itemId: number, data: CommentRequest) {
  return apiPost(`/triage/${itemId}/comment`, data);
}
