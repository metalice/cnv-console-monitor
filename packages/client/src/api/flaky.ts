import type { FlakyTest } from '@cnv-monitor/shared';

import { apiFetch } from './client';

export const fetchFlakyTests = (
  days = 14,
  limit = 20,
  component?: string,
): Promise<FlakyTest[]> => {
  const componentParam = component ? `&component=${encodeURIComponent(component)}` : '';
  return apiFetch(`/flaky-tests?days=${days}&limit=${limit}${componentParam}`);
};
