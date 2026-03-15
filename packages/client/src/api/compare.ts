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

export function fetchCompare(launchA: number, launchB: number): Promise<CompareResult> {
  return apiFetch(`/compare?launchA=${launchA}&launchB=${launchB}`);
}
