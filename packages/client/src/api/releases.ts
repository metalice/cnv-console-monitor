import type { ReleaseInfo, ChecklistTask, ChecklistDetail } from '@cnv-monitor/shared';
import { apiFetch } from './client';

export function fetchReleases(): Promise<ReleaseInfo[]> {
  return apiFetch('/releases');
}

export function fetchChecklist(component?: string, status = 'open', version?: string): Promise<ChecklistTask[]> {
  const params = new URLSearchParams();
  if (component) params.set('component', component);
  if (status) params.set('status', status);
  if (version) params.set('version', version);
  return apiFetch(`/releases/checklist?${params.toString()}`);
}

export function fetchChecklistDetail(key: string): Promise<ChecklistDetail> {
  return apiFetch(`/releases/checklist/${key}`);
}

export function transitionChecklistTask(key: string, data: { transitionId: string; comment?: string; assignee?: string }): Promise<{ success: boolean }> {
  return apiFetch(`/releases/checklist/${key}/transition`, { method: 'POST', body: JSON.stringify(data) });
}

export function addChecklistComment(key: string, comment: string): Promise<{ success: boolean }> {
  return apiFetch(`/releases/checklist/${key}/comment`, { method: 'POST', body: JSON.stringify({ comment }) });
}
