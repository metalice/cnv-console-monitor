import type { TestItem } from '@cnv-monitor/shared';

import { apiFetch } from './client';

export type LaunchSummary = {
  rp_id: number;
  name: string;
  cnv_version: string | null;
  ocp_version: string | null;
  tier: string | null;
  cluster_name: string | null;
  start_time: number;
  status: string;
  total: number;
  passed: number;
  failed: number;
};

export type CompareResult = {
  launchA: LaunchSummary;
  launchB: LaunchSummary;
  regressions: TestItem[];
  fixes: TestItem[];
  persistent: TestItem[];
  summary: { regressions: number; fixes: number; persistent: number };
};

export type LaunchRun = {
  rp_id: number;
  number: number;
  status: string;
  start_time: number;
  total: number;
  passed: number;
  failed: number;
  cluster_name: string | null;
};

export type LaunchGroup = {
  name: string;
  runCount: number;
  latestStatus: string;
  cnvVersion: string | null;
  tier: string | null;
  component: string | null;
  runs: LaunchRun[];
};

export const fetchCompareLaunches = (days = 30): Promise<LaunchGroup[]> =>
  apiFetch(`/compare/launches?days=${days}`);

export const fetchCompare = (launchA: number, launchB: number): Promise<CompareResult> =>
  apiFetch(`/compare?launchA=${launchA}&launchB=${launchB}`);
