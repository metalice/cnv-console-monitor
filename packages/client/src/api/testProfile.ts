import type { TestItem } from '@cnv-monitor/shared';

import { apiFetch } from './client';

export type TestIdentity = {
  name: string;
  uniqueId: string;
  polarionId: string | null;
  component: string | null;
  jiraKeys: string[];
};

export type RunStatus = {
  status: string;
  date: string;
};

export type StreakInfo = {
  consecutiveFailures: number;
  totalRuns: number;
  lastPassDate: string | null;
  lastPassTime: number | null;
  recentStatuses: string[];
  recentRuns: RunStatus[];
};

export type AffectedLaunch = {
  rp_id: number;
  name: string;
  cnv_version: string | null;
  ocp_version: string | null;
  tier: string | null;
  cluster_name: string | null;
  component: string | null;
  start_time: number;
  status: string;
};

export type TriageEntry = {
  action: string;
  old_value: string | null;
  new_value: string | null;
  performed_by: string | null;
  performed_at: string;
};

export type TestProfile = {
  identity: TestIdentity;
  streak: StreakInfo;
  history: TestItem[];
  affectedLaunches: AffectedLaunch[];
  triageHistory: TriageEntry[];
};

export const fetchTestProfile = (uniqueId: string): Promise<TestProfile> =>
  apiFetch(`/test-profile/${encodeURIComponent(uniqueId)}`);
