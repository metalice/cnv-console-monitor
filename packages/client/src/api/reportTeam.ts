import { type TeamMember, type TeamMemberCreate, type TeamMemberUpdate } from '@cnv-monitor/shared';

import { apiFetch, apiPost } from './client';

const buildQuery = (component?: string): string =>
  component ? `?component=${encodeURIComponent(component)}` : '';

export const fetchTeamMembers = (
  component?: string,
  includeInactive = false,
): Promise<TeamMember[]> => {
  const params = new URLSearchParams();
  if (component) params.set('component', component);
  if (includeInactive) params.set('includeInactive', 'true');
  const queryStr = params.toString();
  return apiFetch(`/report-team${queryStr ? `?${queryStr}` : ''}`);
};

export const createTeamMember = (data: TeamMemberCreate): Promise<TeamMember> =>
  apiPost('/report-team', data);

export const updateTeamMember = (memberId: string, data: TeamMemberUpdate): Promise<TeamMember> =>
  apiFetch(`/report-team/${memberId}`, {
    body: JSON.stringify(data),
    method: 'PUT',
  });

export const deleteTeamMember = (memberId: string, hard = false): Promise<{ success: boolean }> => {
  const query = hard ? '?hard=true' : '';
  return apiFetch(`/report-team/${memberId}${query}`, { method: 'DELETE' });
};

export const restoreDeletedMembers = (): Promise<{ restored: number }> =>
  apiPost('/report-team/restore-deleted', {});

export const fetchAvailableUsers = (
  component?: string,
): Promise<{ githubUsers: string[]; gitlabUsers: string[] }> =>
  apiFetch(`/report-team/available-users${buildQuery(component)}`);
