import { apiFetch } from './client';

export type BlockingFailure = {
  name: string;
  unique_id: string;
  fail_count: number;
  total_runs: number;
  failure_rate: number;
  recent_trend: 'worsening' | 'improving' | 'stable';
};

type ReadinessTrendPoint = {
  date: string;
  total: number;
  passed: number;
  rate: number;
};

export type ComponentBreakdownEntry = {
  component: string;
  passRate: number;
  totalLaunches: number;
  failedLaunches: number;
};

type ReadinessAssessment = {
  version: string;
  passRate: number;
  totalLaunches: number;
  failedLaunches: number;
  untriagedCount: number;
  blockingFailures: BlockingFailure[];
  trend: ReadinessTrendPoint[];
  recommendation: 'ready' | 'at_risk' | 'blocked';
  componentBreakdown: ComponentBreakdownEntry[];
};

export type VersionSummary = {
  version: string;
  passRate: number;
  totalLaunches: number;
  recommendation: 'ready' | 'at_risk' | 'blocked';
  lastRun: string | null;
};

export const fetchReadiness = (
  version: string,
  days = 30,
  components?: string[],
): Promise<ReadinessAssessment> => {
  const params = new URLSearchParams({ days: String(days) });
  if (components?.length) {
    params.set('components', components.join(','));
  }
  return apiFetch(`/readiness/${encodeURIComponent(version)}?${params.toString()}`);
};

export const fetchReadinessVersions = (components?: string[]): Promise<VersionSummary[]> => {
  const params = new URLSearchParams();
  if (components?.length) {
    params.set('components', components.join(','));
  }
  const queryString = params.toString();
  return apiFetch(`/readiness/versions${queryString ? `?${queryString}` : ''}`);
};
