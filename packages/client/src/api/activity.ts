import type { ActivityEntry } from '@cnv-monitor/shared';

import { apiFetch, apiPost } from './client';

export type ActivityFilters = {
  component?: string;
  action?: string;
  user?: string;
  since?: string;
  until?: string;
  search?: string;
};

export type ActivityResponse = {
  entries: ActivityEntry[];
  total: number;
};

export const fetchActivity = (
  limit = 50,
  offset = 0,
  filters: ActivityFilters = {},
): Promise<ActivityResponse> => {
  const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (filters.component) {
    params.set('component', filters.component);
  }
  if (filters.action) {
    params.set('action', filters.action);
  }
  if (filters.user) {
    params.set('user', filters.user);
  }
  if (filters.since) {
    params.set('since', filters.since);
  }
  if (filters.until) {
    params.set('until', filters.until);
  }
  if (filters.search) {
    params.set('search', filters.search);
  }
  return apiFetch(`/activity?${params.toString()}`);
};

export type ActivityMeta = { users: string[]; components: string[] };

export const fetchActivityMeta = (): Promise<ActivityMeta> => apiFetch('/activity/meta');

export type ActivitySummary = {
  byAction: Record<string, number>;
  byComponent: [string, number][];
  byUser: [string, number][];
  total: number;
  latestActivityAt: number | null;
};

export const fetchActivitySummary = (filters: ActivityFilters = {}): Promise<ActivitySummary> => {
  const params = new URLSearchParams();
  if (filters.component) {
    params.set('component', filters.component);
  }
  if (filters.since) {
    params.set('since', filters.since);
  }
  if (filters.until) {
    params.set('until', filters.until);
  }
  return apiFetch(`/activity/summary?${params.toString()}`);
};

export type RelatedActivity = {
  id: number;
  action: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string | null;
  performed_at: string;
  component: string | null;
};

export const fetchRelatedActivity = (testItemId: number): Promise<RelatedActivity[]> =>
  apiFetch(`/activity/related/${testItemId}`);

export const fetchPinnedActivity = (): Promise<ActivityEntry[]> => apiFetch('/activity/pinned');

export const pinActivity = (id: number, note?: string): Promise<{ success: boolean }> =>
  apiPost(`/activity/${id}/pin`, { note });

export const unpinActivity = (id: number): Promise<{ success: boolean }> =>
  apiPost(`/activity/${id}/unpin`, {});
