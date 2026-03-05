import { apiPost } from './client';

type PollResponse = { success: boolean; launches: number };

export function triggerPollNow(): Promise<PollResponse> {
  return apiPost('/poll/now', {});
}
