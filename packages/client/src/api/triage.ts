import type { TriageRequest, CommentRequest, BulkTriageRequest } from '@cnv-monitor/shared';
import { apiPost } from './client';

export type TriageResult = { success: boolean };

export const classifyDefect = (itemId: number, data: TriageRequest): Promise<TriageResult> =>
  apiPost(`/triage/${itemId}`, data);

export const bulkClassifyDefect = (data: BulkTriageRequest): Promise<TriageResult> =>
  apiPost('/triage/bulk', data);

export const addComment = (itemId: number, data: CommentRequest): Promise<TriageResult> =>
  apiPost(`/triage/${itemId}/comment`, data);
