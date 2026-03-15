import { apiFetch } from './client';

export type ComponentHealthSummary = {
  component: string;
  passRate: number;
  totalLaunches: number;
  failedLaunches: number;
  untriagedCount: number;
  flakyCount: number;
  worseningCount: number;
  trend: 'improving' | 'worsening' | 'stable';
};

export const fetchComponentHealth = (since: number, until: number): Promise<ComponentHealthSummary[]> =>
  apiFetch(`/component-health?since=${since}&until=${until}`);
