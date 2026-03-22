import type { ReleaseInfo, ChecklistTask, ChecklistDetail } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export const fetchReleases = (): Promise<ReleaseInfo[]> =>
  apiFetch('/releases');

export const fetchChecklist = (component?: string, status = 'open', version?: string): Promise<ChecklistTask[]> => {
  const params = new URLSearchParams();
  if (component) params.set('component', component);
  if (status) params.set('status', status);
  if (version) params.set('version', version);
  return apiFetch(`/releases/checklist?${params.toString()}`);
};

export const fetchChecklistDetail = (key: string): Promise<ChecklistDetail> =>
  apiFetch(`/releases/checklist/${key}`);

export const transitionChecklistTask = (key: string, data: { transitionId: string; comment?: string; assignee?: string }): Promise<{ success: boolean }> =>
  apiFetch(`/releases/checklist/${key}/transition`, { method: 'POST', body: JSON.stringify(data) });

export const addChecklistComment = (key: string, comment: string): Promise<{ success: boolean }> =>
  apiFetch(`/releases/checklist/${key}/comment`, { method: 'POST', body: JSON.stringify({ comment }) });

export type VersionReadiness = {
  totalLaunches: number;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  skippedTests: number;
  passRate: number | null;
  trend: Array<{ day: string; passRate: number | null }>;
};

export const fetchVersionReadiness = (version: string): Promise<VersionReadiness> =>
  apiFetch(`/releases/${version}/readiness`);

export type ManualMilestone = {
  id: number;
  version: string;
  milestone_type: string;
  name: string;
  date: string;
  notes: string | null;
};

export const fetchManualMilestones = (): Promise<ManualMilestone[]> =>
  apiFetch('/releases/milestones');

export type SubVersion = { name: string; released: boolean };

export const fetchSubVersions = (version: string): Promise<SubVersion[]> =>
  apiFetch(`/releases/${version}/sub-versions`);

export type BlockerIssue = {
  key: string;
  summary: string;
  status: string;
  assignee: string | null;
  priority: string;
  created: string;
  ageDays: number;
};

export const fetchBlockers = (version: string): Promise<BlockerIssue[]> =>
  apiFetch(`/releases/${version}/blockers`);

export type VelocityMetric = {
  version: string;
  totalReleases: number;
  avgDaysBetweenReleases: number | null;
};

export const fetchVelocity = (): Promise<VelocityMetric[]> =>
  apiFetch('/releases/velocity');
