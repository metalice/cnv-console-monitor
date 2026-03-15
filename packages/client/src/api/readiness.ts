import { apiFetch } from './client';

export type BlockingFailure = {
  name: string;
  unique_id: string;
  fail_count: number;
  total_runs: number;
  failure_rate: number;
  recent_trend: 'worsening' | 'improving' | 'stable';
};

export type ReadinessTrendPoint = {
  date: string;
  total: number;
  passed: number;
  rate: number;
};

export type ReadinessAssessment = {
  version: string;
  passRate: number;
  totalLaunches: number;
  failedLaunches: number;
  untriagedCount: number;
  blockingFailures: BlockingFailure[];
  trend: ReadinessTrendPoint[];
  recommendation: 'ready' | 'at_risk' | 'blocked';
};

export function fetchReadiness(version: string, days = 30): Promise<ReadinessAssessment> {
  return apiFetch(`/readiness/${encodeURIComponent(version)}?days=${days}`);
}

export function fetchReadinessVersions(): Promise<string[]> {
  return apiFetch('/readiness/versions');
}
