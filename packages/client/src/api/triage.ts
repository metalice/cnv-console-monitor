import type { BulkTriageRequest, TriageRequest } from '@cnv-monitor/shared';

import { apiPost } from './client';

type TriageResult = { success: boolean };

export const classifyDefect = (itemId: number, data: TriageRequest): Promise<TriageResult> =>
  apiPost(`/triage/${itemId}`, data);

export const bulkClassifyDefect = (data: BulkTriageRequest): Promise<TriageResult> =>
  apiPost('/triage/bulk', data);
