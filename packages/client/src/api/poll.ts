import { apiPost } from './client';

type PollResponse = { success: boolean; launches: number };

export const triggerPollNow = (): Promise<PollResponse> =>
  apiPost('/poll/now', {});
